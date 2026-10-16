import "server-only";
import { Prisma, type Shop as ShopRecord } from "@prisma/client";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { getSystemShop, type Shop, type ShopDraft, type SceneAsset } from "@/domain/shops";
import { prisma } from "./db";
import { fail } from "./http";
import { canonicalTemplate, draftSchema } from "./shop-validation";
import { downloadPrivate, uploadPublic } from "./storage";

export function publishedShop(record: ShopRecord, isOwner = false): Shop | null {
  if (!record.published) return null;
  const published = record.published as unknown as Shop;
  // Allowlist public fields, including for old stored JSON, never participant IDs.
  return { id: record.id, kind: "human", name: published.name, description: published.description, signStyle: published.signStyle,
    musicTrackId: published.musicTrackId, acceptingLetters: published.acceptingLetters, scenes: published.scenes, isOwner };
}
export async function findShop(id: string, viewerId?: string): Promise<Shop> {
  const system = getSystemShop(id);
  if (system) return { ...system, isOwner: false };
  const record = await prisma.shop.findUnique({ where: { id } });
  const shop = record && publishedShop(record, Boolean(viewerId && record.ownerId === viewerId));
  if (!shop) fail(404, "这家小店还没有开门");
  return shop;
}
export async function ownShop(ownerId: string) {
  const record = await prisma.shop.findUnique({ where: { ownerId } });
  return { shop: record ? publishedShop(record, true) : null, draft: record?.draft as ShopDraft | null ?? null };
}
async function normalizeAsset(ownerId: string, asset: SceneAsset | null, side: "outdoor" | "indoor"): Promise<SceneAsset | null> {
  if (!asset) return null;
  if (asset.uploadId) {
    const upload = await prisma.upload.findFirst({ where: { id: asset.uploadId, ownerId } });
    if (!upload) fail(403, "只能使用自己上传的图片");
    return { mode: "image", uploadId: upload.id, src: `/api/uploads/${upload.id}`, framing: asset.framing };
  }
  const template = canonicalTemplate(asset, side);
  if (!template) fail(400, "请选择系统模板或上传自己的图片");
  return template;
}
export async function saveDraft(ownerId: string, input: unknown) {
  const draft = draftSchema.parse(input);
  const [outdoor, indoor] = await Promise.all([normalizeAsset(ownerId, draft.scenes.outdoor, "outdoor"), normalizeAsset(ownerId, draft.scenes.indoor, "indoor")]);
  const value = { ...draft, scenes: { outdoor, indoor } };
  // ownerId uniqueness plus upsert also covers concurrent first-time saves.
  await prisma.shop.upsert({ where: { ownerId }, create: { ownerId, draft: value as Prisma.InputJsonValue }, update: { draft: value as Prisma.InputJsonValue, revision: { increment: 1 } } });
  return ownShop(ownerId);
}
async function publishAsset(ownerId: string, asset: SceneAsset, side: "outdoor" | "indoor"): Promise<SceneAsset> {
  const normalized = await normalizeAsset(ownerId, asset, side);
  if (!normalized) fail(400, "请补齐室内外图片");
  if (!normalized.uploadId) return normalized;
  const upload = await prisma.upload.findFirst({ where: { id: normalized.uploadId, ownerId } });
  if (!upload) fail(403, "图片不存在或不属于你");
  const bytes = await downloadPrivate(upload.path);
  const webp = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  const src = await uploadPublic(`scenes/${randomUUID()}.webp`, webp);
  return { ...normalized, src };
}
export async function publishShop(ownerId: string) {
  const record = await prisma.shop.findUnique({ where: { ownerId } });
  if (!record?.draft) fail(400, "请先保存小店草稿");
  const draft = draftSchema.parse(record.draft);
  if (!draft.name || !draft.scenes.outdoor || !draft.scenes.indoor) fail(400, "发布前请填写店名，并补齐室外和室内图片");
  const [outdoor, indoor] = await Promise.all([publishAsset(ownerId, draft.scenes.outdoor, "outdoor"), publishAsset(ownerId, draft.scenes.indoor, "indoor")]);
  const shop: Shop = { ...draft, id: record.id, kind: "human", scenes: { outdoor, indoor } };
  // A single compare-and-swap publishes the pair. Concurrent draft edits win.
  const result = await prisma.shop.updateMany({ where: { id: record.id, ownerId, revision: record.revision }, data: { published: shop as unknown as Prisma.InputJsonValue, publishedAt: new Date(), revision: { increment: 1 } } });
  if (result.count !== 1) fail(409, "草稿已更新，请重新预览后发布");
  return { ...shop, isOwner: true };
}
