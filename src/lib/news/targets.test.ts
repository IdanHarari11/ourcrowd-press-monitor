import { test } from "node:test";
import assert from "node:assert/strict";
import { toCompany } from "../companies";
import { selectCompaniesForCollect } from "./targets";
import type { CompanyStatus } from "../types";

function status(companyId: string, recency: CompanyStatus["recency"]): CompanyStatus {
  return {
    companyId,
    companyName: companyId,
    lastMentionedAt: null,
    lastMentionTitle: null,
    lastMentionUrl: null,
    daysSinceLastMention: recency === "none" ? null : 1,
    statusLabel: "",
    recency,
    mentionCountQuarter: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
  };
}

test("selectCompaniesForCollect keeps original order without preferStale", () => {
  const hailo = toCompany({ name: "Hailo", searchName: "Hailo", aliases: [] });
  const peak = toCompany({ name: "Peak", searchName: "Peak", aliases: [] });
  const selected = selectCompaniesForCollect([hailo, peak], [status(hailo.id, "none")], { limit: 1 });
  assert.equal(selected[0]?.id, hailo.id);
});

test("selectCompaniesForCollect prefers companies with no coverage", () => {
  const hailo = toCompany({ name: "Hailo", searchName: "Hailo", aliases: [] });
  const peak = toCompany({ name: "Peak", searchName: "Peak", aliases: [] });
  const selected = selectCompaniesForCollect(
    [hailo, peak],
    [status(hailo.id, "hot"), status(peak.id, "none")],
    { limit: 1, preferStale: true },
  );
  assert.equal(selected[0]?.id, peak.id);
});
