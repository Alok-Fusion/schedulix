"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";

export default function ResetPasswordPage() {
  const [mode, setMode] = useState("otp");
  const [form, setForm] = useState({
    email: "",
    otp: "",
    token: "",
    newPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    setForm((current) => ({
      ...current,
      token,
      email: sessionStorage.getItem("schedulix-reset-email") || ""
    }));
    if (token) setMode("link");
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
      if (mode === "otp") {
        await api.post("/auth/reset-password-otp", {
          email: form.email,
          otp: form.otp,
          newPassword: form.newPassword
        });
      } else {
        await api.post("/auth/reset-password-link", {
          token: form.token,
          newPassword: form.newPassword
        });
      }
      setMessage("Password reset successful.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <section className="page-card p-6">
        <h1 className="text-2xl font-semibold text-ink">Reset password</h1>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`btn ${mode === "otp" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("otp")}
          >
            OTP
          </button>
          <button
            type="button"
            className={`btn ${mode === "link" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("link")}
          >
            Link token
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "otp" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Email</span>
                <input
                  className="form-input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">OTP</span>
                <input
                  className="form-input"
                  required
                  inputMode="numeric"
                  value={form.otp}
                  onChange={(event) => update("otp", event.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Reset token</span>
              <input
                className="form-input"
                required
                value={form.token}
                onChange={(event) => update("token", event.target.value)}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">New password</span>
            <input
              className="form-input"
              type="password"
              minLength={8}
              required
              value={form.newPassword}
              onChange={(event) => update("newPassword", event.target.value)}
            />
          </label>

          {message ? <p className="text-sm font-semibold text-brand">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

          <button className="btn btn-primary w-full" disabled={loading}>
            <KeyRound size={16} />
            {loading ? "Saving" : "Reset password"}
          </button>
        </form>

        <Link className="mt-5 inline-block text-sm font-semibold text-brand" href="/login">
          Back to login
        </Link>
      </section>
    </div>
  );
}
