import sharp from "sharp";
import { requireUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { fail, routeError } from "@/lib/server/http";
import { downloadPrivate } from "@/lib/server/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const upload = await prisma.upload.findFirst({ where: { id: (await context.params).id, ownerId: user.id } });
    if (!upload) fail(404, "找不到图片");
    // Authenticated preview is re-encoded to strip EXIF and never leaks a signed URL.
    const bytes = await sharp(await downloadPrivate(upload.path), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return routeError(error); }
}
