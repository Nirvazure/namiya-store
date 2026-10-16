import { defaultShop, type Shop } from "@/domain/shops";

const pending = new Map<string, Promise<void>>();

function preloadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; reject(new Error("indoor-load-timeout")); }, 18_000);
    image.onload = () => { window.clearTimeout(timer); resolve(); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error("indoor-load-failed")); };
    image.src = src;
  });
}

export function preloadIndoorEntry(shop: Shop = defaultShop) {
  const scene = shop.scenes.indoor;
  const paths = scene.mode === "layers" && scene.templateId ? ["background", "keeper", "counter", "decor"].map(name => `/indoor/optimized/${scene.templateId}/${name}.webp`) : [scene.src];
  const key = paths.join("|");
  if (!pending.has(key)) pending.set(key, Promise.all(paths.map(preloadImage)).then(() => {}).catch(error => { pending.delete(key); throw error; }));
  return pending.get(key)!;
}
