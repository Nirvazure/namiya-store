import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin, fail, json, routeError } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    // YQYHub is shared with other products; revoke only this site's session.
    const { error } = await (await createClient()).auth.signOut({ scope: "local" });
    if (error) fail(503, "退出失败，请重试");
    return json({ ok: true });
  } catch (error) { return routeError(error); }
}
