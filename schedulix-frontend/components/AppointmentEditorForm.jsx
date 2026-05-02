"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ImageUploadField from "@/components/ImageUploadField";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency } from "@/lib/format";
import {
  normalizeDoctorType,
  specializationOptionsForDoctorType
} from "@/lib/medical";

const weekdays = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" }
];

const currencies = ["INR", "USD", "EUR", "GBP"];

const defaultDays = [1, 2, 3, 4, 5];

const buildInitialForm = (specializationOptions, initialValues = {}) => ({
  title: initialValues.title || "",
  description: initialValues.description || "",
  venue: initialValues.onlineVenue ? "Online" : initialValues.venue || "",
  onlineVenue: Boolean(initialValues.onlineVenue),
  coverImageUrl: initialValues.coverImageUrl || "",
  duration: initialValues.duration ?? 30,
  specialization:
    initialValues.specialization ||
    specializationOptions[0] ||
    "General Physician",
  manageCapacity: Boolean(initialValues.manageCapacity),
  maxCapacity: initialValues.maxCapacity ?? 1,
  maxBookingsPerSlot: initialValues.maxBookingsPerSlot ?? 1,
  manualConfirmation: Boolean(initialValues.manualConfirmation),
  advancePayment: Boolean(initialValues.advancePayment),
  feeAmount: initialValues.feeAmount ?? 0,
  currency: initialValues.currency || "INR",
  startTime: initialValues.startTime || "09:00",
  endTime: initialValues.endTime || "17:00",
  days: initialValues.days?.length ? initialValues.days : defaultDays,
  publishNow: initialValues.publishNow ?? true
});

export const appointmentFormValuesFromRecord = (appointment, schedule) => {
  const weeklySlots =
    schedule?.scheduleType === "weekly"
      ? (schedule.weeklySlots || []).filter((slot) => slot.isActive !== false)
      : [];
  const referenceSlot = weeklySlots[0];

  return {
    title: appointment?.title || "",
    description: appointment?.description || "",
    venue: appointment?.venue === "Online" ? "Online" : appointment?.venue || "",
    onlineVenue: appointment?.venue === "Online",
    coverImageUrl: appointment?.coverImageUrl || "",
    duration: appointment?.duration ?? 30,
    specialization: appointment?.specialization || "",
    manageCapacity: Boolean(appointment?.manageCapacity),
    maxCapacity: appointment?.maxCapacity ?? 1,
    maxBookingsPerSlot: appointment?.maxBookingsPerSlot ?? 1,
    manualConfirmation: Boolean(appointment?.manualConfirmation),
    advancePayment: Boolean(appointment?.advancePayment),
    feeAmount: appointment?.feeAmount ?? 0,
    currency: appointment?.currency || "INR",
    startTime: referenceSlot?.startTime || "09:00",
    endTime: referenceSlot?.endTime || "17:00",
    days: weeklySlots.length
      ? [...new Set(weeklySlots.map((slot) => slot.dayOfWeek))]
      : defaultDays,
    publishNow: Boolean(appointment?.isPublished)
  };
};

export default function AppointmentEditorForm({
  mode = "create",
  initialValues,
  loading = false,
  error = "",
  onSubmit
}) {
  const { user } = useAuthStore();
  const organiserDoctorType = normalizeDoctorType(user?.doctorType);
  const specializationOptions = useMemo(
    () => specializationOptionsForDoctorType(organiserDoctorType),
    [organiserDoctorType]
  );
  const [form, setForm] = useState(() =>
    buildInitialForm(specializationOptions, initialValues)
  );
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setForm(buildInitialForm(specializationOptions, initialValues));
  }, [initialValues, specializationOptions]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day]
    }));
  };

  const amountPreview = useMemo(
    () => formatCurrency(form.feeAmount || 0, form.currency || "INR"),
    [form.currency, form.feeAmount]
  );

  const submit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!form.days.length) {
      setLocalError("Select at least one working day.");
      return;
    }

    if (Number(form.feeAmount) < 0) {
      setLocalError("Appointment amount cannot be negative.");
      return;
    }

    if (form.advancePayment && Number(form.feeAmount) <= 0) {
      setLocalError("Set a positive amount before enabling advance payment.");
      return;
    }

    if (!form.onlineVenue && !String(form.venue || "").trim()) {
      setLocalError("Provide a venue or select Online consultation.");
      return;
    }

    const weeklySlots = form.days.map((dayOfWeek) => ({
      dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      isActive: true
    }));

    await onSubmit({
      title: form.title,
      description: form.description,
      venue: form.onlineVenue ? "Online" : form.venue,
      coverImageUrl: form.coverImageUrl,
      duration: Number(form.duration),
      specialization: form.specialization,
      manageCapacity: form.manageCapacity,
      maxCapacity: form.manageCapacity ? Number(form.maxCapacity) : 1,
      maxBookingsPerSlot: form.manageCapacity
        ? Number(form.maxBookingsPerSlot)
        : 1,
      manualConfirmation: form.manualConfirmation,
      advancePayment: form.advancePayment,
      feeAmount: Number(form.feeAmount),
      currency: form.currency,
      schedule: {
        scheduleType: "weekly",
        weeklySlots
      },
      publishNow: Boolean(form.publishNow)
    });
  };

  const isCreate = mode === "create";
  const heading = isCreate
    ? "Define the experience, amount, and schedule in one place."
    : "Refine the service, timing, and booking rules without rebuilding it.";
  const intro = isCreate
    ? "Set a clear title, a patient-friendly price, and the rules that shape how bookings will be confirmed and paid."
    : "Keep the published service current while preserving the booking flow patients already use.";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <p className="section-kicker">{isCreate ? "Create a service" : "Edit service"}</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              {heading}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">{intro}</p>
          </div>
          <Link href="/organiser/appointments" className="btn btn-secondary">
            Back to services
          </Link>
        </div>
      </section>

      <form className="page-card space-y-6 p-6 sm:p-8" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Title</span>
            <input
              className="form-input"
              required
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Specialization</span>
            <select
              className="form-input"
              disabled
              value={form.specialization}
              onChange={(event) => update("specialization", event.target.value)}
            >
              {specializationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">
              This service specialization is locked to the organiser doctor type.
            </p>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Description</span>
          <textarea
            className="form-input min-h-28"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Venue</span>
          <input
            className="form-input"
            disabled={form.onlineVenue}
            placeholder={
              form.onlineVenue
                ? "Online consultation"
                : "Clinic, hospital, or consultation address"
            }
            value={form.venue}
            onChange={(event) => update("venue", event.target.value)}
          />
          <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.onlineVenue}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  onlineVenue: event.target.checked,
                  venue: event.target.checked ? "Online" : ""
                }))
              }
            />
            Select venue as Online
          </label>
          <p className="mt-2 text-xs text-muted">
            If you do not want to share a physical location, choose Online and we will show that to patients.
          </p>
        </label>

        <ImageUploadField
          category="services"
          helperText="This image appears on the public service cards and booking screens."
          label="Service image"
          value={form.coverImageUrl}
          onChange={(value) => update("coverImageUrl", value)}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Duration</span>
            <input
              className="form-input"
              type="number"
              min="5"
              value={form.duration}
              onChange={(event) => update("duration", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Amount</span>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              value={form.feeAmount}
              onChange={(event) => update("feeAmount", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Currency</span>
            <select
              className="form-input"
              value={form.currency}
              onChange={(event) => update("currency", event.target.value)}
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <div className="panel-muted px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Patient price
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">{amountPreview}</p>
            <p className="mt-1 text-xs text-muted">Shown during booking and payment.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Max capacity</span>
            <input
              className="form-input"
              type="number"
              min="1"
              disabled={!form.manageCapacity}
              value={form.maxCapacity}
              onChange={(event) => update("maxCapacity", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Bookings per slot</span>
            <input
              className="form-input"
              type="number"
              min="1"
              disabled={!form.manageCapacity}
              value={form.maxBookingsPerSlot}
              onChange={(event) => update("maxBookingsPerSlot", event.target.value)}
            />
          </label>
          <div className="panel-muted px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Confirmation style
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {form.manualConfirmation
                ? "Manual review before confirmation"
                : "Instant confirmation after reserve"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["manageCapacity", "Manage capacity"],
            ["manualConfirmation", "Manual confirmation"],
            ["advancePayment", "Advance payment"],
            ["publishNow", isCreate ? "Publish now" : "Published after save"]
          ].map(([field, label]) => (
            <label
              key={field}
              className="panel-muted flex items-center gap-3 px-4 py-4 text-sm font-semibold text-ink"
            >
              <input
                type="checkbox"
                checked={Boolean(form[field])}
                onChange={(event) => update(field, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-semibold text-ink">Weekly schedule</h2>
              <p className="mt-1 text-sm text-muted">
                Use the service editor for the main weekly schedule, then fine-tune availability from the organiser calendar if needed.
              </p>
            </div>
            <Link href="/organiser/calendar" className="btn btn-secondary">
              Manage schedule
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {weekdays.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`btn ${
                  form.days.includes(day.value) ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => toggleDay(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Start time</span>
              <input
                className="form-input"
                type="time"
                value={form.startTime}
                onChange={(event) => update("startTime", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">End time</span>
              <input
                className="form-input"
                type="time"
                value={form.endTime}
                onChange={(event) => update("endTime", event.target.value)}
              />
            </label>
          </div>
        </section>

        {error || localError ? (
          <p className="text-sm font-semibold text-danger">{error || localError}</p>
        ) : null}

        <button className="btn btn-primary" disabled={loading}>
          <Save size={16} />
          {loading
            ? "Saving"
            : isCreate
              ? "Create service"
              : "Save service changes"}
        </button>
      </form>
    </div>
  );
}
