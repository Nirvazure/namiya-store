# 爷爷柜台与互动小物件素材

使用内置 image_gen 生成，2026-10-14。参考图仅用于画风：`public/indoor/indoor (3).jpg`。保留手绘笔触，三层贴图与四个物件均由生成器输出真正的 alpha 透明背景；未用程序重画或重建 alpha。

## 原始输出

- `source/grandpa-atlas.png`：1448 × 1086。生成器采用不等分布局；上层分界 y=618，左右分界 x=766。裁切区（x,y,w,h）：background=(0,0,766,618)，keeper=(766,0,682,618)，counter=(0,618,766,468)，foreground=(766,618,682,468)。消费脚本应各区裁切后按场景画布统一缩放。
- `source/props-atlas.png`：四格物件原图，按图像正中等分；输出 `optimized/items/{coffee,matcha,cake,sashimi}.webp`。只裁切、缩放与压缩，保留 alpha。

## 爷爷柜台完整提示词

```text
Use case: illustration-story. Asset type: production parallax atlas for a hand-drawn Japanese picture-book grocery shop website.
Input image 1 is a STYLE REFERENCE ONLY: warm muted gouache, visible dry brush/paper grain, rustic Japanese wooden stall. Create a NEW grandfather letter-writing reception stall in that precise cozy illustrated family.
Output one rectangular 8:6 image divided invisibly into a perfect 2 by 2 grid. Each quadrant is a complete identical 4:3 camera canvas; no gutters, no dividers, no labels. The 4 canvases must ALIGN PERFECTLY to composite into one scene.
TOP LEFT: background layer only, full wall filled with muted warm cream plaster, dark cedar wooden framing and rear shelves with old books, a few letter boxes, warm dark interior. NO human, NO counter, NO hanging curtain or lantern. Paint clean complete background including regions behind the later layers.
TOP RIGHT: TRANSPARENT layer with only a kind elderly Japanese grandfather, fluffy white hair, small round glasses, gentle smile, oatmeal apron over moss-green cardigan. Standing in the exact center of this 4:3 quadrant, head at 39% height, body extending from 40 to 96% height, feet at bottom. Generous fully transparent empty area all around him; no ground, no background, no counter.
BOTTOM LEFT: TRANSPARENT layer only, broad antique wooden reception desk positioned across lower 32% of this 4:3 quadrant, from 9 to 91% width; cream letter paper, fountain pen, small ceramic coffee cup and two worn books on top. Counter top at 68% height; keep upper two thirds transparent. No human and no backdrop.
BOTTOM RIGHT: TRANSPARENT layer only, warm ochre short fabric curtain across upper 16% of this 4:3 quadrant and small glowing paper lantern at upper right from 17 to 41% height. All other areas transparent. No human, counter or backdrop.
Constraints: truly transparent RGBA in the THREE cutout quadrants. No checkerboard texture painted into image, no white background on cutouts. No text, logos, watermark, captions. The background quadrant alone is opaque. Four layers share exactly the same scene perspective and dimensions. Hand-painted irregular brush edges, nostalgic subdued caramel, cream, rust and moss palette. This is a new image, not an edit of the reference.
```

## 物件完整提示词

```text
Use case: illustration-story. Asset type: transparent props atlas for a Japanese hand-painted picture-book shop website.
Create four fully isolated hand-painted food and drink props, arranged in a PERFECT EQUAL 2 by 2 grid on a transparent 1:1 square canvas. The grid split is precisely 50% horizontal and 50% vertical. No borders, no dividers, no labels, no visible grid.
Top left quadrant: one small rustic cream ceramic coffee cup with dark fresh coffee on matching saucer, tiny curl of steam.
Top right quadrant: one small moss-green ceramic bowl full of frothy bright matcha, matching small bamboo whisk beside it.
Bottom left quadrant: one little slice of strawberry sponge cake on a cream plate with a small silver fork.
Bottom right quadrant: one little rectangular dark wooden plate holding five salmon and tuna sashimi slices, a dab of wasabi and shiso leaf.
Each complete object fits WITHIN its quadrant with 20 percent empty margin on every side. Nothing touches or crosses either grid axis. All four props similar visual size and scale, centered exactly at coordinates 25%/25%, 75%/25%, 25%/75%, 75%/75%. No ground plane, no background, no scenery, no cast-shadow rectangle. Real RGBA transparency, never painted checkerboard.
Style: charming Japanese retro children's book gouache painting, visible warm paper grain within objects, soft dry-brushed irregular edges, muted caramel/cream/moss/red colors. Front view looking gently down at each item, consistent perspective. No text, no logo, no watermark.
```

