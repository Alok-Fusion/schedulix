import Link from "next/link";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/", label: "Live booking board" },
      { href: "/home", label: "Service directory" },
      { href: "/login", label: "Workspace access" }
    ]
  },
  {
    title: "Patient",
    links: [
      { href: "/my-bookings", label: "Bookings" },
      { href: "/payment", label: "Payments" },
      { href: "/profile", label: "Profile" }
    ]
  },
  {
    title: "Organizer",
    links: [
      { href: "/organiser/dashboard", label: "Dashboard" },
      { href: "/organiser/appointments", label: "Services" },
      { href: "/organiser/bookings", label: "Bookings" }
    ]
  }
];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-line/70 px-4 pb-8 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <p className="section-kicker">Schedulix</p>
          <h2 className="text-2xl font-semibold text-ink">
            Medical scheduling that feels trustworthy from the first click.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            OTP verification, live slot visibility, downloadable receipts, and
            local medical-image support are now part of the product flow.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-ink">{column.title}</p>
              <div className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <Link key={link.href} href={link.href} className="block text-sm text-muted hover:text-ink">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
