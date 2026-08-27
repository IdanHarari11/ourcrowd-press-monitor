import { formatPercent } from "@/lib/format";
import type { QuarterStats } from "@/lib/desk-stats";

export function DashboardStats({ stats }: { stats: QuarterStats }) {
  return (
    <section className="kpi-strip" aria-label="Quarter summary">
      <article className="kpi-cell">
        <p className="kpi-label">Tracked Companies</p>
        <p className="kpi-value num">{stats.tracked}</p>
        <p className="kpi-meta">{formatPercent(stats.trackedShare)} of portfolio</p>
      </article>
      <article className="kpi-cell">
        <p className="kpi-label">Companies With Coverage</p>
        <p className="kpi-value num">{stats.withCoverage}</p>
        <p className="kpi-meta">{formatPercent(stats.withCoverageShare)} of portfolio</p>
      </article>
      <article className="kpi-cell">
        <p className="kpi-label">Total Mentions</p>
        <p className="kpi-value num">{stats.totalMentions}</p>
        <p className="kpi-meta">This quarter</p>
      </article>
      <article className="kpi-cell">
        <p className="kpi-label">Sentiment</p>
        <div className="kpi-sentiment">
          <SentimentDonut
            positive={stats.sentiment.positive}
            negative={stats.sentiment.negative}
            neutral={stats.sentiment.neutral}
          />
          <div className="min-w-0">
            <p className="kpi-value num kpi-value--compact">{stats.sentiment.total}</p>
            <p className="kpi-meta">
              <span className="text-positive">{stats.sentiment.positive} pos</span>
              {" · "}
              <span className="text-negative">{stats.sentiment.negative} neg</span>
              {" · "}
              {stats.sentiment.neutral} neu
            </p>
          </div>
        </div>
      </article>
      <article className="kpi-cell kpi-cell--alert">
        <p className="kpi-label">New Coverage</p>
        <p className="kpi-value num" style={{ color: "var(--alert)" }}>
          {stats.newCoverageCount}
        </p>
        <p className="kpi-meta">
          {stats.newCoverageCount === 0
            ? "None since last daily snapshot"
            : `${stats.companiesAffected} companies newly discovered`}
        </p>
      </article>
    </section>
  );
}

function SentimentDonut({
  positive,
  negative,
  neutral,
}: {
  positive: number;
  negative: number;
  neutral: number;
}) {
  const total = positive + negative + neutral;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const pos = total === 0 ? 0 : (positive / total) * circumference;
  const neu = total === 0 ? 0 : (neutral / total) * circumference;
  const neg = total === 0 ? 0 : (negative / total) * circumference;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
      {total > 0 ? (
        <>
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--positive)"
            strokeWidth="4"
            strokeDasharray={`${pos} ${circumference - pos}`}
            strokeDashoffset={0}
            transform="rotate(-90 18 18)"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--neutral)"
            strokeWidth="4"
            strokeDasharray={`${neu} ${circumference - neu}`}
            strokeDashoffset={-pos}
            transform="rotate(-90 18 18)"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--negative)"
            strokeWidth="4"
            strokeDasharray={`${neg} ${circumference - neg}`}
            strokeDashoffset={-(pos + neu)}
            transform="rotate(-90 18 18)"
          />
        </>
      ) : null}
    </svg>
  );
}
