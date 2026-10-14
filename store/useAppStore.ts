"use client";

import { create } from "zustand";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";

type AppStore = {
  hasHydrated: boolean;
  hasSeenIntro: boolean;
  hydrate: () => void;
  completeIntro: () => void;
};

const VISIT_KEY = "namiya.visit";

export const useAppStore = create<AppStore>((set) => ({
  hasHydrated: false,
  hasSeenIntro: false,
  hydrate: () => {
    const visit = readLocalValue(VISIT_KEY, { hasSeenIntro: false });
    set({ hasHydrated: true, hasSeenIntro: visit.hasSeenIntro });
  },
  completeIntro: () => {
    writeLocalValue(VISIT_KEY, { hasSeenIntro: true });
    set({ hasSeenIntro: true });
  },
}));
