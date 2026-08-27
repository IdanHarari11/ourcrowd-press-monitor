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
  // Hosted demo cannot spawn or observe local PIDs; a leftover "running" file must not poll forever.
  if (isVercelHost) {
    return run.status === "running" ? null : run;
  }
  if (run.status === "running" && run.pid !== null && !isPidAlive(run.pid)) {
    const failed: PipelineRun = {
      ...run,
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: "Daily check process exited unexpectedly",
    };
    await saveRunStatus(failed);
    return failed;
  }
  return run;
}
