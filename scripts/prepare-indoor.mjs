import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Sprite framing/conversion only. All cutouts, restored backgrounds and alpha
// are painted by imagegen; no procedural masks or recoloring are applied here.
const root = path.resolve("public/indoor");
const canvas = [1024, 768];
const layers = ["background", "keeper", "counter", "decor"];
const configurations = {
  grandpa: {
    crops: [[0, 0, 766, 610], [800, 0, 648, 610], [0, 640, 755, 446], [770, 618, 678, 468]],
    frames: [[0, 0, 1024, 768], [490, 205, 300, 510], [18, 490, 988, 270], [0, 20, 1024, 330]],
  },
  sashimi: {
    crops: [[0, 0, 780, 602], [900, 70, 400, 530], [0, 620, 720, 466], [740, 620, 708, 466]],
    frames: [[0, 0, 1024, 768], [560, 285, 285, 440], [22, 415, 980, 340], [95, 130, 920, 365]],
  },
  dessert: {
    crops: [[0, 0, 800, 640], [800, 0, 648, 640], [0, 640, 820, 446], [825, 640, 623, 446]],
    frames: [[0, 0, 1024, 768], [450, 280, 240, 400], [17, 235, 990, 525], [110, 135, 900, 345]],
  },
  matcha: {
    crops: [[0, 0, 740, 620], [780, 0, 668, 620], [0, 620, 740, 466], [780, 620, 668, 466]],
    frames: [[0, 0, 1024, 768], [320, 255, 310, 450], [22, 190, 980, 565], [110, 150, 900, 380]],
  },
};
await mkdir(path.join(root, "previews"), { recursive: true });
const scenes = [];
for (const [id, configuration] of Object.entries(configurations)) {
  const output = path.join(root, "optimized", id);
  await mkdir(output, { recursive: true });
  const rendered = [];
  const entries = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    const [left, top, width, height] = configuration.crops[index];
    const [x, y, targetWidth, targetHeight] = configuration.frames[index];
    const cell = await sharp(path.join(root, "source", `${id}-atlas.png`))
      .extract({ left, top, width, height }).png().toBuffer();
    const cutout = await sharp(cell).trim({ threshold: 20 })
      .resize(targetWidth, targetHeight, { fit: index === 0 ? "fill" : "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    const buffer = await sharp({ create: { width: canvas[0], height: canvas[1], channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: cutout, left: x, top: y }]).png().toBuffer();
    await sharp(buffer).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, `${layer}.webp`));
    rendered.push({ input: buffer, left: 0, top: 0 });
    entries.push({ id: layer, file: `/indoor/optimized/${id}/${layer}.webp`, depth: [0.18, 0.52, 0.85, 1.15][index], zIndex: index + 1, bounds: [0, 0, ...canvas], contentBounds: [x, y, targetWidth, targetHeight] });
  }
  await sharp({ create: { width: canvas[0], height: canvas[1], channels: 4, background: "#eee0c6" } })
    .composite(rendered).png().toFile(path.join(root, "previews", `${id}.png`));
  scenes.push({ id, canvas, layers: entries });
}
await writeFile(path.join(root, "scenes.json"), `${JSON.stringify(scenes, null, 2)}\n`);
// Rebuild the four independently painted items from their equal sprite cells.
await mkdir(path.join(root, "optimized", "items"), { recursive: true });
for (const [index, id] of ["coffee", "matcha", "cake", "sashimi"].entries()) {
  await sharp(path.join(root, "source", "props-atlas.png"))
    .extract({ left: (index % 2) * 627, top: Math.floor(index / 2) * 627, width: 627, height: 627 })
    .resize(400, 400).webp({ quality: 91, alphaQuality: 100 })
    .toFile(path.join(root, "optimized", "items", `${id}.webp`));
}
console.log(`Prepared ${scenes.length} scenes, 16 transparent layers, four items and composited previews.`);
