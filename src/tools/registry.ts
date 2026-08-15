export interface Tool<TInput, TResult> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  execute(input: TInput): Promise<TResult>;
}

export interface ToolResult {
  toolName: string;
  result: unknown;
  error?: string;
  durationMs: number;
}
