import { applyRelevanceGate } from "./relevance";
import { config } from "./config";
import { ingestCompanies } from "./ingest";
import { collectCompanyMentions, mapWithConcurrency } from "./news/collect";
import { selectCompaniesForCollect } from "./news/targets";
import { classifyMentionBatch, getClassifierModel, pingClassifier } from "./classifier";
import { log } from "./cli";
import { getQuarterWindow } from "./paths";
import {
  loadCompanies,
  loadMentions,
  loadStatuses,
  saveMentions,
  saveMeta,
  saveStatuses,
} from "./storage";
import { computeAllStatuses } from "./status";
import type { Company, Mention, PipelineMeta } from "./types";

export interface PipelineOptions {
  limit?: number;
  preferStale?: boolean;
  skipCollect?: boolean;
  skipClassify?: boolean;
  deadlineAt?: number;
  concurrency?: number;
}

export async function runIngest(): Promise<Company[]> {
  const count = await ingestCompanies();
  log(`Ingested ${count} companies from data/source/ourcrowd_companies.txt`);
  return loadCompanies();
}

export async function runCollect(options: PipelineOptions = {}): Promise<{ mentions: Mention[]; errors: number }> {
  const companies = await loadCompanies();
  const statuses = await loadStatuses();
  const selected = selectCompaniesForCollect(companies, statuses, {
    limit: options.limit,
    preferStale: options.preferStale,
  });
  const existing = await loadMentions();
  const existingById = new Map(existing.map((mention) => [mention.id, mention]));
  let errors = 0;
  let collected = 0;
  const concurrency = options.concurrency ?? config.collectConcurrency;
  const pastDeadline = () => Boolean(options.deadlineAt && Date.now() >= options.deadlineAt);

  log(`Collecting news for ${selected.length} companies (max ${config.maxArticlesPerCompany} each)`);

  await mapWithConcurrency(
    selected,
    concurrency,
    async (company, index) => {
      if (pastDeadline()) return;
      const result = await collectCompanyMentions(company);
      if (result.error) {
        errors += 1;
        log(`  ! ${company.name}: ${result.error}`);
      }
      collected += result.mentions.length;
      for (const mention of result.mentions) {
        const previous = existingById.get(mention.id);
        existingById.set(mention.id, previous ? { ...mention, ...pickClassification(previous) } : mention);
      }
      if ((index + 1) % 25 === 0 || index === selected.length - 1) {
        log(`  collected ${index + 1}/${selected.length} companies (${collected} articles so far)`);
      }
    },
    pastDeadline,
  );

  const { start } = getQuarterWindow();
  const merged = [...existingById.values()].filter((mention) => {
    const published = Date.parse(mention.publishedAt);
    return !Number.isNaN(published) && published >= start.getTime();
  });

  await saveMentions(merged);
  log(`Stored ${merged.length} mentions in the current quarter (${errors} company fetch errors)`);
  return { mentions: merged, errors };
}

export async function runClassify(options: PipelineOptions = {}): Promise<Mention[]> {
  await pingClassifier();
  const model = getClassifierModel();
  const companies = await loadCompanies();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const mentions = await loadMentions();
  const pending = mentions.filter((mention) => mention.classifiedAt === null);
  const limited = options.limit ? pending.slice(0, options.limit) : pending;

  if (limited.length === 0) {
    log("No unclassified mentions");
    return mentions;
  }

  log(`Classifying ${limited.length} mentions with ${model}`);
  const byCompany = groupBy(limited, (mention) => mention.companyId);
  let done = 0;
  const pastDeadline = () => Boolean(options.deadlineAt && Date.now() >= options.deadlineAt);

  for (const [companyId, companyMentions] of byCompany) {
    if (pastDeadline()) {
      log("Stopping classification: cloud time budget reached");
      break;
    }
    const company = companyById.get(companyId);
    if (!company) continue;
    const batches = chunk(companyMentions, config.classifyBatchSize);

    for (const batch of batches) {
      if (pastDeadline()) break;
      try {
        const results = await classifyMentionBatch(company.name, company.aliases, company.domain, batch);
        const byId = new Map(results.map((item) => [item.id, item]));
        for (const mention of batch) {
          const classified = byId.get(mention.id);
          mention.classifiedAt = new Date().toISOString();
          mention.model = model;
          if (classified) {
            const gated = applyRelevanceGate(company, {
              title: mention.title,
              snippet: mention.snippet,
              url: mention.url,
              relevant: classified.relevant,
              rationale: classified.rationale,
            });
            mention.relevant = gated.relevant;
            mention.sentiment = gated.relevant ? classified.sentiment : "neutral";
            mention.rationale = gated.rationale;
          } else {
            mention.relevant = false;
            mention.sentiment = "neutral";
            mention.rationale = "Model omitted this item; not counted as coverage";
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`  ! ${company.name} batch failed: ${message}`);
        for (const mention of batch) {
          mention.classifiedAt = new Date().toISOString();
          mention.model = model;
          mention.relevant = false;
          mention.sentiment = "neutral";
          mention.rationale = `Classification error: ${message.slice(0, 180)}`;
        }
      }
      done += batch.length;
      log(`  classified ${Math.min(done, limited.length)}/${limited.length} (${company.name})`);
      if (done % 20 === 0) {
        await saveMentions(mentions);
      }
    }
  }

  await saveMentions(mentions);
  return mentions;
}

export async function runStatusAndMeta(collectionErrors = 0): Promise<PipelineMeta> {
  const companies = await loadCompanies();
  const mentions = await loadMentions();
  const statuses = computeAllStatuses(companies, mentions);
  await saveStatuses(statuses);

  const { start, end } = getQuarterWindow();
  const meta: PipelineMeta = {
    generatedAt: new Date().toISOString(),
    quarterStart: start.toISOString(),
    quarterEnd: end.toISOString(),
    model: getClassifierModel(),
    companiesTracked: companies.length,
    mentionsCollected: mentions.length,
    mentionsClassified: mentions.filter((mention) => mention.classifiedAt).length,
    relevantMentions: mentions.filter((mention) => mention.relevant === true).length,
    collectionErrors,
  };
  await saveMeta(meta);
  log(
    `Status ready: ${meta.relevantMentions} relevant mentions across ${companies.length} companies (${statuses.filter((item) => item.recency !== "none").length} with coverage)`,
  );
  return meta;
}

export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineMeta> {
  await runIngest();
  let collectionErrors = 0;
  if (!options.skipCollect) {
    const collected = await runCollect(options);
    collectionErrors = collected.errors;
  }
  if (!options.skipClassify) {
    await runClassify(options);
  }
  return runStatusAndMeta(collectionErrors);
}

function pickClassification(mention: Mention): Pick<Mention, "relevant" | "sentiment" | "rationale" | "classifiedAt" | "model"> {
  return {
    relevant: mention.relevant,
    sentiment: mention.sentiment,
    rationale: mention.rationale,
    classifiedAt: mention.classifiedAt,
    model: mention.model,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = map.get(key(item)) ?? [];
    group.push(item);
    map.set(key(item), group);
  }
  return map;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
