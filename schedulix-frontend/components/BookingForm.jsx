"use client";

import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import ImageUploadField from "@/components/ImageUploadField";

export default function BookingForm({
  problemImageUrl = "",
  questions = [],
  submitting,
  onProblemImageChange,
  onSubmit
}) {
  const [answers, setAnswers] = useState({});

  const update = (key, value) => {
    setAnswers((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = Object.entries(answers).map(([key, value]) => ({ key, value }));
    onSubmit({
      answers: payload,
      problemImageUrl
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {questions.length ? (
        questions.map((question) => (
          <label key={question.key} className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              {question.label}
              {question.required ? " *" : ""}
            </span>
            {question.type === "select" ? (
              <select
                className="form-input"
                required={question.required}
                value={answers[question.key] || ""}
                onChange={(event) => update(question.key, event.target.value)}
              >
                <option value="">Select an option</option>
                {(question.options || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : question.type === "boolean" ? (
              <select
                className="form-input"
                required={question.required}
                value={answers[question.key] || ""}
                onChange={(event) => update(question.key, event.target.value)}
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                className="form-input"
                type={question.type === "number" ? "number" : question.type === "date" ? "date" : "text"}
                required={question.required}
                value={answers[question.key] || ""}
                onChange={(event) => update(question.key, event.target.value)}
              />
            )}
          </label>
        ))
      ) : (
        <p className="rounded-lg border border-line bg-panel p-4 text-sm text-muted">
          No additional intake questions are required.
        </p>
      )}

      <ImageUploadField
        category="problems"
        helperText="Optional: upload a photo of the affected area or relevant document. This will be visible in your booking and to the organiser."
        label="Problem photo"
        value={problemImageUrl}
        onChange={onProblemImageChange}
      />

      <button className="btn btn-primary w-full sm:w-auto" disabled={submitting}>
        <ClipboardCheck size={16} />
        {submitting ? "Confirming" : "Confirm booking"}
      </button>
    </form>
  );
}
