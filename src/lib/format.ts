import { isRunStale } from "./run-phase";
import type { Mention, PipelineMeta, PipelineRun, RunPhase } from "./types";

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatQuarterRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "Quarter window unavailable";
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Quarter window unavailable";

  const startLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function formatCompactAge(daysSinceLastMention: number | null): string {
  if (daysSinceLastMention === null) return "No coverage";
  if (daysSinceLastMention <= 0) return "Today";
  if (daysSinceLastMention === 1) return "1 day ago";
  return `${daysSinceLastMention} days ago`;
}

export function formatRelativeFromIso(iso: string | null, now = new Date()): string {
  if (!iso) return "No coverage";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No coverage";

  const deltaMs = now.getTime() - date.getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function formatLastRun(iso: string | null, now = new Date()): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never";

  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) return `Today, ${time}`;
  return `${formatDate(iso)}, ${time}`;
}

export function formatRunStatus(status: RunPhase): string {
  switch (status) {
    case "running":
      return "Running";
    case "success":
      return "Success";
    case "failed":
      return "Failed";
  }
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

export function companyInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const token = parts[0] ?? "";
    return token.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function deskEdition(meta: PipelineMeta | null): { edition: string; stamp: string } {
  if (!meta) {
    return { edition: "No pipeline window", stamp: "Pipeline not run" };
  }
  return {
    edition: formatQuarterRange(meta.quarterStart, meta.quarterEnd),
    stamp: `Last run ${formatLastRun(meta.generatedAt)} · ${meta.model}`,
  };
}

export function relevantMentionsForCompany(mentions: Mention[], companyId: string): Mention[] {
  return mentions
    .filter((mention) => mention.companyId === companyId && mention.relevant === true)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function lastRunFrom(
  meta: PipelineMeta | null,
  run: PipelineRun | null,
  now = new Date(),
): { at: string | null; status: RunPhase } {
  if (run) {
    if (isRunStale(run, now.getTime())) {
      return { at: run.startedAt, status: "failed" };
    }
    return { at: run.finishedAt ?? run.startedAt, status: run.status };
  }
  if (meta) return { at: meta.generatedAt, status: "success" };
  return { at: null, status: "failed" };
}
