"use client";

import { roleHome, useAuthStore } from "@/lib/authStore";
import { resolveMediaUrl } from "@/lib/media";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Home,
  LogIn,
  LogOut,
  Menu,
  Stethoscope,
  User,
  UserPlus,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const customerLinks = [
  { href: "/home", label: "Services", icon: Home },
  { href: "/my-bookings", label: "My bookings", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User }
];

const organiserLinks = [
  { href: "/organiser/dashboard", label: "Dashboard", icon: Activity },
  { href: "/organiser/appointments", label: "Services", icon: Stethoscope },
  { href: "/organiser/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/organiser/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User }
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Activity },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User }
];

const publicLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/home", label: "Services", icon: Stethoscope },
  { href: "/signup", label: "Get started", icon: Activity }
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, hasHydrated } = useAuthStore();
  const [open, setOpen] = useState(false);

  const links = useMemo(() => {
    if (!user) return publicLinks;
    if (user.role === "admin") return adminLinks;
    if (user.role === "organiser") return organiserLinks;
    return customerLinks;
  }, [user]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-[1360px]">
        <div className="page-card flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={user ? roleHome(user?.role) : "/"}
            className="flex items-center gap-3 font-semibold text-ink"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
              <CalendarDays size={18} />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Scheduling
              </span>
              <span className="block text-lg leading-none">Schedulix</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-[20px] border border-line bg-panel/80 p-1 md:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`btn min-h-10 px-4 text-sm ${
                    active
                      ? "border-transparent bg-white text-ink shadow-soft"
                      : "bg-transparent text-muted hover:bg-white"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {hasHydrated && token ? (
              <>
                <div className="hidden text-right lg:block">
                  <p className="text-sm font-semibold text-ink">
                    {user?.name || "Workspace"}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {user?.role || "customer"} access
                  </p>
                </div>
                {user?.profileImageUrl ? (
                  <img
                    src={resolveMediaUrl(user.profileImageUrl)}
                    alt={user?.name || "Profile"}
                    className="h-11 w-11 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panel text-sm font-semibold text-ink">
                    {(user?.name || "S").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="status-pill">{user?.role || "customer"}</span>
                <button className="btn btn-secondary" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary">
                  <LogIn size={16} />
                  Login
                </Link>
                <Link href="/signup" className="btn btn-primary">
                  <UserPlus size={16} />
                  Create account
                </Link>
              </>
            )}
          </div>

          <button
            className="btn btn-secondary md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="mx-auto mt-3 max-w-[1360px] md:hidden">
          <div className="page-card flex flex-col gap-2 p-3">
            {hasHydrated && token ? (
              <div className="rounded-[20px] border border-line bg-panel px-4 py-3">
                <div className="flex items-center gap-3">
                  {user?.profileImageUrl ? (
                    <img
                      src={resolveMediaUrl(user.profileImageUrl)}
                      alt={user?.name || "Profile"}
                      className="h-11 w-11 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-ink">
                      {(user?.name || "S").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {user?.name || "Workspace"}
                    </p>
                    <p className="text-xs text-muted capitalize">
                      {user?.role || "customer"} access
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="btn btn-secondary justify-start"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {hasHydrated && token ? (
              <button className="btn btn-secondary justify-start" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn btn-secondary justify-start"
                >
                  <LogIn size={16} />
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary justify-start"
                >
                  <UserPlus size={16} />
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
