import { beforeEach, expect, it, vi } from "vitest";
import { systemShops } from "@/domain/shops";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/services/api/client", () => ({ api: request }));
import { DiscoveryQueue, ShopTrail, swipeDirection } from "@/services/shops/exploration";
beforeEach(() => request.mockReset());
it("keeps forward history instead of randomizing again after returning", () => {
  const trail = new ShopTrail("own");
  trail.observe("a"); trail.observe("b"); trail.observe("a");
  expect(trail.previousIds()).toEqual(["own"]);
  expect(trail.forwardIds()).toEqual(["b"]);
  expect(trail.hasVisited("b")).toBe(true);
});
it("consumes all cursor batches and does not duplicate requests for simultaneous preloads", async () => {
  request.mockResolvedValueOnce({ shops: [systemShops[1]], nextCursor: "page-2" }).mockResolvedValueOnce({ shops: [systemShops[2]], nextCursor: null });
  const queue = new DiscoveryQueue();
  await Promise.all([queue.peek(), queue.peek()]);
  expect(request).toHaveBeenCalledTimes(1);
  expect((await queue.take())?.id).toBe("sashimi");
  expect((await queue.take())?.id).toBe("dessert");
  expect(await queue.take()).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
});
it("uses labelled system scenes only for an empty first batch, and retries network failures", async () => {
  request.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ shops: [], nextCursor: null });
  const queue = new DiscoveryQueue();
  await expect(queue.peek()).rejects.toThrow("offline");
  expect((await queue.take())?.kind).toBe("demo");
});
it("requires 60px and a dominant horizontal movement; vertical and small drags do nothing", () => {
  expect(swipeDirection(-60, 20)).toBe("next");
  expect(swipeDirection(80, 20)).toBe("previous");
  expect(swipeDirection(59, 0)).toBeNull();
  expect(swipeDirection(-80, 70)).toBeNull();
});
