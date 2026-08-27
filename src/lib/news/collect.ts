import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { buildSearchQuery } from "../companies";
import { config } from "../config";
import { getQuarterWindow } from "../paths";
import { mentionId } from "../storage";
import { assessLexicalRelevance } from "../relevance";
import type { Company, Mention } from "../types";
import { normalizeArticleUrl, parseHttpUrl } from "./url";

const USER_AGENT = "OurCrowdPressMonitor/1.0 (portfolio news monitoring take-home)";

const rssParser = new Parser({
  timeout: config.newsFetchTimeoutMs,
  headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
});

interface CollectedItem {
  title: string;
  url: string;
  publishedAt: Date;
  sourceName: string;
  snippet: string;
}

export async function collectCompanyMentions(
  company: Company,
  now = new Date(),
): Promise<{ mentions: Mention[]; error?: string }> {
  const { start } = getQuarterWindow(now);
  const query = buildSearchQuery(company);

  try {
    const [googleItems, gdeltItems] = await Promise.all([
      fetchGoogleNews(query),
      fetchGdelt(query, company.name),
    ]);

    const merged = dedupeItems([...googleItems, ...gdeltItems])
      .filter((item) => item.publishedAt >= start && item.publishedAt <= now)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, config.maxArticlesPerCompany);

    const collectedAt = now.toISOString();
    const mentions = merged.map((item) => toMention(company, item, collectedAt));
    return { mentions };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { mentions: [], error: message };
  }
}

function toMention(company: Company, item: CollectedItem, collectedAt: string): Mention {
  const lexical = assessLexicalRelevance(company, item.title, item.snippet, item.url);
  if (!lexical.ok) {
    return {
      id: mentionId(company.id, item.url, item.title),
      companyId: company.id,
      companyName: company.name,
      title: item.title,
      sourceName: item.sourceName,
      url: item.url,
      publishedAt: item.publishedAt.toISOString(),
      snippet: item.snippet,
      collectedAt,
      relevant: false,
      sentiment: "neutral",
      rationale: lexical.reason,
      classifiedAt: collectedAt,
      model: "lexical-gate",
    };
  }

  return {
    id: mentionId(company.id, item.url, item.title),
    companyId: company.id,
    companyName: company.name,
    title: item.title,
    sourceName: item.sourceName,
    url: item.url,
    publishedAt: item.publishedAt.toISOString(),
    snippet: item.snippet,
    collectedAt,
    relevant: null,
    sentiment: null,
    rationale: null,
    classifiedAt: null,
    model: null,
  };
}

/**
 * Fetch RSS over HTTP ourselves. rss-parser.parseURL() still calls Node's
 * deprecated url.parse() (DEP0169), which Vercel log drains label as [error].
 */
async function parseRssFeed(feedUrl: string) {
  const parsedUrl = parseHttpUrl(feedUrl);
  if (!parsedUrl) return { items: [] as [] };

  const response = await fetch(parsedUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(config.newsFetchTimeoutMs),
    redirect: "follow",
  });
  if (!response.ok) return { items: [] as [] };
  const xml = await response.text();
  if (!xml.trim()) return { items: [] as [] };
  return rssParser.parseString(xml);
}

async function fetchGoogleNews(query: string): Promise<CollectedItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:90d`)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const feed = await parseRssFeed(url);

    return (feed.items ?? [])
      .map((item) => {
        const title = cleanTitle(item.title ?? "");
        const publishedAt = item.pubDate ? new Date(item.pubDate) : null;
        if (!title || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;
        const sourceName =
          (typeof item.source === "object" && item.source && "title" in item.source
            ? String((item.source as { title?: string }).title ?? "")
            : "") || extractSourceFromTitle(item.title ?? "") || feed.title || "Google News";

        return {
          title,
          url: item.link || canonicalFallbackUrl(title),
          publishedAt,
          sourceName,
          snippet: (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim().slice(0, 400),
        } satisfies CollectedItem;
      })
      .filter((item): item is CollectedItem => item !== null);
  } catch {
    return [];
  }
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  sourcecountry?: string;
}

async function fetchGdelt(query: string, companyName: string): Promise<CollectedItem[]> {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=20&timespan=3m&sort=datedesc&format=json`;

  try {
    const parsedUrl = parseHttpUrl(url);
    if (!parsedUrl) return [];
    const response = await fetch(parsedUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(config.newsFetchTimeoutMs),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { articles?: GdeltArticle[] };
    return (payload.articles ?? [])
      .map((article) => {
        const title = cleanTitle(article.title ?? "");
        const publishedAt = parseGdeltDate(article.seendate);
        if (!title || !publishedAt || !article.url) return null;
        if (!title.toLowerCase().includes(firstToken(companyName).toLowerCase()) && !article.url.toLowerCase().includes(firstToken(companyName).toLowerCase())) {
          // Keep the item; the local LLM decides relevance. Do not drop here.
        }
        return {
          title,
          url: article.url,
          publishedAt,
          sourceName: article.domain || "GDELT",
          snippet: "",
        } satisfies CollectedItem;
      })
      .filter((item): item is CollectedItem => item !== null);
  } catch {
    return [];
  }
}

function parseGdeltDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
}

function cleanTitle(title: string): string {
  return title.replace(/\s+-\s+[^-]+$/, "").replace(/\s+/g, " ").trim();
}

function extractSourceFromTitle(title: string): string {
  const match = title.match(/\s+-\s+([^-]+)$/);
  return match?.[1]?.trim() ?? "";
}

function canonicalFallbackUrl(title: string): string {
  const slug = createHash("sha256").update(title).digest("hex").slice(0, 12);
  return `https://news.google.com/search?q=${encodeURIComponent(title)}#${slug}`;
}

function firstToken(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

function dedupeItems(items: CollectedItem[]): CollectedItem[] {
  const seen = new Set<string>();
  const result: CollectedItem[] = [];
  for (const item of items) {
    const key = `${normalizeArticleUrl(item.url)}|${item.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  shouldStop?: () => boolean,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      if (shouldStop?.()) return;
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}
