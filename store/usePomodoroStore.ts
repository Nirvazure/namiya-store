"use client";

import { create } from "zustand";

type PomodoroStore = {
  mode: "focus" | "break";
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  panelOpen: boolean;
  togglePanel: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
};

const FOCUS_SECONDS = 25 * 60;

export const usePomodoroStore = create<PomodoroStore>((set) => ({
  mode: "focus",
  durationSeconds: FOCUS_SECONDS,
  remainingSeconds: FOCUS_SECONDS,
  isRunning: false,
  panelOpen: false,
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () =>
    set({
      mode: "focus",
      durationSeconds: FOCUS_SECONDS,
      remainingSeconds: FOCUS_SECONDS,
      isRunning: false,
    }),
  tick: () =>
    set((state) => {
      if (!state.isRunning) {
        return state;
      }

      const remainingSeconds = Math.max(0, state.remainingSeconds - 1);
      return {
        remainingSeconds,
        isRunning: remainingSeconds > 0,
      };
    }),
}));
