import { json, routeError } from "@/lib/server/http";
import { findShop } from "@/lib/server/shops";
import { getAuthUser } from "@/lib/server/auth";
import { authConfig } from "@/lib/supabase/config";

export async function GET(_request: Request, context: { params: Promise<{ shopId: string }> }) {
  try {
    const viewer = authConfig() ? await getAuthUser().catch(() => null) : null;
    return json({ shop: await findShop((await context.params).shopId, viewer?.id) });
  } catch (error) { return routeError(error); }
}
