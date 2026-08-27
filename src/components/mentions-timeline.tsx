"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineBucket, TimelineGranularity } from "@/lib/desk-stats";

interface MentionsTimelineProps {
  buckets: TimelineBucket[];
  granularity: TimelineGranularity;
  onGranularityChange: (value: TimelineGranularity) => void;
}

export function MentionsTimeline({ buckets, granularity, onGranularityChange }: MentionsTimelineProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const dataMax = useMemo(() => Math.max(0, ...buckets.map((bucket) => bucket.total)), [buckets]);
  const scale = useMemo(() => chartScale(dataMax), [dataMax]);
  const labeled = useMemo(
    () => labeledIndexes(buckets.length, granularity === "day" ? (compact ? 21 : 14) : compact ? 2 : 1),
    [buckets.length, compact, granularity],
  );
  const hovered = buckets.find((bucket) => bucket.key === hoverKey) ?? null;
  const empty = buckets.length === 0 || buckets.every((bucket) => bucket.total === 0);
  const daily = granularity === "day";
  const scrollDaily = daily && compact;

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot || !scrollDaily) return;
    plot.scrollLeft = plot.scrollWidth;
  }, [scrollDaily, buckets.length]);

  return (
    <section className="panel h-full" aria-label="Mentions over time">
      <div className="panel-head">
        <h2 className="panel-title">Mentions Over Time</h2>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <ul className="chart-legend" aria-label="Sentiment colors">
            <li>
              <span className="chart-swatch bg-positive" aria-hidden="true" />
              Positive
            </li>
            <li>
              <span className="chart-swatch bg-neutral" aria-hidden="true" />
              Neutral
            </li>
            <li>
              <span className="chart-swatch bg-negative" aria-hidden="true" />
              Negative
            </li>
          </ul>
          <div className="seg" role="group" aria-label="Chart granularity">
            <button type="button" aria-pressed={!daily} onClick={() => onGranularityChange("week")}>
              Weekly
            </button>
            <button type="button" aria-pressed={daily} onClick={() => onGranularityChange("day")}>
              Daily
            </button>
          </div>
        </div>
      </div>
      {empty ? (
        <p className="state-copy">No press mentions found for this period.</p>
      ) : (
        <div className="chart-body">
          <div className="chart-y" aria-hidden="true">
            {scale.ticks.map((tick) => (
              <span key={tick} className="num">
                {tick}
              </span>
            ))}
          </div>
          <div className="chart-plot" ref={plotRef}>
            <div
              className="timeline-scroll"
              style={scrollDaily ? { minWidth: `max(100%, ${buckets.length * 8}px)` } : undefined}
            >
              <div className="chart-grid" aria-hidden="true">
                {scale.ticks.map((tick) => (
                  <span key={tick} className={tick === 0 ? "is-baseline" : undefined} />
                ))}
              </div>
              <div className={`timeline${daily ? " timeline--day" : ""}`}>
                {buckets.map((bucket) => {
                  const height = scale.max === 0 ? 0 : (bucket.total / scale.max) * 100;
                  return (
                    <div
                      key={bucket.key}
                      className="timeline-col"
                      onMouseEnter={() => setHoverKey(bucket.key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <button
                        type="button"
                        className="timeline-stack"
                        style={{ height: `${height}%` }}
                        aria-label={`${tooltipDate(bucket.startIso, granularity)}: ${bucket.total} mentions, ${bucket.positive} positive, ${bucket.negative} negative, ${bucket.neutral} neutral`}
                        onFocus={() => setHoverKey(bucket.key)}
                        onBlur={() => setHoverKey(null)}
                        onClick={() => setHoverKey(bucket.key)}
                      >
                        {bucket.total > 0 && bucket.positive > 0 ? (
                          <span className="bg-positive" style={{ height: `${(bucket.positive / bucket.total) * 100}%` }} />
                        ) : null}
                        {bucket.total > 0 && bucket.neutral > 0 ? (
                          <span className="bg-neutral" style={{ height: `${(bucket.neutral / bucket.total) * 100}%` }} />
                        ) : null}
                        {bucket.total > 0 && bucket.negative > 0 ? (
                          <span className="bg-negative" style={{ height: `${(bucket.negative / bucket.total) * 100}%` }} />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="chart-x" aria-hidden="true">
                {buckets.map((bucket, index) =>
                  labeled.has(index) ? (
                    <span
                      key={bucket.key}
                      className={index === 0 ? "is-start" : index === buckets.length - 1 ? "is-end" : "is-mid"}
                      style={{ left: `${(index / Math.max(1, buckets.length - 1)) * 100}%` }}
                    >
                      {axisDate(bucket.startIso)}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
            {hovered ? (
              <div className="chart-tooltip" role="status">
                <p className="font-medium">{tooltipDate(hovered.startIso, granularity)}</p>
                <p className="num text-text-secondary">
                  {hovered.total} total · {hovered.positive} pos · {hovered.negative} neg · {hovered.neutral} neu
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function chartScale(maxValue: number): { max: number; ticks: number[] } {
  const max = Math.max(1, maxValue);
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough) || 0);
  const step = [1, 2, 2.5, 5, 10].map((unit) => unit * pow).find((value) => value >= rough) ?? pow * 10;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let value = top; value >= 0; value -= step) ticks.push(Number(value.toPrecision(12)));
  return { max: top, ticks };
}

function labeledIndexes(length: number, step: number): Set<number> {
  if (length <= 1) return new Set([0]);
  const labels = new Set<number>([0, length - 1]);
  if (step <= 1) {
    for (let index = 1; index < length - 1; index += 1) labels.add(index);
    return labels;
  }
  for (let index = step; index < length - 1; index += step) {
    if (index >= 2 && index <= length - 3) labels.add(index);
  }
  return labels;
}

function axisDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  return `${month} ${date.getUTCDate()}`;
}

function tooltipDate(iso: string, granularity: TimelineGranularity): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return granularity === "week" ? `Week of ${formatted}` : formatted;
}
