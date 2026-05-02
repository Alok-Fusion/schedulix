"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppointmentEditorForm from "@/components/AppointmentEditorForm";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (payload) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/appointments", {
        ...payload,
        publishNow: undefined
      });

      if (payload.publishNow) {
        await api.patch(`/appointments/${data.appointment._id}/publish`, {
          isPublished: true
        });
      }

      router.push("/organiser/appointments");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  return (
    <AppointmentEditorForm
      mode="create"
      loading={loading}
      error={error}
      onSubmit={submit}
    />
  );
}
