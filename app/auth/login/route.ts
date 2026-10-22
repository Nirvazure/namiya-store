import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail, routeError } from "@/lib/server/http";
import { safeReturnPath } from "@/lib/server/redirects";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const next = safeReturnPath(url.searchParams.get("next"), origin);
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", next);
    const client = await createClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: callback.toString() } });
    if (error || !data.url) fail(503, "暂时无法开启 GitHub 登录");
    return NextResponse.redirect(data.url);
  } catch (error) { return routeError(error); }
}
