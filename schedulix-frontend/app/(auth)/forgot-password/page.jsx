"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      sessionStorage.setItem("schedulix-reset-email", email);
      setMessage(data.message);
      window.setTimeout(() => router.push("/reset-password"), 700);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <section className="page-card p-6">
        <h1 className="text-2xl font-semibold text-ink">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">
          Receive an OTP and reset link by email.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              className="form-input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {message ? <p className="text-sm font-semibold text-brand">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

          <button className="btn btn-primary w-full" disabled={loading}>
            <Mail size={16} />
            {loading ? "Sending" : "Send reset instructions"}
          </button>
        </form>

        <Link className="mt-5 inline-block text-sm font-semibold text-brand" href="/login">
          Back to login
        </Link>
      </section>
    </div>
  );
}
