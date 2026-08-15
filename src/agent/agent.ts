import type { AgentState, AgentEvent } from "./state.js";
import type { ModelProvider, ModelRequest } from "../model/provider.js";
import { ContextManager } from "./context.js";
import { ToolRegistry } from "../tools/tool-registry.js";
import type { Source, Evidence, Claim } from "../model/types.js";
import {
  createSession, updateSessionStatus,
  insertSource, insertEvidence, insertEvent,
  updateSessionDraft,
} from "../storage/repositories/session.js";

function genId(): string {
  return crypto.randomUUID();
}

export interface AgentCallbacks {
  onStateChange?: (state: AgentState) => void;
  onEvent?: (event: AgentEvent) => void;
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: unknown) => void;
  onToolResult?: (name: string, result: unknown, error?: string) => void;
}

// ponytail: many local models don't support native tool calls.
// We parse text output for tool call patterns instead.
const TOOL_CALL_PATTERN = /\[TOOL_CALL\]\s*(\w+)\s*(\{.*?\})\s*$/gm;

export class AgentRuntime {
  private state: AgentState = "IDLE";
  private context = new ContextManager();
  private sessionId: string;
  private question: string;
  private sources: Source[] = [];
  private evidence: Evidence[] = [];
  private claims: Claim[] = [];
  private searchCount = 0;
  private maxSearches: number;
  private callbacks: AgentCallbacks;

  constructor(
    private model: ModelProvider,
    private tools: ToolRegistry,
    question: string,
    maxSearches: number = 12,
    callbacks: AgentCallbacks = {},
  ) {
    this.question = question;
    this.sessionId = genId();
    this.maxSearches = maxSearches;
    this.callbacks = callbacks;
    createSession(this.sessionId, question);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getState(): AgentState {
    return this.state;
  }

  private transition(newState: AgentState): void {
    this.state = newState;
    updateSessionStatus(this.sessionId, newState);
    const event: AgentEvent = {
      type: `state.${newState.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      data: { state: newState },
    };
    insertEvent(this.sessionId, event);
    this.callbacks.onStateChange?.(newState);
    this.callbacks.onEvent?.(event);
  }

  private emit(type: string, data: Record<string, unknown>): void {
    const event: AgentEvent = { type, timestamp: new Date().toISOString(), data };
    insertEvent(this.sessionId, event);
    this.callbacks.onEvent?.(event);
  }

  async run(): Promise<{ draft: string; sources: Source[]; claims: Claim[] }> {
    try {
      // Phase 1: Search — we generate queries and search ourselves
      this.transition("SEARCHING");
      await this.searchPhase();

      // Phase 2: Retrieve top sources
      this.transition("RETRIEVING");
      await this.retrievePhase();

      // Phase 3: Synthesize with the model
      this.transition("SYNTHESIZING");
      const draft = await this.synthesize();

      this.transition("COMPLETED");
      updateSessionDraft(this.sessionId, draft);
      return { draft, sources: this.sources, claims: this.claims };
    } catch (err) {
      this.transition("FAILED");
      throw err;
    }
  }

  private async searchPhase(): Promise<void> {
    // Generate search queries by asking the model
    this.context.addUserMessage(
      `Research question: ${this.question}\n\n` +
      `Generate exactly 5 search queries to investigate this topic thoroughly.\n` +
      `Output each query on its own line, nothing else. No numbering, no explanation.`
    );

    const queryResponse = await this.collectText({
      messages: this.context.getMessages(),
      max_tokens: 512,
    });

    if (queryResponse) {
      this.context.addAssistantMessage(queryResponse);
    }

    // Parse queries from response
    const queries = parseSearchQueries(queryResponse, this.question);

    // Execute searches directly
    for (const query of queries) {
      if (this.searchCount >= this.maxSearches) break;

      const result = await this.tools.execute("search_web", { query, numResults: 5 });
      this.callbacks.onToolCall?.("search_web", { query });

      if (result.error) {
        this.callbacks.onToolResult?.("search_web", null, result.error);
        continue;
      }

      this.callbacks.onToolResult?.("search_web", result.result);

      if (Array.isArray(result.result)) {
        for (const r of result.result) {
          const source: Source = {
            id: genId(),
            type: "WEB_PAGE",
            title: r.title,
            url: r.url,
            retrievedAt: new Date().toISOString(),
            metadata: r.metadata,
          };
          insertSource(this.sessionId, source);
          this.sources.push(source);
        }
        this.searchCount++;
        this.emit("source.discovered", { count: result.result.length, total: this.sources.length });
      }
    }
  }

  private async retrievePhase(): Promise<void> {
    // Pick top sources to retrieve (by title relevance)
    const toRetrieve = this.sources
      .filter((s) => s.url)
      .slice(0, 5);

    for (const source of toRetrieve) {
      const result = await this.tools.execute("retrieve_url", { url: source.url, maxLength: 6000 });
      this.callbacks.onToolCall?.("retrieve_url", { url: source.url });

      if (result.error || !result.result) {
        this.callbacks.onToolResult?.("retrieve_url", null, result.error ?? "no result");
        continue;
      }

      this.callbacks.onToolResult?.("retrieve_url", result.result);

      const r = result.result as { content: string };
      // Update source with content
      source.content = r.content;

      const ev: Evidence = {
        id: genId(),
        sourceId: source.id,
        text: r.content.slice(0, 1000),
        relevance: 0.5,
        supports: [],
        contradicts: [],
      };
      insertEvidence(this.sessionId, ev);
      this.evidence.push(ev);

      this.emit("evidence.extracted", { sourceId: source.id, total: this.evidence.length });
    }
  }

  private async synthesize(): Promise<string> {
    const sourceSummary = this.sources
      .slice(0, 15)
      .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
      .join("\n");

    const evidenceSummary = this.evidence
      .slice(0, 20)
      .map((e) => `- ${e.text.slice(0, 200)}`)
      .join("\n");

    this.context.addUserMessage(
      `Write a comprehensive research report on: ${this.question}\n\n` +
      `Use the following sources and evidence. Cite with [number] markers.\n\n` +
      `SOURCES:\n${sourceSummary || "None found"}\n\n` +
      `EVIDENCE:\n${evidenceSummary || "None extracted"}\n\n` +
      `OUTPUT FORMAT (raw Markdown only, no code blocks, no JSON):\n\n` +
      `# Title\n\n` +
      `## Executive Summary\n\n` +
      `## Findings\n\n` +
      `## Discussion\n\n` +
      `## Limitations\n\n` +
      `## Conclusion\n\n` +
      `## References\n\n` +
      `Format each reference as: [N] Author, "Title," Year. URL`
    );

    const response = await this.collectText({
      messages: this.context.getMessages(),
      max_tokens: 4096,
    });

    if (response.trim()) return response;

    // ponytail: if model produced nothing, build report from sources directly
    return this.fallbackReport();
  }

  private fallbackReport(): string {
    const lines: string[] = [];
    lines.push(`# Research: ${this.question}\n`);
    lines.push(`## Executive Summary\n`);
    lines.push(`This report compiles findings from ${this.sources.length} sources.\n`);
    lines.push(`## Findings\n`);

    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      lines.push(`### ${s.title}\n`);
      if (s.content) {
        lines.push(`${s.content.slice(0, 500)}...\n`);
      }
      lines.push(`Source: ${s.url}\n`);
    }

    if (this.evidence.length > 0) {
      lines.push(`## Evidence\n`);
      for (const e of this.evidence) {
        lines.push(`- ${e.text.slice(0, 200)}\n`);
      }
    }

    lines.push(`## References\n`);
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i];
      lines.push(`[${i + 1}] ${s.title}. ${s.url}\n`);
    }

    return lines.join("\n");
  }

  private async collectText(request: ModelRequest): Promise<string> {
    let full = "";
    try {
      for await (const event of this.model.stream(request)) {
        if (event.type === "token") {
          full += event.content;
          this.callbacks.onToken?.(event.content);
        }
        if (event.type === "error") {
          this.emit("model.error", { error: event.error });
        }
      }
    } catch (err) {
      this.emit("model.error", { error: String(err) });
    }
    return full;
  }

  async cancel(): Promise<void> {
    this.transition("CANCELLED");
  }
}

function parseSearchQueries(text: string, fallbackQuestion: string): string[] {
  const lines = text.split("\n")
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((l) => l.length >= 5 && l.length < 200)
    .filter((l) => !/^(here|the|these|below|following|search|queries|query|I)/i.test(l));

  if (lines.length === 0) return [fallbackQuestion];
  return [...new Set(lines)].slice(0, 6);
}
