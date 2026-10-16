import { afterEach, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/services/api/client", () => ({ api: request }));
import { decorationPath, isDecorationPath, loadShopDestination, shopIdFromPath, shopPath } from "@/services/shops/navigation";
afterEach(() => { vi.unstubAllGlobals(); request.mockReset(); });
it("uses singular encoded routes and recognizes a direct URL", () => {
  expect(shopPath("some id")).toBe("/shop/some%20id");
  expect(shopIdFromPath("/shop/some%20id")).toBe("some id");
  expect(shopIdFromPath("/")).toBe("grandpa");
  expect(shopIdFromPath("/elsewhere")).toBeNull();
  expect(decorationPath("some id")).toBe("/shop/some%20id/decorate");
  expect(shopIdFromPath("/shop/some%20id/decorate")).toBe("some id");
  expect(isDecorationPath("/shop/some%20id/decorate")).toBe(true);
  expect(isDecorationPath("/shop/some%20id")).toBe(false);
});
it("loads only the destination exterior before returning it", async () => {
  const { defaultShop } = await import("@/domain/shops");
  const shop = { ...defaultShop, id: "human-shop" };
  request.mockResolvedValue({ shop });
  const sources: string[] = [];
  vi.stubGlobal("window", { Image: class { onload?: () => void; set src(value: string) { sources.push(value); queueMicrotask(() => this.onload?.()); } } });
  expect((await loadShopDestination("human-shop")).id).toBe("human-shop");
  expect(sources).toContain(shop.scenes.outdoor.src);
  expect(sources).not.toContain(shop.scenes.indoor.src);
});
it("rejects mismatching destinations instead of silently falling back to the official shop", async () => {
  request.mockResolvedValue({ shop: { id: "wrong" } });
  await expect(loadShopDestination("requested")).rejects.toThrow("小店地址");
});
