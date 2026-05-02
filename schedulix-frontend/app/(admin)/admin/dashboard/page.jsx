"use client";

import { CalendarCheck, Stethoscope, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCount, formatCurrency } from "@/lib/format";

const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
const dateInput = (date) => date.toISOString().slice(0, 10);

export default function AdminDashboardPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [graphs, setGraphs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setError("");
      try {
        const [statsRes, graphsRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/analytics/graphs", {
            params: {
              from: `${dateInput(thirtyDaysAgo)}T00:00:00`,
              to: `${dateInput(today)}T23:59:59`
            }
          })
        ]);
        setStats(statsRes.data);
        setGraphs(graphsRes.data);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    };
    if (hasHydrated) load();
  }, [hasHydrated, token]);

  const cards = useMemo(
    () => [
      {
        label: "Users",
        value: formatCount(stats?.totalUsers || 0),
        note: "Registered accounts",
        icon: Users,
        href: "/admin/users"
      },
      {
        label: "Providers",
        value: formatCount(stats?.totalProviders || 0),
        note: "Organisers on the platform",
        icon: Stethoscope,
        href: "/admin/users"
      },
      {
        label: "Bookings",
        value: formatCount(stats?.totalBookings || 0),
        note: "All booking records",
        icon: CalendarCheck,
        href: "/admin/analytics"
      },
      {
        label: "Collected revenue",
        value: formatCurrency(stats?.totalRevenue || 0, "INR"),
        note: "Paid booking value",
        icon: Wallet,
        href: "/admin/analytics"
      }
    ],
    [stats]
  );

  if (!hasHydrated) return null;
  if (!token || user?.role !== "admin") {
    return <p className="text-sm font-semibold text-danger">Admin access required.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="section-kicker">System oversight</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Read platform health through bookings, revenue, and usage patterns.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              The dashboard keeps the important signals visible first, then lets
              you drill into analytics and user management when needed.
            </p>
          </div>
          <Link href="/admin/analytics" className="btn btn-primary">
            Open analytics
          </Link>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="metric-card p-5 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">{label}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-brand text-white">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Chart
          title="Booking trend"
          description="How booking volume has changed over the last thirty days."
          data={graphs?.bookingsOverTime || []}
          labelKey="date"
          valueKey="bookings"
        />
        <Chart
          title="Status distribution"
          description="A simple read on how bookings are progressing through the system."
          data={graphs?.bookingStatusDistribution || []}
          labelKey="status"
          valueKey="count"
        />
      </div>
    </div>
  );
}
