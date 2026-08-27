import { coverageStatusFromDays, type CoverageStatus } from "./coverage-ui";
import { relevantMentions } from "./status";
import type { Company, CompanyStatus, Mention, Sentiment } from "./types";

export { getNewCoverage } from "./coverage-diff";

export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveShare: number;
  negativeShare: number;
  neutralShare: number;
}

export interface QuarterStats {
  tracked: number;
  trackedShare: number;
  withCoverage: number;
  withCoverageShare: number;
  totalMentions: number;
  sentiment: SentimentBreakdown;
  newCoverageCount: number;
  companiesAffected: number;
  alertGeneratedAt: string | null;
}

export interface AlertEvent {
  generatedAt: string;
  newMentionCount: number;
  companiesAffected: number;
  summary: string;
  samples: Array<{
    companyName: string;
    title: string;
    url: string;
    sentiment: Sentiment | null;
    publishedAt: string;
  }>;
}

export interface TimelineBucket {
  key: string;
  label: string;
  startIso: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export type TimelineGranularity = "day" | "week";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_MENTIONS_LIMIT = 6;
const ALERT_SAMPLE_LIMIT = 4;

export function getCompanyCoverageStatus(status: Pick<CompanyStatus, "daysSinceLastMention">): CoverageStatus {
  return coverageStatusFromDays(status.daysSinceLastMention);
}

export function getSentimentBreakdown(
  counts: Pick<CompanyStatus, "positiveCount" | "negativeCount" | "neutralCount">[],
): SentimentBreakdown {
  const positive = counts.reduce((sum, item) => sum + item.positiveCount, 0);
  const negative = counts.reduce((sum, item) => sum + item.negativeCount, 0);
  const neutral = counts.reduce((sum, item) => sum + item.neutralCount, 0);
  const total = positive + negative + neutral;
  return {
    positive,
    negative,
    neutral,
    total,
    positiveShare: total === 0 ? 0 : positive / total,
    negativeShare: total === 0 ? 0 : negative / total,
    neutralShare: total === 0 ? 0 : neutral / total,
  };
}

export function getQuarterStats(
  companies: Company[],
  statuses: CompanyStatus[],
  newMentions: Mention[],
  alertGeneratedAt: string | null,
): QuarterStats {
  const tracked = companies.length;
  const withCoverage = statuses.filter((item) => item.mentionCountQuarter > 0).length;
  const totalMentions = statuses.reduce((sum, item) => sum + item.mentionCountQuarter, 0);
  const companiesAffected = new Set(newMentions.map((item) => item.companyId)).size;

  return {
    tracked,
    trackedShare: tracked > 0 ? 1 : 0,
    withCoverage,
    withCoverageShare: tracked > 0 ? withCoverage / tracked : 0,
    totalMentions,
    sentiment: getSentimentBreakdown(statuses),
    newCoverageCount: newMentions.length,
    companiesAffected,
    alertGeneratedAt,
  };
}

export function getRecentMentions(mentions: Mention[], limit = RECENT_MENTIONS_LIMIT): Mention[] {
  return relevantMentions(mentions)
    .filter((mention) => !Number.isNaN(Date.parse(mention.publishedAt)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

/**
 * Alerts are daily-check discovery events, not a restyle of recent mentions.
 * Pass only mentions returned by getNewCoverage / diffNewMentions.
 */
export function getLatestAlerts(newMentions: Mention[], checkedAt: string | null): AlertEvent[] {
  if (!checkedAt && newMentions.length === 0) return [];
  const generatedAt = checkedAt ?? new Date().toISOString();
  const companiesAffected = new Set(newMentions.map((item) => item.companyId)).size;
  const summary =
    newMentions.length === 0
      ? "No new press mentions since the last snapshot."
      : `New press coverage for ${companiesAffected} compan${companiesAffected === 1 ? "y" : "ies"} (${newMentions.length} mention${newMentions.length === 1 ? "" : "s"}).`;
  return [
    {
      generatedAt,
      newMentionCount: newMentions.length,
      companiesAffected,
      summary,
      samples: newMentions.slice(0, ALERT_SAMPLE_LIMIT).map((mention) => ({
        companyName: mention.companyName,
        title: mention.title,
        url: mention.url,
        sentiment: mention.sentiment,
        publishedAt: mention.publishedAt,
      })),
    },
  ];
}

export function getMentionsTimeline(
  mentions: Mention[],
  quarterStart: string,
  quarterEnd: string,
  granularity: TimelineGranularity,
): TimelineBucket[] {
  const start = startOfUtcDay(new Date(quarterStart));
  const end = startOfUtcDay(new Date(quarterEnd));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const stepDays = granularity === "week" ? 7 : 1;
  const buckets = buildEmptyBuckets(start, end, stepDays);
  const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));

  for (const mention of relevantMentions(mentions)) {
    const published = new Date(mention.publishedAt);
    if (Number.isNaN(published.getTime())) continue;
    const day = startOfUtcDay(published);
    if (day < start || day > end) continue;
    const key = bucketKeyFor(day, start, stepDays);
    const slot = index.get(key);
    if (slot === undefined) continue;
    const bucket = buckets[slot];
    if (!bucket) continue;
    const sentiment: Sentiment = mention.sentiment ?? "neutral";
    bucket[sentiment] += 1;
    bucket.total += 1;
  }

  return buckets;
}

function buildEmptyBuckets(start: Date, end: Date, stepDays: number): TimelineBucket[] {
  const buckets: TimelineBucket[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, stepDays)) {
    buckets.push({
      key: utcDayKey(cursor),
      label: formatBucketLabel(cursor, stepDays),
      startIso: cursor.toISOString(),
      positive: 0,
      negative: 0,
      neutral: 0,
      total: 0,
    });
  }
  return buckets;
}

function bucketKeyFor(day: Date, rangeStart: Date, stepDays: number): string {
  if (stepDays === 1) return utcDayKey(day);
  const offsetDays = Math.floor((day.getTime() - rangeStart.getTime()) / MS_PER_DAY);
  const bucketIndex = Math.floor(offsetDays / stepDays);
  return utcDayKey(addUtcDays(rangeStart, bucketIndex * stepDays));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatBucketLabel(date: Date, stepDays: number): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  const day = date.getUTCDate();
  return stepDays === 1 ? `${day}` : `${month} ${day}`;
}
