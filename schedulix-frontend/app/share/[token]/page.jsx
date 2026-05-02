"use client";

import { useParams } from "next/navigation";
import BookingWorkspace from "@/components/BookingWorkspace";

export default function SharedAppointmentPage() {
  const { token } = useParams();

  return (
    <BookingWorkspace
      shareToken={token}
      backHref="/"
      backLabel="Back to live board"
    />
  );
}
