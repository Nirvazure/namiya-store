"use client";
import { api, errorMessage } from "@/services/api/client";
import { useLetterStore } from "@/store/useLetterStore";
import type { ThreadDetail } from "@/domain/threads";

export async function deliverPreparedLetter(): Promise<ThreadDetail | undefined> {
  const state = useLetterStore.getState();
  if (state.flowState !== "envelopeReady" || !state.draft.body.trim()) return;
  if (!state.userId) { state.failDelivery("登录后就能寄出这封信。草稿已经为你保留。"); return; }
  state.beginDelivery();
  try {
    const result = await api<ThreadDetail>("/api/threads", { method: "POST", signal: AbortSignal.timeout(30_000), body: JSON.stringify({
      shopId: state.shop.id, title: state.draft.title.trim(), body: state.draft.body.trim(),
      signature: state.signature.trim() || null, clientRequestId: state.clientRequestId,
    }) });
    const current = useLetterStore.getState();
    if (current.userId === state.userId && current.shop.id === state.shop.id && current.clientRequestId === state.clientRequestId) {
      current.completeDelivery(); return result;
    }
  } catch (error) {
    const current = useLetterStore.getState();
    if (current.userId === state.userId && current.shop.id === state.shop.id && current.clientRequestId === state.clientRequestId) current.failDelivery(errorMessage(error));
  }
}
