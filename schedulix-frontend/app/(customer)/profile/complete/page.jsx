"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import api, { apiErrorMessage } from "@/lib/api";
import { roleHome, useAuthStore } from "@/lib/authStore";

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

export default function CompleteProfilePage() {
  const router = useRouter();
  const { hasHydrated, token, user, setUser } = useAuthStore();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.push("/login");
      return;
    }

    setForm((current) => ({
      ...current,
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      profileImageUrl: user?.profileImageUrl || "",
      gender: user?.gender || "",
      dateOfBirth: user?.dateOfBirth || "",
      address: user?.address || "",
      emergencyContactName: user?.emergencyContactName || "",
      emergencyContactPhone: user?.emergencyContactPhone || "",
      medicalRegistrationNo: user?.medicalRegistrationNo || "",
      doctorType: user?.doctorType || "",
      highestQualification: user?.highestQualification || ""
    }));
  }, [hasHydrated, token, user, router]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await api.put("/profile", {
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
      });

      setUser(data.user);
      router.push(roleHome(data.user.role));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!hasHydrated || !token) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <section className="page-card p-6">
        <h1 className="text-2xl font-semibold text-ink">Complete profile</h1>
        <p className="mt-1 text-sm text-muted">
          Add the details needed for appointments and role-based access.
        </p>

        <div className="mt-6">
          <ProfileForm
            form={form}
            role={user?.role}
            saving={saving}
            completeMode
            onChange={update}
            onSubmit={save}
          />
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}
      </section>
    </div>
  );
}
