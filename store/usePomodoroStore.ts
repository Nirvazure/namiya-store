"use client";
import { create } from "zustand";
import { secondsUntil } from "@/domain/focus";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";

const FOCUS_SECONDS = 25 * 60;
const KEY = "namiya.focus.v2";
type TimerRecord = { remainingSeconds: number; deadline: number | null; isRunning: boolean };
type PomodoroStore = TimerRecord & {
  mode: "focus" | "break"; durationSeconds: number; panelOpen: boolean;
  hydrate: () => void; togglePanel: () => void; start: () => void; pause: () => void; reset: () => void; tick: () => void;
};
function save(state: TimerRecord) { writeLocalValue(KEY, { remainingSeconds: state.remainingSeconds, deadline: state.deadline, isRunning: state.isRunning }); }
export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  mode: "focus", durationSeconds: FOCUS_SECONDS, remainingSeconds: FOCUS_SECONDS,
  deadline: null, isRunning: false, panelOpen: false,
  hydrate: () => {
    const raw = readLocalValue<Partial<TimerRecord> | null>(KEY, null);
    if (!raw || typeof raw.remainingSeconds !== "number" || !Number.isFinite(raw.remainingSeconds)) return;
    const deadline = typeof raw.deadline === "number" && Number.isFinite(raw.deadline) ? raw.deadline : null;
    const remainingSeconds = raw.isRunning && deadline ? Math.min(FOCUS_SECONDS, secondsUntil(deadline)) : Math.floor(Math.max(0, Math.min(FOCUS_SECONDS, raw.remainingSeconds)));
    set({ remainingSeconds, deadline: remainingSeconds && raw.isRunning ? deadline : null, isRunning: Boolean(raw.isRunning && deadline && remainingSeconds) });
  },
  togglePanel: () => set(state => ({ panelOpen: !state.panelOpen })),
  start: () => {
    if (get().isRunning) return;
    const remainingSeconds = get().remainingSeconds || FOCUS_SECONDS;
    set({ remainingSeconds, deadline: Date.now() + remainingSeconds * 1000, isRunning: true }); save(get());
  },
  pause: () => {
    const state = get();
    set({ remainingSeconds: state.deadline ? secondsUntil(state.deadline) : state.remainingSeconds, deadline: null, isRunning: false }); save(get());
  },
  reset: () => { set({ mode: "focus", durationSeconds: FOCUS_SECONDS, remainingSeconds: FOCUS_SECONDS, deadline: null, isRunning: false }); save(get()); },
  tick: () => {
    const state = get();
    if (!state.isRunning || !state.deadline) return;
    const remainingSeconds = secondsUntil(state.deadline);
    set({ remainingSeconds, isRunning: remainingSeconds > 0, deadline: remainingSeconds > 0 ? state.deadline : null });
    if (!remainingSeconds) save(get());
  },
}));
