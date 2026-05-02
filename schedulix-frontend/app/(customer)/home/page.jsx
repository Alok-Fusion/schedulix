"use client";

import { CalendarClock, CalendarPlus, Filter, MapPin, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCount, formatCurrency, formatDateTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

export default function CustomerHomePage() {
  const { token, user, hasHydrated } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [insights, setInsights] = useState(null);
  const [specialization, setSpecialization] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState("");

  const specializationOptions = useMemo(() => {
    const dynamicOptions = Array.from(
      new Set(appointments.map((item) => item.specialization).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));

    return ["All", ...dynamicOptions];
  }, [appointments]);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/appointments");
        setAppointments(data.appointments || []);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  useEffect(() => {
    const loadInsights = async () => {
      if (!token || user?.role !== "customer") return;
      setInsightsLoading(true);
      try {
        const { data } = await api.get("/bookings/insights");
        setInsights(data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setInsightsLoading(false);
      }
    };

    if (hasHydrated) {
      loadInsights();
    }
  }, [hasHydrated, token, user?.role]);

  useEffect(() => {
    if (!specializationOptions.includes(specialization)) {
      setSpecialization("All");
    }
  }, [specialization, specializationOptions]);

  const visible = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return appointments.filter((item) => {
      const matchesSpecialization =
        specialization === "All" || item.specialization === specialization;

      if (!matchesSpecialization) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        item.title,
        item.description,
        item.specialization,
        item.venue,
        item.organiserId?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [appointments, searchTerm, specialization]);

  const providerCount = useMemo(
    () =>
      new Set(
        appointments.map((item) => item.organiserId?._id || item.organiserId).filter(Boolean)
      ).size,
    [appointments]
  );

  const discoveryOverview = useMemo(
    () => [
      {
        label: "Published services",
        value: formatCount(appointments.length),
        note: "Available to browse now"
      },
      {
        label: specialization === "All" ? "Matching now" : `${specialization} matches`,
        value: formatCount(visible.length),
        note: "Filtered by your current view"
      },
      {
        label: "Providers",
        value: formatCount(providerCount),
        note: "Distinct clinicians on the board"
      }
    ],
    [appointments.length, providerCount, specialization, visible.length]
  );

  const careOverview = useMemo(() => {
    if (!insights?.summary) return [];

    return [
      {
        label: "Upcoming care",
        value: formatCount(insights.summary.upcomingBookings),
        note: "Confirmed or active visits ahead"
      },
      {
        label: "Awaiting confirmation",
        value: formatCount(insights.summary.awaitingConfirmation),
        note: "Reserved or pending bookings"
      },
      {
        label: "Total spent",
        value: formatCurrency(
          insights.summary.totalSpent,
          insights.summary.currency || "INR"
        ),
        note: "Paid bookings in the current range"
      },
      {
        label: "Upcoming value",
        value: formatCurrency(
          insights.summary.upcomingValue,
          insights.summary.currency || "INR"
        ),
        note: "What your active bookings are worth"
      }
    ];
  }, [insights]);

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.95fr] lg:items-end">
          <div>
            <p className="section-kicker">
              {token ? "Your care board" : "Care discovery"}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              {token
                ? "See what is booked, what is next, and where you can reserve more care."
                : "Find the right appointment without the back and forth."}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Browse provider services, see live slot availability, and move
              from discovery to confirmation in one calm flow.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
              {(careOverview.length ? careOverview.slice(0, 3) : discoveryOverview).map(
                (item) => (
                  <div key={item.label} className="metric-card px-4 py-4">
                    <p className="text-sm font-semibold text-muted">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{item.note}</p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="panel-muted p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Filter size={15} className="text-brand" />
              Narrow the board
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Focus on a specialty when you know the kind of care you need, or
              browse everything to compare availability.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-ink">
                Search services
              </span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="form-input pl-11"
                  placeholder="Service, doctor, specialty, or venue"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-ink">
                Specialization
              </span>
              <select
                className="form-input"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
              >
                {specializationOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {careOverview.length > 3 ? (
              <div className="mt-4 rounded-[20px] border border-line bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Additional insight
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {careOverview[3].value}
                </p>
                <p className="mt-1 text-sm text-muted">{careOverview[3].label}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      {token && user?.role === "customer" ? (
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-5">
            <Chart
              title="Booking activity over time"
              description="A simple view of how often you have been booking care recently."
              data={insights?.bookingTrend || []}
              labelKey="date"
              valueKey="count"
              emptyMessage={insightsLoading ? "Loading booking activity..." : undefined}
            />
            <Chart
              title="Care mix"
              description="Which specialties appear most often in your booking history."
              data={insights?.careMix || []}
              labelKey="label"
              valueKey="count"
              emptyMessage={insightsLoading ? "Loading care mix..." : undefined}
            />
          </div>

          <div className="grid gap-5">
            <Chart
              title="Status overview"
              description="This helps you understand whether bookings are confirmed, pending, or already closed."
              data={insights?.statusBreakdown || []}
              labelKey="label"
              valueKey="count"
              emptyMessage={insightsLoading ? "Loading status breakdown..." : undefined}
            />

            <section className="page-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Upcoming bookings</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Your next scheduled appointments and who they are with.
                  </p>
                </div>
                <Link href="/my-bookings" className="btn btn-secondary min-h-10 px-4">
                  View all
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {(insights?.upcoming || []).length ? (
                  insights.upcoming.map((booking) => (
                    <div key={booking.id} className="panel-muted p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-ink">{booking.title}</p>
                          <p className="mt-1 text-sm text-muted">
                            {booking.counterpartName} on {formatDateTime(booking.startTime)}
                          </p>
                          {booking.venue ? (
                            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                              <MapPin size={14} />
                              {booking.venue}
                            </p>
                          ) : null}
                        </div>
                        <span className="status-pill">{booking.status}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                        <Wallet size={15} />
                        {formatCurrency(booking.priceAmount, booking.currency)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state p-5 text-sm text-muted">
                    {insightsLoading
                      ? "Loading upcoming bookings..."
                      : "No upcoming bookings yet."}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Available services</h2>
            <p className="mt-1 text-sm text-muted">
              Browse published appointment types and compare providers, duration, and price.
            </p>
          </div>
          <span className="inline-code">
            {formatCount(visible.length)} matching
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="page-card h-72 animate-pulse" />
              ))
            : visible.map((appointment) => (
                <article
                  key={appointment._id}
                  className="page-card flex h-full flex-col p-5 sm:p-6"
                >
                  {appointment.coverImageUrl ? (
                    <img
                      src={resolveMediaUrl(appointment.coverImageUrl)}
                      alt={appointment.title}
                      className="mb-5 h-48 w-full rounded-[24px] object-cover"
                    />
                  ) : (
                    <div className="mb-5 flex h-48 w-full items-end rounded-[24px] border border-line bg-panel p-4">
                      <span className="status-pill">{appointment.specialization}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="status-pill">{appointment.specialization}</span>
                      <span className="text-sm font-semibold text-muted">
                        {appointment.duration} min
                      </span>
                    </div>

                    <h3 className="text-2xl font-semibold text-ink">
                      {appointment.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                      {appointment.description || "Provider-managed medical appointment."}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Provider
                        </p>
                        <p className="mt-2 text-sm font-semibold text-ink">
                          {appointment.organiserId?.name || "Assigned provider"}
                        </p>
                        {appointment.organiserId?.profileImageUrl ? (
                          <img
                            src={resolveMediaUrl(appointment.organiserId.profileImageUrl)}
                            alt={appointment.organiserId?.name || "Provider"}
                            className="mt-3 h-10 w-10 rounded-2xl object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Price
                        </p>
                        <p className="mt-2 text-sm font-semibold text-ink">
                          {appointment.feeAmount > 0
                            ? formatCurrency(
                                appointment.feeAmount,
                                appointment.currency || "INR"
                              )
                            : "Free"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                      <CalendarClock size={15} />
                      {appointment.advancePayment
                        ? "Advance payment enabled"
                        : "Pay later if needed"}
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-sm text-muted">
                      <MapPin size={15} className="mt-0.5 shrink-0" />
                      <span>{appointment.venue || "Venue shared after confirmation"}</span>
                    </div>
                  </div>

                  <Link
                    href={`/book/${appointment._id}`}
                    className="btn btn-primary mt-6 w-full sm:w-auto"
                  >
                    <CalendarPlus size={16} />
                    Reserve a slot
                  </Link>
                </article>
              ))}
        </div>

        {!loading && !visible.length ? (
          <div className="empty-state mt-4 p-8 text-center text-muted">
            No published services match this filter.
          </div>
        ) : null}
      </section>
    </div>
  );
}
