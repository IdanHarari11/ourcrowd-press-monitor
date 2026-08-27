import type { Mention } from "../types";

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
