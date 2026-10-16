import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadedThread } from "@/lib/server/messaging";

const mocks = vi.hoisted(() => ({
  db: { thread: { findUnique: vi.fn(), update: vi.fn() }, message: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, $transaction: vi.fn() },
  reply: vi.fn(), speech: vi.fn(), download: vi.fn(), upload: vi.fn(), privateStorage: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ prisma: mocks.db }));
vi.mock("@/services/ai/replyService", () => ({ createGrandpaReply: mocks.reply, createGrandpaSpeech: mocks.speech }));
vi.mock("@/lib/server/storage", () => ({ downloadPrivate: mocks.download, uploadPrivate: mocks.upload, privateStorage: mocks.privateStorage }));
import { generateReply, messageAudio } from "@/lib/server/generation";

function fixture(): LoadedThread {
  const date = new Date(Date.now() - 60_000);
  return { id: "private-thread", shopId: "grandpa", visitorId: "visitor", shopOwnerId: null, signature: null, title: "心事", clientRequestId: "request-1", blockedByOwner: false,
    blockedByVisitor: false, visitorReadAt: date, ownerReadAt: null, generationStatus: "pending", createdAt: date, updatedAt: date,
    messages: [{ id: "visitor-letter", threadId: "private-thread", role: "visitor", seq: 1, body: "今天有点累", source: "human", clientRequestId: "request-1", replyToId: null,
      status: "completed", leaseUntil: null, error: null, audioPath: null, audioStatus: "idle", audioLeaseUntil: null, createdAt: date, updatedAt: date }] };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async work => work(mocks.db));
  mocks.db.message.updateMany.mockResolvedValue({ count: 1 });
});

describe("grandpa generation leases", () => {
  it("never generates on behalf of a real shop or for a third party", async () => {
    const thread = fixture();
    thread.shopId = "human-shop";
    thread.shopOwnerId = "owner";
    mocks.db.thread.findUnique.mockResolvedValue(thread);
    await expect(generateReply(thread.id, "owner")).rejects.toMatchObject({ status: 403 });
    await expect(generateReply(thread.id, "third-party")).rejects.toMatchObject({ status: 404 });
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it("does not call OpenAI again while the existing worker lease is alive", async () => {
    const thread = fixture();
    thread.messages.push({ ...thread.messages[0], id: "ai-letter", seq: 2, clientRequestId: null, replyToId: "visitor-letter", role: "system", source: "openai", body: "", status: "processing", leaseUntil: new Date(Date.now() + 90_000) });
    mocks.db.thread.findUnique.mockResolvedValue(thread);
    const detail = await generateReply(thread.id, "visitor");
    expect(detail.thread.generationStatus).toBe("generating");
    expect(detail.messages).toHaveLength(1);
    expect(mocks.reply).not.toHaveBeenCalled();
  });
  it("records recoverable failure, without inserting a mock reply", async () => {
    const thread = fixture();
    mocks.db.thread.findUnique.mockResolvedValue(thread);
    mocks.db.message.create.mockResolvedValue({ id: "ai-letter" });
    mocks.reply.mockRejectedValue(new Error("upstream unavailable"));
    await generateReply(thread.id, "visitor");
    expect(mocks.reply).toHaveBeenCalledWith([{ role: "user", content: "标题：心事\n\n今天有点累" }]);
    expect(mocks.db.message.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "ai-letter", status: "processing", leaseUntil: expect.any(Date) }),
      data: expect.objectContaining({ status: "failed", leaseUntil: null }),
    }));
    expect(mocks.db.thread.update).toHaveBeenCalledWith({ where: { id: thread.id }, data: { generationStatus: "failed" } });
  });
  it("does not overwrite a newer worker when a stale lease loses ownership", async () => {
    const thread = fixture();
    mocks.db.thread.findUnique.mockResolvedValue(thread);
    mocks.db.message.create.mockResolvedValue({ id: "ai-letter" });
    mocks.reply.mockResolvedValue("亲爱的朋友，慢慢来。");
    mocks.db.message.updateMany.mockResolvedValue({ count: 0 });
    await generateReply(thread.id, "visitor");
    expect(mocks.db.thread.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ generationStatus: "idle" }) }));
  });
});

describe("private synthesized speech", () => {
  it("checks the visitor identity before reading a cached private audio file", async () => {
    const thread = fixture();
    const message = { ...thread.messages[0], source: "openai", audioPath: "private/audio.mp3", thread };
    mocks.db.message.findUnique.mockResolvedValue(message);
    await expect(messageAudio(message.id, "third-party")).rejects.toMatchObject({ status: 404 });
    expect(mocks.download).not.toHaveBeenCalled();
    const bytes = Buffer.from("cached-mp3");
    mocks.download.mockResolvedValue(bytes);
    await expect(messageAudio(message.id, "visitor")).resolves.toBe(bytes);
    expect(mocks.speech).not.toHaveBeenCalled();
  });
  it("retains text and clears the synthesis lease after a voice failure", async () => {
    const thread = fixture();
    const message = { ...thread.messages[0], source: "openai", thread };
    mocks.db.message.findUnique.mockResolvedValue(message);
    mocks.speech.mockRejectedValue(new Error("朗读暂时失败"));
    await expect(messageAudio(message.id, "visitor")).rejects.toMatchObject({ status: 503 });
    expect(mocks.db.message.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { audioStatus: "failed", audioLeaseUntil: null } }));
    expect(mocks.db.message.updateMany.mock.calls.every(call => !("body" in call[0].data))).toBe(true);
  });
});
