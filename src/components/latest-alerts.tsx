"use client";

import { formatLastRun } from "@/lib/format";
import type { AlertEvent } from "@/lib/desk-stats";

interface LatestAlertsProps {
  events: AlertEvent[];
}

export function LatestAlerts({ events }: LatestAlertsProps) {
  const event = events[0] ?? null;

  return (
    <section className="panel" aria-label="Latest alerts">
      <div className="panel-head">
        <h2 className="panel-title">Latest Alerts</h2>
        {event ? <p className="panel-meta">{formatLastRun(event.generatedAt)}</p> : null}
      </div>
      {event ? (
        <div className="min-h-0 overflow-auto px-3 py-2">
          <p className="text-[13px] font-medium" style={{ color: event.newMentionCount > 0 ? "var(--alert)" : undefined }}>
            {event.newMentionCount > 0
              ? `Daily check found ${event.newMentionCount} new mention${event.newMentionCount === 1 ? "" : "s"} across ${event.companiesAffected} companies.`
              : "Daily check found no new coverage."}
          </p>
          {event.samples.length > 0 ? (
            <ul className="mt-2">
              {event.samples.map((sample) => (
                <li key={`${sample.url}-${sample.title}`} className="border-t border-border py-1.5 first:border-t-0">
                  <a
                    href={sample.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[13px] hover:text-accent"
                  >
                    {sample.title}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                  <p className="text-[11px] text-text-secondary">{sample.companyName}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="state-copy">No daily alert file yet. Run Daily Check to generate one.</p>
      )}
    </section>
  );
}
