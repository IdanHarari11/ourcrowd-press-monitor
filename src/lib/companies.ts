import { createHash } from "node:crypto";
import { isAmbiguousCompanyName } from "./relevance";
import type { Company } from "./types";

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || createHash("sha256").update(name).digest("hex").slice(0, 12);
}

function looksLikeDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(value) && !value.includes(" ");
}

export function parseCompanyLine(line: string): Omit<Company, "id" | "isAmbiguous"> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const parenMatch = trimmed.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (!parenMatch) {
    return { name: trimmed, searchName: trimmed, aliases: [] };
  }

  const name = parenMatch[1].trim();
  const inner = parenMatch[2].trim();

  if (/^formerly\b/i.test(inner)) {
    const alias = inner.replace(/^formerly\s+(known as\s+)?/i, "").trim();
    return {
      name,
      searchName: name,
      aliases: alias ? [alias] : [],
      notes: inner,
    };
  }

  if (looksLikeDomain(inner)) {
    return {
      name,
      searchName: name,
      aliases: [],
      domain: inner.toLowerCase(),
    };
  }

  return {
    name,
    searchName: name,
    aliases: [inner],
    notes: inner,
  };
}

export function toCompany(parsed: Omit<Company, "id" | "isAmbiguous">): Company {
  return {
    ...parsed,
    id: slugify(parsed.name),
    isAmbiguous: isAmbiguousCompanyName(parsed.name),
  };
}

export function parseCompanyList(text: string): Company[] {
  const companies: Company[] = [];
  const seen = new Set<string>();

  for (const line of text.split(/\r?\n/)) {
    const parsed = parseCompanyLine(line);
    if (!parsed) continue;
    const company = toCompany(parsed);
    if (seen.has(company.id)) continue;
    seen.add(company.id);
    companies.push(company);
  }

  return companies;
}

export function buildSearchQuery(company: Company): string {
  const quotedName = `"${company.name}"`;
  if (company.domain) {
    return `${quotedName} OR ${company.domain}`;
  }

  if (company.aliases.length > 0) {
    const aliasClause = company.aliases.map((alias) => `"${alias}"`).join(" OR ");
    const base = `(${quotedName} OR ${aliasClause})`;
    return company.isAmbiguous ? `${base} (startup OR company OR "venture capital" OR OurCrowd)` : base;
  }

  if (company.isAmbiguous) {
    return `${quotedName} (startup OR company OR "venture capital" OR OurCrowd)`;
  }

  return quotedName;
}
