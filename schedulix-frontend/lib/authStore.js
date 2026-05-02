"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const roleHome = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "organiser") return "/organiser/dashboard";
  return "/home";
};

export const nextAfterAuth = (user, forceProfile = false) => {
  if (user?.role !== "admin" && (forceProfile || !user?.profileCompleted)) {
    return "/profile/complete";
  }

  return roleHome(user?.role);
};

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      bookingDraft: null,
      selectedBooking: null,
      hasHydrated: false,
      setAuth: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      setBookingDraft: (bookingDraft) => set({ bookingDraft }),
      setSelectedBooking: (selectedBooking) => set({ selectedBooking }),
      clearBookingFlow: () =>
        set({
          bookingDraft: null,
          selectedBooking: null
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          bookingDraft: null,
          selectedBooking: null
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated })
    }),
    {
      name: "schedulix-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        bookingDraft: state.bookingDraft,
        selectedBooking: state.selectedBooking
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
