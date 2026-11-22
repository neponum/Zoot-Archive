#!/usr/bin/env python3
"""Собирает иконки сайта и Android-приложения из логотипа Rhodes Island.

Источник: `public/assets/rhodes_island_logo.png` (белый логотип на прозрачном).
Скрипт перезаписывает favicon/PWA-иконки и mipmap/splash в android-проекте.
Запуск: python3 scripts/generate_brand_icons.py
"""
from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/rhodes_island_logo.png"
PUBLIC = ROOT / "public"
ANDROID_RES = ROOT / "android/app/src/main/res"
BG = (14, 14, 14, 255)


def load_logo() -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


LOGO = load_logo()


def compose(size: int, ratio: float, *, rounded: bool = False) -> Image.Image:
    """Тёмный квадрат с белым логотипом по центру."""
    canvas = Image.new("RGBA", (size, size), BG)
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        canvas.putalpha(mask)

    target_w = max(1, round(size * ratio))
    target_h = max(1, round(LOGO.height * target_w / LOGO.width))
    scaled = LOGO.resize((target_w, target_h), Image.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def svg_with_icon(size: int, path: Path) -> None:
    buffer = io.BytesIO()
    compose(size, 0.80).save(buffer, "PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    path.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
        'width="%d" height="%d" role="img" aria-label="Rhodes Island">'
        '<image width="%d" height="%d" href="data:image/png;base64,%s"/>'
        "</svg>\n" % (size, size, size, size, size, size, encoded),
        encoding="utf-8",
    )


def main() -> None:
    # --- Сайт / PWA ---------------------------------------------------------
    save_png(compose(192, 0.82), PUBLIC / "ZOOT.png")
    save_png(compose(512, 0.82), PUBLIC / "ZOOT-512.png")
    save_png(compose(512, 0.60), PUBLIC / "maskable-512.png")
    save_png(compose(180, 0.82), PUBLIC / "apple-touch-icon.png")
    svg_with_icon(512, PUBLIC / "ZOOT.svg")
    svg_with_icon(256, PUBLIC / "favicon.svg")

    # Одна 256-базовая картинка: Pillow сам вкладывает в ICO все размеры.
    compose(256, 0.84).save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    # --- Android: обычные и круглые иконки ----------------------------------
    legacy = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }
    for density, size in legacy.items():
        out = ANDROID_RES / f"mipmap-{density}"
        save_png(compose(size, 0.84), out / "ic_launcher.png")
        save_png(compose(size, 0.72, rounded=True), out / "ic_launcher_round.png")

    # --- Android: foreground для adaptive icon (108dp safe zone) -------------
    foreground = {
        "mdpi": 108,
        "hdpi": 162,
        "xhdpi": 216,
        "xxhdpi": 324,
        "xxxhdpi": 432,
    }
    for density, size in foreground.items():
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        target_w = max(1, round(size * 0.60))
        target_h = max(1, round(LOGO.height * target_w / LOGO.width))
        scaled = LOGO.resize((target_w, target_h), Image.LANCZOS)
        canvas.alpha_composite(
            scaled, ((size - target_w) // 2, (size - target_h) // 2)
        )
        save_png(canvas, ANDROID_RES / f"mipmap-{density}/ic_launcher_foreground.png")

    # --- Android: сплэш ------------------------------------------------------
    splash = {
        "drawable/splash.png": (480, 320),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    }
    for rel, (width, height) in splash.items():
        canvas = Image.new("RGB", (width, height), BG[:3])
        target_w = round(min(width, height) * 0.40)
        target_h = round(LOGO.height * target_w / LOGO.width)
        scaled = LOGO.resize((target_w, target_h), Image.LANCZOS)
        canvas.paste(
            scaled, ((width - target_w) // 2, (height - target_h) // 2), scaled
        )
        save_png(canvas.convert("RGBA"), ANDROID_RES / rel)

    # --- Android: фон adaptive icon -----------------------------------------
    (ANDROID_RES / "values/ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="ic_launcher_background">#0E0E0E</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    print("Brand icons generated.")


if __name__ == "__main__":
    main()
