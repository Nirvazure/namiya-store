import sharp from "sharp";
import { fail } from "./http";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function imageType(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
export async function validateImage(bytes: Buffer, declaredType: string) {
  if (bytes.length > MAX_IMAGE_BYTES) fail(413, "图片不能超过 10 MB");
  const type = imageType(bytes);
  if (!type || type !== declaredType) fail(400, "仅支持 JPEG、PNG、WebP 静态图片");
  try {
    const meta = await sharp(bytes, { limitInputPixels: 40_000_000, animated: true }).metadata();
    if (!meta.width || !meta.height || meta.width > 8192 || meta.height > 8192 || meta.width * meta.height > 40_000_000 || (meta.pages ?? 1) !== 1) fail(400, "图片须为静态图片，边长不超过 8192 像素，总像素不超过 4000 万");
    // Decode before saving: metadata alone can accept truncated image payloads.
    await sharp(bytes, { limitInputPixels: 40_000_000 }).resize({ width: 32, height: 32, fit: "inside" }).raw().toBuffer();
    return { contentType: type, width: meta.width, height: meta.height };
  } catch (error) {
    if (error instanceof Error && error.name === "HttpError") throw error;
    fail(400, "图片无法解码，请选择完整的 JPEG、PNG 或 WebP 图片");
  }
}
