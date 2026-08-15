import type { Tool } from "./registry.js";
import type { SearchResult } from "../model/types.js";

interface SearchWebInput {
  query: string;
  numResults?: number;
}

export const searchWebTool: Tool<SearchWebInput, SearchResult[]> = {
  name: "search_web",
  description: "Search the web for information on a topic",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      numResults: { type: "number", description: "Number of results (default 5)" },
    },
    required: ["query"],
  },

  async execute(input): Promise<SearchResult[]> {
    const numResults = input.numResults ?? 5;
    const results = await searchDuckDuckGo(input.query, numResults);
    return results;
  },
};

// ponytail: DuckDuckGo lite scraping is fragile. Add Tavily/SerpAPI provider when available.
async function searchDuckDuckGo(query: string, numResults: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Seekly/0.1.0; research agent)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const html = await res.text();
  return parseDuckDuckGoHtml(html, numResults);
}

function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links: string[] = [];
  const titles: string[] = [];
  const snippets: string[] = [];

  let match;
  while ((match = resultRegex.exec(html)) !== null && links.length < maxResults) {
    links.push(match[1]);
    titles.push(match[2].replace(/<[^>]*>/g, "").trim());
  }
  while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
    snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
  }

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    const rawUrl = links[i];
    // DuckDuckGo wraps URLs in redirects; extract the actual URL
    const urlMatch = rawUrl.match(/uddg=([^&]+)/);
    const cleanUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;

    results.push({
      title: titles[i] ?? "",
      url: cleanUrl,
      snippet: snippets[i] ?? "",
      source: "duckduckgo",
      metadata: {},
    });
  }

  return results;
}
