"use client";

import { RefreshCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { nextAfterAuth, useAuthStore } from "@/lib/authStore";

export default function VerifyOtpPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({ userId: "", email: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedOtp = sessionStorage.getItem("schedulix-signup-otp") || "";
    setForm((current) => ({
      ...current,
      userId:
        params.get("userId") ||
        sessionStorage.getItem("schedulix-signup-user-id") ||
        "",
      email: sessionStorage.getItem("schedulix-signup-email") || "",
      otp: savedOtp
    }));
    if (savedOtp) {
      setMessage("OTP auto-filled — email delivery was unavailable. Click verify to continue.");
      sessionStorage.removeItem("schedulix-signup-otp");
    }
  }, []);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = form.userId
        ? { userId: form.userId, otp: form.otp }
        : { email: form.email, otp: form.otp };
      const { data } = await api.post("/auth/verify-otp", payload);
      setAuth({ token: data.token, user: data.user });
      router.push(nextAfterAuth(data.user, true));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    setMessage("");

    try {
      const payload = form.userId
        ? { userId: form.userId }
        : { email: form.email };
      const { data } = await api.post("/auth/resend-verification", payload);
      setMessage(data.message);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <section className="hero-panel overflow-hidden">
        <div className="grid lg:grid-cols-[1.05fr_420px]">
          <div className="border-b border-line px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <p className="section-kicker">Account verification</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Verify once and enter the workspace with confidence.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Enter the six-digit code from your email. If it has expired, request
              a fresh one without leaving the page.
            </p>
          </div>

          <div className="bg-white/80 px-6 py-8 sm:px-8 lg:py-10">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-ink">Verify OTP</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                We sent the code to your signup email.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  User ID or email
                </span>
                <input
                  className="form-input"
                  value={form.userId || form.email}
                  onChange={(event) => update("email", event.target.value)}
                  disabled={Boolean(form.userId)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">OTP</span>
                <input
                  className="form-input"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={form.otp}
                  onChange={(event) => update("otp", event.target.value)}
                />
              </label>

              {message ? <p className="text-sm font-semibold text-brand">{message}</p> : null}
              {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

              <button className="btn btn-primary w-full" disabled={loading}>
                <ShieldCheck size={16} />
                {loading ? "Verifying" : "Verify account"}
              </button>
            </form>

            <button
              className="btn btn-secondary mt-4 w-full"
              type="button"
              onClick={resend}
              disabled={resending || (!form.userId && !form.email)}
            >
              <RefreshCcw size={16} />
              {resending ? "Sending again" : "Resend OTP"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
