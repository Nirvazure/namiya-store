import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), signOut: vi.fn(), initialize: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser, signOut: mocks.signOut } }) }));
vi.mock("@/lib/server/account", () => ({ initializeAccount: mocks.initialize }));
import { requireUser } from "@/lib/server/auth";
import { POST } from "@/app/api/auth/signout/route";

beforeEach(() => vi.clearAllMocks());
it("requires a verified Auth user before touching application data", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  expect(mocks.initialize).not.toHaveBeenCalled();
});
it("creates only the current verified user's local profile", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-auth-id", user_metadata: { role: "admin" } } }, error: null });
  expect(await requireUser()).toEqual({ id: "verified-auth-id" });
  expect(mocks.initialize).toHaveBeenCalledWith({ id: "verified-auth-id", user_metadata: { role: "admin" } });
});
it("distinguishes Auth outages from a logged-out user", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  await expect(requireUser()).rejects.toMatchObject({ status: 503 });
});
it("logs out this site only without revoking sessions in other YQYHub products", async () => {
  mocks.signOut.mockResolvedValue({ error: null });
  expect((await POST(new Request("https://namiya.example/api/auth/signout", { method: "POST", headers: { Origin: "https://namiya.example" } }))).status).toBe(200);
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("rejects a cross-site sign-out request", async () => {
  expect((await POST(new Request("https://namiya.example/api/auth/signout", { method: "POST", headers: { Origin: "https://evil.example" } }))).status).toBe(403);
  expect(mocks.signOut).not.toHaveBeenCalled();
});
