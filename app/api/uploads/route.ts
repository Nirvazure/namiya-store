import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin, fail, json, routeError } from "@/lib/server/http";
import { MAX_IMAGE_BYTES, validateImage } from "@/lib/server/image-validation";
import { uploadPrivate } from "@/lib/server/storage";

export const runtime = "nodejs";
async function boundedFormData(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) fail(400, "请选择一张图片");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_IMAGE_BYTES + 64 * 1024) {
        await reader.cancel();
        fail(413, "图片不能超过 10 MB");
      }
      chunks.push(new Uint8Array(next.value));
    }
  } finally { reader.releaseLock(); }
  return new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const size = Number(request.headers.get("content-length"));
    if (size > MAX_IMAGE_BYTES + 64 * 1024) fail(413, "图片不能超过 10 MB");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) fail(400, "请选择一张图片上传");
    // Bound the actual stream too; Content-Length is optional and untrusted.
    const form = await boundedFormData(request);
    if (form.getAll("file").length !== 1) fail(400, "请每次上传一张图片");
    const file = form.get("file");
    if (!(file instanceof File)) fail(400, "请选择一张图片");
    if (file.size > MAX_IMAGE_BYTES) fail(413, "图片不能超过 10 MB");
    // Prevent bulk upload abuse without turning a retry into a second shop.
    const count = await prisma.upload.count({ where: { ownerId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (count >= 30) fail(429, "图片上传较频繁，请稍后重试");
    const bytes = Buffer.from(await file.arrayBuffer());
    const meta = await validateImage(bytes, file.type);
    const path = `${user.id}/originals/${randomUUID()}`;
    await uploadPrivate(path, bytes, meta.contentType);
    const upload = await prisma.upload.create({ data: { ownerId: user.id, path, size: bytes.length, ...meta } });
    return json({ asset: { mode: "image", src: `/api/uploads/${upload.id}`, uploadId: upload.id, framing: { x: 50, y: 50, scale: 1 } } }, 201);
  } catch (error) { return routeError(error); }
}
