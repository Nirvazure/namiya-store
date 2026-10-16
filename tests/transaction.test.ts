import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ prisma: db }));
import { serializable } from "@/lib/server/transaction";
beforeEach(() => vi.resetAllMocks());
it.each(["40001", "40P01"])("retries raw PostgreSQL transaction conflict %s after a row lock", async code => {
  db.$transaction.mockRejectedValueOnce({ code: "P2010", meta: { code } }).mockResolvedValueOnce("closed shop checked");
  expect(await serializable(async () => "unused")).toBe("closed shop checked");
  expect(db.$transaction).toHaveBeenCalledTimes(2);
});
it("does not retry unrelated raw SQL errors and bounds conflict retries", async () => {
  const invalid = { code: "P2010", meta: { code: "42601" } };
  db.$transaction.mockRejectedValue(invalid);
  await expect(serializable(async () => null)).rejects.toBe(invalid);
  expect(db.$transaction).toHaveBeenCalledTimes(1);
  db.$transaction.mockClear().mockRejectedValue({ code: "P2010", meta: { code: "40001" } });
  await expect(serializable(async () => null)).rejects.toMatchObject({ code: "P2010" });
  expect(db.$transaction).toHaveBeenCalledTimes(4);
});
