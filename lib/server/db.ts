import "server-only";
import { PrismaClient } from "@prisma/client";
import { fail } from "./http";

const globalDb = globalThis as unknown as { namiyaPrisma?: PrismaClient };
function getDb() {
  if (!process.env.DATABASE_URL) fail(503, "数据库尚未配置");
  if (!globalDb.namiyaPrisma) globalDb.namiyaPrisma = new PrismaClient();
  return globalDb.namiyaPrisma;
}
// Lazy initialization lets the public experience build and run without secrets.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const db = getDb();
    const value = Reflect.get(db, key);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
