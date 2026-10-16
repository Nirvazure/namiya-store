import { beforeEach, expect, it, vi } from "vitest";
import { defaultShop, systemShops } from "@/domain/shops";

const db = vi.hoisted(() => ({ shop: { findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() }, $transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
import { readDecoration, updateDecoration } from "@/lib/server/shop-decoration";

const base = () => ({ id: "mine", ownerId: "owner", revision: 3, published: structuredClone(defaultShop), draft: { ...structuredClone(defaultShop), name: "待完善草稿", privateNote: "保留", scenes: { ...structuredClone(defaultShop.scenes), outdoor: { uploadId: "private-outdoor" } } }, isOpen: false, discoverable: false, acceptingLetters: false, decorationOnboardedAt: null });
const settings = { name: "新店名", description: "新的介绍", signStyle: "moss", musicTrackId: "store-lamp", showForegroundPlants: false };
let record: ReturnType<typeof base>;
beforeEach(() => {
  vi.resetAllMocks(); record = base();
  db.$transaction.mockImplementation(work => work(db));
  db.shop.findUnique.mockImplementation(async () => record);
  db.shop.findUniqueOrThrow.mockImplementation(async () => record);
  db.shop.updateMany.mockImplementation(async ({ data }) => {
    record = { ...record, ...data, revision: record.revision + 1 };
    return { count: 1 };
  });
});

it("reads only the requested owner's shop and includes private onboarding state", async () => {
  expect(await readDecoration("owner", "mine")).toMatchObject({ revision: 3, onboardedAt: null, shop: { id: "mine", isOwner: true } });
  expect(db.shop.findUnique).toHaveBeenCalledWith({ where: { ownerId: "owner" } });
  await expect(readDecoration("owner", "other")).rejects.toMatchObject({ status: 403 });
});
it("skips once without changing published scenes, drafts or operating settings", async () => {
  const published = structuredClone(record.published), draft = structuredClone(record.draft);
  await updateDecoration("owner", { action: "skip", shopId: "mine" });
  expect(record.published).toEqual(published); expect(record.draft).toEqual(draft);
  expect(record.decorationOnboardedAt).toBeInstanceOf(Date);
  await updateDecoration("owner", { action: "skip", shopId: "mine" });
  expect(db.shop.updateMany).toHaveBeenCalledTimes(1);
  expect(record.isOpen).toBe(false); expect(record.acceptingLetters).toBe(false);
});
it("saves details while retaining grandpa or a custom indoor scene when no theme was chosen", async () => {
  for (const indoor of [defaultShop.scenes.indoor, { mode: "image", src: "/custom.webp", framing: { x: 44, y: 50, scale: 1 } }]) {
    record = base(); record.published.scenes.indoor = indoor as typeof defaultShop.scenes.indoor;
    const oldOutdoor = structuredClone(record.published.scenes.outdoor);
    await updateDecoration("owner", { action: "save", shopId: "mine", revision: 3, settings });
    expect(record.published.scenes.indoor).toEqual(indoor);
    expect(record.published.scenes.outdoor).toEqual(oldOutdoor);
    expect(record.draft.scenes.outdoor).toEqual({ uploadId: "private-outdoor" });
    expect(record.draft.privateNote).toBe("保留");
    expect(record.published).toMatchObject({ name: "新店名", appearance: { showForegroundPlants: false } });
    expect(db.shop.updateMany.mock.lastCall?.[0].data).not.toHaveProperty("isOpen");
  }
});
it("applies each allowlisted theme to published and draft interiors without changing the exterior", async () => {
  for (const template of systemShops.filter(shop => shop.kind === "demo")) {
    record = base();
    await updateDecoration("owner", { action: "save", shopId: "mine", revision: 3, settings: { ...settings, themeId: template.id } });
    expect(record.published.scenes.indoor).toEqual(template.scenes.indoor);
    expect(record.draft.scenes.indoor).toEqual(template.scenes.indoor);
  }
});
it("rejects stale versions, forged destinations and arbitrary resource paths", async () => {
  await expect(updateDecoration("owner", { action: "save", shopId: "mine", revision: 2, settings })).rejects.toMatchObject({ status: 409 });
  await expect(updateDecoration("owner", { action: "skip", shopId: "other" })).rejects.toMatchObject({ status: 403 });
  for (const patch of [{ themeId: "grandpa" }, { themeId: "https://example.com/a.webp" }, { musicTrackId: "untrusted" }, { src: "/private" }]) {
    await expect(updateDecoration("owner", { action: "save", shopId: "mine", revision: 3, settings: { ...settings, ...patch } })).rejects.toThrow();
  }
  expect(db.shop.updateMany).not.toHaveBeenCalled();
});
it("reports a compare-and-swap conflict instead of silently overwriting another edit", async () => {
  db.shop.updateMany.mockResolvedValue({ count: 0 });
  await expect(updateDecoration("owner", { action: "save", shopId: "mine", revision: 3, settings })).rejects.toMatchObject({ status: 409 });
});
