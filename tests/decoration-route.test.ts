import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/server/shop-decoration", () => ({ readDecoration: mocks.read, updateDecoration: mocks.update }));
import { GET, PATCH } from "@/app/api/shops/mine/decoration/route";
import { HttpError } from "@/lib/server/http";
beforeEach(() => { vi.resetAllMocks(); mocks.requireUser.mockResolvedValue({ id: "verified-owner" }); });
it("reads through verified identity and returns private noncacheable metadata", async () => {
  mocks.read.mockResolvedValue({ revision: 4, onboardedAt: null });
  const response = await GET(new Request("https://namiya.example/api/shops/mine/decoration?shopId=mine"));
  expect(mocks.read).toHaveBeenCalledWith("verified-owner", "mine");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ revision: 4, onboardedAt: null });
});
it("rejects anonymous reads and writes", async () => {
  mocks.requireUser.mockRejectedValue(new HttpError(401, "请先登录"));
  expect((await GET(new Request("https://namiya.example/api/shops/mine/decoration?shopId=mine"))).status).toBe(401);
  expect((await PATCH(new Request("https://namiya.example/api/shops/mine/decoration", { method: "PATCH", body: '{}' }))).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
});
it("rejects cross-site saves before executing a mutation", async () => {
  const response = await PATCH(new Request("https://namiya.example/api/shops/mine/decoration", { method: "PATCH", headers: { origin: "https://other.example" }, body: '{}' }));
  expect(response.status).toBe(403); expect(mocks.update).not.toHaveBeenCalled();
});
it("uses the authenticated owner and preserves conflict status", async () => {
  mocks.update.mockRejectedValue(new HttpError(409, "请重新读取"));
  const body = { action: "skip", shopId: "mine" };
  const response = await PATCH(new Request("https://namiya.example/api/shops/mine/decoration", { method: "PATCH", headers: { origin: "https://namiya.example" }, body: JSON.stringify(body) }));
  expect(mocks.update).toHaveBeenCalledWith("verified-owner", body); expect(response.status).toBe(409);
});
