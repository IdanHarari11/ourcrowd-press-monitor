import type { CompanyStatus, Sentiment } from "./types";

/**
 * Coverage status is derived from days since last relevant mention.
 * Thresholds live here only — pipeline recency buckets map onto these labels.
 *
 * - Very Recent: last mention within 1 day (inclusive)
 * - Recent: last mention within 7 days (inclusive)
 * - Stale: last mention more than 7 days ago
 * - No Coverage: no relevant mention in the current quarter
 */
export const COVERAGE_THRESHOLDS = {
  veryRecentMaxDays: 1,
  recentMaxDays: 7,
} as const;

export type CoverageStatus = "very_recent" | "recent" | "stale" | "none";
export type Recency = CompanyStatus["recency"];

export const COVERAGE_ORDER = [
  "very_recent",
  "recent",
  "stale",
  "none",
] as const satisfies ReadonlyArray<CoverageStatus>;

export const COVERAGE_SECTION: Record<
  CoverageStatus,
  { title: string; hint: string; shortLabel: string; chipClass: string }
> = {
  very_recent: {
    title: "Very Recent",
    hint: "Mentioned in the last 1 day",
    shortLabel: "Very Recent",
    chipClass: "chip chip-fresh",
  },
  recent: {
    title: "Recent",
    hint: "Last mention within 7 days",
    shortLabel: "Recent",
    chipClass: "chip chip-watch",
  },
  stale: {
    title: "Stale",
    hint: "Last mention more than 7 days ago",
    shortLabel: "Stale",
    chipClass: "chip chip-stale",
  },
  none: {
    title: "No Coverage",
    hint: "Nothing found this quarter",
    shortLabel: "No Coverage",
    chipClass: "chip chip-absent",
  },
};

export const SENTIMENT_CHIP: Record<Sentiment, string> = {
  positive: "chip chip-positive",
  negative: "chip chip-negative",
  neutral: "chip chip-neutral",
};

export const UNCLASSIFIED_CHIP = "chip chip-absent";

export function coverageStatusFromDays(daysSinceLastMention: number | null): CoverageStatus {
  if (daysSinceLastMention === null) return "none";
  if (daysSinceLastMention <= COVERAGE_THRESHOLDS.veryRecentMaxDays) return "very_recent";
  if (daysSinceLastMention <= COVERAGE_THRESHOLDS.recentMaxDays) return "recent";
  return "stale";
}

export function recencyFromCoverage(status: CoverageStatus): Recency {
  switch (status) {
    case "very_recent":
      return "hot";
    case "recent":
      return "warm";
    case "stale":
      return "cold";
    case "none":
      return "none";
  }
}

/** @deprecated Use coverageStatusFromDays. Kept for stored pipeline recency values. */
export const RECENCY_ORDER = ["hot", "warm", "cold", "none"] as const satisfies ReadonlyArray<Recency>;

export const RECENCY_SECTION: Record<
  Recency,
  { title: string; hint: string; shortLabel: string; chipClass: string; rowClass: string }
> = {
  hot: {
    title: COVERAGE_SECTION.very_recent.title,
    hint: COVERAGE_SECTION.very_recent.hint,
    shortLabel: COVERAGE_SECTION.very_recent.shortLabel,
    chipClass: COVERAGE_SECTION.very_recent.chipClass,
    rowClass: "row-fresh",
  },
  warm: {
    title: COVERAGE_SECTION.recent.title,
    hint: COVERAGE_SECTION.recent.hint,
    shortLabel: COVERAGE_SECTION.recent.shortLabel,
    chipClass: COVERAGE_SECTION.recent.chipClass,
    rowClass: "row-watch",
  },
  cold: {
    title: COVERAGE_SECTION.stale.title,
    hint: COVERAGE_SECTION.stale.hint,
    shortLabel: COVERAGE_SECTION.stale.shortLabel,
    chipClass: COVERAGE_SECTION.stale.chipClass,
    rowClass: "row-stale",
  },
  none: {
    title: COVERAGE_SECTION.none.title,
    hint: COVERAGE_SECTION.none.hint,
    shortLabel: COVERAGE_SECTION.none.shortLabel,
    chipClass: COVERAGE_SECTION.none.chipClass,
    rowClass: "row-absent",
  },
};
