#!/usr/bin/env python3
"""Generates PWA/app icons for ZOOT Archive.

The brand mark: a dark PRTS-style panel (#222121) with a thin frame and a
bold "Z" letterform. Produces the PNG icons referenced by the web manifest
(manifest icons, apple-touch-icon, favicon.ico, maskable variant).

Run from the repo root:  python3 scripts/generate_icons.py
Requires: Pillow.
"""
import os
from PIL import Image, ImageDraw, ImageFont

BG = (34, 33, 33, 255)          # #222121 — matches public/ZOOT.svg background
FG = (254, 254, 254, 255)       # #FEFEFE — brand foreground
DIM = (120, 120, 120, 255)      # frame

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')


def load_font(px: int) -> ImageFont.ImageFont:
    # load_default(size=...) exists since Pillow 9.2; fall back to the classic tiny font
    try:
        return ImageFont.load_default(size=px)
    except TypeError:
        return ImageFont.load_default()


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new('RGBA', (size, size), BG)

    # Maskable icons must keep their content inside the central 80% safe zone
    margin = size * (0.2 if maskable else 0.06)
    box = [margin, margin, size - margin, size - margin]

    draw = ImageDraw.Draw(img)

    # Thin frame
    frame_inset = size * (0.05 if maskable else 0.04)
    draw.rectangle(
        [frame_inset, frame_inset, size - frame_inset, size - frame_inset],
        outline=DIM,
        width=max(1, int(size * 0.008)),
    )

    # Letterform
    font_px = int((box[3] - box[1]) * 0.62)
    font = load_font(font_px)
    text = 'Z'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx = (box[0] + box[2]) / 2 - (bbox[0] + tw / 2)
    cy = (box[1] + box[3]) / 2 - (bbox[1] + th / 2)
    draw.text((cx, cy), text, font=font, fill=FG)

    return img


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    outputs = [
        ('ZOOT.png', 192, False),
        ('ZOOT-512.png', 512, False),
        ('apple-touch-icon.png', 180, False),
        ('maskable-512.png', 512, True),
    ]
    for name, size, maskable in outputs:
        icon = draw_icon(size, maskable)
        path = os.path.join(OUT_DIR, name)
        icon.save(path, 'PNG')
        print(f'[icon] {path} ({size}x{size}, maskable={maskable})')

    # favicon.ico (16+32)
    ico_path = os.path.join(OUT_DIR, 'favicon.ico')
    draw_icon(32, False).save(ico_path, sizes=[(16, 16), (32, 32)])
    print(f'[icon] {ico_path}')

    # favicon.svg: reuse the brand master SVG under a conventional name
    src_svg = os.path.join(OUT_DIR, 'ZOOT.svg')
    dst_svg = os.path.join(OUT_DIR, 'favicon.svg')
    if os.path.exists(src_svg):
        with open(src_svg, 'rb') as f:
            data = f.read()
        with open(dst_svg, 'wb') as f:
            f.write(data)
        print(f'[icon] {dst_svg} (copied from ZOOT.svg)')


if __name__ == '__main__':
    main()
