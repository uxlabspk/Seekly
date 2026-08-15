import type { ResearchPlan, SourceType } from "../model/types.js";

export function createResearchPlan(question: string): ResearchPlan {
  // ponytail: simple heuristic planner - replace with LLM-generated plans later
  const words = question.toLowerCase().split(/\s+/);
  const isAcademic = words.some(w =>
    ["study", "research", "evidence", "empirical", "meta-analysis", "review", "clinical"].includes(w)
  );

  const subquestions: string[] = [];
  const sourceTypes: SourceType[] = ["WEB_PAGE"];

  // Generate subquestions from the main question
  subquestions.push(`What is the current state of knowledge about: ${question}`);
  subquestions.push(`What are the key findings regarding: ${question}`);
  subquestions.push(`What are the limitations or gaps in understanding: ${question}`);
  subquestions.push(`What are alternative perspectives on: ${question}`);
  subquestions.push(`What recent developments exist regarding: ${question}`);

  if (isAcademic) {
    sourceTypes.push("RESEARCH_PAPER");
    subquestions.push(`What empirical evidence exists for: ${question}`);
    subquestions.push(`What methodological approaches have been used to study: ${question}`);
  }

  return { objective: question, subquestions, sourceTypes };
}

export function generateSearchQueries(plan: ResearchPlan): string[] {
  const queries: string[] = [];
  const base = plan.objective;

  // Direct searches
  queries.push(base);

  // Subquestion-based searches
  for (const sq of plan.subquestions.slice(0, 4)) {
    queries.push(sq);
  }

  // Evidence-seeking searches
  queries.push(`${base} evidence`);
  queries.push(`${base} study`);
  queries.push(`${base} limitations`);
  queries.push(`${base} review`);

  // Deduplicate
  return [...new Set(queries)];
}
