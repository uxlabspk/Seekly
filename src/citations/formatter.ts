import type { Source } from "../model/types.js";

export type CitationStyle = "apa" | "mla" | "chicago" | "ieee" | "harvard" | "vancouver";

export function formatCitation(source: Source, index: number, style: CitationStyle): string {
  const authors = source.authors?.map((a) => a.name).join(", ") ?? "Unknown";
  const year = source.publishedAt?.slice(0, 4) ?? "n.d.";
  const title = source.title;
  const url = source.url ?? "";

  switch (style) {
    case "apa":
      return `${authors} (${year}). ${title}. ${url ? retrieveUrl(url) : ""}`.trim();
    case "ieee":
      return `[${index}] ${authors}, "${title}," ${year}. ${url ? `[Online]. Available: ${url}` : ""}`.trim();
    case "mla":
      return `${authors}. "${title}." ${year}. ${url ? retrieveUrl(url) : ""}`.trim();
    default:
      return `${authors} (${year}). ${title}. ${url}`.trim();
  }
}

function retrieveUrl(url: string): string {
  return `Available: ${url}`;
}

export function formatReferenceList(sources: Source[], style: CitationStyle): string {
  return sources
    .map((s, i) => formatCitation(s, i + 1, style))
    .join("\n\n");
}

export function generateInlineCitations(sources: Source[], style: CitationStyle): string {
  if (style === "ieee") {
    return sources.map((_, i) => `[${i + 1}]`).join(", ");
  }
  return sources
    .map((s) => {
      const author = s.authors?.[0]?.name?.split(" ").pop() ?? "Unknown";
      const year = s.publishedAt?.slice(0, 4) ?? "n.d.";
      return `(${author}, ${year})`;
    })
    .join("; ");
}
