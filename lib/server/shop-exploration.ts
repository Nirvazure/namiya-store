import "server-only";
import { Prisma, type Shop as ShopRecord } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSystemShop, type ShopPageResponse } from "@/domain/shops";
import { prisma } from "./db";
import { fail } from "./http";
import { serializable } from "./transaction";
import { lockShop } from "./shop-lock";
import { publishedShop } from "./shops";

const discoveryCursor = z.object({ seed: z.string().uuid(), rank: z.string().regex(/^[a-f0-9]{32}$/), id: z.string().min(1).max(128) });
const favoriteCursor = z.object({ date: z.string().datetime(), id: z.string().min(1).max(128) });
function decode<T>(value: string, schema: z.ZodType<T>): T {
  try {
    if (value.length > 1024) throw new Error();
    return schema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch { return fail(400, "浏览位置已失效，请重新开始。"); }
}
function encode(value: unknown) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }

export async function discoverShops(viewerId?: string, cursor?: string | null): Promise<ShopPageResponse> {
  const previous = cursor ? decode(cursor, discoveryCursor) : null;
  const seed = previous?.seed ?? randomUUID();
  const rank = Prisma.sql`md5(s."id" || ${seed})`;
  const after = previous ? Prisma.sql`AND (${rank}, s."id") > (${previous.rank}, ${previous.id})` : Prisma.empty;
  const owner = viewerId ? Prisma.sql`AND s."ownerId" <> ${viewerId}::uuid` : Prisma.empty;
  const rows = await prisma.$queryRaw<(ShopRecord & { discoveryRank: string })[]>(Prisma.sql`
    SELECT s.*, ${rank} AS "discoveryRank" FROM "namiya_store"."shops" s
    WHERE s."isOpen" = true AND s."discoverable" = true
      AND s."publishedAt" IS NOT NULL AND s."published" IS NOT NULL ${owner} ${after}
    ORDER BY ${rank}, s."id" LIMIT 13`);
  const page = rows.slice(0, 12);
  const last = page.at(-1);
  return { shops: page.flatMap(row => { const shop = publishedShop(row); return shop ? [shop] : []; }),
    nextCursor: rows.length > 12 && last ? encode({ seed, rank: last.discoveryRank, id: last.id }) : null };
}

const settingsSchema = z.object({ isOpen: z.boolean().optional(), discoverable: z.boolean().optional(), acceptingLetters: z.boolean().optional() }).strict().refine(value => Object.keys(value).length > 0);
export async function updateShopSettings(ownerId: string, input: unknown) {
  const data = settingsSchema.parse(input);
  return serializable(async db => {
    const record = await lockShop(db, { ownerId });
    if (!record) fail(404, "找不到你的小店。");
    const updated = await db.shop.update({ where: { id: record.id }, data });
    return publishedShop(updated, true)!;
  });
}

export async function favoriteShop(userId: string, shopId: string, favorite: boolean) {
  if (getSystemShop(shopId)) fail(400, "本人和官方入口已固定，示例店无需收藏。");
  const record = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!record?.published) fail(404, "这家小店还没有开门。");
  if (record.ownerId === userId) fail(400, "你的小店已有固定入口。");
  if (favorite) await prisma.shopFavorite.createMany({ data: [{ userId, shopId }], skipDuplicates: true });
  else await prisma.shopFavorite.deleteMany({ where: { userId, shopId } });
  return { isFavorite: favorite };
}

export async function listFavorites(userId: string, cursor: string | null): Promise<ShopPageResponse> {
  const previous = cursor ? decode(cursor, favoriteCursor) : null;
  const rows = await prisma.shopFavorite.findMany({ where: { userId, ...(previous ? { OR: [
    { createdAt: { lt: new Date(previous.date) } }, { createdAt: new Date(previous.date), shopId: { gt: previous.id } },
  ] } : {}) }, orderBy: [{ createdAt: "desc" }, { shopId: "asc" }], take: 51, include: { shop: true } });
  const page = rows.slice(0, 50);
  const last = page.at(-1);
  return { shops: page.flatMap(row => { const shop = publishedShop(row.shop); return shop ? [{ ...shop, isFavorite: true }] : []; }),
    nextCursor: rows.length > 50 && last ? encode({ date: last.createdAt.toISOString(), id: last.shopId }) : null };
}
