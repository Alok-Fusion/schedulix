"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer"
  });
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
      const { data } = await api.post("/auth/signup", form);
      sessionStorage.setItem("schedulix-signup-user-id", data.userId);
      sessionStorage.setItem("schedulix-signup-email", form.email);
      router.push(`/verify-otp?userId=${encodeURIComponent(data.userId)}`);
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
            <p className="section-kicker">Create your account</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Start with secure access and move straight into scheduling.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Sign up as a patient or organiser, verify the email with OTP, and
              continue into a workspace built around your role.
            </p>
          </div>

          <div className="bg-white/80 px-6 py-8 sm:px-8 lg:py-10">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-ink">Create account</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Sign up as a patient or provider.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Name</span>
                <input
                  className="form-input"
                  required
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </label>
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
                <span className="mb-1 block text-sm font-semibold">Password</span>
                <input
                  className="form-input"
                  type="password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Role</span>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(event) => update("role", event.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="organiser">Organiser</option>
                </select>
              </label>

              {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

              <button className="btn btn-primary w-full" disabled={loading}>
                <UserPlus size={16} />
                {loading ? "Creating account" : "Sign up"}
              </button>
            </form>

            <p className="mt-5 text-sm text-muted">
              Already registered?{" "}
              <Link className="font-semibold text-brand" href="/login">
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
