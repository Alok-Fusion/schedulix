"use client";

import { formatCount } from "@/lib/format";

export default function Chart({
  title,
  description = "",
  data = [],
  labelKey = "label",
  valueKey = "value",
  suffix = "",
  formatValue = undefined,
  emptyMessage = "No data available."
}) {
  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <section className="page-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        <span className="inline-code">{formatCount(data.length)} points</span>
      </div>
      <div className="space-y-3">
        {data.length ? (
          data.map((item) => {
            const value = Number(item[valueKey]) || 0;
            const width = `${Math.max(4, (value / max) * 100)}%`;
            const valueText = formatValue
              ? formatValue(value, item)
              : `${formatCount(value)}${suffix}`;

            return (
              <div
                key={`${item[labelKey]}-${value}`}
                className="grid grid-cols-[120px_1fr_86px] items-center gap-3 text-sm"
              >
                <span className="truncate text-muted">{item[labelKey]}</span>
                <div className="h-3 overflow-hidden rounded-full bg-panel">
                  <div className="h-full rounded-full bg-brand" style={{ width }} />
                </div>
                <span className="text-right font-semibold text-ink">{valueText}</span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
