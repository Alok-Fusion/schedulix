"use client";

import { ArrowRight, CalendarRange, Shield, Wallet } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

const tabs = [
  { key: "patient", label: "Patient" },
  { key: "organiser", label: "Organizer" },
  { key: "admin", label: "Admin" }
];

const previewTitle = {
  patient: "Patient view",
  organiser: "Organizer view",
  admin: "Admin view"
};

export default function RolePreviewSwitcher({
  appointment,
  ctaHref,
  metrics,
  onRoleChange,
  recommendation,
  roleView,
  slots
}) {
  return (
    <section className="page-card p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 border-b border-line/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-kicker">Role switcher</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Switch roles and the workspace changes with the decision context.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onRoleChange(tab.key)}
              className={`btn min-h-10 px-4 ${
                roleView === tab.key ? "btn-primary" : "btn-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-line bg-panel px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {previewTitle[roleView]}
          </p>

          {roleView === "patient" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <CalendarRange size={16} className="text-brand" />
                  Booking path
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {appointment?.title || "Selected service"} with{" "}
                  {appointment?.organiserId?.name || "the provider"} is ready for booking.
                </p>
              </div>
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Wallet size={16} className="text-brand" />
                  What the patient sees
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Price, availability, and confirmation rules stay visible before checkout.
                </p>
              </div>
            </div>
          ) : null}

          {roleView === "organiser" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <p className="text-sm font-semibold text-ink">Live service health</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {slots.length} slots are open for the current service, and demand is clustering around{" "}
                  {metrics.peakHours}.
                </p>
              </div>
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <p className="text-sm font-semibold text-ink">Revenue watch</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Estimated flow today: {formatCurrency(metrics.revenueFlow, "INR")}.
                </p>
              </div>
            </div>
          ) : null}

          {roleView === "admin" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Shield size={16} className="text-brand" />
                  Platform stability
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Cancellations are holding at {metrics.cancellationRate}% while booking demand rises.
                </p>
              </div>
              <div className="rounded-[20px] border border-line bg-white px-4 py-4">
                <p className="text-sm font-semibold text-ink">Traffic concentration</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Admin view surfaces where staffing pressure is building before the queue breaks.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(roleView === "patient"
              ? [
                  ["Suggested slot", recommendation ? new Date(recommendation.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Waiting"],
                  ["Visible queue", `${slots.length} slots`],
                  ["Fee", appointment?.feeAmount > 0 ? formatCurrency(appointment.feeAmount, appointment.currency || "INR") : "Free"]
                ]
              : roleView === "organiser"
                ? [
                    ["Today's bookings", `${metrics.bookingsToday}`],
                    ["Peak window", metrics.peakHours],
                    ["Revenue", formatCurrency(metrics.revenueFlow, "INR")]
                  ]
                : [
                    ["Demand trend", "Rising"],
                    ["Cancellations", `${metrics.cancellationRate}%`],
                    ["Capacity use", `${metrics.occupancy[metrics.occupancy.length - 1]}%`]
                  ]).map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-line bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {label}
                </p>
                <p className="mt-3 text-lg font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-line bg-panel px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {roleView === "patient"
                  ? "Queue confidence"
                  : roleView === "organiser"
                    ? "Service occupancy"
                    : "Demand signal"}
              </p>
              <Link href={ctaHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                {roleView === "patient" ? "Try booking" : "Simulate your schedule"}
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-4 grid h-[128px] grid-cols-6 items-end gap-2">
              {(roleView === "patient"
                ? slots.slice(0, 6).map((slot) => Math.min(96, slot.remainingCapacity * 28 + slot.viewers * 8))
                : roleView === "organiser"
                  ? metrics.occupancy
                  : metrics.trend.slice(1)).map((value, index) => (
                <div key={`${roleView}-${index}-${value}`} className="flex h-full items-end">
                  <div
                    className={`w-full rounded-t-[14px] ${
                      roleView === "admin" ? "bg-accent/85" : "bg-brand/85"
                    }`}
                    style={{ height: `${Math.max(20, value)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
