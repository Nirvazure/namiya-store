import { getSystemShop, type Shop } from "@/domain/shops";
import { api } from "@/services/api/client";

export function shopPath(id: string) { return `/shop/${encodeURIComponent(id)}`; }
export function shopIdFromPath(path: string): string | null {
  if (path === "/") return "grandpa";
  const match = /^\/shop\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

const images = new Map<string, Promise<void>>();
export function preloadExterior(shop: Shop) {
  const src = shop.scenes.outdoor.src;
  if (!images.has(src)) images.set(src, new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    const timer = setTimeout(() => reject(new Error("门面的图片暂时没有加载好，请重试。")), 18_000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error("门面的图片暂时没有加载好，请重试。")); };
    image.src = src;
  }).catch(error => { images.delete(src); throw error; }));
  return images.get(src)!;
}
export async function loadShopDestination(id: string, signal?: AbortSignal) {
  const shop = getSystemShop(id) ?? (await api<{ shop: Shop }>(`/api/shops/${encodeURIComponent(id)}`, { signal })).shop;
  if (shop.id !== id) throw new Error("小店地址没有对应上，请重新试试。");
  await preloadExterior(shop);
  signal?.throwIfAborted();
  return shop;
}
