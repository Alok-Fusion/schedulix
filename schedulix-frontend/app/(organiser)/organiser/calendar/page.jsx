"use client";

import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function OrganiserCalendarPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [calendar, setCalendar] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setError("");
      try {
        const { data } = await api.get("/bookings/calendar");
        setCalendar(data.calendar || []);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    };
    if (hasHydrated) load();
  }, [hasHydrated, token]);

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Calendar</h1>
        <p className="mt-1 text-muted">Bookings grouped by date and time.</p>
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4">
        {calendar.length ? (
          calendar.map((group) => (
            <section key={`${group.date}-${group.time}`} className="page-card p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <h2 className="text-lg font-semibold text-ink">
                  {group.date} · {group.time}
                </h2>
                <span className="status-pill">{group.bookings.length} bookings</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {group.bookings.map((booking) => (
                  <div key={booking._id} className="rounded-lg border border-line bg-panel p-4">
                    <p className="font-semibold text-ink">
                      {booking.appointmentTypeId?.title || "Appointment"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {booking.customerId?.name || "Customer"} · {booking.status}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
            No calendar bookings yet.
          </div>
        )}
      </div>
    </div>
  );
}
