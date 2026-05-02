"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { nextAfterAuth, useAuthStore } from "@/lib/authStore";

export default function VerifyLinkPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [status, setStatus] = useState("Verifying link");
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const verify = async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        setError("Verification token is missing.");
        return;
      }

      try {
        const { data } = await api.get(
          `/auth/verify-link?token=${encodeURIComponent(token)}`
        );
        setAuth({ token: data.token, user: data.user });
        setStatus("Account verified");
        window.setTimeout(() => router.push(nextAfterAuth(data.user, true)), 700);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    };

    verify();
  }, [router, setAuth]);

  return (
    <div className="mx-auto max-w-md">
      <section className="page-card p-6 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-danger">Verification failed</h1>
            <p className="mt-3 text-sm text-muted">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-brand">
              {status === "Account verified" ? (
                <CheckCircle2 size={24} />
              ) : (
                <Loader2 className="animate-spin" size={24} />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-ink">{status}</h1>
          </>
        )}
      </section>
    </div>
  );
}
