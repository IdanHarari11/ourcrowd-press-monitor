const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Parse a URL with the WHATWG URL API. Never use Node's url.parse (DEP0169).
 */
export function parseHttpUrl(value: string): URL | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (typeof URL.canParse === "function" && !URL.canParse(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Stable key for article identity: drop hash, query, trailing slash. */
export function normalizeArticleUrl(url: string): string {
  const parsed = parseHttpUrl(url);
  if (!parsed) return url.toLowerCase();
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "").toLowerCase();
}
