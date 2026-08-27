import { Search } from "lucide-react";
import { FilterSelect } from "@/components/filter-select";
import { COVERAGE_ORDER, COVERAGE_SECTION } from "@/lib/coverage-ui";
import type { CoverageFilter, SortKey } from "@/lib/desk-query";

const COVERAGE_OPTIONS = [
  ["all", "All coverage"],
  ...COVERAGE_ORDER.map((status) => [status, COVERAGE_SECTION[status].title] as const),
] as const;

const SORT_OPTIONS = [
  ["recent", "Most recently mentioned"],
  ["mentions", "Most mentions"],
  ["name", "Name A–Z"],
] as const;

interface CoverageFiltersProps {
  query: string;
  coverage: CoverageFilter;
  sortKey: SortKey;
  onQueryChange: (value: string) => void;
  onCoverageChange: (value: CoverageFilter) => void;
  onSortChange: (value: SortKey) => void;
  shown: number;
  total: number;
}

export function CoverageFilters({
  query,
  coverage,
  sortKey,
  onQueryChange,
  onCoverageChange,
  onSortChange,
  shown,
  total,
}: CoverageFiltersProps) {
  return (
    <div className="desk-toolbar">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium tracking-[0.06em] text-text-secondary uppercase">
        Search
        <span className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search companies…"
            className="h-8 w-full rounded-sm border border-border bg-background pr-3 pl-8 font-sans text-[13px] tracking-normal text-text-primary normal-case placeholder:text-text-secondary"
          />
        </span>
      </label>
      <FilterSelect
        label="Coverage"
        value={coverage}
        onChange={(value) => onCoverageChange(value as CoverageFilter)}
        options={COVERAGE_OPTIONS}
      />
      <FilterSelect
        label="Sort"
        value={sortKey}
        onChange={(value) => onSortChange(value as SortKey)}
        options={SORT_OPTIONS}
      />
      <p className="desk-toolbar-count pb-1 text-[11px] text-text-secondary" role="status" aria-atomic="true">
        Showing {shown} of {total}
      </p>
    </div>
  );
}
