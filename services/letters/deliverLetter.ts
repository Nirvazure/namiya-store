"use client";

import { isLetterReply } from "@/domain/letterTypes";
import { useLetterStore } from "@/store/useLetterStore";

const DELIVERY_DURATION_MS = 1800;
const REQUEST_TIMEOUT_MS = 45_000;

/** Only a prepared envelope can be posted by clicking the scene mailbox. */
export async function deliverPreparedLetter(): Promise<void> {
  const state = useLetterStore.getState();
  if (state.flowState !== "envelopeReady" || !state.draft.body.trim()) return;

  const payload = {
    title: state.draft.title.trim(),
    body: state.draft.body.trim(),
    characterId: state.selectedCharacterId,
    privacyMode: state.privacyMode,
  };
  // Zustand updates synchronously, so a second click cannot start another request.
  state.beginDelivery();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const waitForEnvelope = () => new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(0, DELIVERY_DURATION_MS - (Date.now() - startedAt)));
  });

  try {
    const response = await fetch("/api/letters/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("reply-unavailable");
    const reply: unknown = await response.json();
    if (!isLetterReply(reply)) throw new Error("invalid-reply");
    await waitForEnvelope();
    useLetterStore.getState().setReply(reply);
  } catch {
    await waitForEnvelope();
    useLetterStore.getState().failDelivery(
      controller.signal.aborted
        ? "等候回信的时间有点久。信还在，请再点一次邮箱投递。"
        : "这次没有投递成功，信还在。请再点一次邮箱重试。",
    );
  } finally {
    clearTimeout(timeout);
  }
}
