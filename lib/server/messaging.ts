import type { Prisma } from "@prisma/client";
import type { ThreadDetail, ThreadSummary } from "@/domain/threads";
import type { Shop } from "@/domain/shops";
import { getSystemShop } from "@/domain/shops";
import { prisma } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { participantRole, requestId, textField } from "@/lib/server/messaging-policy";

type Db = Prisma.TransactionClient;
const includeMessages = { messages: { orderBy: { seq: "asc" as const } } };
export type LoadedThread = Prisma.ThreadGetPayload<{ include: typeof includeMessages }>;
type SummaryThread = Omit<LoadedThread, "messages"> & { messages: Pick<LoadedThread["messages"][number], "role" | "status" | "source" | "createdAt" | "leaseUntil">[] };

export async function serializable<T>(work: (tx: Db) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (attempt < 3 && typeof error === "object" && error !== null && "code" in error && (error.code === "P2034" || error.code === "P2002")) continue;
      throw error;
    }
  }
}

function validated<T>(work: () => T): T {
  try { return work(); } catch (error) { return fail(400, error instanceof Error ? error.message : "输入无效。"); }
}

export async function authorizedThread(id: string, userId: string, db: Db = prisma): Promise<LoadedThread> {
  const thread = await db.thread.findUnique({ where: { id }, include: includeMessages });
  if (!thread || !participantRole(thread, userId)) fail(404, "找不到这封通信。");
  return thread;
}

async function shopName(id: string, db: Db = prisma) {
  const system = getSystemShop(id);
  if (system) return system.name;
  const shop = await db.shop.findUnique({ where: { id }, select: { published: true } });
  return (shop?.published as Shop | null)?.name ?? "小店";
}

export function threadSummary(thread: SummaryThread, userId: string, name: string): ThreadSummary {
  const role = participantRole(thread, userId);
  if (!role) fail(404, "找不到这封通信。");
  const lastIncoming = thread.messages.filter(message => message.status === "completed" && (role === "owner" ? message.role === "visitor" : message.role !== "visitor")).at(-1);
  const readAt = role === "owner" ? thread.ownerReadAt : thread.visitorReadAt;
  const pending = thread.messages.find(message => message.source === "openai" && message.status !== "completed");
  const generationStatus = pending
    ? pending.status === "processing" && pending.leaseUntil && pending.leaseUntil > new Date() ? "generating" : "failed"
    : thread.generationStatus as ThreadSummary["generationStatus"];
  // Deliberate allowlist: internal participant IDs, storage paths and leases never leave the server.
  return { id: thread.id, shopId: thread.shopId, shopName: name, title: thread.title, signature: thread.signature,
    viewerRole: role, isAi: thread.shopId === "grandpa", unread: Boolean(lastIncoming && (!readAt || lastIncoming.createdAt > readAt)),
    blocked: thread.blockedByOwner || thread.blockedByVisitor, generationStatus, updatedAt: thread.updatedAt.toISOString() };
}

export async function threadDetail(id: string, userId: string): Promise<ThreadDetail> {
  const thread = await authorizedThread(id, userId);
  return { thread: threadSummary(thread, userId, await shopName(thread.shopId)), messages: thread.messages.filter(message => message.status === "completed").map(message => ({ id: message.id, body: message.body,
    role: message.role as "visitor" | "owner" | "system", source: message.source as "human" | "openai", createdAt: message.createdAt.toISOString() })) };
}

export async function listThreads(userId: string, box: string | null) {
  if (box && box !== "all" && box !== "inbox" && box !== "sent") fail(400, "未知信箱。");
  const where = box === "inbox" ? { shopOwnerId: userId } : box === "sent" ? { visitorId: userId } : { OR: [{ visitorId: userId }, { shopOwnerId: userId }] };
  // Polling for unread counts never loads private letter bodies or audio paths.
  const threads = await prisma.thread.findMany({ where, include: { messages: { orderBy: { seq: "asc" }, select: { role: true, status: true, source: true, createdAt: true, leaseUntil: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  const names = new Map<string, string>();
  for (const id of new Set(threads.map(thread => thread.shopId))) names.set(id, await shopName(id));
  return { threads: threads.map(thread => threadSummary(thread, userId, names.get(thread.shopId)!)) };
}

async function checkRate(db: Db, userId: string) {
  const recent = await db.message.count({ where: { source: "human", createdAt: { gt: new Date(Date.now() - 60_000) }, OR: [
    { role: "visitor", thread: { visitorId: userId } }, { role: "owner", thread: { shopOwnerId: userId } },
  ] } });
  if (recent >= 5) fail(429, "信已在路上，请稍等一分钟再寄。");
  const daily = await db.message.count({ where: { source: "human", createdAt: { gt: new Date(Date.now() - 86_400_000) }, OR: [
    { role: "visitor", thread: { visitorId: userId } }, { role: "owner", thread: { shopOwnerId: userId } },
  ] } });
  if (daily >= 100) fail(429, "今天已经寄出了很多信，请明天再来。");
}

export async function createThread(userId: string, input: Record<string, unknown>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "提交的数据格式不正确。");
  const fields = validated(() => ({ shopId: textField(input.shopId, 100), title: textField(input.title ?? "", 120, false), body: textField(input.body, 10_000),
    signature: input.signature === null || input.signature === undefined ? null : textField(input.signature, 40) || null, clientRequestId: requestId(input.clientRequestId) }));
  const id = await serializable(async db => {
    const existing = await db.thread.findUnique({ where: { visitorId_clientRequestId: { visitorId: userId, clientRequestId: fields.clientRequestId } }, include: includeMessages });
    if (existing) {
      if (existing.shopId !== fields.shopId || existing.title !== fields.title || existing.signature !== fields.signature || existing.messages[0]?.body !== fields.body) fail(409, "这个投递标识已经用于另一封信。");
      return existing.id;
    }
    let ownerId: string | null = null;
    const system = getSystemShop(fields.shopId);
    if (system && system.id !== "grandpa") fail(409, "这家示例小店暂不接信。");
    if (!system) {
      const shop = await db.shop.findUnique({ where: { id: fields.shopId } });
      if (!shop?.published) fail(404, "这家小店尚未开门。");
      if (!(shop.published as Shop).acceptingLetters) fail(409, "店主暂时暂停接收新来信。");
      ownerId = shop.ownerId;
      if (ownerId === userId) fail(400, "请到另一家小店投递心事。");
    }
    await checkRate(db, userId);
    const thread = await db.thread.create({ data: { shopId: fields.shopId, shopOwnerId: ownerId, visitorId: userId, title: fields.title, signature: fields.signature,
      clientRequestId: fields.clientRequestId, visitorReadAt: new Date(), generationStatus: fields.shopId === "grandpa" ? "pending" : "idle",
      messages: { create: { seq: 1, role: "visitor", source: "human", status: "completed", body: fields.body, clientRequestId: fields.clientRequestId } } } });
    return thread.id;
  });
  return threadDetail(id, userId);
}

export async function appendMessage(id: string, userId: string, input: Record<string, unknown>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "提交的数据格式不正确。");
  const fields = validated(() => ({ body: textField(input.body, 10_000), clientRequestId: requestId(input.clientRequestId) }));
  await serializable(async db => {
    const thread = await authorizedThread(id, userId, db);
    const role = participantRole(thread, userId)!;
    const existing = thread.messages.find(message => message.clientRequestId === fields.clientRequestId);
    if (existing) {
      if (existing.role !== role || existing.body !== fields.body) fail(409, "这个投递标识已被使用。");
      return;
    }
    if (thread.blockedByOwner || thread.blockedByVisitor) fail(409, "这段通信已被屏蔽。");
    if (thread.shopId === "grandpa" && thread.generationStatus !== "idle") fail(409, "请先等待或重试爷爷上一封回信。");
    await checkRate(db, userId);
    await db.message.create({ data: { threadId: id, seq: (thread.messages.at(-1)?.seq ?? 0) + 1, role, source: "human", status: "completed", body: fields.body, clientRequestId: fields.clientRequestId } });
    await db.thread.update({ where: { id }, data: { updatedAt: new Date(), ...(role === "owner" ? { ownerReadAt: new Date() } : { visitorReadAt: new Date() }),
      generationStatus: thread.shopId === "grandpa" ? "pending" : "idle" } });
  });
  return threadDetail(id, userId);
}

export async function markRead(id: string, userId: string, throughMessageId?: string) {
  await serializable(async db => {
    const thread = await authorizedThread(id, userId, db);
    const visible = thread.messages.filter(message => message.status === "completed");
    const through = throughMessageId ? visible.find(message => message.id === throughMessageId) : visible.at(-1);
    if (throughMessageId && !through) fail(400, "已读标识不属于这段通信。");
    // The browser supplies its rendered last message, so letters arriving after its GET stay unread.
    const nextReadAt = through?.createdAt ?? thread.createdAt;
    const isOwner = participantRole(thread, userId) === "owner";
    const previous = isOwner ? thread.ownerReadAt : thread.visitorReadAt;
    const readAt = previous && previous > nextReadAt ? previous : nextReadAt;
    await db.thread.update({ where: { id }, data: isOwner ? { ownerReadAt: readAt } : { visitorReadAt: readAt } });
  });
  return { ok: true };
}

export async function blockThread(id: string, userId: string, blocked: unknown) {
  if (typeof blocked !== "boolean") fail(400, "请提供屏蔽状态。");
  await serializable(async db => {
    const thread = await authorizedThread(id, userId, db);
    await db.thread.update({ where: { id }, data: participantRole(thread, userId) === "owner" ? { blockedByOwner: blocked } : { blockedByVisitor: blocked } });
  });
  return threadDetail(id, userId);
}
