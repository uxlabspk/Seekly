import type { Tool } from "./registry.js";

interface RetrieveUrlInput {
  url: string;
  maxLength?: number;
}

interface RetrieveUrlResult {
  url: string;
  title: string;
  content: string;
  contentType: string;
  length: number;
}

export const retrieveUrlTool: Tool<RetrieveUrlInput, RetrieveUrlResult> = {
  name: "retrieve_url",
  description: "Fetch and extract text content from a URL",
  schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to retrieve" },
      maxLength: { type: "number", description: "Max content length in chars (default 8000)" },
    },
    required: ["url"],
  },

  async execute(input): Promise<RetrieveUrlResult> {
    const maxLength = input.maxLength ?? 8000;

    // SSRF protection: block private/internal IPs
    const parsed = new URL(input.url);
    if (isPrivateHost(parsed.hostname)) {
      throw new Error("Cannot retrieve private/internal URLs");
    }

    const res = await fetch(input.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Seekly/0.1.0; research agent)",
        Accept: "text/html,text/plain,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const contentType = res.headers.get("content-type") ?? "text/plain";
    const raw = await res.text();
    const content = extractText(raw, contentType).slice(0, maxLength);
    const title = extractTitle(raw, contentType);

    return {
      url: input.url,
      title,
      content,
      contentType,
      length: content.length,
    };
  },
};

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (h.startsWith("192.168.") || h.startsWith("10.") || h.startsWith("172.")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  return false;
}

function extractText(html: string, contentType: string): string {
  if (contentType.includes("text/plain")) return html;
  // Simple HTML to text: strip tags, decode entities, collapse whitespace
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string, contentType: string): string {
  if (contentType.includes("text/plain")) return "";
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}
