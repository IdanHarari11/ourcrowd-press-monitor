import type { Mention } from "../types";
import { classifyWithOllama, isOllamaReachable, pingOllama } from "./ollama";
import { classifyWithOpenAI, pingOpenAI } from "./openai";
import {
  classifierLabel,
  hasCloudClassifierKey,
  resolveClassifierModel,
  resolveClassifierProvider,
  type ClassifierProviderId,
} from "./provider";
import type { Classification } from "./schema";

export type { Classification } from "./schema";
export type { ClassifierProviderId } from "./provider";
export { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
export { extractJson } from "./parse";
export {
  classifierLabel,
  hasCloudClassifierKey,
  resolveClassifierModel,
  resolveClassifierProvider,
};
export { isOllamaReachable, pingOllama };

export async function classifyMentionBatch(
  companyName: string,
  aliases: string[],
  domain: string | undefined,
  mentions: Mention[],
): Promise<Classification[]> {
  if (resolveClassifierProvider() === "openai") {
    return classifyWithOpenAI(companyName, aliases, domain, mentions);
  }
  return classifyWithOllama(companyName, aliases, domain, mentions);
}

export async function pingClassifier(): Promise<void> {
  if (resolveClassifierProvider() === "openai") {
    await pingOpenAI();
    return;
  }
  await pingOllama();
}

export async function isClassifierReady(): Promise<boolean> {
  if (resolveClassifierProvider() === "openai") {
    return hasCloudClassifierKey();
  }
  return isOllamaReachable();
}

export function getClassifierProvider(): ClassifierProviderId {
  return resolveClassifierProvider();
}

export function getClassifierModel(): string {
  return resolveClassifierModel();
}
