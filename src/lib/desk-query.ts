import { getCompanyCoverageStatus } from "./desk-stats";
import type { CoverageStatus } from "./coverage-ui";
import type { Company, CompanyStatus } from "./types";

export type CoverageFilter = "all" | CoverageStatus;
export type SortKey = "mentions" | "recent" | "name";

export const COVERAGE_PAGE_SIZE = 20;

export interface DeskRow {
  company: Company;
  status: CompanyStatus;
}

export function filterDeskRows(
  companies: Company[],
  statusById: Map<string, CompanyStatus>,
  query: string,
  coverage: CoverageFilter,
  sortKey: SortKey,
): DeskRow[] {
  const needle = query.trim().toLowerCase();

  const filtered = companies.flatMap((company) => {
    const status = statusById.get(company.id);
    if (!status) return [];
    if (coverage !== "all" && getCompanyCoverageStatus(status) !== coverage) return [];
    if (needle) {
      const nameHit = company.name.toLowerCase().includes(needle);
      const aliasHit = company.aliases.some((alias) => alias.toLowerCase().includes(needle));
      if (!nameHit && !aliasHit) return [];
    }
    return [{ company, status }];
  });

  return filtered.sort((left, right) => compareDeskRows(left, right, sortKey));
}

export function paginateRows(rows: DeskRow[], page: number, pageSize = COVERAGE_PAGE_SIZE) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total,
    start: total === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, total),
    slice: rows.slice(start, start + pageSize),
  };
}

function compareDeskRows(left: DeskRow, right: DeskRow, sortKey: SortKey): number {
  if (sortKey === "name") return left.company.name.localeCompare(right.company.name);
  if (sortKey === "mentions") return right.status.mentionCountQuarter - left.status.mentionCountQuarter;
  const leftTime = left.status.lastMentionedAt ? Date.parse(left.status.lastMentionedAt) : 0;
  const rightTime = right.status.lastMentionedAt ? Date.parse(right.status.lastMentionedAt) : 0;
  return rightTime - leftTime;
}
