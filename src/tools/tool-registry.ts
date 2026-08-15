import type { Tool, ToolResult } from "./registry.js";

export class ToolRegistry {
  private tools = new Map<string, Tool<unknown, unknown>>();

  register<TInput, TResult>(tool: Tool<TInput, TResult>): void {
    this.tools.set(tool.name, tool as Tool<unknown, unknown>);
  }

  get(name: string): Tool<unknown, unknown> | undefined {
    return this.tools.get(name);
  }

  schemas() {
    return Array.from(this.tools.values()).map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.schema,
      },
    }));
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { toolName: name, result: null, error: `Unknown tool: ${name}`, durationMs: 0 };
    const start = Date.now();
    try {
      const result = await tool.execute(input as never);
      return { toolName: name, result, durationMs: Date.now() - start };
    } catch (err) {
      return { toolName: name, result: null, error: String(err), durationMs: Date.now() - start };
    }
  }
}
