import { requireUser } from "@/lib/server/auth";
import { json, routeError } from "@/lib/server/http";
import { listFavorites } from "@/lib/server/shop-exploration";

export async function GET(request: Request) {
  try { return json(await listFavorites((await requireUser()).id, new URL(request.url).searchParams.get("cursor"))); }
  catch (error) { return routeError(error); }
}
