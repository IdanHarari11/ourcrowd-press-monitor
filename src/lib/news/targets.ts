import type { Company, CompanyStatus } from "../types";

const RECENCY_RANK: Record<CompanyStatus["recency"], number> = {
  none: 0,
  cold: 1,
  warm: 2,
  hot: 3,
};

export interface CollectTargetOptions {
  limit?: number;
  preferStale?: boolean;
}

/**
 * Local full runs keep list order. Cloud Daily Check prefers companies with
 * no/stale coverage so a short batch still moves the desk forward.
 */
export function selectCompaniesForCollect(
  companies: Company[],
  statuses: CompanyStatus[],
  options: CollectTargetOptions = {},
): Company[] {
  const { limit, preferStale } = options;
  let ordered = companies;
  if (preferStale) {
    const rankById = new Map(statuses.map((status) => [status.companyId, RECENCY_RANK[status.recency]]));
    ordered = [...companies].sort((a, b) => {
      const rankDelta = (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0);
      if (rankDelta !== 0) return rankDelta;
      return a.name.localeCompare(b.name);
    });
  }
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return ordered.slice(0, limit);
  }
  return ordered;
}
