"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppointmentEditorForm, {
  appointmentFormValuesFromRecord
} from "@/components/AppointmentEditorForm";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function EditAppointmentPage({ params }) {
  const router = useRouter();
  const { user, token, hasHydrated } = useAuthStore();
  const [appointment, setAppointment] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!params?.id || !token) return;

      setLoadingRecord(true);
      setError("");

      try {
        const { data } = await api.get(`/appointments/${params.id}`);
        setAppointment(data.appointment || null);
        setSchedule(data.schedule || null);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoadingRecord(false);
      }
    };

    if (hasHydrated) {
      load();
    }
  }, [hasHydrated, params?.id, token]);

  const initialValues = useMemo(
    () => appointmentFormValuesFromRecord(appointment, schedule),
    [appointment, schedule]
  );

  const submit = async (payload) => {
    setSaving(true);
    setError("");

    try {
      await api.put(`/appointments/${params.id}`, {
        ...payload,
        publishNow: undefined
      });
      await api.patch(`/appointments/${params.id}/publish`, {
        isPublished: Boolean(payload.publishNow)
      });
      router.push("/organiser/appointments");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated) return null;
  if (!token || user?.role === "customer") {
    return <p className="text-sm font-semibold text-danger">Organiser access required.</p>;
  }

  if (loadingRecord) {
    return <div className="page-card h-64 animate-pulse" />;
  }

  return (
    <AppointmentEditorForm
      mode="edit"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={submit}
    />
  );
}
