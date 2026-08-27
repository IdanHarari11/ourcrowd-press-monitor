import { COVERAGE_SECTION, SENTIMENT_CHIP, UNCLASSIFIED_CHIP, type CoverageStatus } from "@/lib/coverage-ui";
import { getCompanyCoverageStatus } from "@/lib/desk-stats";
import type { CompanyStatus, Sentiment } from "@/lib/types";

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) {
    return <span className={UNCLASSIFIED_CHIP}>Unclassified</span>;
  }

  return <span className={SENTIMENT_CHIP[sentiment]}>{sentiment}</span>;
}

export function CoverageBadge({ status }: { status: CoverageStatus }) {
  const section = COVERAGE_SECTION[status];
  return <span className={section.chipClass}>{section.shortLabel}</span>;
}

export function StatusChip({ status }: { status: CompanyStatus }) {
  return <CoverageBadge status={getCompanyCoverageStatus(status)} />;
}

export function SentimentBar({
  positive,
  negative,
  neutral,
}: {
  positive: number;
  negative: number;
  neutral: number;
}) {
  const total = positive + negative + neutral;
  if (total === 0) {
    return <div className="sentiment-bar" aria-hidden="true" />;
  }

  return (
    <div
      className="sentiment-bar"
      role="img"
      aria-label={`${positive} positive, ${neutral} neutral, ${negative} negative`}
    >
      {positive > 0 ? <span className="bg-positive" style={{ width: `${(positive / total) * 100}%` }} /> : null}
      {neutral > 0 ? <span className="bg-neutral" style={{ width: `${(neutral / total) * 100}%` }} /> : null}
      {negative > 0 ? <span className="bg-negative" style={{ width: `${(negative / total) * 100}%` }} /> : null}
    </div>
  );
}

export function SentimentDistribution({
  positive,
  negative,
  neutral,
}: {
  positive: number;
  negative: number;
  neutral: number;
}) {
  const total = positive + negative + neutral;
  if (total === 0) {
    return <span className="text-[11px] text-text-secondary">No articles</span>;
  }

  return (
    <div className="sentiment-mix">
      <SentimentBar positive={positive} negative={negative} neutral={neutral} />
      <p className="num shrink-0 text-[11px] text-text-secondary">
        <span className="sr-only">
          {positive} positive, {neutral} neutral, {negative} negative
        </span>
        <span aria-hidden="true">
          {positive} / {neutral} / {negative}
        </span>
      </p>
    </div>
  );
}
