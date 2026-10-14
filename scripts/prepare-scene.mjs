import sharp from "sharp";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Format conversion only: preserve the supplied watercolor pixels and alpha.
const root = path.resolve("public/joy_store_parallax");
const manifest = JSON.parse(await readFile(path.join(root, "layers.json"), "utf8"));
const output = path.join(root, "optimized");
await mkdir(output, { recursive: true });
await sharp(path.join(root, manifest.base)).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(output, "building.webp"));
const layers = [];
for (const layer of manifest.layers) {
  const [x1, y1, x2, y2] = layer.bounds;
  const left = Math.max(0, x1 - 10);
  const top = Math.max(0, y1 - 10);
  const width = Math.min(1080 - left, x2 - x1 + 20);
  const height = Math.min(1080 - top, y2 - y1 + 20);
  await sharp(path.join(root, layer.file)).extract({ left, top, width, height })
    .webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(output, `${layer.name}.webp`));
  layers.push({ name: layer.name, file: `${layer.name}.webp`, left, top, width, height });
}
await writeFile(path.join(output, "layers.json"), JSON.stringify(layers, null, 2) + "\n");
await sharp(path.join(root, "assets/mailbox-watercolor.png")).resize({ height: 900 })
  .webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, "mailbox.webp"));
await sharp(path.join(root, "assets/foreground-grass.png")).resize({ width: 900 })
  .webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, "foreground-grass.webp"));
console.log(`Prepared building and ${layers.length} aligned watercolor layers.`);
