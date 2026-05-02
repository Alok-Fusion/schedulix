"use client";

import { CheckCircle2, Download, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { downloadAppointmentReceipt, downloadPaymentReceipt } from "@/lib/receipts";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import { getSocket } from "@/lib/socket";

const statuses = ["all", "reserved", "pending", "confirmed", "cancelled", "rescheduled"];

export default function OrganiserBookingsPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/bookings/calendar");
      setBookings((data.calendar || []).flatMap((group) => group.bookings || []));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated && token) load();
  }, [hasHydrated, token]);

  useEffect(() => {
    if (!hasHydrated || !token) return undefined;

    const socket = getSocket();
    const refresh = () => {
      load();
    };

    socket.on("booking_created", refresh);
    socket.on("booking_cancelled", refresh);

    return () => {
      socket.off("booking_created", refresh);
      socket.off("booking_cancelled", refresh);
    };
  }, [hasHydrated, token]);

  const filtered = useMemo(() => {
    if (status === "all") return bookings;
    return bookings.filter((booking) => booking.status === status);
  }, [bookings, status]);

  const approve = async (booking) => {
    setError("");
    try {
      await api.post(`/bookings/${booking._id}/confirm`, {
        answers: booking.answers || []
      });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const reject = async (booking) => {
    setError("");
    try {
      await api.post(`/bookings/${booking._id}/cancel`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Bookings</h1>
          <p className="mt-1 text-muted">
            Review patient bookings, uploaded problem photos, and confirmation status.
          </p>
        </div>
        <select
          className="form-input w-full sm:w-56"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4">
        {loading ? (
          <div className="page-card h-48 animate-pulse" />
        ) : filtered.length ? (
          filtered.map((booking) => (
            <article key={booking._id} className="page-card p-5 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  {booking.appointmentTypeId?.coverImageUrl ? (
                    <img
                      src={resolveMediaUrl(booking.appointmentTypeId.coverImageUrl)}
                      alt={booking.appointmentTypeId?.title || "Service"}
                      className="mb-4 h-48 w-full rounded-[24px] object-cover"
                    />
                  ) : null}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-ink">
                        {booking.appointmentTypeId?.title || "Appointment"}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {formatDateTime(booking.startTime)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="status-pill">{booking.status}</span>
                      <span className="status-pill">payment: {booking.paymentStatus}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Customer
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        {booking.customerId?.profileImageUrl ? (
                          <img
                            src={resolveMediaUrl(booking.customerId.profileImageUrl)}
                            alt={booking.customerId?.name || "Customer"}
                            className="h-10 w-10 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {booking.customerId?.name || "Customer"}
                          </p>
                          <p className="text-xs text-muted">
                            {booking.customerId?.email || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Value
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {formatCurrency(
                          booking.priceAmount || 0,
                          booking.currency || booking.appointmentTypeId?.currency || "INR"
                        )}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Intake answers
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {(booking.answers || []).length || 0} captured
                      </p>
                    </div>
                  </div>

                  {(booking.answers || []).length ? (
                    <div className="mt-4 rounded-[20px] border border-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Submitted answers
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {booking.answers.map((answer) => (
                          <div key={answer.key} className="rounded-[16px] border border-line bg-panel px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                              {answer.key}
                            </p>
                            <p className="mt-2 text-sm text-ink">{String(answer.value ?? "")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-line bg-panel p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Problem photo
                    </p>
                    {booking.problemImageUrl ? (
                      <img
                        src={resolveMediaUrl(booking.problemImageUrl)}
                        alt="Problem upload"
                        className="mt-3 h-56 w-full rounded-[20px] object-cover"
                      />
                    ) : (
                      <div className="mt-3 flex h-56 items-center justify-center rounded-[20px] border border-dashed border-line bg-white text-sm text-muted">
                        No photo uploaded
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-secondary min-h-10"
                      onClick={() => downloadAppointmentReceipt(booking)}
                      type="button"
                    >
                      <Download size={15} />
                      Appointment PDF
                    </button>
                    {booking.paymentStatus === "paid" ? (
                      <button
                        className="btn btn-secondary min-h-10"
                        onClick={() => downloadPaymentReceipt(booking)}
                        type="button"
                      >
                        <Download size={15} />
                        Payment PDF
                      </button>
                    ) : null}
                    <button
                      className="btn btn-secondary min-h-10"
                      disabled={booking.status !== "pending"}
                      onClick={() => approve(booking)}
                    >
                      <CheckCircle2 size={15} />
                      Approve
                    </button>
                    <button
                      className="btn btn-danger min-h-10"
                      disabled={!["reserved", "pending", "confirmed"].includes(booking.status)}
                      onClick={() => reject(booking)}
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state p-8 text-center text-muted">
            No bookings match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
