# 字体

店名、首页主文案、店内标题与店长称呼使用 [志莽行书 / Zhi Mang Xing](https://github.com/google/fonts/tree/main/ofl/zhimangxing) Regular（400），对应确认的 B 字样。它是中文行书字体，用毛笔行笔表现招牌的书法气质。其本地子集为 `namiya-brush.woff2`，字体内名称为 **Namiya Brush**；许可见 `brush-OFL.txt`，源版本、SHA-256 与大小见 `brush-source.json`。字体不使用浏览器合成加粗。

长正文、信纸和回信使用 [思源宋体 / Source Han Serif](https://github.com/adobe-fonts/source-han-serif) 的简体中文地区子集 **Source Han Serif CN**，正文为 Regular（400），其他面板短标题为 Medium（500）。按钮、天气提示等操作文字保持系统黑体。思源宋体许可见 `OFL.txt`；官方源文件版本、提交与 SHA-256 见 `font-source.json`。两款字体均保留原作者版权，按 SIL OFL 1.1 分发。

- `namiya-book-regular.woff2`、`namiya-book-medium.woff2`：当前源码静态文案、ASCII 与常用标点的本地子集，字体内名称为 **Namiya Book**，由 `next/font/local` 加载。
- `namiya-book-extended.woff2`：Regular 中其余全部字符，字体内名称为 **Namiya Book Extended**。`app/book-font.css` 用互不重叠的 `unicode-range` 限制它，仅信件或动态回信出现常用子集以外的字符时下载。字体声明由根布局直接导入，public 目录仅提供静态字体资源。简体中文正文不依赖访客设备是否安装思源宋体。

所有字体均同源加载，并采用 `font-display: swap`。普通构建无需联网取字体，也无需安装字体处理工具。上游不覆盖的字符继续回退到系统字体；扩展字符只有常规字重。

更新静态文案或字体源后，将官方的 `SourceHanSerifCN-Regular.otf`、`SourceHanSerifCN-Medium.otf`、`LICENSE.txt`（重命名为 `SourceHanSerif-OFL.txt`）与记录源提交的 `upstream-commit.txt` 放在同一目录，然后运行：

```sh
python -m pip install fonttools brotli
python scripts/prepare-font.py /path/to/source-font-directory
```

脚本从 app、components 与 domain 源码提取静态字符，不保存访客输入或生成的回信；扩展字体保留源字体剩余字符。请同时提交生成的字体、CSS、许可和来源记录。

行书标题子集可单独生成（第二个参数是志莽行书原版 `OFL.txt`）：

```sh
python scripts/prepare-brush-font.py /path/to/ZhiMangXing-Regular.ttf /path/to/OFL.txt
```

行书只用于静态短标题。脚本核对当前场景标题字符覆盖，新增标题文案后应重新生成子集。
