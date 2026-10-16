import { beforeEach, expect, it, vi } from "vitest";
import { defaultShop } from "@/domain/shops";
const db = vi.hoisted(() => ({
  shop: { findUnique: vi.fn(), update: vi.fn() }, shopFavorite: { findUnique: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  $queryRaw: vi.fn(), $transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
import { discoverShops, favoriteShop, listFavorites, updateShopSettings } from "@/lib/server/shop-exploration";
const record = { id: "human-shop", ownerId: "owner", published: defaultShop, publishedAt: new Date(), isOpen: true, discoverable: true, acceptingLetters: true, ownerDisplayName: "店主", ownerAvatarUrl: null };
beforeEach(() => {
  vi.resetAllMocks(); db.$transaction.mockImplementation(work => work(db)); db.$queryRaw.mockResolvedValue([]);
  db.shop.findUnique.mockResolvedValue(record); db.shop.update.mockResolvedValue({ ...record, isOpen: false });
});
it("changes operating state without changing remembered discovery, letters or scenes", async () => {
  expect(await updateShopSettings("owner", { isOpen: false })).toMatchObject({ isOpen: false, discoverable: true, acceptingLetters: true });
  expect(db.shop.update).toHaveBeenCalledWith({ where: { id: "human-shop" }, data: { isOpen: false } });
  expect(db.$queryRaw).toHaveBeenCalled();
});
it("rejects unknown settings and missing owner shops", async () => {
  await expect(updateShopSettings("owner", { ownerId: "attacker" })).rejects.toHaveProperty("name", "ZodError");
  db.shop.findUnique.mockResolvedValue(null);
  await expect(updateShopSettings("stranger", { isOpen: false })).rejects.toMatchObject({ status: 404 });
});
it("allows a closed human favorite, uses the compound key, and forbids self/system favorites", async () => {
  db.shop.findUnique.mockResolvedValue({ ...record, isOpen: false });
  await favoriteShop("visitor", "human-shop", true);
  expect(db.shopFavorite.createMany).toHaveBeenCalledWith({ data: [{ userId: "visitor", shopId: "human-shop" }], skipDuplicates: true });
  await expect(favoriteShop("owner", "human-shop", true)).rejects.toMatchObject({ status: 400 });
  await expect(favoriteShop("visitor", "grandpa", true)).rejects.toMatchObject({ status: 400 });
});
it("returns a closed favorite through an owner-private paginated query without owner IDs", async () => {
  db.shopFavorite.findMany.mockResolvedValue([{ userId: "visitor", shopId: record.id, createdAt: new Date(), shop: { ...record, isOpen: false } }]);
  const result = await listFavorites("visitor", null);
  expect(result.shops[0]).toMatchObject({ isOpen: false, isFavorite: true });
  expect(JSON.stringify(result)).not.toContain('"ownerId"');
  expect(db.shopFavorite.findMany.mock.calls[0][0].where.userId).toBe("visitor");
});
it("rejects malformed discovery and favorite cursors before querying data", async () => {
  await expect(discoverShops(undefined, "bad-cursor")).rejects.toMatchObject({ status: 400 });
  await expect(listFavorites("visitor", "bad-cursor")).rejects.toMatchObject({ status: 400 });
  expect(db.$queryRaw).not.toHaveBeenCalled();
});
it("uses stable seeded cursor pages and filters open, discoverable, published and other owners in SQL", async () => {
  db.$queryRaw.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ ...record, id: `shop-${i}`, discoveryRank: i.toString(16).padStart(32, "0") })));
  const page = await discoverShops("visitor");
  expect(page.shops).toHaveLength(12);
  expect(page.nextCursor).toBeTypeOf("string");
  const query = db.$queryRaw.mock.calls[0][0];
  expect(query.sql).toContain('"isOpen" = true');
  expect(query.sql).toContain('"discoverable" = true');
  expect(query.values).toContain("visitor");
  db.$queryRaw.mockResolvedValue([]);
  expect(await discoverShops("visitor", page.nextCursor)).toEqual({ shops: [], nextCursor: null });
  expect(db.$queryRaw.mock.calls[1][0].values).toContain("0000000000000000000000000000000b");
});
