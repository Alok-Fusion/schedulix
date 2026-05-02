"use client";

import { CalendarClock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BookingForm from "@/components/BookingForm";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function ConfirmPage() {
  const router = useRouter();
  const { bookingDraft, setSelectedBooking, clearBookingFlow } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [problemImageUrl, setProblemImageUrl] = useState("");

  const booking = bookingDraft?.booking;
  const appointment = bookingDraft?.appointment;
  const needsPayment = appointment?.advancePayment && (booking?.priceAmount || 0) > 0;

  const confirm = async ({ answers, problemImageUrl: nextProblemImageUrl }) => {
    if (!booking?._id) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post(`/bookings/${booking._id}/confirm`, {
        answers,
        problemImageUrl: nextProblemImageUrl
      });
      setSelectedBooking(data.booking);
      if (needsPayment) {
        router.push("/payment");
      } else {
        clearBookingFlow();
        router.push("/my-bookings");
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingDraft) {
    return (
      <div className="mx-auto max-w-xl page-card p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">No reserved slot</h1>
        <p className="mt-2 text-muted">Reserve a live slot before confirming.</p>
        <Link href="/home" className="btn btn-primary mt-5">
          Find appointment
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="page-card h-fit p-5 sm:p-6">
        <div className="flex items-center gap-2 text-brand">
          <CalendarClock size={18} />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Reserved
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-ink">
          {appointment?.title}
        </h1>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-muted">Time</dt>
            <dd className="mt-1 text-ink">{formatDateTime(booking.startTime)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Capacity</dt>
            <dd className="mt-1 text-ink">{booking.capacity}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Status</dt>
            <dd className="status-pill mt-1">{booking.status}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Venue</dt>
            <dd className="mt-1 flex items-start gap-2 text-ink">
              <MapPin size={15} className="mt-0.5 text-brand" />
              <span>{appointment?.venue || "Venue shared by organiser"}</span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Amount</dt>
            <dd className="mt-1 flex items-center gap-2 text-ink">
              <Wallet size={15} className="text-brand" />
              {formatCurrency(
                booking.priceAmount || 0,
                booking.currency || appointment?.currency || "INR"
              )}
            </dd>
          </div>
        </dl>
      </aside>

      <section className="page-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-ink">Confirm details</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Reserved slots expire after five minutes until confirmed.{" "}
          {needsPayment
            ? "You will be taken to payment after confirmation."
            : "No immediate payment step is required for this booking."}
        </p>
        <div className="mt-5">
          <BookingForm
            problemImageUrl={problemImageUrl}
            questions={appointment?.questions || []}
            submitting={submitting}
            onProblemImageChange={setProblemImageUrl}
            onSubmit={confirm}
          />
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}
      </section>
    </div>
  );
}
