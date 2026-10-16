import "server-only";
import { Prisma } from "@prisma/client";
import { defaultShop } from "@/domain/shops";
import { serializable } from "./transaction";

type Identity = { id: string; user_metadata?: Record<string, unknown> };
export function publicIdentity(user: Identity) {
  const metadata = user.user_metadata ?? {};
  const candidate = metadata.full_name || metadata.user_name;
  const displayName = typeof candidate === "string" && candidate.trim() && !candidate.includes("@")
    ? [...candidate.trim()].slice(0, 24).join("") : "旅人";
  let avatarUrl: string | null = null;
  try {
    const url = new URL(String(metadata.avatar_url ?? ""));
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048) avatarUrl = url.href;
  } catch { /* The public avatar is optional. */ }
  return { displayName, avatarUrl };
}

export async function initializeAccount(user: Identity) {
  const identity = publicIdentity(user);
  const published = { ...defaultShop, kind: "human", name: `${identity.displayName}的小店`, description: "留一盏灯，等一封来信。" };
  return serializable(async db => {
    await db.profile.upsert({ where: { authUserId: user.id }, create: { authUserId: user.id }, update: {} });
    const record = await db.shop.upsert({ where: { ownerId: user.id }, create: {
      ownerId: user.id, ownerDisplayName: identity.displayName, ownerAvatarUrl: identity.avatarUrl,
      isOpen: true, discoverable: true, acceptingLetters: true,
      published: published as unknown as Prisma.InputJsonValue, publishedAt: new Date(),
    }, update: { ownerDisplayName: identity.displayName, ownerAvatarUrl: identity.avatarUrl } });
    if (record.published) return record;
    await db.shop.updateMany({ where: { id: record.id, published: { equals: Prisma.DbNull } }, data: {
      published: published as unknown as Prisma.InputJsonValue, publishedAt: new Date(), revision: { increment: 1 },
    } });
    return db.shop.findUniqueOrThrow({ where: { id: record.id } });
  });
}
