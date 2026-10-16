"use client";
import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
export function useLocalSnapshot(key: string) {
  return useSyncExternalStore(subscribe, () => { try { return window.localStorage.getItem(key); } catch { return null; } }, () => null);
}
