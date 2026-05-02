"use client";

export default function DatePicker({ label = "Date", value, onChange, min }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input
        className="form-input"
        type="date"
        value={value}
        min={min || today}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
