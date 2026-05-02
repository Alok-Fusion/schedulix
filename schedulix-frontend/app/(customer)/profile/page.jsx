"use client";

import { useEffect, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  profileImageUrl: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  medicalRegistrationNo: "",
  doctorType: "",
  highestQualification: "",
  currentPassword: "",
  newPassword: ""
};

export default function ProfilePage() {
  const { hasHydrated, token, user, setUser } = useAuthStore();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!hasHydrated || !token) return;
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/profile");
        setUser(data.user);
        setForm((current) => ({
          ...current,
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          profileImageUrl: data.user.profileImageUrl || "",
          gender: data.user.gender || "",
          dateOfBirth: data.user.dateOfBirth || "",
          address: data.user.address || "",
          emergencyContactName: data.user.emergencyContactName || "",
          emergencyContactPhone: data.user.emergencyContactPhone || "",
          medicalRegistrationNo: data.user.medicalRegistrationNo || "",
          doctorType: data.user.doctorType || "",
          highestQualification: data.user.highestQualification || ""
        }));
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasHydrated, token, setUser]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      profileImageUrl: form.profileImageUrl,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      address: form.address,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      medicalRegistrationNo: form.medicalRegistrationNo,
      doctorType: form.doctorType,
      highestQualification: form.highestQualification
    };

    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    try {
      const { data } = await api.put("/profile", payload);
      setUser(data.user);
      setMessage(data.message);
      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: ""
      }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated) return null;
  if (!token) {
    return <p className="text-sm font-semibold text-danger">Login required.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <section className="page-card p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Profile</h1>
            <p className="mt-1 text-sm text-muted">
              Manage account, contact, and medical details.
            </p>
          </div>
          <span className="status-pill">
            {user?.profileCompleted ? "complete" : "incomplete"}
          </span>
        </div>

        {loading ? (
          <div className="mt-6 h-64 animate-pulse rounded-lg bg-panel" />
        ) : (
          <div className="mt-6">
            <ProfileForm
              form={form}
              role={user?.role}
              saving={saving}
              onChange={update}
              onSubmit={save}
            />
            {message ? (
              <p className="mt-4 text-sm font-semibold text-brand">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-4 text-sm font-semibold text-danger">{error}</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
