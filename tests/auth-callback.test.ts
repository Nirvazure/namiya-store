import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock("@/lib/server/account", () => ({ initializeAccount: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: auth.exchange } }) }));
import { GET } from "@/app/auth/callback/route";
import { initializeAccount } from "@/lib/server/account";

beforeEach(() => vi.clearAllMocks());
it("returns canceled and missing-code callbacks to the friendly in-app error", async () => {
  const response = await GET(new Request("https://namiya.example/auth/callback?error=access_denied"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://namiya.example/?error=auth_callback_failed");
  expect(auth.exchange).not.toHaveBeenCalled();
});
it("returns failed exchanges to the same page without upstream error details", async () => {
  auth.exchange.mockResolvedValue({ error: { message: "expired-sensitive-upstream-value" } });
  const response = await GET(new Request("https://namiya.example/auth/callback?code=expired&next=https://evil.example"));
  expect(response.headers.get("location")).toBe("https://namiya.example/?error=auth_callback_failed");
  expect(await response.text()).not.toContain("expired-sensitive-upstream-value");
});
it("returns successful exchanges to a safe local shop path", async () => {
  auth.exchange.mockResolvedValue({ error: null });
  const response = await GET(new Request("https://namiya.example/auth/callback?code=valid&next=%2Fshops%2Fmy-store"));
  expect(auth.exchange).toHaveBeenCalledWith("valid");
  expect(response.headers.get("location")).toBe("https://namiya.example/shops/my-store");
  const malicious = await GET(new Request("https://namiya.example/auth/callback?code=valid&next=%2F%2Fevil.example"));
  expect(malicious.headers.get("location")).toBe("https://namiya.example/");
});
it("preserves verified login and the return fragment when default-shop initialization fails", async () => {
  auth.exchange.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
  vi.mocked(initializeAccount).mockRejectedValueOnce(new Error("offline database"));
  const response = await GET(new Request("https://namiya.example/auth/callback?code=valid&next=%2Fshop%2Ffriend%3Ffrom%3Dshare%23mailbox"));
  expect(response.headers.get("location")).toBe("https://namiya.example/shop/friend?from=share&error=account_initialization_failed#mailbox");
});
