import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAlert, diffNewMentions, getNewCoverage } from "./alerts";
import type { Mention } from "./types";

const mention: Mention = {
  id: "abc",
  companyId: "hailo",
  companyName: "Hailo",
  title: "Hailo ships new chip",
  sourceName: "Reuters",
  url: "https://example.com/hailo",
  publishedAt: "2026-08-26T00:00:00.000Z",
  snippet: "",
  collectedAt: "2026-08-27T00:00:00.000Z",
  relevant: true,
  sentiment: "positive",
  rationale: "product launch",
  classifiedAt: "2026-08-27T00:00:00.000Z",
  model: "llama3.2:3b",
};

test("diffNewMentions ignores unclassified and irrelevant items", () => {
  const next = diffNewMentions(
    [
      mention,
      { ...mention, id: "old", relevant: true },
      { ...mention, id: "noise", relevant: false },
      { ...mention, id: "pending", relevant: null },
    ],
    new Set(["old"]),
  );
  assert.deepEqual(next.map((item) => item.id), ["abc"]);
});

test("buildAlert summarizes by company", () => {
  const alert = buildAlert([mention, { ...mention, id: "def", sentiment: "neutral" }]);
  assert.equal(alert.newMentionCount, 2);
  assert.equal(alert.companiesAffected, 1);
  assert.match(alert.summary, /Hailo: 2 new mentions/);
});

test("getNewCoverage is discovery against the snapshot, not publish recency", () => {
  const publishedToday = { ...mention, id: "seen", publishedAt: new Date().toISOString(), relevant: true as const };
  const discovered = { ...mention, id: "fresh", relevant: true as const };
  const found = getNewCoverage([publishedToday, discovered], ["seen"]);
  assert.deepEqual(
    found.map((item) => item.id),
    ["fresh"],
  );
});

test("buildAlert handles an empty day", () => {
  const alert = buildAlert([]);
  assert.equal(alert.newMentionCount, 0);
  assert.match(alert.summary, /No new press mentions/);
});
