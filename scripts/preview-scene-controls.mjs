// Static artwork/layout composites, without launching a browser.
// Run: node --import ./tests/register.mjs scripts/preview-scene-controls.mjs
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { CompanionObject } from '../components/companions/CompanionObject.tsx';
import { counterCompanions } from '../domain/companions.ts';

const output = new URL('../artifacts/scene-controls/', import.meta.url);
await mkdir(output, { recursive: true });
const css = await readFile(new URL('../components/companions/companions.css', import.meta.url), 'utf8');
const names = { sashimi: '刺身店', dessert: '甜品屋', matcha: '抹茶店' };
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const label = (x, y, text, size = 13, color = '#4c493c', anchor = 'start') => `<text x="${x}" y="${y}" font-family="Microsoft YaHei, sans-serif" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escape(text)}</text>`;
const files = [];
for (const room of Object.keys(names)) {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1360;
    const height = mobile ? 844 : 900;
    const artWidth = mobile ? 366.6 : 800;
    const artHeight = artWidth * .75;
    const x = (width - artWidth) / 2;
    const y = mobile ? 310 : 220;
    const background = (await readFile(new URL(`../public/indoor/previews/${room}.png`, import.meta.url))).toString('base64');
    let content = `<rect width="100%" height="100%" fill="#f4ecd9"/>${label(24, 40, '← 返回街角', 12)}${label(width / 2, 40, '解忧杂货店', mobile ? 21 : 26, '#453d31', 'middle')}${label(mobile ? 31 : x, mobile ? 115 : 115, '此刻 · ' + names[room], 13)}${label(mobile ? 31 : x, mobile ? 155 : 158, '进来坐坐，慢慢听。', 24)}<image href="data:image/png;base64,${background}" x="${x}" y="${y}" width="${artWidth}" height="${artHeight}"/>`;
    for (const tool of ['music', 'focus']) {
      const rule = css.match(new RegExp(`\\.companion-${tool}\\.companion-at-${room} \\{([^}]+)\\}`))[1];
      const value = key => Number(rule.match(new RegExp(`${key}: ([\\d.]+)%`))?.[1]);
      const artwork = counterCompanions[room][tool === 'music' ? 'musicArtwork' : 'focusArtwork'];
      const deviceWidth = Math.max(mobile ? 44 : 0, artWidth * value('width') / 100);
      const deviceHeight = deviceWidth * (artwork ? artwork.height / artwork.width : 130 / 160);
      const deviceX = Number.isNaN(value('left')) ? x + artWidth * (1 - value('right') / 100) - deviceWidth : x + artWidth * value('left') / 100;
      const deviceY = y + artHeight * (1 - value('bottom') / 100) - deviceHeight;
      const kind = counterCompanions[room][tool === 'music' ? 'musicDevice' : 'focusDevice'];
      if (artwork) {
        const data = (await readFile(new URL(`../public${artwork.src}`, import.meta.url))).toString('base64');
        content += `<image href="data:image/webp;base64,${data}" x="${deviceX}" y="${deviceY}" width="${deviceWidth}" height="${deviceHeight}"/>`;
        if (artwork.face) {
          const face = artwork.face;
          content += `<g transform="translate(${deviceX} ${deviceY}) scale(${deviceWidth / artwork.width})"><path d="M${face.x} ${face.y}h${face.radius * .66}" stroke="#9f6c50" stroke-width="${face.radius * .055}"/></g>`;
        }
      } else {
        const svg = renderToStaticMarkup(createElement(CompanionObject, { kind, progress: .25 }));
        content += `<g transform="translate(${deviceX} ${deviceY}) scale(${deviceWidth / 160})">${svg.replace('<svg ', '<svg width="160" height="130" ')}</g>`;
      }
      if (mobile) content += label(deviceX + deviceWidth / 2, deviceY + deviceHeight + 14, tool === 'music' ? '听一会儿' : '专注片刻', 11, '#403c31', 'middle');
    }
    const hotspot = room === 'sashimi' ? { left: .30, top: .87 } : room === 'dessert' ? { left: .16, top: .84 } : { left: mobile ? .30 : .17, top: .73 };
    const menuX = x + artWidth * hotspot.left;
    const menuY = y + artHeight * hotspot.top;
    content += `<rect x="${menuX}" y="${menuY}" width="${mobile ? 92 : 112}" height="${mobile ? 34 : 40}" rx="4" fill="#584d3bdd"/>${label(menuX + 12, menuY + (mobile ? 22 : 26), '看看菜单 →', mobile ? 11 : 13, '#fff9e8')}`;
    const bookmarkY = height - 164;
    content += `<rect x="${width - 66}" y="${bookmarkY}" width="66" height="54" fill="#f2e6cd" stroke="#b7a17e66"/>${label(width - 33, bookmarkY + 25, '24:36', 13, '#4c493c', 'middle')}<path d="M${width - 56} ${bookmarkY + 39}h44" stroke="#b7a17e55"/><path d="M${width - 56} ${bookmarkY + 39}h11" stroke="#98704f"/>${label(width / 2, height - 60, '爷爷柜台    刺身店    甜品屋    抹茶店', mobile ? 11 : 13, '#857665', 'middle')}${label(width / 2, height - 20, '静态合成 · 现有占位贴图 · 非浏览器截图', 11, '#857665', 'middle')}`;
    const filename = `${room}-${mobile ? 'mobile' : 'desktop'}.png`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`)).png().toFile(fileURLToPath(new URL(filename, output)));
    files.push(filename);
  }
}
await writeFile(new URL('index.html', output), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>场景物件静态合成</title><style>body{margin:32px;background:#eee7d7;color:#453d31;font:16px/1.8 serif}main{display:grid;grid-template-columns:2fr 1fr;gap:24px}img{width:100%}figure{margin:0}figcaption{font:13px sans-serif}@media(max-width:700px){main{display:block}}</style><h1>场景物件静态合成</h1><p>按当前物件位置与 44px 点击区域合成；用于检查画面落点。后三间房仍为旧 SVG 占位，水彩重制素材待提供。本预览不验证浏览器排版或交互。</p><main>${files.map(file => `<figure><img src="${file}" alt="${file}"><figcaption>${file}</figcaption></figure>`).join('')}</main></html>`);
console.log(`Created ${files.length} composites: artifacts/scene-controls/index.html`);
