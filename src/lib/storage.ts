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
import { isVercelHost } from "./runtime";
import type {
  AlertPayload,
  Company,
  CompanyStatus,
  Mention,
  PipelineMeta,
  PipelineRun,
} from "./types";

interface HostedStore {
  companies: Company[];
  mentions: Mention[];
  statuses: CompanyStatus[];
  meta: PipelineMeta | null;
  snapshotIds: string[];
  latestAlert: AlertPayload | null;
  runStatus: PipelineRun | null;
}

let hostedStore: HostedStore | null = null;

function getHostedStore(): HostedStore {
  if (!hostedStore) {
    hostedStore = {
      companies: structuredClone(bundledCompanies),
      mentions: structuredClone(bundledMentions),
      statuses: structuredClone(bundledStatuses),
      meta: structuredClone(bundledMeta),
      snapshotIds: structuredClone(bundledSnapshotIds),
      latestAlert: structuredClone(bundledLatestAlert),
      runStatus: structuredClone(bundledRunStatus),
    };
  }
  return hostedStore;
}

function readHosted<K extends keyof HostedStore>(key: K, bundled: HostedStore[K]): HostedStore[K] {
  return hostedStore ? hostedStore[key] : bundled;
}

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
  if (isVercelHost) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

export function mentionId(companyId: string, url: string, title: string): string {
  return createHash("sha256").update(`${companyId}|${url}|${title}`).digest("hex").slice(0, 16);
}

export async function loadCompanies(): Promise<Company[]> {
  if (isVercelHost) return readHosted("companies", bundledCompanies);
  return readJsonFile<Company[]>(COMPANIES_FILE, []);
}

export async function saveCompanies(companies: Company[]): Promise<void> {
  if (isVercelHost) {
    getHostedStore().companies = companies;
    return;
  }
  await writeJsonAtomic(COMPANIES_FILE, companies);
}

export async function loadMentions(): Promise<Mention[]> {
  if (isVercelHost) return readHosted("mentions", bundledMentions);
  return readJsonFile<Mention[]>(MENTIONS_FILE, []);
}

export async function saveMentions(mentions: Mention[]): Promise<void> {
  if (isVercelHost) {
    getHostedStore().mentions = mentions;
    return;
  }
  await writeJsonAtomic(MENTIONS_FILE, mentions);
}

export async function loadStatuses(): Promise<CompanyStatus[]> {
  if (isVercelHost) return readHosted("statuses", bundledStatuses);
  return readJsonFile<CompanyStatus[]>(STATUS_FILE, []);
}

export async function saveStatuses(statuses: CompanyStatus[]): Promise<void> {
  if (isVercelHost) {
    getHostedStore().statuses = statuses;
    return;
  }
  await writeJsonAtomic(STATUS_FILE, statuses);
}

export async function loadMeta(): Promise<PipelineMeta | null> {
  if (isVercelHost) return readHosted("meta", bundledMeta);
  return readJsonFile<PipelineMeta | null>(META_FILE, null);
}

export async function saveMeta(meta: PipelineMeta): Promise<void> {
  if (isVercelHost) {
    getHostedStore().meta = meta;
    return;
  }
  await writeJsonAtomic(META_FILE, meta);
}

export async function loadSnapshotIds(): Promise<string[]> {
  if (isVercelHost) return readHosted("snapshotIds", bundledSnapshotIds);
  return readJsonFile<string[]>(SNAPSHOT_FILE, []);
}

export async function saveSnapshotIds(ids: string[]): Promise<void> {
  if (isVercelHost) {
    getHostedStore().snapshotIds = ids;
    return;
  }
  await writeJsonAtomic(SNAPSHOT_FILE, ids);
}

export async function loadLatestAlert(): Promise<AlertPayload | null> {
  if (isVercelHost) return readHosted("latestAlert", bundledLatestAlert);
  return readJsonFile<AlertPayload | null>(LATEST_ALERT_FILE, null);
}

export async function saveAlert(alert: AlertPayload): Promise<void> {
  if (isVercelHost) {
    getHostedStore().latestAlert = alert;
    return;
  }
  await mkdir(ALERTS_DIR, { recursive: true });
  const dated = path.join(ALERTS_DIR, `${alert.generatedAt.slice(0, 10)}.json`);
  await writeJsonAtomic(dated, alert);
  await writeJsonAtomic(LATEST_ALERT_FILE, alert);
}

export async function loadRunStatus(): Promise<PipelineRun | null> {
  if (isVercelHost) return readHosted("runStatus", bundledRunStatus);
  return readJsonFile<PipelineRun | null>(RUN_STATUS_FILE, null);
}

export async function saveRunStatus(run: PipelineRun): Promise<void> {
  if (isVercelHost) {
    getHostedStore().runStatus = run;
    return;
  }
  await writeJsonAtomic(RUN_STATUS_FILE, run);
}
