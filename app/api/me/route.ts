import { getAuthUser } from "@/lib/server/auth";
import { initializeAccount, publicIdentity } from "@/lib/server/account";
import { json, routeError } from "@/lib/server/http";
import { authConfig } from "@/lib/supabase/config";

export async function GET() {
  if (!authConfig()) return json({ user: null, configured: false, myShopId: null });
  try {
    const user = await getAuthUser();
    if (!user) return json({ user: null, configured: true, myShopId: null });
    const account = { id: user.id, ...publicIdentity(user) };
    try {
      const shop = await initializeAccount(user);
      return json({ user: account, configured: true, myShopId: shop.id });
    } catch {
      console.error("Namiya account initialization failed");
      return json({ user: account, configured: true, myShopId: null, initializationError: "登录已完成，小店初始化失败，请重试。" });
    }
  } catch (error) { return routeError(error); }
}
