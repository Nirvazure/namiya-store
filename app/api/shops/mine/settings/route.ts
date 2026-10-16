import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { updateShopSettings } from "@/lib/server/shop-exploration";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return json({ shop: await updateShopSettings(user.id, await request.json()) });
  } catch (error) { return routeError(error); }
}
