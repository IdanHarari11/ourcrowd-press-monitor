import { z } from "zod";
import { config } from "../config";
import type { Mention, Sentiment } from "../types";

const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          relevant: { type: "boolean" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
          rationale: { type: "string" },
        },
        required: ["id", "relevant", "sentiment", "rationale"],
      },
    },
  },
  required: ["items"],
} as const;

const resultSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      relevant: z.boolean(),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      rationale: z.string().default(""),
    }),
  ),
});

export const SYSTEM_PROMPT = `You are a press analyst for OurCrowd, a global investment platform.

Classify each news item for ONE target company — the business entity, not an English phrase.

Rules:
1. relevant=true only if the article is about that specific company (the business), not a namesake person, place, or unrelated brand. A funding roundup that lists the company still counts as relevant.
2. If the company is not named as a company, relevant=false. Homonyms and ordinary English collocations are not coverage (example: "future family plans" is not the company Future Family; "peak performance" is not Peak the startup).
3. If you are not sure it is the portfolio company, relevant=false.
4. sentiment is how the coverage portrays the company:
   - positive: funding, growth, product wins, partnerships, awards, strong results
   - negative: lawsuits, layoffs, breaches, losses, scandals, shutdowns, failed deals
   - neutral: factual listings, roundups, calendar items, or mixed/unclear tone
5. If relevant=false, still set sentiment to "neutral".
6. Keep rationale to one short sentence. Do not claim the company is mentioned if it is not.
7. Return JSON only.`;

export function buildUserPrompt(
  companyName: string,
  aliases: string[],
  domain: string | undefined,
  mentions: Array<Pick<Mention, "id" | "title" | "sourceName" | "snippet" | "url">>,
): string {
  const identity = [
    `Company: ${companyName}`,
    aliases.length ? `Aliases: ${aliases.join(", ")}` : null,
    domain ? `Domain: ${domain}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const items = mentions
    .map(
      (mention, index) =>
        `${index + 1}. id=${mention.id}
title: ${mention.title}
source: ${mention.sourceName}
snippet: ${mention.snippet || "(none)"}`,
    )
    .join("\n\n");

  return `${identity}

News items:
${items}`;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Ollama response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export interface Classification {
  id: string;
  relevant: boolean;
  sentiment: Sentiment;
  rationale: string;
}

export async function classifyMentionBatch(
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
