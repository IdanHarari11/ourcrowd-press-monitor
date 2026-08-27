import { DashboardClient } from "@/components/dashboard-client";
import { AppShell, SimpleHeader } from "@/components/app-shell";
import { classifierLabel, getClassifierModel, isClassifierReady } from "@/lib/classifier";
import { loadDashboardData } from "@/lib/dashboard";
import { canRunPipeline, isHostedReadOnly } from "@/lib/runtime";
import { resolveRunStatus } from "@/lib/run-status";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const pipelineAvailable = canRunPipeline();
  const skipClassifierProbe = isHostedReadOnly || process.env.NEXT_PHASE === "phase-production-build";
  const [data, classifierReady, initialRun] = await Promise.all([
    loadDashboardData(),
    skipClassifierProbe ? Promise.resolve(false) : isClassifierReady(),
    resolveRunStatus(),
  ]);

  if (data.companies.length === 0) {
    return <SetupState />;
  }

  return (
    <DashboardClient
      companies={data.companies}
      statuses={data.statuses}
      mentions={data.mentions}
      meta={data.meta}
      alert={data.alert}
      snapshotIds={data.snapshotIds}
      initialRun={initialRun}
      classifierReady={classifierReady}
      pipelineAvailable={pipelineAvailable}
      classifierLabel={classifierLabel()}
      model={data.meta?.model || getClassifierModel()}
    />
  );
}

function SetupState() {
  return (
    <AppShell header={<SimpleHeader />}>
      <div className="max-w-xl px-4 py-8">
        <h1 className="text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.03em]">Press monitor is empty</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          No company data has been ingested yet. From the project root, run the local pipeline and refresh this page:
        </p>
        <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-[13px] text-text-secondary">
          {`npm install
npm run pipeline
npm run dev`}
        </pre>
      </div>
    </AppShell>
  );
}
