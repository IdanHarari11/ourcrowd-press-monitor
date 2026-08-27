import { reconcileRun } from "./run-phase";
import { isVercelHost } from "./runtime";
import { loadRunStatus, saveRunStatus } from "./storage";
import type { PipelineRun } from "./types";

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function resolveRunStatus(): Promise<PipelineRun | null> {
  const run = await loadRunStatus();
  if (!run) return null;
  // Hosted isolates cannot observe a previous invocation's PID. Stale Running
  // is failed; a fresh Running in this isolate still blocks overlapping POSTs.
  const next = reconcileRun(run, Date.now(), (pid) => (isVercelHost ? true : isPidAlive(pid)));
  if (next.status !== run.status || next.error !== run.error || next.finishedAt !== run.finishedAt) {
    await saveRunStatus(next);
  }
  return next;
}
