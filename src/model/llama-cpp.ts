import type { ModelProvider, ModelRequest, ModelEvent, ToolDefinition } from "./provider.js";

export interface LlamaCppConfig {
  baseUrl: string;
  model?: string;
}

export class LlamaCppProvider implements ModelProvider {
  private baseUrl: string;
  private model?: string;

  constructor(config: LlamaCppConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.model = config.model;
  }

  async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
    const body = {
      messages: request.messages,
      tools: request.tools,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 16384,
      stream: true,
      model: this.model,
    };

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });

    if (!res.ok) {
      const text = await res.text();
      yield { type: "error", error: `llama.cpp error ${res.status}: ${text}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            if (choice.delta?.content) {
              fullContent += choice.delta.content;
              yield { type: "token", content: choice.delta.content };
            }

            if (choice.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                if (tc.function?.name) {
                  yield {
                    type: "tool_call",
                    id: tc.id ?? `tc_${Date.now()}`,
                    name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments ?? "{}"),
                  };
                }
              }
            }

            if (choice.finish_reason === "stop" || choice.finish_reason === "tool_calls") {
              yield { type: "done", content: fullContent };
              return;
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (fullContent) {
      yield { type: "done", content: fullContent };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
