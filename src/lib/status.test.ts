import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCompanyStatus, formatStatusLabel } from "./status";
import type { Mention } from "./types";

function mention(overrides: Partial<Mention>): Mention {
  return {
    id: "1",
    companyId: "stripe",
    companyName: "Stripe",
    title: "Stripe raises funding",
    sourceName: "TechCrunch",
    url: "https://example.com/stripe",
    publishedAt: "2026-08-24T00:00:00.000Z",
    snippet: "",
    collectedAt: "2026-08-27T00:00:00.000Z",
    relevant: true,
    sentiment: "positive",
    rationale: "funding",
    classifiedAt: "2026-08-27T00:00:00.000Z",
    model: "llama3.2:3b",
    ...overrides,
  };
}

test("formatStatusLabel covers the required examples", () => {
  assert.equal(formatStatusLabel(null), "No coverage found");
  assert.equal(formatStatusLabel(0), "Last mentioned today");
  assert.equal(formatStatusLabel(3), "Last mentioned 3 days ago");
  assert.equal(formatStatusLabel(45), "Last mentioned 45 days ago");
});

test("computeCompanyStatus ignores irrelevant mentions", () => {
  const now = new Date("2026-08-27T00:00:00.000Z");
  const status = computeCompanyStatus("stripe", "Stripe", [
    mention({ relevant: false, publishedAt: "2026-08-26T00:00:00.000Z" }),
    mention({
      id: "2",
      relevant: true,
      publishedAt: "2026-08-20T00:00:00.000Z",
      title: "Stripe launches new API",
    }),
  ], now);

  assert.equal(status.daysSinceLastMention, 7);
  assert.equal(status.statusLabel, "Last mentioned 7 days ago");
  assert.equal(status.recency, "warm");
  assert.equal(status.mentionCountQuarter, 1);
  assert.equal(status.lastMentionTitle, "Stripe launches new API");
});

test("companies with no relevant coverage are marked none", () => {
  const status = computeCompanyStatus("peak", "Peak", []);
  assert.equal(status.recency, "none");
  assert.equal(status.statusLabel, "No coverage found");
});
