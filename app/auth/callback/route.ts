import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/server/http";
import { safeReturnPath } from "@/lib/server/redirects";
import { initializeAccount } from "@/lib/server/account";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) fail(400, "登录链接不完整，请重新登录");
    const client = await createClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) fail(400, "登录链接已过期，请重新登录");
    const next = safeReturnPath(url.searchParams.get("next"), url.origin);
    if (data?.user) {
      try { await initializeAccount(data.user); }
      catch {
        const destination = new URL(next, url.origin);
        destination.searchParams.set("error", "account_initialization_failed");
        return NextResponse.redirect(destination);
      }
    }
    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    // Keep canceled/expired sign-ins in the product and expose no upstream details.
    return NextResponse.redirect(new URL("/?error=auth_callback_failed", request.url));
  }
}
