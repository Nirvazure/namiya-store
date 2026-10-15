"""Build the local short-heading subset of Zhi Mang Xing.

Usage: python scripts/prepare-brush-font.py /path/to/ZhiMangXing-Regular.ttf /path/to/OFL.txt
Requires fonttools and brotli only when updating the asset.
"""
import hashlib
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
license_file = Path(sys.argv[2])
text = "".join(
    file.read_text(encoding="utf-8")
    for folder, extension in [("app", "*.tsx"), ("components", "*.tsx"), ("domain", "*.ts")]
    for file in sorted((root / folder).rglob(extension))
)
font = TTFont(source, recalcTimestamp=False)
version = font["name"].getDebugName(5)
codepoints = ({ord(char) for char in text} | set(range(32, 127))) & set(font.getBestCmap())
options = subset.Options()
options.flavor = "woff2"
options.recalc_timestamp = False
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
options.name_languages = [0x409]
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
# Name the web subset separately, retaining original copyright and licensing.
names = {1: "Namiya Brush", 2: "Regular", 3: "NamiyaBrush-Regular", 4: "Namiya Brush Regular", 6: "NamiyaBrush-Regular", 16: "Namiya Brush", 17: "Regular"}
for record in font["name"].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = "woff2"
output = root / "public/fonts"
output.mkdir(parents=True, exist_ok=True)
destination = output / "namiya-brush.woff2"
font.save(destination)
font.close()
with TTFont(destination) as result:
    assert set(result.getBestCmap()) == codepoints, "Brush font subset lost characters"
    headings = "解忧杂货店心事有处落笔，来信总有人读。先坐一会儿吧今天也有新鲜的海风给今天留一点甜热水正好时间也正好浪矢爷爷刺身师傅甜品店长抹茶店长"
    assert {ord(char) for char in headings} <= codepoints, "Brush font does not cover scene headings"
(output / "brush-OFL.txt").write_bytes(license_file.read_bytes())
manifest = {
    "upstream": "https://github.com/google/fonts/tree/main/ofl/zhimangxing",
    "sourceVersion": version,
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "glyphs": len(codepoints),
    "file": destination.name,
    "bytes": destination.stat().st_size,
}
(output / "brush-source.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False))
