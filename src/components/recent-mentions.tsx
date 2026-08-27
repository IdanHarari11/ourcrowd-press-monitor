"use client";

import { SentimentBadge } from "@/components/sentiment";
import { formatRelativeFromIso } from "@/lib/format";
import type { Mention } from "@/lib/types";

interface RecentMentionsProps {
  mentions: Mention[];
  onOpenCompany: (companyId: string) => void;
}

export function RecentMentions({ mentions, onOpenCompany }: RecentMentionsProps) {
  return (
    <section className="panel" aria-label="Recent mentions">
      <div className="panel-head">
        <h2 className="panel-title">Recent Mentions</h2>
      </div>
      {mentions.length === 0 ? (
        <p className="state-copy">No press mentions found for this period.</p>
      ) : (
        <ul className="mention-list">
          {mentions.map((mention) => (
            <li key={mention.id}>
              <button type="button" className="mention-row" onClick={() => onOpenCompany(mention.companyId)}>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{mention.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
                    {mention.companyName} · {mention.sourceName} · {formatRelativeFromIso(mention.publishedAt)}
                  </span>
                </span>
                <SentimentBadge sentiment={mention.sentiment} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
