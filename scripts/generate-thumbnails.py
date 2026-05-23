from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog.json"
THUMB_ROOT = ROOT / "assets" / "thumbs"
MAX_SIZE = (720, 540)


def make_thumbnail(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        image.save(target, "WEBP", quality=76, method=6)


def rel(path: Path) -> str:
    return "./" + path.relative_to(ROOT).as_posix()


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8-sig"))
    made = 0

    for item in catalog:
        cover = item.get("cover") or (item.get("images") or [None])[0]
        if not cover:
            continue

        source = ROOT / cover.removeprefix("./")
        if not source.exists():
            continue

        target = THUMB_ROOT / source.parent.name / f"{source.stem}.webp"
        make_thumbnail(source, target)
        item["thumbnail"] = rel(target)
        made += 1

    CATALOG_PATH.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {made} thumbnails.")


if __name__ == "__main__":
    main()
