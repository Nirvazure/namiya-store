import "server-only";
import { Prisma, type Shop as ShopRecord } from "@prisma/client";
import { z } from "zod";
import { decorationPreview, type DecorationResponse } from "@/domain/decoration";
import type { Shop } from "@/domain/shops";
import { prisma } from "./db";
import { serializable } from "./transaction";
import { publishedShop } from "./shops";
import { fail } from "./http";

const shopId = z.string().min(1).max(128);
const settingsSchema = z.object({
  name: z.string().trim().min(1).max(30), description: z.string().trim().max(240),
  signStyle: z.enum(["wood", "paper", "moss"]), musicTrackId: z.enum(["rain-radio", "store-lamp"]),
  showForegroundPlants: z.boolean(), themeId: z.enum(["sashimi", "dessert", "matcha"]).optional(),
}).strict();
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("skip"), shopId }).strict(),
  z.object({ action: z.literal("save"), shopId, revision: z.number().int().nonnegative(), settings: settingsSchema }).strict(),
]);
function response(record: ShopRecord, id: string): DecorationResponse {
  if (record.id !== id) fail(403, "只能装饰自己的小店。");
  const shop = publishedShop(record, true);
  if (!shop) fail(404, "小店还没有准备好，请重试。");
  return { shop, revision: record.revision, onboardedAt: record.decorationOnboardedAt?.toISOString() ?? null };
}
export async function readDecoration(ownerId: string, id: string) {
  shopId.parse(id);
  const record = await prisma.shop.findUnique({ where: { ownerId } });
  if (!record) fail(404, "找不到你的小店。");
  return response(record, id);
}
export async function updateDecoration(ownerId: string, input: unknown): Promise<DecorationResponse> {
  const data = inputSchema.parse(input);
  return serializable(async db => {
    const record = await db.shop.findUnique({ where: { ownerId } });
    if (!record) fail(404, "找不到你的小店。");
    const current = response(record, data.shopId);
    if (data.action === "skip") {
      if (record.decorationOnboardedAt) return current;
      await db.shop.updateMany({ where: { id: record.id, ownerId, decorationOnboardedAt: null },
        data: { decorationOnboardedAt: new Date(), revision: { increment: 1 } } });
    } else {
      if (record.revision !== data.revision) fail(409, "小店已在其他页面更新，请重新读取后再保存。");
      const preview = decorationPreview(record.published as unknown as Shop, data.settings);
      // Keep unrelated stored fields and the original exterior, including uploaded scenes.
      const changes = { name: preview.name, description: preview.description, signStyle: preview.signStyle,
        musicTrackId: preview.musicTrackId, appearance: preview.appearance };
      const published = { ...(record.published as Prisma.JsonObject), ...changes, scenes: preview.scenes };
      let draft: Prisma.InputJsonValue | undefined;
      if (record.draft && typeof record.draft === "object" && !Array.isArray(record.draft)) {
        const previous = record.draft as Prisma.JsonObject;
        const scenes = previous.scenes && typeof previous.scenes === "object" && !Array.isArray(previous.scenes) ? previous.scenes : {};
        draft = { ...previous, ...changes, ...(data.settings.themeId ? { scenes: { ...scenes, indoor: preview.scenes.indoor } } : {}) } as unknown as Prisma.InputJsonValue;
      }
      const result = await db.shop.updateMany({ where: { id: record.id, ownerId, revision: data.revision }, data: {
        published: published as unknown as Prisma.InputJsonValue, ...(draft ? { draft } : {}),
        decorationOnboardedAt: record.decorationOnboardedAt ?? new Date(), revision: { increment: 1 },
      } });
      if (result.count !== 1) fail(409, "小店已在其他页面更新，请重新读取后再保存。");
    }
    return response(await db.shop.findUniqueOrThrow({ where: { id: record.id } }), data.shopId);
  });
}
