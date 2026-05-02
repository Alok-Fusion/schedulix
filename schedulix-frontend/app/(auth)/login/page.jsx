"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { nextAfterAuth, useAuthStore } from "@/lib/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", form);
      setAuth({ token: data.token, user: data.user });
      router.push(nextAfterAuth(data.user));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <section className="hero-panel overflow-hidden">
        <div className="grid lg:grid-cols-[1.05fr_420px]">
          <div className="border-b border-line px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <p className="section-kicker">Workspace access</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Scheduling that feels considered from the first screen.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Sign in to manage live bookings, provider availability, and patient
              follow-through from one warm, focused workspace.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="metric-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Flow
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Discovery to confirmation
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Access
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Customer, organiser, admin
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Pace
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Real-time slot handling
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 px-6 py-8 sm:px-8 lg:py-10">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-ink">Login</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Access your Schedulix workspace.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Email</span>
                <input
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Password</span>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </label>

              {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

              <button className="btn btn-primary w-full" disabled={loading}>
                <LogIn size={16} />
                {loading ? "Signing in" : "Login"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
              <Link className="font-semibold text-brand" href="/signup">
                Create account
              </Link>
              <Link className="font-semibold text-brand" href="/forgot-password">
                Forgot password
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
