import { getAuthUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { json, routeError } from "@/lib/server/http";
import { authConfig } from "@/lib/supabase/config";

export async function GET() {
  if (!authConfig()) return json({ user: null, configured: false });
  try {
    const user = await getAuthUser();
    if (!user) return json({ user: null, configured: true });
    await prisma.profile.upsert({ where: { authUserId: user.id }, create: { authUserId: user.id }, update: {} });
    return json({ user: { id: user.id, displayName: String(user.user_metadata?.full_name || user.user_metadata?.user_name || "旅人"), avatarUrl: user.user_metadata?.avatar_url || null }, configured: true });
  } catch (error) { return routeError(error); }
}
