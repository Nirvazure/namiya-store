import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { blockThread } from "@/lib/server/messaging";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const user = await requireUser(); return json(await blockThread((await context.params).id, user.id, (await request.json()).blocked)); }
  catch (error) { return routeError(error); }
}
