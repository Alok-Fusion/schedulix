"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

const timeLabel = (value) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export default function LiveBookingSimulation({
  appointment,
  appointments,
  ctaHref,
  date,
  heldSlotTime,
  loading,
  onAppointmentChange,
  onDateChange,
  onReleaseHold,
  onSelectSlot,
  providerId,
  recommendation,
  selectedAppointmentId,
  selectedConflict,
  selectedSlot,
  slots,
  token,
  useDemoData,
  userRole
}) {
  return (
    <section className="page-card p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 border-b border-line/80 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-kicker">Live booking simulation</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="status-pill">
              <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              {useDemoData ? "Demo signal layer" : "Public availability feed"}
            </span>
            <span className="status-pill">
              <Activity size={14} />
              {slots.length} visible slots
            </span>
            <span className="status-pill">
              <ShieldCheck size={14} />
              {token && userRole === "customer"
                ? "Conflict checks active"
                : "Conflict checks on sign-in"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-[220px]">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Service
            </span>
            <select
              className="form-input"
              value={selectedAppointmentId}
              onChange={(event) => onAppointmentChange(event.target.value)}
            >
              {appointments.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-[220px]">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Date
            </span>
            <input
              className="form-input"
              min={new Date().toISOString().slice(0, 10)}
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <div className="panel-muted p-5">
            {appointment?.coverImageUrl ? (
              <img
                src={resolveMediaUrl(appointment.coverImageUrl)}
                alt={appointment?.title || "Service"}
                className="mb-4 h-44 w-full rounded-[22px] object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Selected doctor
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {appointment?.organiserId?.name || "Assigned provider"}
                </p>
              </div>
              {appointment?.organiserId?.profileImageUrl ? (
                <img
                  src={resolveMediaUrl(appointment.organiserId.profileImageUrl)}
                  alt={appointment?.organiserId?.name || "Provider"}
                  className="h-14 w-14 rounded-[18px] object-cover"
                />
              ) : null}
              <span className="status-pill">
                <Clock3 size={14} />
                {appointment?.duration || 0} min
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-line bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Price
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {appointment?.feeAmount > 0
                    ? formatCurrency(appointment.feeAmount, appointment.currency || "INR")
                    : "Free"}
                </p>
              </div>
              <div className="rounded-[20px] border border-line bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Specialty
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {appointment?.specialization || "Medical service"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted">
              Provider path: {providerId || "Auto-assigned"}.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-line bg-white/85 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} className="text-brand" />
                Best time based on your history
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {recommendation
                  ? `${timeLabel(recommendation.startTime)} is currently the cleanest path through the queue.`
                  : "The engine is waiting for the next clean recommendation."}
              </p>
              {recommendation ? (
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(recommendation.startTime)}
                </p>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-line bg-white/85 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <AlertTriangle size={16} className="text-brand" />
                Conflict detection
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {selectedConflict
                  ? `This overlaps with ${selectedConflict.title}.`
                  : token && userRole === "customer"
                    ? "No appointment conflict is detected for the current hold."
                    : "Sign in as a patient to compare this hold against your real bookings."}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-[420px] rounded-[28px] border border-line bg-panel/70 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Live slot wall
              </p>
              <p className="mt-1 text-sm text-muted">
                Only bookable future times stay in the queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {heldSlotTime ? (
                <button className="btn btn-secondary min-h-10 px-4" onClick={onReleaseHold}>
                  Release hold
                </button>
              ) : null}
              <Link href={ctaHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                Try booking
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[108px] rounded-[22px] border border-line bg-white/70 animate-pulse"
                  />
                ))
              : slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => onSelectSlot(slot)}
                    className="rounded-[22px] border border-line bg-white px-4 py-4 text-left transition hover:border-brand/40 hover:bg-[#fff9fa]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {timeLabel(slot.startTime)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {slot.viewers} users viewing this slot
                        </p>
                      </div>
                      <span className="status-pill">{slot.remainingCapacity} left</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                      <span>{slot.demand}</span>
                      <span>Live concurrency watch</span>
                    </div>
                  </button>
                ))}
          </div>

          {!loading && !slots.length ? (
            <div className="empty-state mt-4 p-6 text-center text-sm text-muted">
              No future slots are open for this date.
            </div>
          ) : null}

          {selectedSlot ? (
            <div className="mt-4 rounded-[24px] border border-brand/20 bg-white px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {timeLabel(selectedSlot.startTime)} is now being held.
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    It disappears from the queue to simulate real contention.
                  </p>
                </div>
                <Link href={ctaHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                  Simulate your schedule
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
