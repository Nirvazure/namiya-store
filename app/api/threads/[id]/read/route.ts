import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, fail, json, routeError } from "@/lib/server/http";
import { markRead } from "@/lib/server/messaging";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const raw = await request.text();
    const input = raw ? JSON.parse(raw) : {};
    if (!input || typeof input !== "object" || (input.throughMessageId !== undefined && typeof input.throughMessageId !== "string")) fail(400, "已读标识格式不正确。");
    return json(await markRead((await context.params).id, user.id, input.throughMessageId));
  }
  catch (error) { return routeError(error); }
}
