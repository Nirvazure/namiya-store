import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadedThread } from "@/lib/server/messaging";

const db = vi.hoisted(() => ({
  thread: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  message: { count: vi.fn(), create: vi.fn() },
  shop: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
import { appendMessage, authorizedThread, createThread, markRead, threadDetail } from "@/lib/server/messaging";

const now = new Date("2026-10-15T12:00:00Z");
function fixture(): LoadedThread {
  return { id: "thread-1", shopId: "grandpa", shopOwnerId: null, visitorId: "private-visitor-id", signature: null, title: "心事", clientRequestId: "request-1",
    blockedByVisitor: false, blockedByOwner: false, visitorReadAt: now, ownerReadAt: null, generationStatus: "pending", createdAt: now, updatedAt: now,
    messages: [{ id: "message-1", threadId: "thread-1", seq: 1, role: "visitor", body: "今天很累", source: "human", clientRequestId: "request-1", replyToId: null,
      status: "completed", leaseUntil: null, error: null, audioPath: null, audioStatus: "idle", audioLeaseUntil: null, createdAt: now, updatedAt: now }] };
}
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async work => work(db));
  db.message.count.mockResolvedValue(0);
});

describe("private thread service", () => {
  it("rejects a third account before returning any messages", async () => {
    db.thread.findUnique.mockResolvedValue(fixture());
    await expect(authorizedThread("thread-1", "third-account")).rejects.toMatchObject({ status: 404 });
  });
  it("projects a private DTO without account IDs, internal paths, request IDs or leases", async () => {
    const thread = fixture();
    thread.messages[0].audioPath = "audio/secret-path";
    db.thread.findUnique.mockResolvedValue(thread);
    const dto = await threadDetail("thread-1", thread.visitorId);
    expect(dto.thread.signature).toBeNull();
    const serialized = JSON.stringify(dto);
    for (const secret of ["private-visitor-id", "audio/secret-path", "request-1", "leaseUntil", "shopOwnerId"]) expect(serialized).not.toContain(secret);
    expect(dto.messages[0].body).toBe("今天很累");
  });
  it("replays the same initial submission without inserting another letter or charging a rate slot", async () => {
    const thread = fixture();
    db.thread.findUnique.mockResolvedValue(thread);
    const dto = await createThread(thread.visitorId, { shopId: "grandpa", title: "心事", body: "今天很累", signature: null, clientRequestId: "request-1" });
    expect(dto.thread.id).toBe("thread-1");
    expect(db.thread.create).not.toHaveBeenCalled();
    expect(db.message.count).not.toHaveBeenCalled();
    await expect(createThread(thread.visitorId, { shopId: "grandpa", title: "心事", body: "不同内容", clientRequestId: "request-1" })).rejects.toMatchObject({ status: 409 });
  });
  it("does not insert another continuation on a successful retry even after a conversation is blocked", async () => {
    const thread = fixture();
    thread.blockedByVisitor = true;
    db.thread.findUnique.mockResolvedValue(thread);
    await appendMessage(thread.id, thread.visitorId, { body: "今天很累", clientRequestId: "request-1" });
    expect(db.message.create).not.toHaveBeenCalled();
  });
  it("enforces sending limits before saving a new letter", async () => {
    db.thread.findUnique.mockResolvedValue(null);
    db.message.count.mockResolvedValue(5);
    await expect(createThread("visitor", { shopId: "grandpa", body: "新心事", clientRequestId: "new-request-1" })).rejects.toMatchObject({ status: 429 });
    expect(db.thread.create).not.toHaveBeenCalled();
  });
  it("never marks a concurrently arriving future message read", async () => {
    const thread = fixture();
    thread.messages.push({ ...thread.messages[0], id: "newer-unseen-message", role: "system", source: "openai", seq: 2, clientRequestId: null, createdAt: new Date(now.getTime() + 5000) });
    db.thread.findUnique.mockResolvedValue(thread);
    await markRead(thread.id, thread.visitorId, "message-1");
    expect(db.thread.update).toHaveBeenCalledWith({ where: { id: thread.id }, data: { visitorReadAt: now } });
  });
  it("does not regress the read marker when an older tab finishes late", async () => {
    const thread = fixture();
    thread.visitorReadAt = new Date(now.getTime() + 10_000);
    db.thread.findUnique.mockResolvedValue(thread);
    await markRead(thread.id, thread.visitorId, "message-1");
    expect(db.thread.update).toHaveBeenCalledWith({ where: { id: thread.id }, data: { visitorReadAt: thread.visitorReadAt } });
    await expect(markRead(thread.id, thread.visitorId, "not-in-this-thread")).rejects.toMatchObject({ status: 400 });
  });
  it("rejects demo shop delivery and does not ask AI to reply to a human shop", async () => {
    db.thread.findUnique.mockResolvedValue(null);
    await expect(createThread("visitor", { shopId: "sashimi", body: "新心事", clientRequestId: "new-request-1" })).rejects.toMatchObject({ status: 409 });
    expect(db.thread.create).not.toHaveBeenCalled();
  });
  it("rejects a new letter to a paused shop but allows its existing correspondence", async () => {
    const thread = fixture();
    thread.shopId = "human-shop";
    thread.shopOwnerId = "owner";
    thread.generationStatus = "idle";
    db.thread.findUnique.mockResolvedValue(null);
    db.shop.findUnique.mockResolvedValue({ ownerId: "owner", published: { name: "小店", acceptingLetters: false } });
    await expect(createThread(thread.visitorId, { shopId: thread.shopId, body: "新来信", clientRequestId: "new-request-1" })).rejects.toMatchObject({ status: 409 });
    db.thread.findUnique.mockResolvedValue(thread);
    await appendMessage(thread.id, "owner", { body: "我仍然会读你的信。", clientRequestId: "owner-reply-1" });
    expect(db.message.create).toHaveBeenCalledWith({ data: expect.objectContaining({ threadId: thread.id, role: "owner", body: "我仍然会读你的信。" }) });
  });
});
