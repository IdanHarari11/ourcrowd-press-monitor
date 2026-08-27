import { spawn } from "node:child_process";
import { config } from "./config";
import { log } from "./cli";
import { pingClassifier } from "./classifier";
import { buildAlert, diffNewMentions, notifyAlert } from "./alerts";
import { runCollect, runClassify, runIngest, runStatusAndMeta } from "./pipeline";
import { failRun } from "./run-phase";
import { loadMentions, loadSnapshotIds, saveAlert, saveRunStatus, saveSnapshotIds } from "./storage";
import type { AlertPayload, PipelineRun } from "./types";

export interface DailyCheckOptions {
  skipFetch?: boolean;
  skipIngest?: boolean;
  collectLimit?: number;
  classifyLimit?: number;
  preferStale?: boolean;
  deadlineAt?: number;
  collectConcurrency?: number;
}

export async function runDailyCheck(options: DailyCheckOptions = {}): Promise<AlertPayload> {
  const startedAt = new Date().toISOString();
  await saveRunStatus(runningState(startedAt, process.pid));

  try {
    if (!options.skipFetch) {
      if (!options.skipIngest) {
        await runIngest();
      }
      await runCollect({
        limit: options.collectLimit,
        preferStale: options.preferStale,
        deadlineAt: options.deadlineAt,
        concurrency: options.collectConcurrency,
      });
      if (!options.deadlineAt || Date.now() < options.deadlineAt) {
        await pingClassifier();
        await runClassify({
          limit: options.classifyLimit,
          deadlineAt: options.deadlineAt,
        });
      } else {
        log("Skipping classify: cloud time budget reached after collect");
      }
      await runStatusAndMeta();
    }

    const mentions = await loadMentions();
    const previousIds = new Set(await loadSnapshotIds());
    const fresh = diffNewMentions(mentions, previousIds);
    const alert = buildAlert(fresh);

    await saveAlert(alert);
    await notifyAlert(alert, config.alertWebhookUrl);
    await saveSnapshotIds(mentions.filter((mention) => mention.relevant === true).map((mention) => mention.id));

    await saveRunStatus({
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: null,
      newMentionCount: alert.newMentionCount,
      companiesAffected: alert.companiesAffected,
      pid: process.pid,
    });

    log(
      fresh.length === 0
        ? "Daily check complete: no new mentions"
        : `Daily check complete: ${fresh.length} new mentions across ${alert.companiesAffected} companies`,
    );

    return alert;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const current: PipelineRun = runningState(startedAt, process.pid);
    await saveRunStatus(failRun(current, message.slice(0, 400)));
    throw error;
  }
}

export async function startDailyCheckProcess(): Promise<PipelineRun> {
  const startedAt = new Date().toISOString();
  const child = spawn("npm", ["run", "alert"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });

  const pid = child.pid ?? null;
  const run = runningState(startedAt, pid);
  await saveRunStatus(run);
  child.unref();
  return run;
}

function runningState(startedAt: string, pid: number | null): PipelineRun {
  return {
    status: "running",
    startedAt,
    finishedAt: null,
    error: null,
    newMentionCount: null,
    companiesAffected: null,
    pid,
  };
}
