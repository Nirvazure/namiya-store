import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ profile: { upsert: vi.fn() }, shop: { upsert: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() }, $transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
import { initializeAccount } from "@/lib/server/account";

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(work => work(db));
});
it("creates a published default pair using the verified identity, without email in public data", async () => {
  db.shop.upsert.mockImplementation(({ create }) => ({ id: "one-shop", ...create }));
  const result = await initializeAccount({ id: "verified-user", user_metadata: { full_name: "小林", avatar_url: "https://avatars.example/me.png" } });
  expect(result.id).toBe("one-shop");
  expect(result.published).toMatchObject({ name: "小林的小店", scenes: { outdoor: { templateId: "grandpa" }, indoor: { templateId: "grandpa" } } });
  expect(db.shop.upsert.mock.calls[0][0].create).toMatchObject({ ownerId: "verified-user", isOpen: true, discoverable: true, acceptingLetters: true, ownerDisplayName: "小林" });
});
it("preserves an existing published scene, settings, and unconfirmed draft", async () => {
  const record = { id: "old-shop", published: { name: "原来的店" }, draft: { name: "未确认上传" }, isOpen: false };
  db.shop.upsert.mockResolvedValue(record);
  expect(await initializeAccount({ id: "owner", user_metadata: {} })).toEqual(record);
  expect(db.shop.upsert.mock.calls[0][0].update).not.toHaveProperty("published");
  expect(db.shop.upsert.mock.calls[0][0].update).not.toHaveProperty("isOpen");
  expect(db.shop.updateMany).not.toHaveBeenCalled();
});
it("backfills a draft-only shop with templates without publishing the draft", async () => {
  db.shop.upsert.mockResolvedValue({ id: "draft-shop", published: null, draft: { name: "private draft" } });
  db.shop.findUniqueOrThrow.mockResolvedValue({ id: "draft-shop", published: { name: "旅人的小店" } });
  await initializeAccount({ id: "owner" });
  expect(db.shop.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "draft-shop", published: { equals: expect.anything() } }, data: { published: { name: "旅人的小店" } } });
  expect(db.shop.updateMany.mock.calls[0][0].data).not.toHaveProperty("draft");
});
it("retries a unique-conflict initialization and reuses the owner identity", async () => {
  db.$transaction.mockRejectedValueOnce({ code: "P2002" });
  db.shop.upsert.mockResolvedValue({ id: "same-shop", published: {} });
  expect((await initializeAccount({ id: "owner" })).id).toBe("same-shop");
  expect(db.$transaction).toHaveBeenCalledTimes(2);
});
