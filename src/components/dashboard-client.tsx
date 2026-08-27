"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompanyDetailsDrawer } from "@/components/company-details-drawer";
import { CoverageFilters } from "@/components/coverage-filters";
import { CoverageTable } from "@/components/coverage-table";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardStats } from "@/components/dashboard-stats";
import { LatestAlerts } from "@/components/latest-alerts";
import { MentionsTimeline } from "@/components/mentions-timeline";
import { RecentMentions } from "@/components/recent-mentions";
import { SystemStatus } from "@/components/system-status";
import { filterDeskRows, paginateRows, type CoverageFilter, type SortKey } from "@/lib/desk-query";
import { getLatestAlerts, getMentionsTimeline, getNewCoverage, getQuarterStats, getRecentMentions } from "@/lib/desk-stats";
import { formatLastRun, lastRunFrom } from "@/lib/format";
import type { AlertPayload, Company, CompanyStatus, DailyCheckResponse, Mention, PipelineMeta, PipelineRun } from "@/lib/types";

interface Props {
  companies: Company[];
  statuses: CompanyStatus[];
  mentions: Mention[];
  meta: PipelineMeta | null;
  alert: AlertPayload | null;
  snapshotIds: string[];
  initialRun: PipelineRun | null;
  classifierReady: boolean;
  pipelineAvailable: boolean;
  classifierLabel: string;
  model: string;
}

export function DashboardClient({
  companies,
  statuses,
  mentions,
  meta,
  alert,
  snapshotIds,
  initialRun,
  classifierReady,
  pipelineAvailable,
  classifierLabel,
  model,
}: Props) {
  const router = useRouter();
  const pollRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState<CoverageFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [granularity, setGranularity] = useState<"day" | "week">("week");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desk, setDesk] = useState({ companies, statuses, mentions, meta, alert, snapshotIds });
  const [run, setRun] = useState<PipelineRun | null>(initialRun);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    setDesk({ companies, statuses, mentions, meta, alert, snapshotIds });
  }, [alert, companies, mentions, meta, snapshotIds, statuses]);

  const statusById = useMemo(
    () => new Map(desk.statuses.map((item) => [item.companyId, item])),
    [desk.statuses],
  );
  const rows = useMemo(
    () => filterDeskRows(desk.companies, statusById, query, coverage, sortKey),
    [coverage, desk.companies, query, sortKey, statusById],
  );
  const paged = useMemo(() => paginateRows(rows, page), [page, rows]);
  const newMentions = useMemo(
    () => getNewCoverage(desk.mentions, desk.snapshotIds),
    [desk.mentions, desk.snapshotIds],
  );
  const stats = useMemo(
    () =>
      getQuarterStats(
        desk.companies,
        desk.statuses,
        newMentions,
        desk.alert?.generatedAt ?? desk.meta?.generatedAt ?? null,
      ),
    [desk.alert?.generatedAt, desk.companies, desk.meta?.generatedAt, desk.statuses, newMentions],
  );
  const recent = useMemo(() => getRecentMentions(desk.mentions), [desk.mentions]);
  const alerts = useMemo(
    () => getLatestAlerts(newMentions, desk.alert?.generatedAt ?? desk.meta?.generatedAt ?? null),
    [desk.alert?.generatedAt, desk.meta?.generatedAt, newMentions],
  );
  const timeline = useMemo(() => {
    if (!desk.meta) return [];
    return getMentionsTimeline(desk.mentions, desk.meta.quarterStart, desk.meta.quarterEnd, granularity);
  }, [desk.mentions, desk.meta, granularity]);

  const derived = lastRunFrom(desk.meta, run);
  const selectedCompany = selectedId ? (desk.companies.find((item) => item.id === selectedId) ?? null) : null;
  const selectedStatus = selectedId ? (statusById.get(selectedId) ?? null) : null;

  const openCompany = useCallback((companyId: string) => {
    setSelectedId(companyId);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const changeCoverage = (value: CoverageFilter) => {
    setCoverage(value);
    setPage(1);
  };

  const changeSort = (value: SortKey) => {
    setSortKey(value);
    setPage(1);
  };

  const runDailyCheck = async () => {
    setRunError(null);
    setRun({
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      newMentionCount: null,
      companiesAffected: null,
      pid: null,
    });
    const response = await fetch("/api/daily-check", { method: "POST" });
    const payload = (await response.json()) as DailyCheckResponse;
    if (!response.ok && response.status !== 409) {
      setRun(payload);
      setRunError(payload.error ?? "Daily check failed to start.");
      return;
    }
    setRun(payload);
    if (payload.dashboard) {
      setDesk({
        companies: payload.dashboard.companies,
        statuses: payload.dashboard.statuses,
        mentions: payload.dashboard.mentions,
        meta: payload.dashboard.meta,
        alert: payload.dashboard.alert,
        snapshotIds: payload.dashboard.snapshotIds,
      });
    }
    if (payload.status === "running") {
      startPolling();
      return;
    }
    if (payload.status === "failed") setRunError(payload.error);
    if (payload.persisted !== false && !payload.dashboard) router.refresh();
  };

  const startPolling = () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const response = await fetch("/api/daily-check");
      const next = (await response.json()) as PipelineRun | null;
      if (!next) return;
      setRun(next);
      if (next.status !== "running") {
        if (pollRef.current !== null) window.clearInterval(pollRef.current);
        pollRef.current = null;
        if (next.status === "failed") setRunError(next.error);
        router.refresh();
      }
    }, 3000);
  };

  useEffect(() => {
    if (pipelineAvailable && initialRun?.status === "running") startPolling();
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll only on mount
  }, []);

  const collectorOk = Boolean(desk.meta) && (desk.meta?.collectionErrors ?? 0) === 0;

  return (
    <AppShell
      fillViewport
      header={
        <DashboardHeader
          meta={desk.meta}
          run={run}
          derivedStatus={derived.status}
          derivedAt={derived.at}
          pipelineAvailable={pipelineAvailable}
          onRunCheck={runDailyCheck}
        />
      }
      footer={
        <SystemStatus
          lastUpdate={formatLastRun(desk.meta?.generatedAt ?? null)}
          collectorOk={collectorOk}
          classifierReady={classifierReady}
          pipelineAvailable={pipelineAvailable}
          classifierLabel={classifierLabel}
          model={desk.meta?.model || model}
        />
      }
    >
      <div className="desk-page">
        {runError ? (
          <p className="rounded-md border border-negative px-3 py-2 text-[13px] text-negative" role="alert">
            Daily check failed. {runError}
          </p>
        ) : null}
        <DashboardStats stats={stats} />
        <div className="desk-mid">
          <MentionsTimeline buckets={timeline} granularity={granularity} onGranularityChange={setGranularity} />
          <div className="rail">
            <RecentMentions mentions={recent} onOpenCompany={openCompany} />
            <LatestAlerts events={alerts} />
          </div>
        </div>
        <section className="coverage-panel panel">
          <div className="panel-head">
            <h2 className="panel-title">Company Coverage Status</h2>
            <p className="panel-meta hidden sm:block">Very Recent ≤1d · Recent ≤7d · Stale &gt;7d</p>
          </div>
          <CoverageFilters
            query={query}
            coverage={coverage}
            sortKey={sortKey}
            onQueryChange={changeQuery}
            onCoverageChange={changeCoverage}
            onSortChange={changeSort}
            shown={paged.total}
            total={desk.companies.length}
          />
          <CoverageTable
            rows={paged.slice}
            query={query}
            sortKey={sortKey}
            selectedId={selectedId}
            onSortChange={changeSort}
            onSelect={openCompany}
            page={paged.page}
            totalPages={paged.totalPages}
            rangeLabel={paged.total === 0 ? "No companies" : `${paged.start}–${paged.end} of ${paged.total}`}
            onPageChange={setPage}
          />
        </section>
      </div>
      {drawerOpen ? (
        <CompanyDetailsDrawer
          company={selectedCompany}
          status={selectedStatus}
          mentions={desk.mentions}
          open={drawerOpen}
          onClose={closeDrawer}
        />
      ) : null}
    </AppShell>
  );
}
