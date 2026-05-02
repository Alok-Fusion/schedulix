"use client";

import { CalendarCheck, MapPin, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker from "@/components/DatePicker";
import SlotGrid from "@/components/SlotGrid";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import { getSocket } from "@/lib/socket";

const today = () => new Date().toISOString().slice(0, 10);
const startOfDate = (date) => new Date(`${date}T00:00:00`).toISOString();
const endOfDate = (date) => new Date(`${date}T23:59:59`).toISOString();
const isSameDay = (left, right) => {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

export default function BookingWorkspace({
  appointmentId,
  shareToken,
  backHref = "/home",
  backLabel = "Back to services"
}) {
  const router = useRouter();
  const { token, hasHydrated, setBookingDraft } = useAuthStore();
  const [appointment, setAppointment] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [nextAvailableSlot, setNextAvailableSlot] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState("");

  const providerId = useMemo(
    () =>
      schedule?.providerId?._id ||
      schedule?.providerId ||
      appointment?.organiserId?._id ||
      appointment?.organiserId,
    [appointment, schedule]
  );

  useEffect(() => {
    const loadAppointment = async () => {
      if (!appointmentId && !shareToken) return;

      setLoadingAppointment(true);
      setError("");

      try {
        const endpoint = shareToken
          ? `/appointments/share/${shareToken}`
          : `/appointments/${appointmentId}`;
        const { data } = await api.get(endpoint);
        setAppointment(data.appointment);
        setSchedule(data.schedule);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoadingAppointment(false);
      }
    };

    loadAppointment();
  }, [appointmentId, shareToken]);

  const loadNextAvailableSlot = useCallback(async () => {
    if (!appointment?._id) return;

    setLoadingRecommendation(true);

    try {
      const { data } = await api.post("/slots/recommend", {
        appointmentTypeId: appointment._id,
        providerId,
        from: new Date().toISOString(),
        capacity: 1,
        strategy: "earliest"
      });
      setNextAvailableSlot(data.slot || null);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNextAvailableSlot(null);
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setLoadingRecommendation(false);
    }
  }, [appointment?._id, providerId]);

  const loadSlots = useCallback(
    async (targetDate, { keepSelection = false } = {}) => {
      if (!appointment?._id || !targetDate) return;

      setLoadingSlots(true);
      if (!keepSelection) {
        setSelectedSlot(null);
      }
      setError("");

      try {
        const { data } = await api.get("/slots", {
          params: {
            appointmentTypeId: appointment._id,
            providerId,
            from: startOfDate(targetDate),
            to: endOfDate(targetDate),
            capacity: 1
          }
        });
        const nextSlots = data.slots || [];
        setSlots(nextSlots);
        if (keepSelection) {
          setSelectedSlot((current) =>
            current
              ? nextSlots.find((item) => item.startTime === current.startTime) || null
              : null
          );
        }
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoadingSlots(false);
      }
    },
    [appointment?._id, providerId]
  );

  useEffect(() => {
    loadSlots(date);
  }, [date, loadSlots]);

  useEffect(() => {
    loadNextAvailableSlot();
  }, [loadNextAvailableSlot]);

  useEffect(() => {
    if (!appointment?._id || !providerId) return undefined;

    const socket = getSocket();
    const handleSlotUpdate = async (event) => {
      const sameAppointment = event?.appointmentTypeId === appointment._id;
      const sameProvider = !event?.providerId || event.providerId === providerId;

      if (!sameAppointment || !sameProvider) {
        return;
      }

      await Promise.all([
        loadSlots(date, { keepSelection: true }),
        loadNextAvailableSlot()
      ]);
    };

    socket.on("slot_update", handleSlotUpdate);

    return () => {
      socket.off("slot_update", handleSlotUpdate);
    };
  }, [appointment?._id, date, loadNextAvailableSlot, loadSlots, providerId]);

  const reserveSlot = async (slot) => {
    if (!hasHydrated) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (!slot?.startTime || !appointment?._id) return;

    setReserving(true);
    setError("");

    try {
      const { data } = await api.post("/bookings", {
        appointmentTypeId: appointment._id,
        providerId,
        startTime: slot.startTime,
        capacity: 1
      });
      setSlots((current) =>
        current.filter((item) => item.startTime !== slot.startTime)
      );
      setSelectedSlot((current) =>
        current?.startTime === slot.startTime ? null : current
      );
      setNextAvailableSlot((current) =>
        current?.startTime === slot.startTime ? null : current
      );
      setBookingDraft({
        appointment,
        booking: data.booking,
        slot
      });
      router.push("/confirm");
    } catch (err) {
      setError(apiErrorMessage(err));
      if (err?.response?.status === 409) {
        await Promise.all([loadSlots(date, { keepSelection: true }), loadNextAvailableSlot()]);
      }
    } finally {
      setReserving(false);
    }
  };

  const reserve = async () => {
    await reserveSlot(selectedSlot);
  };

  const autoReserve = async () => {
    await reserveSlot(nextAvailableSlot);
  };

  if (loadingAppointment) {
    return <div className="page-card h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <Link href={backHref} className="section-kicker">
              {backLabel}
            </Link>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              {appointment?.title || "Appointment"}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Reserve a live slot with a clear view of provider availability and
              confirmation requirements before you commit.
            </p>
            {appointment?.venue ? (
              <p className="mt-4 inline-flex items-start gap-2 rounded-[18px] border border-line bg-white/80 px-4 py-3 text-sm text-muted">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                <span>{appointment.venue}</span>
              </p>
            ) : null}
          </div>

          <div className="panel-muted grid gap-3 p-5 sm:min-w-[320px] sm:grid-cols-3 lg:grid-cols-1">
            {appointment?.coverImageUrl ? (
              <img
                src={resolveMediaUrl(appointment.coverImageUrl)}
                alt={appointment?.title || "Appointment"}
                className="h-40 w-full rounded-[22px] object-cover sm:col-span-3 lg:col-span-1"
              />
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Specialty
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {appointment?.specialization || "Medical service"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Duration
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {appointment?.duration || 0} minutes
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Price
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {appointment?.feeAmount > 0
                  ? formatCurrency(appointment.feeAmount, appointment.currency || "INR")
                  : "Free"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Venue
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {appointment?.venue || "Venue shared after confirmation"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="page-card h-fit p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Selection</h2>
            <button
              className="btn btn-secondary min-h-10 px-4"
              onClick={() => setDate(today())}
              type="button"
            >
              <RotateCcw size={16} />
              Today
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Provider</span>
              <select className="form-input" value={providerId || ""} disabled>
                <option value={providerId || ""}>
                  {appointment?.organiserId?.name || "Assigned provider"}
                </option>
              </select>
            </label>

            <DatePicker value={date} onChange={setDate} />

            <div className="panel-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Booking policy
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {appointment?.manualConfirmation
                  ? "Manual confirmation after reserve"
                  : "Instant confirmation path"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {appointment?.advancePayment
                  ? "Advance payment is enabled for this service."
                  : "Payment can be settled later if required."}
              </p>
            </div>

            <div className="rounded-[20px] border border-line bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} className="text-brand" />
                Auto-book first available
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                We can grab the earliest live slot for you, even if the next opening is tomorrow.
              </p>
              <button
                className="btn btn-primary mt-4 w-full"
                disabled={!nextAvailableSlot || reserving || loadingRecommendation}
                onClick={autoReserve}
                type="button"
              >
                <CalendarCheck size={16} />
                {loadingRecommendation
                  ? "Checking slots"
                  : nextAvailableSlot
                    ? "Auto-book next available"
                    : "No upcoming slot"}
              </button>
            </div>
          </div>
        </aside>

        <section className="page-card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold text-ink">Available slots</h2>
              <p className="mt-1 text-sm text-muted">
                Live capacity view for the selected day.
              </p>
            </div>
            {selectedSlot ? (
              <span className="inline-code">Slot selected</span>
            ) : (
              <span className="inline-code">Choose a time</span>
            )}
          </div>

          {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}

          <div className="mt-5">
            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              loading={loadingSlots}
            />
          </div>

          {!loadingSlots && !slots.length && nextAvailableSlot ? (
            <div className="mt-5 rounded-[24px] border border-brand/20 bg-[#fff8f8] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {isSameDay(nextAvailableSlot.startTime, new Date())
                      ? "The next open slot is still today."
                      : "Today is full, but the next open slot is ready."}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(new Date(nextAvailableSlot.startTime))}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={reserving}
                  onClick={autoReserve}
                  type="button"
                >
                  <Sparkles size={16} />
                  Book suggested slot
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Reservation window
              </p>
              <p className="mt-1 text-sm text-ink">
                Confirm within five minutes after reserving.
              </p>
            </div>
            <button
              className="btn btn-primary w-full sm:w-auto"
              disabled={!selectedSlot || reserving}
              onClick={reserve}
            >
              <CalendarCheck size={16} />
              {reserving ? "Reserving" : "Reserve slot"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
