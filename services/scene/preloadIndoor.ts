const entryLayers = ["background", "keeper", "counter", "decor"].map(name => `/indoor/optimized/grandpa/${name}.webp`);
let pending: Promise<void> | undefined;

function preloadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; reject(new Error("indoor-load-timeout")); }, 18_000);
    image.onload = () => { window.clearTimeout(timer); resolve(); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error("indoor-load-failed")); };
    image.src = src;
  });
}

export function preloadIndoorEntry() {
  pending ??= Promise.all(entryLayers.map(preloadImage)).then(() => {}).catch(error => { pending = undefined; throw error; });
  return pending;
}
