export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ModelEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; id: string; name: string; arguments: Record<string, unknown> }
  | { type: "content"; content: string }
  | { type: "done"; content: string }
  | { type: "error"; error: string };

export interface ModelProvider {
  stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
