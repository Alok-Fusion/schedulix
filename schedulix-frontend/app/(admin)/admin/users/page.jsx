"use client";

import { Mail, Phone, Power, Search, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

const value = (item) => item || "Not provided";

const formatDate = (date) => {
  if (!date) return "Not provided";
  return new Date(date).toLocaleDateString();
};

export default function AdminUsersPage() {
  const { user, token, hasHydrated } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    doctorType: "",
    gender: "",
    isActive: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const update = (field, nextValue) => {
    setFilters((current) => ({ ...current, [field]: nextValue }));
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          search: filters.search || undefined,
          role: filters.role || undefined,
          doctorType: filters.doctorType || undefined,
          gender: filters.gender || undefined,
          isActive: filters.isActive || undefined
        }
      });
      setUsers(data.users || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated && token) load();
  }, [hasHydrated, token]);

  const toggle = async (item) => {
    setError("");
    try {
      await api.patch(`/admin/users/${item._id}/toggle`, {
        isActive: !item.isActive
      });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!hasHydrated) return null;
  if (!token || user?.role !== "admin") {
    return <p className="text-sm font-semibold text-danger">Admin access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-muted">
          Review account, contact, and doctor profile details.
        </p>
      </div>

      <section className="page-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_180px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
            <input
              className="form-input pl-9"
              placeholder="Name, email, phone, registration"
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
            />
          </label>
          <select
            className="form-input"
            value={filters.role}
            onChange={(event) => update("role", event.target.value)}
          >
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="organiser">Organiser</option>
            <option value="admin">Admin</option>
          </select>
          <input
            className="form-input"
            placeholder="Doctor type"
            value={filters.doctorType}
            onChange={(event) => update("doctorType", event.target.value)}
          />
          <select
            className="form-input"
            value={filters.gender}
            onChange={(event) => update("gender", event.target.value)}
          >
            <option value="">All gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          <select
            className="form-input"
            value={filters.isActive}
            onChange={(event) => update("isActive", event.target.value)}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button className="btn btn-primary" onClick={load}>
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-lg border border-line bg-white" />
          ))}
        </div>
      ) : users.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((item) => {
            const isOrganiser = item.role === "organiser";

            return (
              <article key={item._id} className="page-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">{item.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="status-pill">{item.role}</span>
                      <span className="status-pill">
                        {item.isActive ? "active" : "inactive"}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-secondary min-h-9 px-3" onClick={() => toggle(item)}>
                    <Power size={15} />
                  </button>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-muted">
                    <Mail size={15} />
                    <span className="break-all">{item.email}</span>
                  </p>
                  <p className="flex items-center gap-2 text-muted">
                    <Phone size={15} />
                    {value(item.phone)}
                  </p>
                  <p className="flex items-center gap-2 text-muted">
                    <UserRound size={15} />
                    {value(item.gender)}
                  </p>
                </div>

                {isOrganiser ? (
                  <div className="mt-5 rounded-lg border border-line bg-panel p-4 text-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-ink">
                      <Stethoscope size={15} />
                      Doctor profile
                    </p>
                    <dl className="space-y-2 text-muted">
                      <div>
                        <dt className="font-semibold text-ink">Doctor type</dt>
                        <dd>{value(item.doctorType)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Registration no</dt>
                        <dd>{value(item.medicalRegistrationNo)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Qualification</dt>
                        <dd>{value(item.highestQualification)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-line bg-panel p-4 text-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-ink">
                      <ShieldCheck size={15} />
                      Personal profile
                    </p>
                    <dl className="space-y-2 text-muted">
                      <div>
                        <dt className="font-semibold text-ink">Date of birth</dt>
                        <dd>{formatDate(item.dateOfBirth)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Address</dt>
                        <dd>{value(item.address)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Emergency contact</dt>
                        <dd>
                          {value(item.emergencyContactName)}
                          {item.emergencyContactPhone
                            ? ` · ${item.emergencyContactPhone}`
                            : ""}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
          No users found.
        </div>
      )}
    </div>
  );
}
