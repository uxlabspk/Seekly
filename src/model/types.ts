export type SourceType =
  | "WEB_PAGE"
  | "RESEARCH_PAPER"
  | "REPORT"
  | "NEWS"
  | "DOCUMENTATION"
  | "GOVERNMENT"
  | "REPOSITORY"
  | "DATASET"
  | "USER_DOCUMENT";

export interface Author {
  name: string;
  affiliation?: string;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  url?: string;
  authors?: Author[];
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  content?: string;
  metadata: Record<string, unknown>;
}

export interface EvidenceLocator {
  sourceId: string;
  page?: number;
  section?: string;
  paragraph?: string;
  quote?: string;
}

export interface Evidence {
  id: string;
  sourceId: string;
  text: string;
  locator?: EvidenceLocator;
  relevance: number;
  supports: string[];
  contradicts: string[];
}

export type ClaimStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "CONTRADICTED"
  | "INFERRED"
  | "UNCERTAIN"
  | "UNVERIFIED";

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  evidenceIds: string[];
}

export interface ResearchPlan {
  objective: string;
  subquestions: string[];
  sourceTypes: SourceType[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  metadata: Record<string, unknown>;
}

export interface AcademicPaper {
  id: string;
  title: string;
  authors: Author[];
  abstract: string;
  url: string;
  doi?: string;
  publishedDate?: string;
  source: string;
}

export interface ResearchBudget {
  maxSearches: number;
  maxSources: number;
  maxDocuments: number;
  maxRuntimeMs: number;
}

export const BUDGETS: Record<string, ResearchBudget> = {
  quick: { maxSearches: 5, maxSources: 10, maxDocuments: 5, maxRuntimeMs: 120_000 },
  standard: { maxSearches: 12, maxSources: 30, maxDocuments: 15, maxRuntimeMs: 300_000 },
  deep: { maxSearches: 30, maxSources: 100, maxDocuments: 50, maxRuntimeMs: 600_000 },
};
