import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp } from "ink";
import { Header, Progress, StatusLine, COLORS } from "./theme/index.js";
import { AgentRuntime, type AgentCallbacks } from "../agent/agent.js";
import { LlamaCppProvider } from "../model/llama-cpp.js";
import { ToolRegistry } from "../tools/tool-registry.js";
import { searchWebTool } from "../tools/search-web.js";
import { retrieveUrlTool } from "../tools/retrieve-url.js";
import { getConfig } from "../config/config.js";
import type { AgentState, AgentEvent } from "../agent/state.js";
import { Markdown } from "./components/markdown.js";
import * as fs from "node:fs";

interface AppProps {
  question?: string;
  outputFile?: string;
}

export const App: React.FC<AppProps> = ({ question: initialQuestion, outputFile }) => {
  const { exit } = useApp();
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [state, setState] = useState<AgentState>("IDLE");
  const [sources, setSources] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const [streaming, setStreaming] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(!initialQuestion);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const runResearch = useCallback(async (q: string) => {
    const config = getConfig();
    const startTime = Date.now();

    // Timer
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      const m = String(Math.floor(secs / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      setElapsed(`${m}:${s}`);
    }, 1000);

    try {
      const provider = new LlamaCppProvider({
        baseUrl: config.modelUrl,
        model: config.modelName,
      });

      // Health check
      const healthy = await provider.healthCheck();
      if (!healthy) {
        setError(
          `Seekly could not connect to the local model.\n\nExpected:\n${config.modelUrl}\n\nStart your llama.cpp server and try again.`
        );
        clearInterval(timer);
        return;
      }

      const tools = new ToolRegistry();
      tools.register(searchWebTool);
      tools.register(retrieveUrlTool);

      const callbacks: AgentCallbacks = {
        onStateChange: (s) => {
          setState(s);
          if (s === "SYNTHESIZING") setStreaming("");
        },
        onToken: (t) => {
          if (stateRef.current === "SYNTHESIZING" || stateRef.current === "COMPLETED") {
            setStreaming((prev) => prev + t);
          }
        },
        onEvent: (e) => {
          if (e.type === "source.discovered") {
            setSources((e.data.total as number) ?? 0);
          }
        },
      };

      const agent = new AgentRuntime(provider, tools, q, 12, callbacks);
      setSessionId(agent.getSessionId());
      const result = await agent.run();
      // ponytail: if model still outputs JSON, convert to markdown
      const draft = result.draft.trim().startsWith("{") ? jsonToMarkdown(result.draft) : result.draft;
      setOutput(draft);

      // Save draft to file
      if (outputFile) {
        fs.writeFileSync(outputFile, draft, "utf-8");
      } else {
        const sessionsDir = `${process.env.HOME}/.seekly/sessions`;
        fs.mkdirSync(sessionsDir, { recursive: true });
        fs.writeFileSync(`${sessionsDir}/${agent.getSessionId()}.md`, draft, "utf-8");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    if (initialQuestion) {
      runResearch(initialQuestion);
    }
  }, [initialQuestion, runResearch]);

  // Interactive input mode
  useEffect(() => {
    if (!waitingForInput) return;
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf-8");

    let buffer = "";
    const onData = (chunk: string) => {
      if (chunk === "\r") {
        if (buffer.trim()) {
          setQuestion(buffer.trim());
          setWaitingForInput(false);
          runResearch(buffer.trim());
        }
        buffer = "";
      } else if (chunk === "\u0003") {
        exit();
      } else if (chunk === "\u007F") {
        buffer = buffer.slice(0, -1);
        process.stdout.write("\r\x1b[K> " + buffer);
      } else {
        buffer += chunk;
        process.stdout.write("\r\x1b[K> " + buffer);
      }
    };

    stdin.on("data", onData);
    process.stdout.write("\n> ");

    return () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode?.(false);
      stdin.pause();
    };
  }, [waitingForInput, runResearch, exit]);

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color={COLORS.error}>{error}</Text>
        </Box>
        <Text color={COLORS.dim}>Press any key to exit</Text>
      </Box>
    );
  }

  if (output) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color={COLORS.success}>✓ Research complete</Text>
        </Box>
        <Markdown content={output} />
      </Box>
    );
  }

  if (streaming && state === "SYNTHESIZING") {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color={COLORS.accent}>● Writing report...</Text>
        </Box>
        <Box>
          <Text>{streaming}</Text>
        </Box>
      </Box>
    );
  }

  if (waitingForInput) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color={COLORS.dim}>Type your research question and press Enter</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Progress
      question={question}
      sources={sources}
      elapsed={elapsed}
      state={state}
    />
  );
};

// ponytail: fallback for models that output JSON instead of Markdown
function jsonToMarkdown(raw: string): string {
  try {
    const json = JSON.parse(raw);
    if (!json.title && !json.sections) return raw;
    const lines: string[] = [];
    if (json.title) lines.push(`# ${json.title}\n`);
    if (Array.isArray(json.sections)) {
      for (const s of json.sections) {
        lines.push(`## ${s.heading}\n`);
        if (Array.isArray(s.content)) {
          lines.push(s.content.join("\n") + "\n");
        } else {
          lines.push(`${s.content}\n`);
        }
      }
    }
    return lines.join("\n");
  } catch {
    return raw;
  }
}
