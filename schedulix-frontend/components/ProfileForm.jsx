"use client";

import { Save } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { doctorTypes } from "@/lib/medical";

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" }
];

const dateValue = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export default function ProfileForm({
  form,
  role,
  saving,
  completeMode = false,
  onChange,
  onSubmit
}) {
  const isOrganiser = role === "organiser";

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <section>
        <ImageUploadField
          category="profiles"
          helperText="Stored locally for now so the workspace can show your identity across bookings and services."
          label="Profile photo"
          value={form.profileImageUrl}
          onChange={(value) => onChange("profileImageUrl", value)}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Basic details</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Name</span>
            <input
              className="form-input"
              required
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              className="form-input"
              type="email"
              required
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Phone number</span>
            <input
              className="form-input"
              required={completeMode}
              value={form.phone}
              onChange={(event) => onChange("phone", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Gender</span>
            <select
              className="form-input"
              required={completeMode}
              value={form.gender}
              onChange={(event) => onChange("gender", event.target.value)}
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isOrganiser ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">Medical credentials</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Registration number
              </span>
              <input
                className="form-input"
                required={completeMode}
                value={form.medicalRegistrationNo}
                onChange={(event) =>
                  onChange("medicalRegistrationNo", event.target.value)
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Doctor type</span>
              <select
                className="form-input"
                required={completeMode}
                value={form.doctorType}
                onChange={(event) => onChange("doctorType", event.target.value)}
              >
                <option value="">Select type</option>
                {doctorTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Highest qualification
              </span>
              <input
                className="form-input"
                required={completeMode}
                value={form.highestQualification}
                onChange={(event) =>
                  onChange("highestQualification", event.target.value)
                }
              />
            </label>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold text-ink">Personal details</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Date of birth</span>
              <input
                className="form-input"
                type="date"
                required={completeMode}
                value={dateValue(form.dateOfBirth)}
                onChange={(event) => onChange("dateOfBirth", event.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold">Address</span>
              <textarea
                className="form-input min-h-24"
                required={completeMode}
                value={form.address}
                onChange={(event) => onChange("address", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Emergency contact
              </span>
              <input
                className="form-input"
                value={form.emergencyContactName}
                onChange={(event) =>
                  onChange("emergencyContactName", event.target.value)
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Emergency phone
              </span>
              <input
                className="form-input"
                value={form.emergencyContactPhone}
                onChange={(event) =>
                  onChange("emergencyContactPhone", event.target.value)
                }
              />
            </label>
          </div>
        </section>
      )}

      {!completeMode ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">Password</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Current password
              </span>
              <input
                className="form-input"
                type="password"
                value={form.currentPassword}
                onChange={(event) =>
                  onChange("currentPassword", event.target.value)
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">New password</span>
              <input
                className="form-input"
                type="password"
                value={form.newPassword}
                onChange={(event) => onChange("newPassword", event.target.value)}
              />
            </label>
          </div>
        </section>
      ) : null}

      <button className="btn btn-primary" disabled={saving}>
        <Save size={16} />
        {saving ? "Saving" : completeMode ? "Complete profile" : "Save profile"}
      </button>
    </form>
  );
}
