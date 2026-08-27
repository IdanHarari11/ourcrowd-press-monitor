import path from "node:path";

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const SOURCE_COMPANIES_FILE = path.join(DATA_DIR, "source", "ourcrowd_companies.txt");
export const COMPANIES_FILE = path.join(DATA_DIR, "companies.json");
export const MENTIONS_FILE = path.join(DATA_DIR, "mentions.json");
export const STATUS_FILE = path.join(DATA_DIR, "company-status.json");
export const META_FILE = path.join(DATA_DIR, "pipeline-meta.json");
export const SNAPSHOT_FILE = path.join(DATA_DIR, "mention-snapshot.json");
export const ALERTS_DIR = path.join(DATA_DIR, "alerts");
export const LATEST_ALERT_FILE = path.join(ALERTS_DIR, "latest.json");
export const RUN_STATUS_FILE = path.join(DATA_DIR, "pipeline-run.json");

export const QUARTER_DAYS = 90;

export function getQuarterWindow(now = new Date()): { start: Date; end: Date } {
  const end = now;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - QUARTER_DAYS);
  return { start, end };
}
