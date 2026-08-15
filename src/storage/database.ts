import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import { getConfig } from "../config/config.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const config = getConfig();
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IDLE',
      plan_json TEXT,
      draft TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      authors_json TEXT,
      publisher TEXT,
      published_at TEXT,
      retrieved_at TEXT NOT NULL,
      content TEXT,
      metadata_json TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      text TEXT NOT NULL,
      locator_json TEXT,
      relevance REAL NOT NULL DEFAULT 0,
      supports_json TEXT DEFAULT '[]',
      contradicts_json TEXT DEFAULT '[]',
      FOREIGN KEY (session_id) REFERENCES sessions(session_id),
      FOREIGN KEY (source_id) REFERENCES sources(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNVERIFIED',
      evidence_ids_json TEXT DEFAULT '[]',
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      data_json TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
