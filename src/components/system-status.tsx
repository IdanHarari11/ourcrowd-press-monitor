interface SystemStatusProps {
  lastUpdate: string;
  collectorOk: boolean;
  ollamaOk: boolean;
  pipelineAvailable: boolean;
  model: string;
}

export function SystemStatus({ lastUpdate, collectorOk, ollamaOk, pipelineAvailable, model }: SystemStatusProps) {
  return (
    <footer className="desk-footer">
      <p>
        Last data update {lastUpdate}
        {" · "}
        Collector {collectorOk ? "operational" : "degraded"}
        {" · "}
        Ollama {pipelineAvailable ? (ollamaOk ? "operational" : "unreachable") : "local only"}
        {" · "}
        Sentiment: Ollama · {model}
      </p>
      <p>
        {pipelineAvailable
          ? `Sentiment classification powered locally by Ollama · ${model}`
          : "Hosted demo is read-only. Run Daily Check and classify with Ollama on your local machine."}
      </p>
    </footer>
  );
}
