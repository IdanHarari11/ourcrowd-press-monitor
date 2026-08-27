import type { Company, Mention } from "./types";

/**
 * Tokens that are ordinary English (or generic business words). A company whose
 * entire name is made of these will match celebrity copy, SEO junk, and homonyms.
 */
const COMMON_WORDS = new Set(
  [
    "together",
    "vision",
    "wave",
    "astra",
    "book",
    "casper",
    "class",
    "company",
    "daily",
    "education",
    "energy",
    "every",
    "family",
    "future",
    "global",
    "greenlight",
    "groove",
    "group",
    "guild",
    "harvey",
    "health",
    "honey",
    "island",
    "jump",
    "labs",
    "launchpad",
    "master",
    "medical",
    "near",
    "one",
    "orchard",
    "order",
    "overtime",
    "pay",
    "peak",
    "people",
    "scale",
    "sense",
    "shield",
    "silo",
    "spot",
    "tala",
    "the",
    "together",
    "vision",
    "wave",
  ].map((word) => word.toLowerCase()),
);

const EXPLICIT_AMBIGUOUS = new Set(
  [
    "Astra",
    "Casper",
    "Future Family",
    "Greenlight",
    "Guild",
    "Harvey",
    "Island",
    "Launchpad",
    "MST",
    "Near",
    "Orchard",
    "Overtime",
    "Peak",
    "Ro",
    "Shield",
    "Silo",
    "Wave",
    "Tala",
    "Ordergroove",
    "OneAI",
    "Spot AI",
    "Scale AI",
    "Together AI",
    "Jump",
    "HoneyBook",
    "People.ai",
  ].map((name) => name.toLowerCase()),
);

/** Generic uses of the "Future Family" collocation, not the fertility-financing company. */
const GENERIC_COLLOCATION: RegExp[] = [
  /\bfuture family\s+(plans?|feuds?|planning|goals?|size|life|members?|vacation|home)\b/i,
  /\b(her|his|their|our|my)\s+future family\b/i,
  /\bfears future family\b/i,
  /\bfuture family feud/i,
];

export interface LexicalVerdict {
  ok: boolean;
  reason: string;
}

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 0 && token !== "ai");
}

export function isCommonWordName(name: string): boolean {
  const tokens = nameTokens(name);
  if (tokens.length === 0) return true;
  if (name.replace(/\s+/g, "").length <= 3) return true;
  return tokens.every((token) => COMMON_WORDS.has(token));
}

export function isAmbiguousCompanyName(name: string): boolean {
  return EXPLICIT_AMBIGUOUS.has(name.toLowerCase()) || isCommonWordName(name);
}

const ALLOWED_NAME_FOLLOW = new Set(["ai", "inc", "ltd", "corp", "llc", "labs", "bio", "io", "app", "health"]);

/** "Astra Exploration" is a different entity than the portfolio company "Astra". */
export function isLikelyDifferentEntity(title: string, companyName: string): boolean {
  const name = companyName.trim();
  if (!name || /\s/.test(name)) return false;
  const match = title.match(new RegExp(`\\b${escapeRegExp(name)}\\s+([A-Z][A-Za-z0-9&-]*)`));
  if (!match?.[1]) return false;
  return !ALLOWED_NAME_FOLLOW.has(match[1].toLowerCase());
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = phrase.toLowerCase().trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

export function contradictsClaimedRelevance(rationale: string, companyName: string): boolean {
  const text = rationale.toLowerCase();
  const name = companyName.toLowerCase();
  if (/\b(unrelated|not relevant|namesake|homonym)\b/.test(text)) return true;
  if (new RegExp(`\\bno mention of\\s+${escapeRegExp(name)}`).test(text)) return true;
  if (new RegExp(`\\bnot (about |the company )?${escapeRegExp(name)}`).test(text)) return true;
  if (new RegExp(`\\bnot ${escapeRegExp(name)}\\b`).test(text)) return true;
  return false;
}

export function assessLexicalRelevance(
  company: Pick<Company, "name" | "aliases" | "domain" | "isAmbiguous">,
  title: string,
  snippet: string,
  url = "",
): LexicalVerdict {
  const haystack = `${title} ${snippet} ${url}`.toLowerCase();

  if (company.domain && haystack.includes(company.domain.toLowerCase())) {
    return { ok: true, reason: "domain match" };
  }

  const phrases = [company.name, ...company.aliases].map((value) => value.trim()).filter((value) => value.length >= 2);
  const phraseHit = phrases.some((phrase) => containsPhrase(haystack, phrase));

  if (!phraseHit) {
    return { ok: false, reason: `Title/snippet does not contain “${company.name}” as a company name` };
  }

  if (isCommonWordName(company.name) || company.isAmbiguous) {
    if (GENERIC_COLLOCATION.some((pattern) => pattern.test(haystack))) {
      return { ok: false, reason: "Generic collocation, not the portfolio company" };
    }
    if (isLikelyDifferentEntity(title, company.name)) {
      return { ok: false, reason: "Name appears as a different proper noun, not the portfolio company" };
    }
  }

  return { ok: true, reason: "company name present" };
}

export function applyRelevanceGate(
  company: Pick<Company, "name" | "aliases" | "domain" | "isAmbiguous">,
  mention: { title: string; snippet: string; url: string; relevant: boolean | null; rationale: string | null },
): { relevant: boolean; rationale: string } {
  const lexical = assessLexicalRelevance(company, mention.title, mention.snippet, mention.url);
  if (!lexical.ok) {
    return { relevant: false, rationale: lexical.reason };
  }
  if (mention.rationale && contradictsClaimedRelevance(mention.rationale, company.name)) {
    return { relevant: false, rationale: mention.rationale };
  }
  if (mention.relevant === true) {
    return { relevant: true, rationale: mention.rationale ?? "Model marked relevant" };
  }
  if (mention.relevant === false) {
    return { relevant: false, rationale: mention.rationale ?? "Model marked not relevant" };
  }
  return { relevant: false, rationale: mention.rationale ?? "Unclassified; not counted as coverage" };
}

export function isRelevantMention(mention: Pick<Mention, "relevant">): boolean {
  return mention.relevant === true;
}

export function applyStoredRelevance(
  company: Pick<Company, "name" | "aliases" | "domain" | "isAmbiguous">,
  mention: Mention,
): Mention {
  const gated = applyRelevanceGate(company, mention);
  if (mention.relevant === gated.relevant && (mention.rationale ?? "") === gated.rationale) return mention;
  return {
    ...mention,
    relevant: gated.relevant,
    sentiment: gated.relevant ? mention.sentiment : "neutral",
    rationale: gated.rationale,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
