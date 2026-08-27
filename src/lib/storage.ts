import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  bundledCompanies,
  bundledLatestAlert,
  bundledMentions,
  bundledMeta,
  bundledRunStatus,
  bundledSnapshotIds,
  bundledStatuses,
} from "./bundled-data";
import {
  ALERTS_DIR,
  COMPANIES_FILE,
  LATEST_ALERT_FILE,
  RUN_STATUS_FILE,
  MENTIONS_FILE,
  META_FILE,
  SNAPSHOT_FILE,
  STATUS_FILE,
} from "./paths";
import { isHostedReadOnly } from "./runtime";
import type {
  AlertPayload,
  Company,
  CompanyStatus,
  Mention,
  PipelineMeta,
  PipelineRun,
} from "./types";

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  if (isHostedReadOnly) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

export function mentionId(companyId: string, url: string, title: string): string {
  return createHash("sha256").update(`${companyId}|${url}|${title}`).digest("hex").slice(0, 16);
}

export async function loadCompanies(): Promise<Company[]> {
  if (isHostedReadOnly) return bundledCompanies;
  return readJsonFile<Company[]>(COMPANIES_FILE, []);
}

export async function saveCompanies(companies: Company[]): Promise<void> {
  await writeJsonAtomic(COMPANIES_FILE, companies);
}

export async function loadMentions(): Promise<Mention[]> {
  if (isHostedReadOnly) return bundledMentions;
  return readJsonFile<Mention[]>(MENTIONS_FILE, []);
}

export async function saveMentions(mentions: Mention[]): Promise<void> {
  await writeJsonAtomic(MENTIONS_FILE, mentions);
}

export async function loadStatuses(): Promise<CompanyStatus[]> {
  if (isHostedReadOnly) return bundledStatuses;
  return readJsonFile<CompanyStatus[]>(STATUS_FILE, []);
}

export async function saveStatuses(statuses: CompanyStatus[]): Promise<void> {
  await writeJsonAtomic(STATUS_FILE, statuses);
}

export async function loadMeta(): Promise<PipelineMeta | null> {
  if (isHostedReadOnly) return bundledMeta;
  return readJsonFile<PipelineMeta | null>(META_FILE, null);
}

export async function saveMeta(meta: PipelineMeta): Promise<void> {
  await writeJsonAtomic(META_FILE, meta);
}

export async function loadSnapshotIds(): Promise<string[]> {
  if (isHostedReadOnly) return bundledSnapshotIds;
  return readJsonFile<string[]>(SNAPSHOT_FILE, []);
}

export async function saveSnapshotIds(ids: string[]): Promise<void> {
  await writeJsonAtomic(SNAPSHOT_FILE, ids);
}

export async function loadLatestAlert(): Promise<AlertPayload | null> {
  if (isHostedReadOnly) return bundledLatestAlert;
  return readJsonFile<AlertPayload | null>(LATEST_ALERT_FILE, null);
}

export async function saveAlert(alert: AlertPayload): Promise<void> {
  await mkdir(ALERTS_DIR, { recursive: true });
  const dated = path.join(ALERTS_DIR, `${alert.generatedAt.slice(0, 10)}.json`);
  await writeJsonAtomic(dated, alert);
  await writeJsonAtomic(LATEST_ALERT_FILE, alert);
}

export async function loadRunStatus(): Promise<PipelineRun | null> {
  if (isHostedReadOnly) return bundledRunStatus;
  return readJsonFile<PipelineRun | null>(RUN_STATUS_FILE, null);
}

export async function saveRunStatus(run: PipelineRun): Promise<void> {
  await writeJsonAtomic(RUN_STATUS_FILE, run);
}
