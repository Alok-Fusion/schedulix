"use client";

const timeLabel = (value) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export default function SlotGrid({ slots = [], selectedSlot, onSelect, loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="page-card h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="empty-state p-6 text-center text-sm text-muted">
        No slots available for this date.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {slots.map((slot) => {
        const selected = selectedSlot?.startTime === slot.startTime;
        const available = slot.isAvailable !== false && slot.remainingCapacity > 0;

        return (
          <button
            key={`${slot.startTime}-${slot.endTime}`}
            type="button"
            disabled={!available}
            onClick={() => onSelect(slot)}
            className={`slot-card text-left ${
              selected
                ? "slot-card-selected"
                : available
                  ? ""
                  : "slot-card-disabled"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="block text-base font-semibold text-ink">
                {timeLabel(slot.startTime)}
              </span>
              <span className="status-pill">
                {available ? `${slot.remainingCapacity} left` : "Full"}
              </span>
            </div>
            <span className="mt-3 block text-sm text-muted">
              {selected ? "Selected for reservation" : "Reserve instantly"}
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Live capacity check
            </span>
          </button>
        );
      })}
    </div>
  );
}
