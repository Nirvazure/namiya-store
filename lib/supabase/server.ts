import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./config";
import { fail } from "@/lib/server/http";

export async function createClient() {
  const config = authConfig();
  if (!config) fail(503, "账号服务尚未配置");
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // RSC cannot write cookies; proxy refreshes them. Route handlers can.
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}
