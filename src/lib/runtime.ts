import { hasCloudClassifierKey } from "./classifier/provider";

export const isVercelHost = Boolean(process.env.VERCEL);

/** Hosted snapshot mode: no cloud classifier key, so the dashboard stays read-only. */
export const isHostedReadOnly = isVercelHost && !hasCloudClassifierKey();

export function canRunPipeline(): boolean {
  return !isVercelHost || hasCloudClassifierKey();
}

export const LOCAL_PIPELINE_MESSAGE =
  "Daily check requires a local machine with Ollama, or OPENAI_API_KEY / AI_GATEWAY_API_KEY on this host. This hosted dashboard is read-only until a cloud classifier key is set.";

/**
 * One HTTP request cannot collect+classify 258 companies. Hobby/Pro both need
 * the handler to finish; 60s is the portable ceiling. Full pipeline stays local.
 */
export const VERCEL_FUNCTION_MAX_DURATION_SEC = 60;

/** Stop work before the platform kills the isolate so we can persist Failed/Success. */
export const VERCEL_WORK_BUDGET_MS = 48_000;

export const CLOUD_COLLECT_CONCURRENCY = 3;
