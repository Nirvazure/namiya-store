import "server-only";
import { Prisma } from "@prisma/client";

export async function lockShop(db: Prisma.TransactionClient, identity: { id: string } | { ownerId: string }) {
  const where = "id" in identity ? Prisma.sql`"id" = ${identity.id}` : Prisma.sql`"ownerId" = ${identity.ownerId}::uuid`;
  await db.$queryRaw(Prisma.sql`SELECT "id" FROM "namiya_store"."shops" WHERE ${where} FOR UPDATE`);
  return db.shop.findUnique({ where: identity });
}
