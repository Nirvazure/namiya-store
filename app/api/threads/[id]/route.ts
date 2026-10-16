import { requireUser } from "@/lib/server/auth";
import { json, routeError } from "@/lib/server/http";
import { threadDetail } from "@/lib/server/messaging";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); return json(await threadDetail((await context.params).id, user.id)); }
  catch (error) { return routeError(error); }
}
