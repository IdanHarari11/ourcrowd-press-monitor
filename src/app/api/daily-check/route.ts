import { NextResponse } from "next/server";
import { runDailyCheck, startDailyCheckProcess } from "@/lib/daily-check";
import { loadDashboardData } from "@/lib/dashboard";
import { LOCAL_PIPELINE_MESSAGE, canRunPipeline, isVercelHost } from "@/lib/runtime";
import { resolveRunStatus } from "@/lib/run-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const run = await resolveRunStatus();
  return NextResponse.json(run);
}

export async function POST() {
  if (!canRunPipeline()) {
    return NextResponse.json(
      {
        status: "failed",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        error: LOCAL_PIPELINE_MESSAGE,
        newMentionCount: null,
        companiesAffected: null,
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
      await runDailyCheck({ skipIngest: true });
      const [run, dashboard] = await Promise.all([resolveRunStatus(), loadDashboardData()]);
      return NextResponse.json({
        ...(run ?? {
          status: "success",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          newMentionCount: null,
          companiesAffected: null,
          pid: process.pid,
        }),
        dashboard,
        persisted: false,
      });
    } catch (error) {
      const run = await resolveRunStatus();
      const message = error instanceof Error ? error.message : "Daily check failed";
      return NextResponse.json(
        {
          ...(run ?? {
            status: "failed",
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            error: message.slice(0, 400),
            newMentionCount: null,
            companiesAffected: null,
            pid: process.pid,
          }),
          persisted: false,
        },
        { status: 500 },
      );
    }
  }

  const run = await startDailyCheckProcess();
  return NextResponse.json({ ...run, persisted: true }, { status: 202 });
}
