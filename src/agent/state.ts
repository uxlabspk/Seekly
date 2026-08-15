export type AgentState =
  | "IDLE"
  | "UNDERSTANDING"
  | "PLANNING"
  | "SEARCHING"
  | "RETRIEVING"
  | "EXTRACTING"
  | "ANALYZING"
  | "VERIFYING"
  | "SYNTHESIZING"
  | "CITATION_AUDIT"
  | "FINAL_REVIEW"
  | "COMPLETED"
  | "RETRYING"
  | "PARTIAL"
  | "CANCELLED"
  | "FAILED";

export interface AgentEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SessionData {
  sessionId: string;
  question: string;
  status: AgentState;
  plan: import("../model/types.js").ResearchPlan | null;
  sources: import("../model/types.js").Source[];
  evidence: import("../model/types.js").Evidence[];
  claims: import("../model/types.js").Claim[];
  draft: string;
  events: AgentEvent[];
  createdAt: string;
  updatedAt: string;
}
