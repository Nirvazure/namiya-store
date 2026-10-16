import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

function isConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  if (error.code === "P2034" || error.code === "P2002") return true;
  // PostgreSQL conflicts from SELECT FOR UPDATE are wrapped as raw-query errors.
  const meta = "meta" in error ? error.meta : null;
  return error.code === "P2010" && typeof meta === "object" && meta !== null && "code" in meta
    && (meta.code === "40001" || meta.code === "40P01");
}

export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (attempt < 3 && isConflict(error)) continue;
      throw error;
    }
  }
}
