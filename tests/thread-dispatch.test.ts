import { beforeEach, expect, it, vi } from "vitest";
import type { ThreadDetail } from "@/domain/threads";
const mocks = vi.hoisted(() => ({ after: vi.fn(), generate: vi.fn(), create: vi.fn(), append: vi.fn(), requireUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/server/generation", () => ({ generateReply: mocks.generate }));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/server/messaging", () => ({ createThread: mocks.create, appendMessage: mocks.append, listThreads: vi.fn() }));
import { POST as create } from "@/app/api/threads/route";
import { POST as append } from "@/app/api/threads/[id]/messages/route";

const detail: ThreadDetail = { thread: { id: "thread", shopId: "grandpa", shopName: "解忧杂货店", title: "心事", signature: null, viewerRole: "visitor", isAi: true, unread: false, blocked: false, generationStatus: "pending", updatedAt: new Date().toISOString() }, messages: [] };
const request = () => new Request("https://namiya.example/api/threads", { method: "POST", headers: { Origin: "https://namiya.example", "Content-Type": "application/json" }, body: JSON.stringify({ body: "一封信" }) });
beforeEach(() => { vi.resetAllMocks(); mocks.requireUser.mockResolvedValue({ id: "verified-user" }); mocks.create.mockResolvedValue(detail); mocks.append.mockResolvedValue(detail); });
it("schedules the first AI reply after delivery even without opening a mailbox", async () => {
  expect((await create(request())).status).toBe(201);
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.after).toHaveBeenCalledTimes(1);
  await mocks.after.mock.calls[0][0]();
  expect(mocks.generate).toHaveBeenCalledWith("thread", "verified-user");
});
it("schedules continuations with the verified sender and keeps human mail off AI", async () => {
  expect((await append(request(), { params: Promise.resolve({ id: "thread" }) })).status).toBe(200);
  expect(mocks.after).toHaveBeenCalledTimes(1);
  mocks.after.mockClear(); mocks.create.mockResolvedValue({ ...detail, thread: { ...detail.thread, isAi: false, generationStatus: "idle" } });
  await create(request());
  expect(mocks.after).not.toHaveBeenCalled();
});
it("does not schedule generation for a rejected submission", async () => {
  mocks.requireUser.mockRejectedValue(new Error("unavailable"));
  expect((await create(request())).status).toBe(503);
  expect(mocks.after).not.toHaveBeenCalled();
});
