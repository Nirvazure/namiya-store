import { describe, expect, it, vi, beforeEach } from "vitest";
import { systemShops, type ShopDraft } from "@/domain/shops";

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ shop: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() }, upload: { findFirst: vi.fn() } }));
const auth = vi.hoisted(() => ({ getAuthUser: vi.fn(), authConfig: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
vi.mock("@/lib/server/storage", () => ({ downloadPrivate: vi.fn(), uploadPublic: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ getAuthUser: auth.getAuthUser }));
vi.mock("@/lib/supabase/config", () => ({ authConfig: auth.authConfig }));
import { findShop, publishShop, saveDraft } from "@/lib/server/shops";
import { GET as listShops } from "@/app/api/shops/route";
import { GET as shopById } from "@/app/api/shops/[shopId]/route";

const draft: ShopDraft = { name: "海边小店", description: "欢迎来信", signStyle: "wood", musicTrackId: "rain-radio", acceptingLetters: true, scenes: systemShops[1].scenes };
beforeEach(() => { vi.clearAllMocks(); auth.authConfig.mockReturnValue(null); auth.getAuthUser.mockResolvedValue(null); });

describe("shop ownership and publication", () => {
  it("stores an incomplete scene only as a draft and uses unique owner upsert", async () => {
    db.shop.findUnique.mockResolvedValue(null);
    await saveDraft("owner", { ...draft, scenes: { outdoor: null, indoor: null } });
    const input = db.shop.upsert.mock.calls[0][0];
    expect(input.where).toEqual({ ownerId: "owner" });
    expect(input.create.draft.scenes).toEqual({ outdoor: null, indoor: null });
    expect(input.update.published).toBeUndefined();
  });
  it("rejects someone else's upload before changing a draft", async () => {
    db.upload.findFirst.mockResolvedValue(null);
    await expect(saveDraft("owner", { ...draft, scenes: { ...draft.scenes, outdoor: { ...draft.scenes.outdoor, uploadId: "someone-elses-image" } } })).rejects.toMatchObject({ status: 403 });
    expect(db.upload.findFirst).toHaveBeenCalledWith({ where: { id: "someone-elses-image", ownerId: "owner" } });
    expect(db.shop.upsert).not.toHaveBeenCalled();
  });
  it("requires both images before publishing", async () => {
    db.shop.findUnique.mockResolvedValue({ id: "shop", draft: { ...draft, scenes: { indoor: null, outdoor: null } }, revision: 1 });
    await expect(publishShop("owner")).rejects.toMatchObject({ status: 400 });
    expect(db.shop.updateMany).not.toHaveBeenCalled();
  });
  it("publishes the pair atomically with a revision condition", async () => {
    db.shop.findUnique.mockResolvedValue({ id: "shop", draft, revision: 4 });
    db.shop.updateMany.mockResolvedValue({ count: 1 });
    const published = await publishShop("owner");
    const update = db.shop.updateMany.mock.calls[0][0];
    expect(update.where).toEqual({ id: "shop", ownerId: "owner", revision: 4 });
    expect(update.data.published.scenes).toEqual(draft.scenes);
    expect(published.isOwner).toBe(true);
    expect(update.data.published.ownerId).toBeUndefined();
  });
  it("does not overwrite a newer draft when publication races a save", async () => {
    db.shop.findUnique.mockResolvedValue({ id: "shop", draft, revision: 4 });
    db.shop.updateMany.mockResolvedValue({ count: 0 });
    await expect(publishShop("owner")).rejects.toMatchObject({ status: 409 });
  });
  it("canonicalizes template paths instead of trusting a caller URL", async () => {
    db.shop.findUnique.mockResolvedValue(null);
    await saveDraft("owner", { ...draft, scenes: { ...draft.scenes, outdoor: { ...draft.scenes.outdoor, src: "https://attacker.invalid/image" } } });
    expect(db.shop.upsert.mock.calls[0][0].create.draft.scenes.outdoor.src).toBe(systemShops[1].scenes.outdoor.src);
  });
  it("marks the owner on shared shop lookup and exposes no owner ID", async () => {
    db.shop.findUnique.mockResolvedValue({ id: "shared-shop", ownerId: "owner", published: { ...draft, ownerId: "legacy-private-id" } });
    expect(await findShop("shared-shop", "owner")).toMatchObject({ id: "shared-shop", isOwner: true });
    const stranger = await findShop("shared-shop", "third-person");
    expect(stranger.isOwner).toBe(false);
    expect(stranger).not.toHaveProperty("ownerId");
    expect(await findShop("shared-shop")).toMatchObject({ isOwner: false });
  });
  it("uses verified optional identity in both directory and shared-link APIs", async () => {
    const record = { id: "shared-shop", ownerId: "owner", published: draft };
    db.shop.findMany.mockResolvedValue([record]); db.shop.findUnique.mockResolvedValue(record);
    auth.authConfig.mockReturnValue({ url: "https://auth.example", key: "public" });
    auth.getAuthUser.mockResolvedValue({ id: "owner" });
    const ownerList = await (await listShops()).json();
    expect(ownerList.shops[0].isOwner).toBe(true);
    const ownerShop = await (await shopById(new Request("https://example.com/api/shops/shared-shop"), { params: Promise.resolve({ shopId: "shared-shop" }) })).json();
    expect(ownerShop.shop.isOwner).toBe(true);
    expect(ownerShop.shop).not.toHaveProperty("ownerId");
    auth.getAuthUser.mockResolvedValue({ id: "third-person" });
    expect((await (await listShops()).json()).shops[0].isOwner).toBe(false);
  });
  it("keeps public shop APIs usable without Auth config or during an Auth outage", async () => {
    const record = { id: "shared-shop", ownerId: "owner", published: draft };
    db.shop.findMany.mockResolvedValue([record]); db.shop.findUnique.mockResolvedValue(record);
    expect((await (await listShops()).json()).shops[0].isOwner).toBe(false);
    expect(auth.getAuthUser).not.toHaveBeenCalled();
    auth.authConfig.mockReturnValue({ url: "https://auth.example", key: "public" });
    auth.getAuthUser.mockRejectedValue(new Error("Auth unavailable"));
    expect((await (await listShops()).json()).shops[0].isOwner).toBe(false);
    const response = await shopById(new Request("https://example.com/api/shops/shared-shop"), { params: Promise.resolve({ shopId: "shared-shop" }) });
    expect(response.status).toBe(200);
    expect((await response.json()).shop.isOwner).toBe(false);
  });
});
