from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / "ai"
POSTCARD_FILES = [
    AI / "明信片 1.png",
    AI / "明信片 2.png",
    AI / "明信片 3.png",
    AI / "明信片 5.png",
    AI / "明信片 6.png",
    AI / "明信片 6 反.png",
    AI / "明信片 7.png",
    AI / "明信片 7 反.png",
    AI / "明信片 8.png",
    AI / "明信片 8 反.png",
    AI / "明信片 9.png",
    AI / "明信片 9 反.png",
    AI / "明信片 10.png",
    AI / "明信片 10 反.png",
    AI / "海报 1 A4.png",
    AI / "海报 2 A4.png",
    AI / "海报 3 A4.png",
    AI / "海报 5 A4.png",
]


def main() -> None:
    missing = [path.name for path in POSTCARD_FILES if not path.exists()]
    if missing:
        raise SystemExit(f"Missing postcard files: {', '.join(missing)}")

    print("AI source files are ready:")
    for path in POSTCARD_FILES:
        print(f"- {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
