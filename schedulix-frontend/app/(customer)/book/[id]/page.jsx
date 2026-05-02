"use client";

import { useParams } from "next/navigation";
import BookingWorkspace from "@/components/BookingWorkspace";

export default function BookingPage() {
  const { id } = useParams();

  return <BookingWorkspace appointmentId={id} />;
}
