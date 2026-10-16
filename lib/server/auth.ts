import "server-only";
import { createClient } from "@/lib/supabase/server";
import { initializeAccount } from "./account";
import { fail } from "./http";

export async function getAuthUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error && error.status && error.status >= 500) fail(503, "账号服务暂时不可用");
  return user ?? null;
}
export async function requireUser(): Promise<{ id: string }> {
  const user = await getAuthUser();
  if (!user) fail(401, "请先登录");
  await initializeAccount(user);
  return { id: user.id };
}
