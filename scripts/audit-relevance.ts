import { log } from "../src/lib/cli";
import { parseCompanyList } from "../src/lib/companies";
import { getNewCoverage, buildAlert } from "../src/lib/alerts";
import { applyStoredRelevance } from "../src/lib/relevance";
import { computeAllStatuses } from "../src/lib/status";
import {
  loadMentions,
  loadMeta,
  loadSnapshotIds,
  saveAlert,
  saveCompanies,
  saveMentions,
  saveMeta,
  saveStatuses,
} from "../src/lib/storage";
import { readFile } from "node:fs/promises";
import { SOURCE_COMPANIES_FILE } from "../src/lib/paths";

async function main(): Promise<void> {
  const source = await readFile(SOURCE_COMPANIES_FILE, "utf8");
  const companies = parseCompanyList(source);
  await saveCompanies(companies);
  const companyById = new Map(companies.map((company) => [company.id, company]));

  const mentions = await loadMentions();
  let flipped = 0;
  const next = mentions.map((mention) => {
    const company = companyById.get(mention.companyId);
    if (!company) return mention;
    const gated = applyStoredRelevance(company, mention);
    if (gated.relevant !== mention.relevant) flipped += 1;
    return gated;
  });

  await saveMentions(next);

  const statuses = computeAllStatuses(companies, next);
  await saveStatuses(statuses);

  const meta = await loadMeta();
  if (meta) {
    await saveMeta({
      ...meta,
      relevantMentions: next.filter((mention) => mention.relevant === true).length,
      mentionsClassified: next.filter((mention) => mention.classifiedAt).length,
    });
  }

  const snapshot = await loadSnapshotIds();
  const fresh = getNewCoverage(next, snapshot);
  const alert = buildAlert(fresh);
  await saveAlert(alert);

  const futureFamily = next.filter((mention) => mention.companyId === "future-family");
  const futureFamilyRelevant = futureFamily.filter((mention) => mention.relevant === true);

  log(`Re-ingested ${companies.length} companies (ambiguous flags refreshed)`);
  log(`Relevance gate flipped ${flipped} stored mentions`);
  log(`Future Family: ${futureFamily.length} stored, ${futureFamilyRelevant.length} still relevant`);
  log(`Relevant mentions now ${next.filter((m) => m.relevant === true).length} / ${next.length}`);
  log(`New coverage vs snapshot: ${fresh.length} (alerts rewritten to match)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
