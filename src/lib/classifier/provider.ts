export type ClassifierProviderId = "ollama" | "openai";

export function hasCloudClassifierKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.AI_GATEWAY_API_KEY?.trim());
}

export function cloudApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || process.env.AI_GATEWAY_API_KEY?.trim() || "";
}

function explicitProvider(): string {
  return process.env.CLASSIFIER_PROVIDER?.trim().toLowerCase() || "";
}

export function usesAiGateway(): boolean {
  const provider = explicitProvider();
  if (provider === "ai-gateway") return true;
  if (process.env.OPENAI_BASE_URL?.trim()) return false;
  return !process.env.OPENAI_API_KEY?.trim() && Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

/**
 * Assignment default is local Ollama. On Vercel, a cloud key opts into the
 * OpenAI-compatible path so Daily Check can run without a local model.
 */
export function resolveClassifierProvider(): ClassifierProviderId {
  const explicit = explicitProvider();
  if (explicit === "ollama") return "ollama";
  if (explicit === "openai" || explicit === "ai-gateway") return "openai";
  if (process.env.VERCEL && hasCloudClassifierKey()) return "openai";
  return "ollama";
}

export function resolveClassifierModel(): string {
  const override = process.env.CLASSIFIER_MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
  if (override) return override;
  if (resolveClassifierProvider() === "openai") {
    return usesAiGateway() ? "openai/gpt-4.1-mini" : "gpt-4.1-mini";
  }
  return process.env.OLLAMA_MODEL?.trim() || "llama3.2:3b";
}

export function resolveOpenAIBaseURL(): string | undefined {
  const explicit = process.env.OPENAI_BASE_URL?.trim();
  if (explicit) return explicit;
  if (usesAiGateway()) return "https://ai-gateway.vercel.sh/v1";
  return undefined;
}

export function classifierLabel(): string {
  const provider = resolveClassifierProvider();
  const model = resolveClassifierModel();
  if (provider === "openai") {
    return usesAiGateway() ? `AI Gateway · ${model}` : `OpenAI-compatible · ${model}`;
  }
  return `Ollama · ${model}`;
}
