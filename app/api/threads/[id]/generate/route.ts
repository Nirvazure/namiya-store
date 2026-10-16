import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { generateReply } from "@/lib/server/generation";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const user = await requireUser(); return json(await generateReply((await context.params).id, user.id)); }
  catch (error) { return routeError(error); }
}
