import { existsSync } from "node:fs";
import { resolveClassifierModel, resolveClassifierProvider, resolveOpenAIBaseURL } from "./classifier/provider";
import { isVercelHost } from "./runtime";

if (!isVercelHost) {
  if (existsSync(".env")) {
    process.loadEnvFile(".env");
  } else if (existsSync(".env.example")) {
    process.loadEnvFile(".env.example");
  }
}

function readEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  ollamaHost: readEnv("OLLAMA_HOST", "http://127.0.0.1:11434"),
  ollamaModel: readEnv("OLLAMA_MODEL", "llama3.2:3b"),
  classifierProvider: resolveClassifierProvider(),
  classifierModel: resolveClassifierModel(),
  openaiBaseUrl: resolveOpenAIBaseURL() ?? "",
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL?.trim() || "",
  maxArticlesPerCompany: readInt("MAX_ARTICLES_PER_COMPANY", 5),
  collectConcurrency: readInt("COLLECT_CONCURRENCY", 5),
  classifyBatchSize: readInt("CLASSIFY_BATCH_SIZE", 3),
};
