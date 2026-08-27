"use client";

import Link from "next/link";
import { DeskMark } from "@/components/desk-mark";
import { formatLastRun, formatQuarterRange, formatRunStatus } from "@/lib/format";
import type { PipelineMeta, PipelineRun, RunPhase } from "@/lib/types";

interface DashboardHeaderProps {
  meta: PipelineMeta | null;
  run: PipelineRun | null;
  derivedStatus: RunPhase;
  derivedAt: string | null;
  pipelineAvailable: boolean;
  onRunCheck: () => void;
}

export function DashboardHeader({
  meta,
  run,
  derivedStatus,
  derivedAt,
  pipelineAvailable,
  onRunCheck,
}: DashboardHeaderProps) {
  const range = meta ? formatQuarterRange(meta.quarterStart, meta.quarterEnd) : "Quarter not available";
  const running = derivedStatus === "running";
  const stampAt = run?.finishedAt ?? run?.startedAt ?? derivedAt;
  const checkDisabled = running || !pipelineAvailable;

  return (
    <header className="desk-header">
      <Link href="/" className="inline-flex min-w-0 max-w-full items-center gap-2 text-[1.05rem] font-semibold tracking-[-0.02em]">
        <DeskMark size={20} />
        <span className="truncate">
          OurCrowd <span className="text-brand">Press</span>
        </span>
        <span className="hidden text-[11px] font-medium tracking-[0.04em] text-text-secondary uppercase md:inline">
          Portfolio Coverage Desk
        </span>
      </Link>
      <div className="desk-header-actions">
        <p className="num desk-header-range min-w-0 text-[12px] text-text-secondary" title="Rolling last-90-day quarter">
          {range}
        </p>
        <p className="num desk-header-run min-w-0 text-[12px] text-text-secondary" aria-live="polite">
          Last run: {formatLastRun(stampAt)} · {formatRunStatus(derivedStatus)}
        </p>
        <button
          type="button"
          className="btn btn-accent desk-header-check"
          onClick={onRunCheck}
          disabled={checkDisabled}
          aria-busy={running}
          title={
            pipelineAvailable
              ? undefined
              : "Requires local Ollama, or OPENAI_API_KEY / AI_GATEWAY_API_KEY on this host"
          }
        >
          {running ? "Running…" : !pipelineAvailable ? "Local only" : derivedStatus === "failed" ? "Retry Daily Check" : "Run Daily Check"}
        </button>
      </div>
    </header>
  );
}
