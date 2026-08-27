import { NextResponse } from "next/server";
import { startDailyCheckProcess } from "@/lib/daily-check";
import { LOCAL_PIPELINE_MESSAGE, isHostedReadOnly } from "@/lib/runtime";
import { resolveRunStatus } from "@/lib/run-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const run = await resolveRunStatus();
  return NextResponse.json(run);
}

export async function POST() {
  if (isHostedReadOnly) {
    return NextResponse.json(
      {
        status: "failed",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        error: LOCAL_PIPELINE_MESSAGE,
        newMentionCount: null,
        companiesAffected: null,
        pid: null,
      },
      { status: 501 },
    );
  }

  const current = await resolveRunStatus();
  if (current?.status === "running") {
    return NextResponse.json(current, { status: 409 });
  }

  const run = await startDailyCheckProcess();
  return NextResponse.json(run, { status: 202 });
}
