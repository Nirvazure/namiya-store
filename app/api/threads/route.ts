import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { createThread, listThreads } from "@/lib/server/messaging";

export async function GET(request: Request) {
  try { const user = await requireUser(); return json(await listThreads(user.id, new URL(request.url).searchParams.get("box"))); }
  catch (error) { return routeError(error); }
}
export async function POST(request: Request) {
  try { assertSameOrigin(request); const user = await requireUser(); return json(await createThread(user.id, await request.json()), 201); }
  catch (error) { return routeError(error); }
}
