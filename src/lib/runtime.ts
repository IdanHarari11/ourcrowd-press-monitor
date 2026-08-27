import { hasCloudClassifierKey } from "./classifier/provider";

export const isVercelHost = Boolean(process.env.VERCEL);

/** Hosted snapshot mode: no cloud classifier key, so the dashboard stays read-only. */
export const isHostedReadOnly = isVercelHost && !hasCloudClassifierKey();

export function canRunPipeline(): boolean {
  return !isVercelHost || hasCloudClassifierKey();
}

export const LOCAL_PIPELINE_MESSAGE =
  "Daily check requires a local machine with Ollama, or OPENAI_API_KEY / AI_GATEWAY_API_KEY on this host. This hosted dashboard is read-only until a cloud classifier key is set.";
