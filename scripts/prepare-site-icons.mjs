// Rebuild favicon, home-screen icon and social images from the supplied artwork.
// Run: node scripts/prepare-site-icons.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('../public/icon.jpg', import.meta.url));
const target = name => new URL(`../app/${name}`, import.meta.url);
const { data, info } = await sharp(source).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const pixel = (y * info.width + x) * info.channels;
    if (Math.min(data[pixel], data[pixel + 1], data[pixel + 2]) < 245) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
}
if (right < left) throw new Error('The source image has no visible artwork.');
const padding = 12;
left = Math.max(0, left - padding); top = Math.max(0, top - padding);
right = Math.min(info.width - 1, right + padding); bottom = Math.min(info.height - 1, bottom + padding);
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
const cropped = await sharp(data, { raw: info }).extract(crop).png().toBuffer();
if (crop.width !== info.width || crop.height !== info.height) {
  await writeFile(source, await sharp(cropped).jpeg({ quality: 95, mozjpeg: true }).toBuffer());
}

// Remove only border-connected white background; enclosed white details stay intact.
const { data: rgba, info: logoInfo } = await sharp(cropped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const visited = new Uint8Array(logoInfo.width * logoInfo.height);
const queue = [];
function enqueue(x, y) {
  if (x < 0 || y < 0 || x >= logoInfo.width || y >= logoInfo.height) return;
  const index = y * logoInfo.width + x;
  if (visited[index]) return;
  visited[index] = 1;
  const pixel = index * 4;
  if (Math.min(rgba[pixel], rgba[pixel + 1], rgba[pixel + 2]) > 200) queue.push(index);
}
for (let x = 0; x < logoInfo.width; x++) { enqueue(x, 0); enqueue(x, logoInfo.height - 1); }
for (let y = 0; y < logoInfo.height; y++) { enqueue(0, y); enqueue(logoInfo.width - 1, y); }
for (let cursor = 0; cursor < queue.length; cursor++) {
  const index = queue[cursor];
  rgba[index * 4 + 3] = 0;
  const x = index % logoInfo.width, y = Math.floor(index / logoInfo.width);
  enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
}
const logo = await sharp(rgba, { raw: logoInfo }).png().toBuffer();
await writeFile(new URL('../public/site-logo.png', import.meta.url), await sharp(logo).resize({ height: 160 }).png().toBuffer());
const square = size => sharp(logo).resize(size, size, { fit: 'contain', background: '#00000000' });
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => square(size).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(target('favicon.ico'), Buffer.concat([header, ...images]));
await writeFile(target('icon.png'), await square(512).png().toBuffer());
await writeFile(target('apple-icon.png'), await square(180).flatten({ background: '#fff9ee' }).png().toBuffer());
const social = await square(1200).flatten({ background: '#fff9ee' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
await writeFile(target('opengraph-image.jpg'), social);
await writeFile(target('twitter-image.jpg'), social);
console.log('Updated favicon, app icons and sharing images from public/icon.jpg.');
