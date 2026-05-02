"use client";

import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  ShieldCheck,
  Stethoscope,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { formatCurrency, formatDateOnly } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);
const startOfDate = (date) => new Date(`${date}T00:00:00`).toISOString();
const endOfDate = (date) => new Date(`${date}T23:59:59`).toISOString();
const atTime = (date, time) => new Date(`${date}T${time}:00`).toISOString();

const demoAppointments = [
  {
    _id: "demo-general",
    title: "General Checkup",
    specialization: "General Physician",
    duration: 30,
    feeAmount: 600,
    currency: "INR",
    organiserId: { _id: "dr-mehta", name: "Dr Mehta" }
  },
  {
    _id: "demo-derma",
    title: "Skin Consultation",
    specialization: "Dermatologist",
    duration: 20,
    feeAmount: 900,
    currency: "INR",
    organiserId: { _id: "dr-rana", name: "Dr Rana" }
  }
];

const demoSlots = [
  {
    startTime: atTime(today(), "09:30"),
    endTime: atTime(today(), "10:00"),
    remainingCapacity: 2
  },
  {
    startTime: atTime(today(), "10:30"),
    endTime: atTime(today(), "11:00"),
    remainingCapacity: 0
  },
  {
    startTime: atTime(today(), "11:30"),
    endTime: atTime(today(), "12:00"),
    remainingCapacity: 1
  },
  {
    startTime: atTime(today(), "15:00"),
    endTime: atTime(today(), "15:30"),
    remainingCapacity: 3
  }
];

const roleCards = [
  { title: "Patients", icon: Users, line: "Book in seconds" },
  { title: "Organisers", icon: Stethoscope, line: "Control availability" },
  { title: "Admins", icon: Activity, line: "Monitor operations" }
];

const reliabilityItems = [
  { icon: CalendarCheck2, label: "No double booking" },
  { icon: Clock3, label: "Real-time updates" },
  { icon: ShieldCheck, label: "Verified users" }
];

const timeLabel = (value) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const calendarRows = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function HeroCalendarPreview({ appointment, slots }) {
  const selected = slots[2] || slots[0];

  return (
    <div className="page-card overflow-hidden p-4 sm:p-5">
      <div className="rounded-[28px] border border-line bg-white">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Live booking board
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {appointment?.title || "General Checkup"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="status-pill">2 people viewing</span>
            <span className="status-pill">
              {formatCurrency(appointment?.feeAmount || 600, appointment?.currency || "INR")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-[22px] border border-line bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Calendar</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatDateOnly(selected?.startTime || new Date())}
                </p>
              </div>
              <span className="status-pill">Day view</span>
            </div>

            <div className="mt-4 space-y-2">
              {calendarRows.map((row, index) => (
                <div
                  key={row}
                  className={`flex items-center justify-between rounded-[16px] border px-3 py-2 text-sm ${
                    index === 2
                      ? "border-brand/30 bg-white text-ink"
                      : "border-line bg-transparent text-muted"
                  }`}
                >
                  <span>{row}</span>
                  <span>{index === 2 ? "Open slots" : "Scheduled"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] border border-line bg-panel p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {slots.slice(0, 4).map((slot, index) => {
                  const available = slot.remainingCapacity > 0;
                  const filling = index === 2;

                  return (
                    <div
                      key={slot.startTime}
                      className={`rounded-[18px] border px-4 py-4 ${
                        filling
                          ? "border-brand/30 bg-[#fff7f8]"
                          : available
                            ? "border-line bg-white"
                            : "border-line bg-[#f1f0eb]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">
                          {timeLabel(slot.startTime)}
                        </span>
                        <span className="status-pill">
                          {available ? `${slot.remainingCapacity} left` : "Booked"}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted">
                        {filling
                          ? "Slot is filling now"
                          : available
                            ? "Available to book"
                            : "Already taken"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[22px] border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">
                    Booking panel
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {appointment?.organiserId?.name || "Dr Mehta"} -{" "}
                    {appointment?.specialization || "General Physician"}
                  </p>
                </div>
                <CalendarCheck2 size={18} className="text-brand" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] border border-line bg-panel px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Chosen</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {timeLabel(selected?.startTime || new Date())}
                  </p>
                </div>
                <div className="rounded-[16px] border border-line bg-panel px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Status</p>
                  <p className="mt-2 text-sm font-semibold text-ink">Ready to confirm</p>
                </div>
                <div className="rounded-[16px] border border-line bg-panel px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Verification</p>
                  <p className="mt-2 text-sm font-semibold text-ink">OTP active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowCard({ index, title, line, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-ink">
          {index}
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">{title}</p>
          <p className="text-sm text-muted">{line}</p>
        </div>
      </div>
      <div className="rounded-[24px] border border-line bg-white p-4">{children}</div>
    </div>
  );
}

function OrganiserCalendarSection() {
  return (
    <section className="page-card p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="max-w-xl">
          <p className="section-kicker">Customer and organiser view</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            See your entire schedule at a glance
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Patients get a clear path into booking, and organisers get a proper schedule board with live movement.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[20px] border border-line bg-panel px-4 py-4">
              <p className="text-sm font-semibold text-ink">Customer view</p>
              <p className="mt-1 text-sm text-muted">Upcoming visit, selected slot, and confirmation state.</p>
            </div>
            <div className="rounded-[20px] border border-line bg-panel px-4 py-4">
              <p className="text-sm font-semibold text-ink">Organiser view</p>
              <p className="mt-1 text-sm text-muted">Daily and weekly visibility with multiple active time blocks.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-line bg-white p-4">
          <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Organiser dashboard</p>
              <p className="mt-1 text-lg font-semibold text-ink">Weekly schedule</p>
            </div>
            <div className="flex gap-2">
              <span className="btn btn-secondary min-h-10 px-4">Daily</span>
              <span className="btn btn-primary min-h-10 px-4">Weekly</span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[22px] border border-line">
            <div className="grid grid-cols-[92px_repeat(5,minmax(0,1fr))] bg-panel text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <div className="border-r border-line px-3 py-3">Time</div>
              {weekDays.map((day) => (
                <div key={day} className="border-r border-line px-3 py-3 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="relative bg-white">
              {calendarRows.map((time) => (
                <div
                  key={time}
                  className="grid grid-cols-[92px_repeat(5,minmax(0,1fr))] border-t border-line"
                >
                  <div className="border-r border-line px-3 py-4 text-sm text-muted">{time}</div>
                  {weekDays.map((day) => (
                    <div key={`${day}-${time}`} className="border-r border-line px-2 py-4 last:border-r-0" />
                  ))}
                </div>
              ))}

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[20%] top-[20%] w-[16%] rounded-[16px] bg-[#fde7ea] px-3 py-3 text-xs text-ink shadow-soft">
                  <p className="font-semibold">General Checkup</p>
                  <p className="mt-1 text-muted">10:00 - 10:30</p>
                </div>
                <div className="absolute left-[39%] top-[35%] w-[16%] rounded-[16px] bg-[#edf5ef] px-3 py-3 text-xs text-ink shadow-soft">
                  <p className="font-semibold">Follow-up</p>
                  <p className="mt-1 text-muted">11:30 - 12:00</p>
                </div>
                <div className="absolute left-[58%] top-[52%] w-[16%] rounded-[16px] bg-[#fff4df] px-3 py-3 text-xs text-ink shadow-soft">
                  <p className="font-semibold">Skin Review</p>
                  <p className="mt-1 text-muted">03:00 - 03:20</p>
                </div>
                <div className="absolute left-[77%] top-[18%] w-[16%] rounded-[16px] bg-[#f1eefc] px-3 py-3 text-xs text-ink shadow-soft">
                  <p className="font-semibold">Dental Review</p>
                  <p className="mt-1 text-muted">09:30 - 10:15</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeExperience() {
  const [appointments, setAppointments] = useState(demoAppointments);
  const [appointment, setAppointment] = useState(demoAppointments[0]);
  const [slots, setSlots] = useState(demoSlots);
  const selectedDate = today();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/appointments");
        const liveAppointments = data.appointments || [];

        if (!liveAppointments.length) {
          setAppointments(demoAppointments);
          setAppointment(demoAppointments[0]);
          setSlots(demoSlots);
          return;
        }

        const firstAppointment = liveAppointments[0];
        setAppointments(liveAppointments);
        setAppointment(firstAppointment);

        const { data: slotData } = await api.get("/slots", {
          params: {
            appointmentTypeId: firstAppointment._id,
            providerId:
              firstAppointment.organiserId?._id || firstAppointment.organiserId,
            from: startOfDate(selectedDate),
            to: endOfDate(selectedDate),
            capacity: 1
          }
        });

        setSlots(slotData.slots?.length ? slotData.slots.slice(0, 4) : demoSlots);
      } catch {
        setAppointments(demoAppointments);
        setAppointment(demoAppointments[0]);
        setSlots(demoSlots);
      }
    };

    load();
  }, [selectedDate]);

  const heroHref = useMemo(() => {
    if (!appointment?._id) return "/home";
    return `/book/${appointment._id}`;
  }, [appointment]);

  const visibleAppointments = appointments.length ? appointments : demoAppointments;
  const stableSlots = slots.length ? slots : demoSlots;

  return (
    <div className="space-y-8 pb-6">
      <section className="hero-panel px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="max-w-xl">
            <p className="section-kicker">Medical appointment scheduling</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
              Appointments that do not collide
            </h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Real-time slots, reliable confirmation, and a booking record that stays clear for both patients and teams.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={heroHref} className="btn btn-primary">
                Start booking
              </Link>
              <Link href="#workspace" className="btn btn-secondary">
                Explore system
              </Link>
            </div>
          </div>

          <HeroCalendarPreview appointment={appointment} slots={stableSlots} />
        </div>
      </section>

      <section className="space-y-5">
        <div className="max-w-2xl">
          <p className="section-kicker">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            Availability, booking, and confirmation in one clean sequence.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <FlowCard index="1" title="Set availability" line="Open slots appear directly in the calendar.">
            <div className="space-y-3">
              {["09:30", "10:00", "11:30"].map((time, index) => (
                <div
                  key={time}
                  className={`rounded-[18px] border px-3 py-3 ${
                    index === 1 ? "border-brand/30 bg-panel" : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{time}</span>
                    <span className="status-pill">Open</span>
                  </div>
                </div>
              ))}
            </div>
          </FlowCard>

          <FlowCard index="2" title="Users book instantly" line="A live slot is selected while others are still watching.">
            <div className="grid gap-3">
              {stableSlots.slice(0, 3).map((slot, index) => (
                <div
                  key={slot.startTime}
                  className={`rounded-[18px] border px-3 py-3 ${
                    index === 1 ? "border-brand/30 bg-[#fff7f8]" : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">
                      {timeLabel(slot.startTime)}
                    </span>
                    <span className="status-pill">
                      {index === 1 ? "2 viewing" : `${Math.max(1, slot.remainingCapacity)} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </FlowCard>

          <FlowCard index="3" title="System confirms and updates" line="The board updates as soon as the slot is taken.">
            <div className="space-y-3">
              <div className="rounded-[18px] border border-line bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">10:30 AM</span>
                  <span className="status-pill">Booked</span>
                </div>
              </div>
              <div className="rounded-[18px] border border-brand/30 bg-panel px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">Confirmation sent</span>
                  <span className="status-pill">Updated</span>
                </div>
              </div>
            </div>
          </FlowCard>
        </div>
      </section>

      <div id="workspace">
        <OrganiserCalendarSection />
      </div>

      <section className="page-card px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {reliabilityItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm font-semibold text-ink">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-panel text-brand">
                <Icon size={16} />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="max-w-2xl">
          <p className="section-kicker">Roles</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            Focused views for each side of the system.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {roleCards.map(({ title, icon: Icon, line }) => (
            <article key={title} className="page-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold text-ink">{title}</h3>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panel text-brand">
                  <Icon size={18} />
                </span>
              </div>
              <div className="mt-5 rounded-[18px] border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink">
                {line}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hero-panel px-6 py-8 text-center sm:px-8 sm:py-10">
        <p className="text-3xl font-semibold text-ink sm:text-4xl">
          Start scheduling without chaos
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/signup" className="btn btn-primary">
            Create account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
