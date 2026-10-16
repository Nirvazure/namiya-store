import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, json, routeError } from "@/lib/server/http";
import { appendMessage } from "@/lib/server/messaging";
import { scheduleReply } from "@/lib/server/reply-dispatch";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const user = await requireUser();
    const detail = await appendMessage((await context.params).id, user.id, await request.json());
    scheduleReply(detail, user.id);
    return json(detail);
  }
  catch (error) { return routeError(error); }
}
