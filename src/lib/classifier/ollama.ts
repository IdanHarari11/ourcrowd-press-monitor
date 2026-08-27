import { config } from "../config";
import type { Mention } from "../types";
import { extractJson } from "./parse";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { CLASSIFICATION_SCHEMA, resultSchema, type Classification } from "./schema";

export { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
export { extractJson } from "./parse";
export type { Classification } from "./schema";

export async function classifyWithOllama(
  companyName: string,
  aliases: string[],
  domain: string | undefined,
  mentions: Mention[],
): Promise<Classification[]> {
  if (mentions.length === 0) return [];

  const response = await fetch(`${config.ollamaHost.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      stream: false,
      format: CLASSIFICATION_SCHEMA,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(companyName, aliases, domain, mentions) },
      ],
      options: {
        temperature: 0,
        num_ctx: 2048,
        num_predict: 512,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { message?: { content?: string } };
  const content = payload.message?.content;
  if (!content) throw new Error("Ollama returned an empty message");

  const parsed = resultSchema.parse(extractJson(content));
  return parsed.items;
}

/** @deprecated Use classifyWithOllama — kept so older scripts keep compiling. */
export const classifyMentionBatch = classifyWithOllama;

export async function pingOllama(): Promise<void> {
  const response = await fetch(`${config.ollamaHost.replace(/\/$/, "")}/api/tags`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama is not reachable at ${config.ollamaHost}`);
  }
}

export async function isOllamaReachable(): Promise<boolean> {
  try {
    await pingOllama();
    return true;
  } catch {
    return false;
  }
}
