interface SystemStatusProps {
  lastUpdate: string;
  collectorOk: boolean;
  classifierReady: boolean;
  pipelineAvailable: boolean;
  classifierLabel: string;
  model: string;
}

export function SystemStatus({
  lastUpdate,
  collectorOk,
  classifierReady,
  pipelineAvailable,
  classifierLabel,
  model,
}: SystemStatusProps) {
  const classifierState = pipelineAvailable
    ? classifierReady
      ? "operational"
      : "unreachable"
    : "local only";

  return (
    <footer className="desk-footer">
      <p>
        Last data update {lastUpdate}
        {" · "}
        Collector {collectorOk ? "operational" : "degraded"}
        {" · "}
        Classifier {classifierState}
        {" · "}
        Snapshot: {model}
      </p>
      <p>
        {pipelineAvailable
          ? `Live classification: ${classifierLabel}. Assignment demo uses local Ollama by default.`
          : "Hosted demo is read-only. Run Daily Check locally with Ollama, or set OPENAI_API_KEY / AI_GATEWAY_API_KEY on Vercel for live cloud classification."}
      </p>
    </footer>
  );
}
