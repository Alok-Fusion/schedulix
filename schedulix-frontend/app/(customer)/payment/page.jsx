"use client";

import { CheckCircle2, Download, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PaymentButtons from "@/components/PaymentButtons";
import { downloadAppointmentReceipt, downloadPaymentReceipt } from "@/lib/receipts";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency } from "@/lib/format";

export default function PaymentPage() {
  const { selectedBooking, bookingDraft, clearBookingFlow } = useAuthStore();
  const [paid, setPaid] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const booking = completedBooking || selectedBooking || bookingDraft?.booking;
  const receiptBooking =
    booking && bookingDraft?.appointment
      ? {
          ...booking,
          appointmentTypeId:
            typeof booking.appointmentTypeId === "object" && booking.appointmentTypeId
              ? booking.appointmentTypeId
              : bookingDraft.appointment
        }
      : booking;
  const amount = booking?.priceAmount || 0;
  const currency = booking?.currency || bookingDraft?.appointment?.currency || "INR";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="hero-panel p-6 sm:p-8">
        <p className="section-kicker">Payment step</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Complete payment and finish the booking journey cleanly.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          The payment record is tied to this booking so both the patient and the
          organiser can track status with confidence.
        </p>
      </section>

      <section className="page-card p-6 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel-muted p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Booking reference
            </p>
            <p className="mt-2 break-all text-base font-semibold text-ink">
              {booking?._id || "No booking selected"}
            </p>
          </div>
          <div className="panel-muted p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Amount due
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
              <Wallet size={18} className="text-brand" />
              {formatCurrency(amount, currency)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <PaymentButtons
            bookingId={booking?._id}
            onSuccess={(nextBooking) => {
              setCompletedBooking(nextBooking);
              setPaid(true);
              clearBookingFlow();
            }}
          />
        </div>

        {paid ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-[20px] border border-line bg-panel p-4 text-ink">
              <CheckCircle2 size={18} className="text-brand" />
              <span className="font-semibold">Payment successful.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => downloadPaymentReceipt(receiptBooking)}
                type="button"
              >
                <Download size={16} />
                Payment receipt
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => downloadAppointmentReceipt(receiptBooking)}
                type="button"
              >
                <Download size={16} />
                Appointment receipt
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Link href="/my-bookings" className="btn btn-secondary">
        View my bookings
      </Link>
    </div>
  );
}
