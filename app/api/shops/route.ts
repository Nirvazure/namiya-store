import { json, routeError } from "@/lib/server/http";
import { discoverShops } from "@/lib/server/shop-exploration";
import { getAuthUser } from "@/lib/server/auth";
import { authConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
  try {
    // Authentication enriches the public view; an Auth outage must not close it.
    const viewer = authConfig() ? await getAuthUser().catch(() => null) : null;
    return json(await discoverShops(viewer?.id, new URL(request.url).searchParams.get("cursor")));
  } catch (error) { return routeError(error); }
}
