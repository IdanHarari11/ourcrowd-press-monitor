import { test } from "node:test";
import assert from "node:assert/strict";
import { companyInitials, formatCompactAge, formatQuarterRange, formatRelativeFromIso } from "./format";
import { filterDeskRows, paginateRows, type DeskRow } from "./desk-query";
import { getLatestAlerts, getMentionsTimeline, getQuarterStats, getRecentMentions, getSentimentBreakdown } from "./desk-stats";
import { coverageStatusFromDays } from "./coverage-ui";
import type { Company, CompanyStatus, Mention } from "./types";

function company(id: string, name: string, aliases: string[] = []): Company {
  return { id, name, searchName: name, aliases, isAmbiguous: false };
}

function status(partial: Partial<CompanyStatus> & Pick<CompanyStatus, "companyId" | "companyName">): CompanyStatus {
  return {
    lastMentionedAt: null,
    lastMentionTitle: null,
    lastMentionUrl: null,
    daysSinceLastMention: null,
    statusLabel: "No coverage found",
    recency: "none",
    mentionCountQuarter: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    ...partial,
  };
}

function mention(partial: Partial<Mention> & Pick<Mention, "id" | "companyId">): Mention {
  return {
    companyName: "Hailo",
    title: "Hailo ships chip",
    sourceName: "Reuters",
    url: "https://example.com/a",
    publishedAt: "2026-08-26T12:00:00.000Z",
    snippet: "",
    collectedAt: "2026-08-27T00:00:00.000Z",
    relevant: true,
    sentiment: "positive",
    rationale: "product",
    classifiedAt: "2026-08-27T00:00:00.000Z",
    model: "llama3.2:3b",
    ...partial,
  };
}

const hailo = company("hailo", "Hailo", ["Hailo Technologies"]);
const peak = company("peak", "Peak");
const morph = company("morphisec", "Morphisec");

const statuses = new Map<string, CompanyStatus>([
  [
    "hailo",
    status({
      companyId: "hailo",
      companyName: "Hailo",
      recency: "cold",
      mentionCountQuarter: 2,
      daysSinceLastMention: 12,
      lastMentionedAt: "2026-08-15T00:00:00.000Z",
    }),
  ],
  ["peak", status({ companyId: "peak", companyName: "Peak" })],
  [
    "morphisec",
    status({
      companyId: "morphisec",
      companyName: "Morphisec",
      recency: "hot",
      mentionCountQuarter: 5,
      positiveCount: 5,
      daysSinceLastMention: 0,
      lastMentionedAt: "2026-08-27T10:00:00.000Z",
    }),
  ],
]);

test("coverageStatusFromDays uses documented thresholds", () => {
  assert.equal(coverageStatusFromDays(null), "none");
  assert.equal(coverageStatusFromDays(0), "very_recent");
  assert.equal(coverageStatusFromDays(1), "very_recent");
  assert.equal(coverageStatusFromDays(2), "recent");
  assert.equal(coverageStatusFromDays(7), "recent");
  assert.equal(coverageStatusFromDays(8), "stale");
});

test("filterDeskRows matches aliases and coverage status", () => {
  const byAlias = filterDeskRows([hailo, peak, morph], statuses, "technologies", "all", "name");
  assert.equal(byAlias.length, 1);
  assert.equal(byAlias[0]?.company.id, "hailo");

  const uncovered = filterDeskRows([hailo, peak, morph], statuses, "", "none", "name");
  assert.deepEqual(
    uncovered.map((row) => row.company.id),
    ["peak"],
  );

  const veryRecent = filterDeskRows([hailo, peak, morph], statuses, "", "very_recent", "name");
  assert.deepEqual(
    veryRecent.map((row) => row.company.id),
    ["morphisec"],
  );
});

test("paginateRows does not dump the full list", () => {
  const rows: DeskRow[] = Array.from({ length: 45 }, (_, index) => ({
    company: company(`c${index}`, `Company ${index}`),
    status: status({ companyId: `c${index}`, companyName: `Company ${index}` }),
  }));
  const page1 = paginateRows(rows, 1);
  assert.equal(page1.slice.length, 20);
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.start, 1);
  assert.equal(page1.end, 20);
});

test("formatCompactAge stays short enough for a table cell", () => {
  assert.equal(formatCompactAge(null), "No coverage");
  assert.equal(formatCompactAge(0), "Today");
  assert.equal(formatCompactAge(1), "1 day ago");
  assert.equal(formatCompactAge(37), "37 days ago");
});

test("formatRelativeFromIso uses hours when the mention is fresh", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");
  assert.equal(formatRelativeFromIso("2026-08-27T10:00:00.000Z", now), "2 hours ago");
  assert.equal(formatRelativeFromIso(null, now), "No coverage");
});

test("formatQuarterRange matches the desk stamp", () => {
  assert.equal(formatQuarterRange("2026-05-29T08:53:55.461Z", "2026-08-27T08:53:55.461Z"), "May 29 – Aug 27, 2026");
});

test("getQuarterStats and sentiment breakdown come from real counts", () => {
  const stats = getQuarterStats([hailo, peak, morph], [...statuses.values()], [], null);
  assert.equal(stats.tracked, 3);
  assert.equal(stats.trackedShare, 1);
  assert.equal(stats.withCoverage, 2);
  assert.equal(stats.totalMentions, 7);
  assert.equal(stats.sentiment.positive, 5);
  assert.equal(stats.newCoverageCount, 0);
});

test("getSentimentBreakdown exposes shares for the KPI", () => {
  const mix = getSentimentBreakdown([{ positiveCount: 2, negativeCount: 1, neutralCount: 1 }]);
  assert.equal(mix.total, 4);
  assert.equal(mix.positiveShare, 0.5);
});

test("getRecentMentions skips irrelevant items and sorts newest first", () => {
  const recent = getRecentMentions([
    mention({ id: "old", companyId: "hailo", publishedAt: "2026-08-01T00:00:00.000Z" }),
    mention({ id: "noise", companyId: "hailo", relevant: false, publishedAt: "2026-08-27T00:00:00.000Z" }),
    mention({ id: "new", companyId: "morphisec", publishedAt: "2026-08-26T00:00:00.000Z" }),
  ]);
  assert.deepEqual(
    recent.map((item) => item.id),
    ["new", "old"],
  );
});

test("getLatestAlerts is a daily-check event, not a mention list", () => {
  const fresh = mention({ id: "new", companyId: "hailo" });
  const events = getLatestAlerts([fresh], "2026-08-27T08:54:14.619Z");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.newMentionCount, 1);
  assert.equal(events[0]?.samples.length, 1);
  const quiet = getLatestAlerts([], "2026-08-27T08:54:14.619Z");
  assert.equal(quiet[0]?.newMentionCount, 0);
  assert.deepEqual(getLatestAlerts([], null), []);
});

test("getMentionsTimeline stacks sentiment by week without inventing data", () => {
  const buckets = getMentionsTimeline(
    [
      mention({ id: "a", companyId: "hailo", publishedAt: "2026-08-26T00:00:00.000Z", sentiment: "positive" }),
      mention({ id: "b", companyId: "hailo", publishedAt: "2026-08-26T04:00:00.000Z", sentiment: "negative" }),
    ],
    "2026-08-20T00:00:00.000Z",
    "2026-08-27T00:00:00.000Z",
    "week",
  );
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0]?.positive, 1);
  assert.equal(buckets[0]?.negative, 1);
  assert.equal(buckets[0]?.total, 2);
  assert.equal(buckets[1]?.total, 0);
});

test("companyInitials never requires a logo", () => {
  assert.equal(companyInitials("Together AI"), "TA");
  assert.equal(companyInitials("Stripe"), "ST");
});
