"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeExperience from "@/components/home/HomeExperience";
import { roleHome, useAuthStore } from "@/lib/authStore";

export default function Page() {
  const router = useRouter();
  const { hasHydrated, token, user } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated || !token || !user?.role) return;
    router.replace(roleHome(user.role));
  }, [hasHydrated, router, token, user?.role]);

  return <HomeExperience />;
}
