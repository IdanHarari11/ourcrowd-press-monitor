import { coverageStatusFromDays, recencyFromCoverage } from "./coverage-ui";
import { isRelevantMention } from "./relevance";
import type { CompanyStatus, Mention, Sentiment } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / MS_PER_DAY);
}

export function formatStatusLabel(daysSinceLastMention: number | null): string {
  if (daysSinceLastMention === null) return "No coverage found";
  if (daysSinceLastMention === 0) return "Last mentioned today";
  if (daysSinceLastMention === 1) return "Last mentioned 1 day ago";
  return `Last mentioned ${daysSinceLastMention} days ago`;
}

export function recencyBucket(daysSinceLastMention: number | null): CompanyStatus["recency"] {
  return recencyFromCoverage(coverageStatusFromDays(daysSinceLastMention));
}

export function relevantMentions(mentions: Mention[]): Mention[] {
  return mentions.filter((mention) => isRelevantMention(mention));
}

export function computeCompanyStatus(
  companyId: string,
  companyName: string,
  mentions: Mention[],
  now = new Date(),
): CompanyStatus {
  const usable = relevantMentions(mentions).filter((mention) => mention.companyId === companyId);
  const dated = usable
    .filter((mention) => !Number.isNaN(Date.parse(mention.publishedAt)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const latest = dated[0] ?? null;
  const daysSinceLastMention = latest ? daysBetween(new Date(latest.publishedAt), now) : null;

  const countBySentiment = (sentiment: Sentiment) =>
    usable.filter((mention) => mention.sentiment === sentiment).length;

  return {
    companyId,
    companyName,
    lastMentionedAt: latest?.publishedAt ?? null,
    lastMentionTitle: latest?.title ?? null,
    lastMentionUrl: latest?.url ?? null,
    daysSinceLastMention,
    statusLabel: formatStatusLabel(daysSinceLastMention),
    recency: recencyBucket(daysSinceLastMention),
    mentionCountQuarter: usable.length,
    positiveCount: countBySentiment("positive"),
    negativeCount: countBySentiment("negative"),
    neutralCount: countBySentiment("neutral"),
  };
}

export function computeAllStatuses(
  companies: Array<{ id: string; name: string }>,
  mentions: Mention[],
  now = new Date(),
): CompanyStatus[] {
  return companies.map((company) => computeCompanyStatus(company.id, company.name, mentions, now));
}
