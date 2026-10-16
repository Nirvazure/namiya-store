import "server-only";
import { after } from "next/server";
import type { ThreadDetail } from "@/domain/threads";
import { generateReply } from "./generation";

/** The committed thread and verified identity outlive the requesting browser view. */
export function scheduleReply(detail: ThreadDetail, userId: string) {
  if (!detail.thread.isAi || detail.thread.blocked || detail.thread.generationStatus !== "pending") return;
  after(async () => {
    try { await generateReply(detail.thread.id, userId); }
    catch { console.error("Namiya reply dispatch failed", { threadId: detail.thread.id }); }
  });
}
