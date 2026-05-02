"use client";

import {
  Check,
  Copy,
  PencilLine,
  ExternalLink,
  MapPin,
  Plus,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatCurrency } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

export default function OrganiserAppointmentsPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState("");

  const sharePath = (token) => `/share/${token}`;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/appointments", {
        params: { mine: "true" }
      });
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated && token) load();
  }, [hasHydrated, token]);

  const togglePublish = async (appointment) => {
    setError("");
    try {
      await api.patch(`/appointments/${appointment._id}/publish`, {
        isPublished: !appointment.isPublished
      });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const copyShareLink = async (token) => {
    const url =
      typeof window === "undefined"
        ? sharePath(token)
        : `${window.location.origin}${sharePath(token)}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => {
        setCopiedToken((current) => (current === token ? "" : current));
      }, 1800);
    } catch {
      setError("Could not copy the share link.");
    }
  };

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="section-kicker">Service board</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Shape the services patients discover first.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Publish with confidence, keep metadata clear, and share direct
              booking entry points from one place.
            </p>
          </div>
          <Link href="/organiser/appointments/new" className="btn btn-primary">
            <Plus size={16} />
            New service
          </Link>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4">
        {loading ? (
          <div className="page-card h-48 animate-pulse" />
        ) : appointments.length ? (
          appointments.map((appointment) => (
            <article key={appointment._id} className="page-card p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div>
                  {appointment.coverImageUrl ? (
                    <img
                      src={resolveMediaUrl(appointment.coverImageUrl)}
                      alt={appointment.title}
                      className="mb-4 h-48 w-full rounded-[24px] object-cover lg:max-w-[420px]"
                    />
                  ) : null}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="status-pill">{appointment.specialization}</span>
                    <span className="status-pill">
                      {appointment.isPublished ? "published" : "draft"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-ink">
                    {appointment.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                    {appointment.description || "No description provided."}
                  </p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-brand" />
                    <span>{appointment.venue || "Venue required before publishing"}</span>
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Duration
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {appointment.duration} minutes
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        Capacity
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {appointment.manageCapacity
                          ? `${appointment.maxCapacity} seats`
                          : "Single slot"}
                      </p>
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

                  <div className="mt-4 rounded-[20px] border border-line bg-panel px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Shareable booking link
                    </p>
                    <p className="mt-2 break-all text-sm text-ink">
                      {sharePath(appointment.shareToken)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Patients can open this link and book directly.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyShareLink(appointment.shareToken)}
                    type="button"
                  >
                    {copiedToken === appointment.shareToken ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                    {copiedToken === appointment.shareToken ? "Copied" : "Copy link"}
                  </button>
                  <Link
                    href={`/book/${appointment._id}`}
                    className="btn btn-secondary"
                  >
                    <ExternalLink size={16} />
                    Preview
                  </Link>
                  <Link
                    href={`/organiser/appointments/${appointment._id}`}
                    className="btn btn-secondary"
                  >
                    <PencilLine size={16} />
                    Edit service
                  </Link>
                  <button
                    className="btn btn-primary"
                    onClick={() => togglePublish(appointment)}
                  >
                    {appointment.isPublished ? (
                      <ToggleRight size={16} />
                    ) : (
                      <ToggleLeft size={16} />
                    )}
                    {appointment.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state p-8 text-center text-muted">
            No services created yet.
          </div>
        )}
      </div>
    </div>
  );
}
