"use client";

import { useEffect, useRef } from "react";
import { CoverageBadge, SentimentBadge, SentimentDistribution } from "@/components/sentiment";
import { getCompanyCoverageStatus } from "@/lib/desk-stats";
import { formatDateTime, formatRelativeFromIso, relevantMentionsForCompany } from "@/lib/format";
import type { Company, CompanyStatus, Mention } from "@/lib/types";

interface CompanyDetailsDrawerProps {
  company: Company | null;
  status: CompanyStatus | null;
  mentions: Mention[];
  open: boolean;
  onClose: () => void;
}

export function CompanyDetailsDrawer({ company, status, mentions, open, onClose }: CompanyDetailsDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!company || !status) return null;

  const companyMentions = relevantMentionsForCompany(mentions, company.id);
  const coverage = getCompanyCoverageStatus(status);

  return (
    <>
      <button type="button" className="drawer-scrim" aria-label="Close company details" onClick={onClose} />
      <aside
        ref={panelRef}
        className={`drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-drawer-title"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.06em] text-text-secondary uppercase">Company</p>
            <h2 id="company-drawer-title" className="mt-1 text-[17px] leading-tight font-semibold">
              {company.name}
            </h2>
            {company.aliases.length > 0 ? (
              <p className="mt-1 text-[12px] text-text-secondary">Also known as {company.aliases.join(", ")}</p>
            ) : null}
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-[11px] text-text-secondary uppercase">Coverage Status</p>
            <div className="mt-1">
              <CoverageBadge status={coverage} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary uppercase">Last Mentioned</p>
            <p className="num mt-1 text-[13px]" title={formatDateTime(status.lastMentionedAt)}>
              {formatRelativeFromIso(status.lastMentionedAt)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary uppercase">Quarter Mentions</p>
            <p className="num mt-1 text-[18px] font-semibold">{status.mentionCountQuarter}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-secondary uppercase">Sentiment</p>
            <div className="mt-2">
              <SentimentDistribution
                positive={status.positiveCount}
                negative={status.negativeCount}
                neutral={status.neutralCount}
              />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className="px-4 py-2 text-[15px] font-semibold">Latest Mentions</h3>
          {companyMentions.length === 0 ? (
            <p className="state-copy">No press mentions found for this period.</p>
          ) : (
            <ul>
              {companyMentions.map((mention) => (
                <li key={mention.id} className="border-t border-border px-4 py-3">
                  <p className="text-[11px] text-text-secondary">
                    {mention.sourceName} · {formatDateTime(mention.publishedAt)}
                  </p>
                  <p className="mt-1 text-[13px] font-medium">{mention.title}</p>
                  {mention.rationale ? (
                    <p className="mt-1 text-[12px] text-text-secondary">{mention.rationale}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SentimentBadge sentiment={mention.sentiment} />
                    <a
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-accent hover:underline"
                    >
                      Open original article ↗
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
