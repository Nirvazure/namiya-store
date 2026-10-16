import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { imageType, validateImage, MAX_IMAGE_BYTES } from "@/lib/server/image-validation";

describe("image upload validation", () => {
  it("recognizes PNG magic instead of trusting extensions", () => {
    expect(imageType(Buffer.from("<svg></svg>"))).toBeNull();
    expect(imageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");
  });
  it("rejects mismatched and truncated payloads", async () => {
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "white" } }).png().toBuffer();
    await expect(validateImage(png, "image/jpeg")).rejects.toMatchObject({ status: 400 });
    await expect(validateImage(png.subarray(0, 24), "image/png")).rejects.toMatchObject({ status: 400 });
  });
  it("accepts decodable static pixels and checks file-size limits", async () => {
    const webp = await sharp({ create: { width: 16, height: 12, channels: 3, background: "white" } }).webp().toBuffer();
    expect(await validateImage(webp, "image/webp")).toEqual({ contentType: "image/webp", width: 16, height: 12 });
    await expect(validateImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png")).rejects.toMatchObject({ status: 413 });
  });
});
