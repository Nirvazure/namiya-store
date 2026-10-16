import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { readDecoration, updateDecoration } from "@/lib/server/shop-decoration";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    return json(await readDecoration(user.id, new URL(request.url).searchParams.get("shopId") ?? ""));
  } catch (error) { return routeError(error); }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return json(await updateDecoration(user.id, await request.json()));
  } catch (error) { return routeError(error); }
}
