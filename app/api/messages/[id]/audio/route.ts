import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, routeError } from "@/lib/server/http";
import { messageAudio } from "@/lib/server/generation";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const user = await requireUser(); const bytes = await messageAudio((await context.params).id, user.id);
    const contentType = bytes.subarray(0, 4).toString("ascii") === "RIFF" ? "audio/wav" : "audio/mpeg";
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
  catch (error) { return routeError(error); }
}
