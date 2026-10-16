import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { publishShop } from "@/lib/server/shops";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return json({ shop: await publishShop((await requireUser()).id) });
  } catch (error) { return routeError(error); }
}
