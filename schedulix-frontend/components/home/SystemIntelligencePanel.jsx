"use client";

import { ArrowUpRight, TrendingUp } from "lucide-react";
import { formatCurrency, formatCount } from "@/lib/format";

const metricCards = (metrics) => [
  {
    label: "Today's bookings",
    value: formatCount(metrics.bookingsToday),
    note: "Active queue count"
  },
  {
    label: "Peak hours",
    value: metrics.peakHours,
    note: "Most pressure in the schedule"
  },
  {
    label: "Revenue flow",
    value: formatCurrency(metrics.revenueFlow, "INR"),
    note: "Live estimate for the day"
  },
  {
    label: "Cancellation rate",
    value: `${metrics.cancellationRate}%`,
    note: "Watched for service quality"
  }
];

export default function SystemIntelligencePanel({ activityFeed, insight, metrics }) {
  return (
    <section className="grid gap-4">
      <div className="page-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">System intelligence</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Numbers keep moving because the homepage behaves like the scheduling engine itself.
            </p>
          </div>
          <span className="status-pill">
            <TrendingUp size={14} />
            Live tick
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {metricCards(metrics).map((item) => (
            <div key={item.label} className="rounded-[24px] border border-line bg-panel px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {item.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">
                {item.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="page-card p-5 sm:p-6">
        <div className="rounded-[24px] border border-brand/20 bg-[#fff7f8] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">
                Insight box
              </p>
              <p className="mt-2 text-base font-semibold text-ink">{insight}</p>
            </div>
            <ArrowUpRight size={18} className="mt-1 text-brand" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {activityFeed.map((item, index) => (
            <div key={item} className="flex gap-3 rounded-[20px] border border-line bg-white/85 px-4 py-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-panel text-xs font-semibold text-ink">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-muted">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Revenue pulse
          </p>
          <div className="mt-3 grid h-[112px] grid-cols-7 items-end gap-2">
            {metrics.trend.map((value, index) => (
              <div key={`${index}-${value}`} className="flex h-full items-end">
                <div
                  className="w-full rounded-t-[14px] bg-brand/85 transition-all"
                  style={{ height: `${Math.max(18, value)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
