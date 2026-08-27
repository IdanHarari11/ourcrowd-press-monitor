import type { PipelineRun } from "./types";

/** Running older than this is a dead job, not an in-flight check. */
export const STALE_RUNNING_MS = 3 * 60 * 1000;

/**
 * Client fetch backstop. Slightly above the Vercel function budget so a 504
 * can surface as Failed instead of leaving the button on Running.
 */
export const CLIENT_DAILY_CHECK_TIMEOUT_MS = 75_000;

/** Local spawned pipeline: stop polling if the child never reports back. */
export const LOCAL_POLL_GIVE_UP_MS = 15 * 60 * 1000;

export function isRunStale(run: Pick<PipelineRun, "status" | "startedAt">, now = Date.now()): boolean {
  if (run.status !== "running") return false;
  const started = Date.parse(run.startedAt);
  return !Number.isFinite(started) || now - started > STALE_RUNNING_MS;
}

export function failRun(run: PipelineRun, error: string, now = new Date()): PipelineRun {
  return {
    ...run,
    status: "failed",
    finishedAt: now.toISOString(),
    error,
  };
}

export function failedRun(error: string, startedAt?: string, now = new Date()): PipelineRun {
  const started = startedAt ?? now.toISOString();
  return {
    status: "failed",
    startedAt: started,
    finishedAt: now.toISOString(),
    error,
    newMentionCount: null,
    companiesAffected: null,
    pid: null,
  };
}

export function reconcileRun(
  run: PipelineRun,
  now = Date.now(),
  pidAlive: (pid: number) => boolean,
): PipelineRun {
  if (run.status !== "running") return run;
  if (isRunStale(run, now)) {
    return failRun(run, "Daily check timed out or was interrupted before it finished.", new Date(now));
  }
  if (run.pid !== null && !pidAlive(run.pid)) {
    return failRun(run, "Daily check process exited unexpectedly", new Date(now));
  }
  return run;
}
