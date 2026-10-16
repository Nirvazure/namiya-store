import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { favoriteShop } from "@/lib/server/shop-exploration";

async function change(request: Request, context: { params: Promise<{ shopId: string }> }, value: boolean) {
  try {
    assertSameOrigin(request);
    return json(await favoriteShop((await requireUser()).id, (await context.params).shopId, value));
  } catch (error) { return routeError(error); }
}
export async function PUT(request: Request, context: { params: Promise<{ shopId: string }> }) { return change(request, context, true); }
export async function DELETE(request: Request, context: { params: Promise<{ shopId: string }> }) { return change(request, context, false); }
