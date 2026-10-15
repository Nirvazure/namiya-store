# 音乐与时钟贴图交接

本轮按用户选择，先完成界面，六张水彩素材等待后续提供。后三间房暂用现有 SVG；这些 SVG 未经滤镜处理冒充重制素材。爷爷房间的两件插画保持原样。

## 六件素材

| 配置键 | 音乐 | 时钟 | 原画参考 | 色彩与材质 |
| --- | --- | --- | --- | --- |
| sashimi | 旧小电视 | 厨房计时器 | previews/sashimi.png | 深木色、灰绿搪瓷 |
| dessert | 唱片机 | 小闹钟 | previews/dessert.png | 奶油白、低饱和粉色 |
| matcha | 木壳收音机 | 茶席计时钟 | previews/matcha.png | 暖木色、茶绿，克制高光 |

与原画保持颗粒水彩、略不规则的边缘、柔和正面光与略俯视的透视。透明 RGBA 背景，不烘焙文字、米色说明牌、投影或白色底板。裁掉无关空白并保留柔边，建议画布 640 × 520，物体基底靠近画布底边。接触阴影由 CSS 单独控制。

时钟保留表盘刻度，**不绘制指针**。交付时标明表盘中心与半径（以原始像素计），运行时叠加指针表示共享专注进度。音乐物件不需要烘焙“正在播放”灯光或动画。

## 接入

1. 将透明图转成 WebP，置于 `public/indoor/optimized/companions/`，建议命名 `sashimi-music.webp`、`sashimi-focus.webp`，其余同理。
2. 在 `domain/companions.ts` 对应房间补充 `musicArtwork` / `focusArtwork`：

```ts
musicArtwork: { src: "/indoor/optimized/companions/sashimi-music.webp", width: 640, height: 520 },
focusArtwork: {
  src: "/indoor/optimized/companions/sashimi-focus.webp", width: 640, height: 520,
  face: { x: 320, y: 288, radius: 128 }, // 示例，必须使用交付素材的真实测量值
},
```

3. `CompanionArtwork` 会使用透明 WebP，并将进度指针定位到 `face`。未配置的物件继续使用旧 SVG，无不存在资源请求。
4. 用 `components/companions/companions.css` 微调实际台面落点。物件的父层与柜台共用视差深度；不要给贴图再增加独立随机位移。
5. 重跑 `node --import ./tests/register.mjs scripts/preview-scene-controls.mjs`，预览脚本会读取配置并展示新 WebP。当前输出 `artifacts/scene-controls/index.html` 含三间房的桌面、手机静态合成，**不代表水彩素材验收，也不验证浏览器布局**。

验收重点：alpha 柔边、原画光照、表盘透视、基底与台面接触、店员热区与菜单和餐品不重叠。手机物件点击区域至少 44px；标签无底色，桌面仅靠近或聚焦显示。
