import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = authConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refresh only when there is a session; a missing upstream must not break browsing.
  if (request.cookies.getAll().some(cookie => cookie.name.startsWith("sb-"))) {
    try { await supabase.auth.getUser(); } catch {}
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/", "/shops/:path*", "/auth/:path*", "/api/:path*"] };
