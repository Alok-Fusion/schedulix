"use client";

import {
  Activity,
  CalendarRange,
  Clock,
  CreditCard,
  Stethoscope,
  Users,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCount, formatCurrency } from "@/lib/format";

const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

const dateInput = (date) => date.toISOString().slice(0, 10);

const summaryCards = (summary = {}) => [
  {
    label: "Total bookings",
    value: formatCount(summary.totalBookings || 0),
    note: "All bookings in the selected range",
    icon: CalendarRange
  },
  {
    label: "Active bookings",
    value: formatCount(summary.activeBookings || 0),
    note: "Reserved, pending, or confirmed",
    icon: Activity
  },
  {
    label: "Confirmed",
    value: formatCount(summary.confirmed || 0),
    note: "Ready to be delivered",
    icon: Users
  },
  {
    label: "Pending",
    value: formatCount(summary.pending || 0),
    note: "Still waiting on organiser action",
    icon: Clock
  },
  {
    label: "Paid",
    value: formatCount(summary.paid || 0),
    note: "Payment status marked complete",
    icon: CreditCard
  },
  {
    label: "Booked hours",
    value: `${summary.bookedHours || 0}h`,
    note: "Provider time committed",
    icon: Stethoscope
  },
  {
    label: "Collected revenue",
    value: formatCurrency(summary.paidRevenue || 0, "INR"),
    note: "Paid booking value",
    icon: Wallet
  },
  {
    label: "Open revenue",
    value: formatCurrency(summary.pendingRevenue || 0, "INR"),
    note: "Unpaid booking value",
    icon: Wallet
  }
];

export default function AdminAnalyticsPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [graphs, setGraphs] = useState(null);
  const [providers, setProviders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({
    providerId: "",
    appointmentTypeId: "",
    from: dateInput(thirtyDaysAgo),
    to: dateInput(today)
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadGraphData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/analytics/graphs", {
        params: {
          providerId: filters.providerId || undefined,
          appointmentTypeId: filters.appointmentTypeId || undefined,
          from: filters.from ? `${filters.from}T00:00:00` : undefined,
          to: filters.to ? `${filters.to}T23:59:59` : undefined
        }
      });
      setGraphs(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFilterData = async () => {
      if (!token) return;
      try {
        const [providersRes, appointmentsRes] = await Promise.all([
          api.get("/admin/users", { params: { role: "organiser" } }),
          api.get("/appointments", { params: { all: "true" } })
        ]);
        setProviders(providersRes.data.users || []);
        setAppointments(appointmentsRes.data.appointments || []);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    };

    if (hasHydrated) loadFilterData();
  }, [hasHydrated, token]);

  useEffect(() => {
    if (hasHydrated && token) loadGraphData();
  }, [hasHydrated, token]);

  const utilization = useMemo(
    () =>
      (graphs?.providerUtilization || []).map((item) => ({
        ...item,
        providerName: item.providerName || item.providerEmail || "Provider",
        utilizationPercent: Math.round((item.utilization || 0) * 100)
      })),
    [graphs]
  );

  if (!hasHydrated) return null;
  if (!token || user?.role !== "admin") {
    return <p className="text-sm font-semibold text-danger">Admin access required.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="max-w-3xl">
          <p className="section-kicker">Analytics workspace</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Understand performance through booking flow, payment flow, and utilization.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            These views are tuned to help you understand what is happening, not
            just stare at totals without context.
          </p>
        </div>
      </section>

      <section className="page-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_160px_auto]">
          <select
            className="form-input"
            value={filters.providerId}
            onChange={(event) => update("providerId", event.target.value)}
          >
            <option value="">All doctors</option>
            {providers.map((provider) => (
              <option key={provider._id} value={provider._id}>
                {provider.name}
                {provider.doctorType ? ` - ${provider.doctorType}` : ""}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={filters.appointmentTypeId}
            onChange={(event) => update("appointmentTypeId", event.target.value)}
          >
            <option value="">All appointment types</option>
            {appointments.map((appointment) => (
              <option key={appointment._id} value={appointment._id}>
                {appointment.title} - {appointment.specialization}
              </option>
            ))}
          </select>
          <input
            className="form-input"
            type="date"
            value={filters.from}
            onChange={(event) => update("from", event.target.value)}
          />
          <input
            className="form-input"
            type="date"
            value={filters.to}
            onChange={(event) => update("to", event.target.value)}
          />
          <button className="btn btn-primary" onClick={loadGraphData}>
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards(graphs?.summary).map(({ label, value, note, icon: Icon }) => (
          <section key={label} className="metric-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted">{label}</span>
              <Icon size={17} className="text-brand" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
          </section>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="page-card h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Chart
              title="Bookings over time"
              description="Volume by day helps you spot stronger periods and slower stretches."
              data={graphs?.bookingsOverTime || []}
              labelKey="date"
              valueKey="bookings"
            />
            <Chart
              title="Peak booking hours"
              description="This shows when appointment demand tends to cluster during the day."
              data={(graphs?.peakHours || []).map((item) => ({
                ...item,
                hourLabel: `${String(item.hour).padStart(2, "0")}:00`
              }))}
              labelKey="hourLabel"
              valueKey="bookings"
            />
            <Chart
              title="Provider utilization"
              description="A higher percentage means more of a provider's available capacity is being used."
              data={utilization}
              labelKey="providerName"
              valueKey="utilizationPercent"
              suffix="%"
            />
            <Chart
              title="Status distribution"
              description="Use this to understand operational balance across the booking lifecycle."
              data={graphs?.bookingStatusDistribution || []}
              labelKey="status"
              valueKey="count"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="page-card p-5">
              <h2 className="text-lg font-semibold text-ink">Appointment mix</h2>
              <div className="mt-4 space-y-3">
                {(graphs?.summary?.appointmentMix || []).length ? (
                  graphs.summary.appointmentMix.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-panel p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="text-muted">{item.specialization}</p>
                      </div>
                      <span className="status-pill">
                        {formatCount(item.bookings)} bookings
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No appointment mix yet.</p>
                )}
              </div>
            </section>

            <section className="page-card p-5">
              <h2 className="text-lg font-semibold text-ink">Provider detail</h2>
              <div className="mt-4 space-y-3">
                {utilization.length ? (
                  utilization.map((provider) => (
                    <div
                      key={provider.providerId}
                      className="rounded-[20px] border border-line bg-panel p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-ink">{provider.providerName}</p>
                        <span className="status-pill">
                          {provider.utilizationPercent}%
                        </span>
                      </div>
                      <p className="mt-1 text-muted">
                        {provider.doctorType || "Doctor"} -{" "}
                        {provider.highestQualification || "Qualification not set"}
                      </p>
                      <p className="mt-2 text-muted">
                        {formatCount(provider.bookedCapacityMinutes)} booked minutes /{" "}
                        {formatCount(provider.availableCapacityMinutes)} available minutes
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No provider utilization yet.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
