"use client";

import { CalendarClock, Download, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DatePicker from "@/components/DatePicker";
import SlotGrid from "@/components/SlotGrid";
import api, { apiErrorMessage } from "@/lib/api";
import { downloadAppointmentReceipt, downloadPaymentReceipt } from "@/lib/receipts";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import { getSocket } from "@/lib/socket";

const today = () => new Date().toISOString().slice(0, 10);
const startOfDate = (date) => new Date(`${date}T00:00:00`).toISOString();
const endOfDate = (date) => new Date(`${date}T23:59:59`).toISOString();
const appointmentId = (booking) =>
  String(booking.appointmentTypeId?._id || booking.appointmentTypeId || "");
const providerId = (booking) => String(booking.providerId?._id || booking.providerId || "");

export default function MyBookingsPage() {
  const router = useRouter();
  const { hasHydrated, token, setSelectedBooking } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rescheduleId, setRescheduleId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotLoading, setSlotLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/bookings/calendar");
      const flattened = (data.calendar || []).flatMap((group) => group.bookings || []);
      setBookings(flattened);
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
    const refreshBookings = () => {
      load();
    };

    socket.on("booking_created", refreshBookings);
    socket.on("booking_cancelled", refreshBookings);

    return () => {
      socket.off("booking_created", refreshBookings);
      socket.off("booking_cancelled", refreshBookings);
    };
  }, [hasHydrated, token]);

  const cancel = async (id) => {
    setError("");
    try {
      await api.post(`/bookings/${id}/cancel`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const openReschedule = async (booking) => {
    setRescheduleId(booking._id);
    setSelectedSlot(null);
    await fetchSlots(booking, rescheduleDate);
  };

  const fetchSlots = async (booking, date) => {
    setSlotLoading(true);
    setError("");
    try {
      const { data } = await api.get("/slots", {
        params: {
          appointmentTypeId: appointmentId(booking),
          providerId: providerId(booking),
          from: startOfDate(date),
          to: endOfDate(date),
          capacity: booking.capacity || 1
        }
      });
      setSlots(data.slots || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSlotLoading(false);
    }
  };

  useEffect(() => {
    if (!rescheduleId) return undefined;

    const booking = bookings.find((item) => item._id === rescheduleId);
    if (!booking) return undefined;

    const socket = getSocket();
    const handleSlotUpdate = async (event) => {
      const sameAppointment = event?.appointmentTypeId === appointmentId(booking);
      const sameProvider = !event?.providerId || event.providerId === providerId(booking);

      if (!sameAppointment || !sameProvider) {
        return;
      }

      await fetchSlots(booking, rescheduleDate);
    };

    socket.on("slot_update", handleSlotUpdate);

    return () => {
      socket.off("slot_update", handleSlotUpdate);
    };
  }, [bookings, rescheduleDate, rescheduleId]);

  const reschedule = async (booking) => {
    if (!selectedSlot) return;
    setError("");
    try {
      await api.post(`/bookings/${booking._id}/reschedule`, {
        startTime: selectedSlot.startTime,
        providerId: providerId(booking),
        capacity: booking.capacity || 1
      });
      setRescheduleId("");
      setSelectedSlot(null);
      setSlots([]);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!hasHydrated) return null;
  if (!token) {
    return (
      <div className="page-card mx-auto max-w-xl p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Login required</h1>
        <Link href="/login" className="btn btn-primary mt-5">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">My bookings</h1>
        <p className="mt-1 text-muted">Cancel or reschedule active appointments.</p>
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="space-y-4">
        {loading ? (
          <div className="page-card h-48 animate-pulse" />
        ) : bookings.length ? (
          bookings.map((booking) => {
            const active = ["reserved", "pending", "confirmed"].includes(
              booking.status
            );
            const isRescheduling = rescheduleId === booking._id;

            return (
              <article key={booking._id} className="page-card p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    {booking.appointmentTypeId?.coverImageUrl ? (
                      <img
                        src={resolveMediaUrl(booking.appointmentTypeId.coverImageUrl)}
                        alt={booking.appointmentTypeId?.title || "Appointment"}
                        className="mb-4 h-44 w-full rounded-[22px] object-cover lg:max-w-[380px]"
                      />
                    ) : null}
                    <h2 className="text-lg font-semibold text-ink">
                      {booking.appointmentTypeId?.title || "Appointment"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {formatDateTime(booking.startTime)}
                    </p>
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                      <MapPin size={15} className="mt-0.5 shrink-0" />
                      <span>
                        {booking.appointmentTypeId?.venue || "Venue shared by organiser"}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="status-pill">{booking.status}</span>
                      <span className="status-pill">
                        payment: {booking.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      {formatCurrency(
                        booking.priceAmount || 0,
                        booking.currency || booking.appointmentTypeId?.currency || "INR"
                      )}
                    </p>
                    {booking.problemImageUrl ? (
                      <div className="mt-4 max-w-xs">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Problem photo
                        </p>
                        <img
                          src={resolveMediaUrl(booking.problemImageUrl)}
                          alt="Problem upload"
                          className="h-32 w-full rounded-[18px] object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => downloadAppointmentReceipt(booking)}
                      type="button"
                    >
                      <Download size={16} />
                      Appointment receipt
                    </button>
                    {booking.paymentStatus === "paid" ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => downloadPaymentReceipt(booking)}
                        type="button"
                      >
                        <Download size={16} />
                        Payment receipt
                      </button>
                    ) : null}
                    {booking.paymentStatus !== "paid" &&
                    (booking.priceAmount || 0) > 0 &&
                    !["cancelled", "rescheduled"].includes(booking.status) ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedBooking(booking);
                          router.push("/payment");
                        }}
                      >
                        Pay now
                      </button>
                    ) : null}
                    <button
                      className="btn btn-secondary"
                      disabled={!active}
                      onClick={() => openReschedule(booking)}
                    >
                      <CalendarClock size={16} />
                      Reschedule
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={!active}
                      onClick={() => cancel(booking._id)}
                    >
                      <XCircle size={16} />
                      Cancel
                    </button>
                  </div>
                </div>

                {isRescheduling ? (
                  <div className="mt-5 border-t border-line pt-5">
                    <div className="mb-4 max-w-xs">
                      <DatePicker
                        label="New date"
                        value={rescheduleDate}
                        onChange={(value) => {
                          setRescheduleDate(value);
                          fetchSlots(booking, value);
                        }}
                      />
                    </div>
                    <SlotGrid
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelect={setSelectedSlot}
                      loading={slotLoading}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="btn btn-primary"
                        disabled={!selectedSlot}
                        onClick={() => reschedule(booking)}
                      >
                        Save new slot
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setRescheduleId("")}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
            No bookings yet.
          </div>
        )}
      </div>
    </div>
  );
}
