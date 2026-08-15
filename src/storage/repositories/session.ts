import { getDb } from "../database.js";
import type { AgentEvent } from "../../agent/state.js";
import type { ResearchPlan, Source, Evidence, Claim } from "../../model/types.js";

export function createSession(sessionId: string, question: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (session_id, question, status, created_at, updated_at) VALUES (?, ?, 'IDLE', ?, ?)`
  ).run(sessionId, question, now, now);
}

export function updateSessionStatus(sessionId: string, status: string): void {
  const db = getDb();
  db.prepare(`UPDATE sessions SET status = ?, updated_at = ? WHERE session_id = ?`)
    .run(status, new Date().toISOString(), sessionId);
}

export function updateSessionPlan(sessionId: string, plan: ResearchPlan): void {
  const db = getDb();
  db.prepare(`UPDATE sessions SET plan_json = ?, updated_at = ? WHERE session_id = ?`)
    .run(JSON.stringify(plan), new Date().toISOString(), sessionId);
}

export function updateSessionDraft(sessionId: string, draft: string): void {
  const db = getDb();
  db.prepare(`UPDATE sessions SET draft = ?, updated_at = ? WHERE session_id = ?`)
    .run(draft, new Date().toISOString(), sessionId);
}

export function insertSource(sessionId: string, source: Source): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO sources (id, session_id, type, title, url, authors_json, publisher, published_at, retrieved_at, content, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    source.id, sessionId, source.type, source.title, source.url ?? null,
    JSON.stringify(source.authors ?? []), source.publisher ?? null,
    source.publishedAt ?? null, source.retrievedAt, source.content ?? null,
    JSON.stringify(source.metadata)
  );
}

export function insertEvidence(sessionId: string, ev: Evidence): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO evidence (id, session_id, source_id, text, locator_json, relevance, supports_json, contradicts_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ev.id, sessionId, ev.sourceId, ev.text,
    JSON.stringify(ev.locator ?? null), ev.relevance,
    JSON.stringify(ev.supports), JSON.stringify(ev.contradicts)
  );
}

export function insertClaim(sessionId: string, claim: Claim): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO claims (id, session_id, text, status, evidence_ids_json)
     VALUES (?, ?, ?, ?, ?)`
  ).run(claim.id, sessionId, claim.text, claim.status, JSON.stringify(claim.evidenceIds));
}

export function insertEvent(sessionId: string, event: AgentEvent): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO events (session_id, type, timestamp, data_json) VALUES (?, ?, ?, ?)`
  ).run(sessionId, event.type, event.timestamp, JSON.stringify(event.data));
}

export function getSources(sessionId: string): Source[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM sources WHERE session_id = ?`).all(sessionId) as any[];
  return rows.map(rowToSource);
}

export function getEvidence(sessionId: string): Evidence[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM evidence WHERE session_id = ?`).all(sessionId) as any[];
  return rows.map(rowToEvidence);
}

export function getClaims(sessionId: string): Claim[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM claims WHERE session_id = ?`).all(sessionId) as any[];
  return rows.map(rowToClaim);
}

export function getEvents(sessionId: string): AgentEvent[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM events WHERE session_id = ? ORDER BY id`).all(sessionId) as any[];
  return rows.map((r) => ({
    type: r.type,
    timestamp: r.timestamp,
    data: JSON.parse(r.data_json ?? "{}"),
  }));
}

export function getAllSessions(): Array<{ sessionId: string; question: string; status: string; createdAt: string }> {
  const db = getDb();
  return db.prepare(`SELECT session_id as sessionId, question, status, created_at as createdAt FROM sessions ORDER BY created_at DESC`).all() as any[];
}

function rowToSource(row: any): Source {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url ?? undefined,
    authors: JSON.parse(row.authors_json ?? "[]"),
    publisher: row.publisher ?? undefined,
    publishedAt: row.published_at ?? undefined,
    retrievedAt: row.retrieved_at,
    content: row.content ?? undefined,
    metadata: JSON.parse(row.metadata_json ?? "{}"),
  };
}

function rowToEvidence(row: any): Evidence {
  return {
    id: row.id,
    sourceId: row.source_id,
    text: row.text,
    locator: JSON.parse(row.locator_json ?? "null") ?? undefined,
    relevance: row.relevance,
    supports: JSON.parse(row.supports_json ?? "[]"),
    contradicts: JSON.parse(row.contradicts_json ?? "[]"),
  };
}

function rowToClaim(row: any): Claim {
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    evidenceIds: JSON.parse(row.evidence_ids_json ?? "[]"),
  };
}
