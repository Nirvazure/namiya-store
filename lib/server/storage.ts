import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fail } from "./http";
import { authConfig } from "@/lib/supabase/config";

export function privateBucket() { return process.env.NAMIYA_PRIVATE_BUCKET || "namiya-private"; }
export function publicBucket() { return process.env.NAMIYA_PUBLIC_BUCKET || "namiya-scenes"; }
export function privateStorage(): SupabaseClient {
  const url = authConfig()?.url;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail(503, "图片与语音存储尚未配置");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function uploadPrivate(path: string, bytes: Buffer, contentType: string) {
  const client = privateStorage();
  const { data: bucket, error: bucketError } = await client.storage.getBucket(privateBucket());
  if (bucketError || !bucket || bucket.public) fail(503, "私有存储配置不正确，请联系维护者");
  const { error } = await client.storage.from(privateBucket()).upload(path, bytes, { contentType, upsert: false });
  if (error) fail(503, "保存资源失败，请重试");
}
export async function downloadPrivate(path: string): Promise<Buffer> {
  const { data, error } = await privateStorage().storage.from(privateBucket()).download(path);
  if (error || !data) fail(503, "读取资源失败，请重试");
  return Buffer.from(await data.arrayBuffer());
}
export async function uploadPublic(path: string, bytes: Buffer) {
  const client = privateStorage();
  if (publicBucket() === privateBucket()) fail(503, "公开与私有资源必须使用不同存储桶");
  const { data: bucket, error: bucketError } = await client.storage.getBucket(publicBucket());
  if (bucketError || !bucket?.public) fail(503, "场景展示存储尚未配置");
  const { error } = await client.storage.from(publicBucket()).upload(path, bytes, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (error) fail(503, "发布场景资源失败，请重试");
  return client.storage.from(publicBucket()).getPublicUrl(path).data.publicUrl;
}
