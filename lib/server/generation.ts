import { prisma } from "@/lib/server/db";
import { fail, HttpError } from "@/lib/server/http";
import { authorizedThread, serializable, threadDetail } from "@/lib/server/messaging";
import { downloadPrivate, privateStorage, uploadPrivate } from "@/lib/server/storage";
import { createGrandpaReply, createGrandpaSpeech } from "@/services/ai/replyService";

const leaseDuration = 120_000;

export async function generateReply(threadId: string, userId: string) {
  const claim = await serializable(async db => {
    const thread = await authorizedThread(threadId, userId, db);
    if (thread.shopId !== "grandpa" || thread.visitorId !== userId) fail(403, "真人小店由店主亲自回信。");
    if (thread.blockedByOwner || thread.blockedByVisitor) fail(409, "这段通信已被屏蔽。");
    const latestVisitor = thread.messages.filter(message => message.role === "visitor").at(-1);
    if (!latestVisitor) fail(409, "请先给爷爷写信。");
    let reply = thread.messages.find(message => message.replyToId === latestVisitor.id);
    const now = new Date();
    if (reply?.status === "completed" || (reply?.leaseUntil && reply.leaseUntil > now)) return null;
    if (reply?.status === "failed" && now.getTime() - reply.updatedAt.getTime() < 10_000) fail(429, "爷爷稍作休息，请十秒后重试。");
    const leaseUntil = new Date(now.getTime() + leaseDuration);
    if (!reply) reply = await db.message.create({ data: { threadId, seq: (thread.messages.at(-1)?.seq ?? 0) + 1, replyToId: latestVisitor.id,
      body: "", role: "system", source: "openai", status: "processing", leaseUntil } });
    else reply = await db.message.update({ where: { id: reply.id }, data: { status: "processing", leaseUntil, error: null } });
    await db.thread.update({ where: { id: threadId }, data: { generationStatus: "generating" } });
    // A bounded context from this private thread only; no shared memory or account metadata.
    const history = thread.messages.filter(message => message.status === "completed").slice(-20).map(message => ({
      role: (message.role === "visitor" ? "user" : "assistant") as "user" | "assistant",
      content: message.seq === 1 ? `标题：${thread.title || "无标题"}\n\n${message.body}` : message.body,
    }));
    return { messageId: reply.id, leaseUntil, history };
  });
  if (!claim) return threadDetail(threadId, userId);
  try {
    const body = await createGrandpaReply(claim.history);
    await serializable(async db => {
      // Compare lease timestamps so a delayed worker cannot overwrite a newer retry.
      const completed = await db.message.updateMany({ where: { id: claim.messageId, status: "processing", leaseUntil: claim.leaseUntil },
        data: { body, status: "completed", leaseUntil: null, error: null, createdAt: new Date() } });
      if (completed.count) await db.thread.update({ where: { id: threadId }, data: { generationStatus: "idle", updatedAt: new Date() } });
    });
  } catch {
    await serializable(async db => {
      const failed = await db.message.updateMany({ where: { id: claim.messageId, status: "processing", leaseUntil: claim.leaseUntil },
        data: { status: "failed", leaseUntil: null, error: "爷爷暂时没能完成回信，请重试。" } });
      if (failed.count) await db.thread.update({ where: { id: threadId }, data: { generationStatus: "failed" } });
    });
  }
  return threadDetail(threadId, userId);
}

export async function messageAudio(messageId: string, userId: string): Promise<Buffer> {
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { thread: true } });
  if (!message || message.thread.visitorId !== userId || message.thread.shopId !== "grandpa") fail(404, "找不到这封回信。");
  if (message.source !== "openai" || message.status !== "completed" || !message.body) fail(409, "请等待文字回信完成后再朗读。");
  if (message.audioPath) return downloadPrivate(message.audioPath);
  privateStorage(); // Validate private storage before making a paid synthesis request.
  const now = new Date();
  if (message.audioStatus === "failed" && now.getTime() - message.updatedAt.getTime() < 10_000) fail(429, "请十秒后再重试朗读。");
  const leaseUntil = new Date(now.getTime() + leaseDuration);
  const claim = await prisma.message.updateMany({ where: { id: messageId, audioPath: null, OR: [{ audioLeaseUntil: null }, { audioLeaseUntil: { lte: now } }] },
    data: { audioStatus: "processing", audioLeaseUntil: leaseUntil } });
  if (!claim.count) fail(409, "正在准备朗读，请稍后再试。");
  try {
    const bytes = await createGrandpaSpeech(message.body);
    const path = `audio/${userId}/${messageId}/${crypto.randomUUID()}.wav`;
    await uploadPrivate(path, bytes, "audio/wav");
    const saved = await prisma.message.updateMany({ where: { id: messageId, audioLeaseUntil: leaseUntil }, data: { audioPath: path, audioStatus: "completed", audioLeaseUntil: null } });
    if (!saved.count) fail(409, "朗读任务已更新，请重新点击播放。");
    return bytes;
  } catch (error) {
    await prisma.message.updateMany({ where: { id: messageId, audioLeaseUntil: leaseUntil }, data: { audioStatus: "failed", audioLeaseUntil: null } });
    if (error instanceof HttpError) throw error;
    return fail(503, "朗读暂时失败，请稍后重试；文字回信已保留。");
  }
}
