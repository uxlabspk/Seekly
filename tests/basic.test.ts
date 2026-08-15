import { describe, it } from "node:test";
import assert from "node:assert";
import { ToolRegistry } from "../src/tools/tool-registry.js";
import { createResearchPlan, generateSearchQueries } from "../src/research/planner.js";
import { formatCitation, formatReferenceList } from "../src/citations/formatter.js";
import type { Source } from "../src/model/types.js";

describe("ToolRegistry", () => {
  it("registers and retrieves tools", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "test_tool",
      description: "A test tool",
      schema: {},
      async execute() { return "ok"; },
    });
    assert.strictEqual(registry.get("test_tool")?.name, "test_tool");
    assert.strictEqual(registry.get("nonexistent"), undefined);
  });

  it("returns schemas for all tools", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "a", description: "A", schema: { type: "object" },
      async execute() { return 1; },
    });
    registry.register({
      name: "b", description: "B", schema: { type: "object" },
      async execute() { return 2; },
    });
    const schemas = registry.schemas();
    assert.strictEqual(schemas.length, 2);
    assert.strictEqual(schemas[0].function.name, "a");
  });

  it("executes tools and captures errors", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "fail",
      description: "Fails",
      schema: {},
      async execute() { throw new Error("boom"); },
    });
    const result = await registry.execute("fail", {});
    assert.ok(result.error?.includes("boom"));
    assert.ok(result.durationMs >= 0);
  });
});

describe("Research Planner", () => {
  it("creates a plan with subquestions", () => {
    const plan = createResearchPlan("What is the impact of AI on productivity?");
    assert.ok(plan.objective.includes("AI"));
    assert.ok(plan.subquestions.length >= 3);
    assert.ok(plan.sourceTypes.includes("WEB_PAGE"));
  });

  it("generates deduplicated search queries", () => {
    const plan = createResearchPlan("What are the effects of intermittent fasting?");
    const queries = generateSearchQueries(plan);
    assert.ok(queries.length >= 5);
    const unique = new Set(queries);
    assert.strictEqual(unique.size, queries.length);
  });
});

describe("Citation Formatter", () => {
  const source: Source = {
    id: "src-1",
    type: "WEB_PAGE",
    title: "Test Article",
    url: "https://example.com/test",
    authors: [{ name: "John Doe" }],
    publishedAt: "2024-01-15",
    retrievedAt: "2024-01-20",
    metadata: {},
  };

  it("formats APA citation", () => {
    const cite = formatCitation(source, 1, "apa");
    assert.ok(cite.includes("Doe"));
    assert.ok(cite.includes("2024"));
    assert.ok(cite.includes("Test Article"));
  });

  it("formats IEEE citation", () => {
    const cite = formatCitation(source, 1, "ieee");
    assert.ok(cite.includes("[1]"));
    assert.ok(cite.includes("Test Article"));
  });

  it("formats reference list", () => {
    const list = formatReferenceList([source], "apa");
    assert.ok(list.includes("Doe"));
    assert.ok(list.includes("Test Article"));
  });
});
