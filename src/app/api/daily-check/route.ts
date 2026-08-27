import { NextResponse } from "next/server";
import { runDailyCheck, startDailyCheckProcess } from "@/lib/daily-check";
import { loadDashboardData } from "@/lib/dashboard";
import { config } from "@/lib/config";
import { failRun } from "@/lib/run-phase";
import {
  CLOUD_COLLECT_CONCURRENCY,
  LOCAL_PIPELINE_MESSAGE,
  VERCEL_WORK_BUDGET_MS,
  canRunPipeline,
  isVercelHost,
} from "@/lib/runtime";
import { resolveRunStatus } from "@/lib/run-status";
import { saveRunStatus } from "@/lib/storage";
import type { PipelineRun } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function emptyRun(status: PipelineRun["status"], error: string | null): PipelineRun {
  const now = new Date().toISOString();
  return {
    status,
    startedAt: now,
    finishedAt: now,
    error,
    newMentionCount: null,
    companiesAffected: null,
    pid: process.pid,
  };
}

export async function GET() {
  const run = await resolveRunStatus();
  return NextResponse.json(run);
}

export async function POST() {
  if (!canRunPipeline()) {
    return NextResponse.json(
      {
        ...emptyRun("failed", LOCAL_PIPELINE_MESSAGE),
        pid: null,
        persisted: false,
      },
      { status: 501 },
    );
  }

  const current = await resolveRunStatus();
  if (current?.status === "running") {
    return NextResponse.json(current, { status: 409 });
  }

  if (isVercelHost) {
    try {
      await runDailyCheck({
        skipIngest: true,
        collectLimit: config.cloudCollectLimit,
        classifyLimit: config.cloudClassifyLimit,
        preferStale: true,
        deadlineAt: Date.now() + VERCEL_WORK_BUDGET_MS,
        collectConcurrency: CLOUD_COLLECT_CONCURRENCY,
      });
      const [run, dashboard] = await Promise.all([resolveRunStatus(), loadDashboardData()]);
      return NextResponse.json({
        ...(run ?? emptyRun("success", null)),
        dashboard,
        persisted: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Daily check failed";
      const run = await resolveRunStatus();
      const failed =
        run?.status === "failed"
          ? run
          : failRun(run ?? emptyRun("running", null), message.slice(0, 400));
      if (failed !== run) await saveRunStatus(failed);
      return NextResponse.json({ ...failed, persisted: false }, { status: 500 });
    }
  }

  const run = await startDailyCheckProcess();
  return NextResponse.json({ ...run, persisted: true }, { status: 202 });
}
