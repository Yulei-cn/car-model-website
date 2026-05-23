from __future__ import annotations

import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / "ai"
OUT = ROOT / "成品"
QR = ROOT / "assets" / "qr" / "site-qrcode.png"

FONT_BOLD = "C:/Windows/Fonts/simhei.ttf"
FONT_REG = "C:/Windows/Fonts/Deng.ttf"

POSTCARD_SIZE = (1748, 1181)
A4_SIZE = (2480, 3508)
A6_SIZE = (1240, 1748)


POSTCARDS = {
    1: {
        "file": "明信片 1.png",
        "title": "法国车模代购",
        "subtitle": "法国本地寻找 · 实拍确认 · 集运到手",
        "note": "下次想找指定车型、比例或颜色，可以直接联系。",
        "panel": "bottom",
    },
    2: {
        "file": "明信片 2.png",
        "title": "像挑艺术品一样挑车模",
        "subtitle": "中高端收藏 · 法国本地渠道",
        "note": "适合 Norev、Otto、Minichamps 和欧系性能车。",
        "panel": "left",
    },
    3: {
        "file": "明信片 3.png",
        "title": "法国代购 · 安心集运",
        "subtitle": "确认车况后再发出",
        "note": "每一次交付，都尽量把细节提前说清楚。",
        "panel": "bottom",
    },
    5: {
        "file": "明信片 5.png",
        "title": "谢谢你选择这台模型",
        "subtitle": "下次找车，可以直接联系",
        "note": "平台适合第一次认识，长期收藏交流可以更直接。",
        "panel": "right",
    },
}

POSTERS = {
    1: {
        "file": "海报 1 A4.png",
        "title": "法国车模代购",
        "subtitle": "真实图片 · 本地寻找 · 集运到手",
    },
    2: {
        "file": "海报 2 A4.png",
        "title": "中高端车模收藏",
        "subtitle": "像挑艺术品一样挑车模",
    },
    3: {
        "file": "海报 3 A4.png",
        "title": "本期法国集运",
        "subtitle": "5月29日封箱 · 6月第一周陆续配送",
    },
    5: {
        "file": "海报 5 A4.png",
        "title": "Merci",
        "subtitle": "谢谢你让这台车进入新的收藏柜",
    },
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    src = image.convert("RGB")
    sw, sh = src.size
    tw, th = size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return src.crop((left, top, left + tw, top + th))


def overlay(draw: ImageDraw.ImageDraw, box, fill=(15, 19, 24, 188)) -> None:
    draw.rounded_rectangle(box, radius=24, fill=fill)


def draw_wrapped(draw, xy, text, fnt, fill, width_chars=18, line_gap=10):
    x, y = xy
    for line in textwrap.wrap(text, width=width_chars):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + line_gap
    return y


def qr_placeholder(draw, box, label="微信二维码"):
    draw.rounded_rectangle(box, radius=12, fill=(255, 255, 255, 238), outline=(24, 61, 114), width=4)
    x1, y1, x2, y2 = box
    f = font(34, True)
    bbox = draw.textbbox((0, 0), label, font=f)
    draw.text(((x1 + x2 - bbox[2]) / 2, (y1 + y2 - bbox[3]) / 2), label, font=f, fill=(24, 61, 114))


def paste_site_qr(canvas, box):
    qr = Image.open(QR).convert("RGB")
    x1, y1, x2, y2 = box
    size = min(x2 - x1, y2 - y1)
    qr = qr.resize((size, size), Image.Resampling.NEAREST)
    pad = 18
    ImageDraw.Draw(canvas).rounded_rectangle((x1 - pad, y1 - pad, x2 + pad, y2 + pad), radius=18, fill=(255, 255, 255))
    canvas.paste(qr, (x1, y1))


def save_postcard_front(num: int, spec: dict) -> None:
    canvas = cover(Image.open(AI / spec["file"]), POSTCARD_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    W, H = POSTCARD_SIZE

    if spec["panel"] == "left":
        panel = (70, 70, 720, H - 70)
        text_xy = (120, 145)
        qr_box = (120, H - 330, 330, H - 120)
    elif spec["panel"] == "right":
        panel = (W - 720, 70, W - 70, H - 70)
        text_xy = (W - 660, 145)
        qr_box = (W - 330, H - 330, W - 120, H - 120)
    else:
        panel = (70, H - 420, W - 70, H - 70)
        text_xy = (120, H - 355)
        qr_box = (W - 330, H - 330, W - 120, H - 120)

    overlay(draw, panel)
    draw.text(text_xy, spec["title"], font=font(70, True), fill=(255, 255, 255))
    y = text_xy[1] + 92
    draw.text((text_xy[0], y), spec["subtitle"], font=font(38), fill=(232, 210, 170))
    draw.text((text_xy[0], y + 58), spec["note"], font=font(31), fill=(245, 245, 245))
    qr_placeholder(draw, qr_box)

    out = OUT / "明信片" / str(num)
    out.mkdir(parents=True, exist_ok=True)
    canvas.save(out / "正面.png", quality=95)


def save_postcard_back(num: int, spec: dict) -> None:
    W, H = POSTCARD_SIZE
    canvas = Image.new("RGB", POSTCARD_SIZE, (248, 241, 228))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((0, 0, W, 18), fill=(178, 33, 47))
    draw.rectangle((0, 18, W, 36), fill=(255, 255, 255))
    draw.rectangle((0, 36, W, 54), fill=(24, 61, 114))
    draw.text((95, 145), "Merci", font=font(82, True), fill=(178, 33, 47))
    draw.text((95, 250), "谢谢你选择这台模型", font=font(54, True), fill=(25, 30, 36))
    draw_wrapped(draw, (95, 340), spec["note"], font(38), (85, 92, 100), width_chars=18, line_gap=16)
    draw.line((W // 2 + 40, 130, W // 2 + 40, H - 130), fill=(216, 203, 183), width=4)
    qr_placeholder(draw, (W - 430, 230, W - 150, 510))
    draw.text((W - 500, 565), "后续找车 / 参加集运 / 确认车型", font=font(34), fill=(24, 61, 114))
    draw.line((W - 610, 720, W - 150, 720), fill=(216, 203, 183), width=3)
    draw.line((W - 610, 800, W - 150, 800), fill=(216, 203, 183), width=3)
    draw.line((W - 610, 880, W - 150, 880), fill=(216, 203, 183), width=3)
    out = OUT / "明信片" / str(num)
    out.mkdir(parents=True, exist_ok=True)
    canvas.save(out / "反面.png", quality=95)


def save_poster_a4(num: int, spec: dict) -> None:
    canvas = cover(Image.open(AI / spec["file"]), A4_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    W, H = A4_SIZE
    draw.rectangle((0, H - 860, W, H), fill=(12, 16, 22, 190))
    draw.text((150, H - 735), spec["title"], font=font(130, True), fill=(255, 255, 255))
    draw.text((155, H - 565), spec["subtitle"], font=font(58), fill=(232, 210, 170))
    paste_site_qr(canvas, (W - 530, H - 550, W - 230, H - 250))
    draw.text((W - 605, H - 210), "扫码查看现有模型", font=font(42, True), fill=(255, 255, 255))
    out = OUT / "海报A4" / str(num)
    out.mkdir(parents=True, exist_ok=True)
    canvas.save(out / "海报.png", quality=95)


def save_poster_a6(num: int, spec: dict) -> None:
    canvas = cover(Image.open(AI / spec["file"]), A6_SIZE)
    draw = ImageDraw.Draw(canvas, "RGBA")
    W, H = A6_SIZE
    draw.rectangle((0, H - 470, W, H), fill=(12, 16, 22, 196))
    draw.text((70, H - 405), spec["title"], font=font(62, True), fill=(255, 255, 255))
    draw_wrapped(draw, (74, H - 320), spec["subtitle"], font(32), (232, 210, 170), width_chars=15, line_gap=10)
    paste_site_qr(canvas, (W - 300, H - 300, W - 110, H - 110))
    out = OUT / "海报A6" / str(num)
    out.mkdir(parents=True, exist_ok=True)
    canvas.save(out / "海报.png", quality=95)


def main() -> None:
    for num, spec in POSTCARDS.items():
        save_postcard_front(num, spec)
        save_postcard_back(num, spec)
    for num, spec in POSTERS.items():
        save_poster_a4(num, spec)
        save_poster_a6(num, spec)

    (OUT / "README.md").write_text(
        "这里是基于 ai/ 原始图继续加工后的成品 PNG。缺少 4 号是因为当前没有满意的 AI 原图。\n",
        encoding="utf-8",
    )
    print("Processed AI collateral.")


if __name__ == "__main__":
    main()
