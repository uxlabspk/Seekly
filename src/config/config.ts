import { z } from "zod";
import * as path from "node:path";
import * as fs from "node:fs";

const configSchema = z.object({
  modelUrl: z.string().url().default("http://127.0.0.1:8080"),
  modelName: z.string().default("local-model"),
  databasePath: z.string().default(""),
  searchProvider: z.enum(["tavily", "serpapi", "duckduckgo"]).default("duckduckgo"),
  searchApiKey: z.string().optional(),
  offline: z.boolean().default(false),
  citationStyle: z.enum(["apa", "mla", "chicago", "ieee", "harvard", "vancouver"]).default("apa"),
});

export type Config = z.infer<typeof configSchema>;

const SEEKLY_DIR = path.join(process.env.HOME ?? "~", ".seekly");

function ensureDir() {
  fs.mkdirSync(SEEKLY_DIR, { recursive: true });
}

export function getConfig(): Config {
  ensureDir();
  const env = process.env;
  return configSchema.parse({
    modelUrl: env.SEEKLY_MODEL_URL,
    modelName: env.SEEKLY_MODEL_NAME,
    databasePath: env.SEEKLY_DATABASE_PATH || path.join(SEEKLY_DIR, "seekly.db"),
    searchProvider: env.SEARCH_PROVIDER,
    searchApiKey: env.SEARCH_API_KEY,
    offline: env.SEEKLY_OFFLINE === "true",
    citationStyle: env.SEEKLY_CITATION_STYLE,
  });
}

export function getDbPath(): string {
  const config = getConfig();
  ensureDir();
  return config.databasePath;
}
