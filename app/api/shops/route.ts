import { prisma } from "@/lib/server/db";
import { json, routeError } from "@/lib/server/http";
import { publishedShop } from "@/lib/server/shops";
import { getAuthUser } from "@/lib/server/auth";
import { authConfig } from "@/lib/supabase/config";

export async function GET() {
  try {
    // Authentication enriches the public view; an Auth outage must not close it.
    const viewer = authConfig() ? await getAuthUser().catch(() => null) : null;
    const records = await prisma.shop.findMany({ where: { publishedAt: { not: null } }, orderBy: { publishedAt: "desc" }, take: 100 });
    return json({ shops: records.map(record => publishedShop(record, Boolean(viewer && record.ownerId === viewer.id))).filter(Boolean) });
  } catch (error) { return routeError(error); }
}
