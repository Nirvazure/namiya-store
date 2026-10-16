import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { ownShop, saveDraft } from "@/lib/server/shops";

export async function GET() {
  try { return json(await ownShop((await requireUser()).id)); } catch (error) { return routeError(error); }
}
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return json(await saveDraft(user.id, await request.json()));
  } catch (error) { return routeError(error); }
}
