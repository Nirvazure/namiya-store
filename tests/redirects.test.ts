import { expect, it } from "vitest";
import { safeReturnPath } from "@/lib/server/redirects";

it("keeps a local shop path and rejects alternate-origin OAuth return paths", () => {
  expect(safeReturnPath("/shops/abc?enter=1", "https://example.com")).toBe("/shops/abc?enter=1");
  for (const input of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/\n/evil.invalid", null]) {
    expect(safeReturnPath(input, "https://example.com")).toBe("/");
  }
});
