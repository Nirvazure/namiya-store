"use client";
import { useLetterStore } from "@/store/useLetterStore";

export function loginUrl(next?: string) {
  if (typeof window === "undefined") return "/auth/login";
  return `/auth/login?next=${encodeURIComponent(next ?? window.location.pathname)}`;
}
export function prepareLogin(next?: string) {
  const state = useLetterStore.getState();
  if (!state.userId && state.draft.body.trim()) {
    try { window.sessionStorage.setItem("namiya.login-draft", JSON.stringify({ shopId: state.shop.id, draft: state.draft, signature: state.signature })); } catch { /* Local draft remains available. */ }
  }
  window.location.assign(loginUrl(next));
}
