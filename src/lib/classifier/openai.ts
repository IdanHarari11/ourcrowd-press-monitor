import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Mention } from "../types";
import { publicClassifierError } from "./parse";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { cloudApiKey, resolveClassifierModel, resolveOpenAIBaseURL } from "./provider";
import { resultSchema, type Classification } from "./schema";
import { config } from "../config";

export async function pingOpenAI(): Promise<void> {
  if (!cloudApiKey()) {
    throw new Error("Cloud classifier requires OPENAI_API_KEY or AI_GATEWAY_API_KEY");
  }
}

export async function classifyWithOpenAI(
  companyName: string,
  aliases: string[],
  domain: string | undefined,
  mentions: Mention[],
  timeoutMs = config.classifyTimeoutMs,
): Promise<Classification[]> {
  if (mentions.length === 0) return [];

  const apiKey = cloudApiKey();
  if (!apiKey) {
    throw new Error("Cloud classifier requires OPENAI_API_KEY or AI_GATEWAY_API_KEY");
  }

  const baseURL = resolveOpenAIBaseURL();
  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    name: "classifier",
  });

  try {
    const { output } = await generateText({
      model: openai(resolveClassifierModel()),
      output: Output.object({ schema: resultSchema }),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(companyName, aliases, domain, mentions),
      temperature: 0,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    if (!output) throw new Error("Cloud classifier returned empty output");
    return output.items;
  } catch (error) {
    throw new Error(`Cloud classifier request failed: ${publicClassifierError(error)}`);
  }
}
