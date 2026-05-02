"use client";

import { BadgeCheck, CreditCard, Landmark } from "lucide-react";
import { useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";

const methods = [
  { key: "mock", label: "Pay now", icon: BadgeCheck },
  { key: "razorpay", label: "Card wallet", icon: CreditCard },
  { key: "clinic", label: "Clinic desk", icon: Landmark }
];

export default function PaymentButtons({ bookingId, onSuccess }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pay = async (method) => {
    setLoading(method);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post(`/bookings/${bookingId}/payment`, {
        method
      });
      setMessage("Payment recorded successfully.");
      onSuccess?.(data.booking);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {methods.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className="btn btn-primary"
            onClick={() => pay(key)}
            disabled={!bookingId || Boolean(loading)}
          >
            <Icon size={16} />
            {loading === key ? "Processing" : label}
          </button>
        ))}
      </div>
      {message ? <p className="text-sm font-semibold text-brand">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
