"use client";

import {
  CalendarDays,
  ClipboardList,
  PencilLine,
  Settings2,
  Stethoscope,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCount, formatCurrency, formatDateTime } from "@/lib/format";
import { getSocket } from "@/lib/socket";

export default function OrganiserDashboardPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const [bookingsRes, insightsRes] = await Promise.all([
          api.get("/bookings/calendar"),
          api.get("/bookings/insights")
        ]);
        setBookings(
          (bookingsRes.data.calendar || []).flatMap((group) => group.bookings || [])
        );
        setInsights(insightsRes.data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    if (hasHydrated) load();
  }, [hasHydrated, token]);

  useEffect(() => {
    if (!hasHydrated || !token) return undefined;

    const socket = getSocket();
    const refresh = () => {
      Promise.all([api.get("/bookings/calendar"), api.get("/bookings/insights")])
        .then(([bookingsRes, insightsRes]) => {
          setBookings(
            (bookingsRes.data.calendar || []).flatMap((group) => group.bookings || [])
          );
          setInsights(insightsRes.data);
        })
        .catch((err) => {
          setError(apiErrorMessage(err));
        });
    };

    socket.on("booking_created", refresh);
    socket.on("booking_cancelled", refresh);

    return () => {
      socket.off("booking_created", refresh);
      socket.off("booking_cancelled", refresh);
    };
  }, [hasHydrated, token]);

  const stats = useMemo(
    () => [
      {
        label: "Services",
        value: formatCount(insights?.summary?.totalServices || 0),
        note: "Total services you own",
        icon: Stethoscope
      },
      {
        label: "Live services",
        value: formatCount(insights?.summary?.liveServices || 0),
        note: "Currently published",
        icon: CalendarDays
      },
      {
        label: "Pending approval",
        value: formatCount(insights?.summary?.pendingApproval || 0),
        note: "Need organiser review",
        icon: ClipboardList
      },
      {
        label: "Collected revenue",
        value: formatCurrency(
          insights?.summary?.totalRevenue || 0,
          insights?.summary?.currency || "INR"
        ),
        note: "Paid bookings in range",
        icon: Wallet
      }
    ],
    [insights]
  );

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  const primaryActions = [
    {
      href: "/organiser/appointments/new",
      label: "Create service",
      note: "Launch a new bookable service with venue, pricing, and schedule.",
      icon: Stethoscope
    },
    {
      href: "/organiser/appointments",
      label: "Edit service",
      note: "Update titles, capacity, pricing, publishing state, and booking links.",
      icon: PencilLine
    },
    {
      href: "/organiser/calendar",
      label: "Manage schedule",
      note: "Adjust live availability and keep the booking grid accurate in real time.",
      icon: Settings2
    }
  ];

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="section-kicker">Organiser workspace</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Keep services published, paid, and easy to understand.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Track service health, booking demand, and revenue without forcing
              your team to read raw numbers without context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/organiser/appointments/new" className="btn btn-primary">
              Create service
            </Link>
            <Link href="/organiser/appointments" className="btn btn-secondary">
              Edit service
            </Link>
            <Link href="/organiser/calendar" className="btn btn-secondary">
              Manage schedule
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {primaryActions.map(({ href, label, note, icon: Icon }) => (
          <Link key={label} href={href} className="page-card p-5 transition hover:border-brand/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-brand text-white">
                <Icon size={18} />
              </div>
              <span className="inline-code">Primary</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-ink">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <section key={label} className="metric-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">{label}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-brand text-white">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
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
        <div className="grid gap-5 xl:grid-cols-2">
          <Chart
            title="Booking activity"
            description="How demand has moved across the current reporting window."
            data={insights?.bookingTrend || []}
            labelKey="date"
            valueKey="count"
          />
          <Chart
            title="Status mix"
            description="A quick read on how many bookings are pending, confirmed, or closed."
            data={insights?.statusBreakdown || []}
            labelKey="label"
            valueKey="count"
          />
          <Chart
            title="Payment mix"
            description="Shows how much of the current workload has already been paid."
            data={insights?.paymentBreakdown || []}
            labelKey="label"
            valueKey="count"
          />
          <Chart
            title="Service demand"
            description="Highlights which services are drawing the most booking activity."
            data={insights?.careMix || []}
            labelKey="label"
            valueKey="count"
          />
        </div>
      )}

      <section className="page-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-semibold text-ink">Recent bookings</h2>
            <p className="mt-1 text-sm text-muted">
              The latest activity, including who booked and how much it is worth.
            </p>
          </div>
          <span className="inline-code">{formatCount(bookings.length)} total records</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="data-table min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                <th>Service</th>
                <th>Customer</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 6).map((booking) => (
                <tr key={booking._id}>
                  <td className="font-semibold text-ink">
                    {booking.appointmentTypeId?.title || "Appointment"}
                  </td>
                  <td className="text-muted">
                    {booking.customerId?.name || "Customer"}
                  </td>
                  <td className="text-muted">{formatDateTime(booking.startTime)}</td>
                  <td className="text-muted">
                    {formatCurrency(
                      booking.priceAmount || 0,
                      booking.currency || booking.appointmentTypeId?.currency || "INR"
                    )}
                  </td>
                  <td>
                    <span className="status-pill">{booking.status}</span>
                  </td>
                </tr>
              ))}
              {!bookings.length ? (
                <tr>
                  <td className="text-center text-muted" colSpan="5">
                    No bookings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
