"use client";

import { useEffect, useRef } from "react";
import { CoverageBadge, SentimentDistribution } from "@/components/sentiment";
import { getCompanyCoverageStatus } from "@/lib/desk-stats";
import { companyInitials, formatDate, formatRelativeFromIso } from "@/lib/format";
import type { DeskRow, SortKey } from "@/lib/desk-query";

interface CoverageTableProps {
  rows: DeskRow[];
  query: string;
  sortKey: SortKey;
  selectedId: string | null;
  onSortChange: (sortKey: SortKey) => void;
  onSelect: (companyId: string) => void;
  page: number;
  totalPages: number;
  rangeLabel: string;
  onPageChange: (page: number) => void;
}

export function CoverageTable({
  rows,
  query,
  sortKey,
  selectedId,
  onSortChange,
  onSelect,
  page,
  totalPages,
  rangeLabel,
  onPageChange,
}: CoverageTableProps) {
  const selectedRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const selectByOffset = (offset: number) => {
    if (rows.length === 0) return;
    const index = Math.max(0, rows.findIndex((row) => row.company.id === selectedId));
    const next = rows[Math.min(Math.max(index + offset, 0), rows.length - 1)];
    if (next) onSelect(next.company.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="coverage-table-wrap">
        {rows.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <table className="coverage-table">
            <caption className="sr-only">
              Portfolio companies with last mention, quarter count, sentiment mix, and coverage status
            </caption>
            <thead>
              <tr>
                <th scope="col" className="col-company">
                  <SortHeader label="Company" active={sortKey === "name"} onClick={() => onSortChange("name")} />
                </th>
                <th scope="col">
                  <SortHeader
                    label="Last Mentioned"
                    active={sortKey === "recent"}
                    onClick={() => onSortChange("recent")}
                  />
                </th>
                <th scope="col" className="col-num">
                  <SortHeader
                    label="Mentions"
                    active={sortKey === "mentions"}
                    onClick={() => onSortChange("mentions")}
                  />
                </th>
                <th scope="col">
                  Sentiment
                  <span className="sr-only"> positive, neutral, negative</span>
                </th>
                <th scope="col" className="col-status">
                  Coverage Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = selectedId === row.company.id;
                const coverage = getCompanyCoverageStatus(row.status);
                return (
                  <tr
                    key={row.company.id}
                    ref={isSelected ? selectedRef : undefined}
                    tabIndex={isSelected ? 0 : -1}
                    className={isSelected ? "is-selected" : undefined}
                    onClick={() => onSelect(row.company.id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        selectByOffset(1);
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        selectByOffset(-1);
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSelect(row.company.id);
                      }
                    }}
                  >
                    <td className="col-company" title={row.company.name}>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="initials" aria-hidden="true">
                          {companyInitials(row.company.name)}
                        </span>
                        <span className="truncate font-medium">{row.company.name}</span>
                      </span>
                      {row.company.aliases.length > 0 ? (
                        <span className="sr-only">, also known as {row.company.aliases.join(", ")}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className="num text-text-secondary" title={formatDate(row.status.lastMentionedAt)}>
                        {formatRelativeFromIso(row.status.lastMentionedAt)}
                      </span>
                    </td>
                    <td className="col-num num">{row.status.mentionCountQuarter}</td>
                    <td>
                      <SentimentDistribution
                        positive={row.status.positiveCount}
                        negative={row.status.negativeCount}
                        neutral={row.status.neutralCount}
                      />
                    </td>
                    <td className="col-status">
                      <CoverageBadge status={coverage} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="pager">
        <p>{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span className="num">
            {page} / {totalPages}
          </span>
          <button type="button" className="btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className="sort-btn" aria-pressed={active} onClick={onClick}>
      {label}
      {active ? <span aria-hidden="true">▾</span> : null}
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="state-copy">
      <p className="font-medium text-text-primary">No companies match these filters</p>
      <p className="mt-1">
        {query
          ? `Nothing found for “${query}”. Try another name or alias.`
          : "Adjust the coverage filter to see companies."}
      </p>
    </div>
  );
}
