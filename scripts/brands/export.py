#!/usr/bin/env python3
"""Выгрузить официальные логотипы коллекций одежды из игры.

В `skin_table.json` у каждой коллекции есть `brandId` (`epoque`, `boc`, …), а
логотип лежит в атласе `spritepack/ui_brand_image_hub_0.ab` спрайтом
`brand_<brandId>`. Читалка архива берёт файлы из `zoot-data/brands`.

Запуск (из checkout'а torappu, чтобы был доступен пакет):

    uv run --project /path/to/torappu python scripts/brands/export.py \
        --out /path/to/zoot-data/brands

На выходе `<out>/brand_<brandid>.png` — белый логотип с прозрачным фоном,
обрезанный по непрозрачным пикселям. На светлых панелях читалка инвертирует
его через CSS (`brightness-0`), поэтому исходник не перекрашивается.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.request import urlopen

import anyio
import UnityPy

import torappu
from torappu.core.utils.unity import install_unity_patches

BUNDLE = "spritepack/ui_brand_image_hub_0.ab"


def latest_res_version() -> str:
    url = "https://ak-conf.hypergryph.com/config/prod/official/Android/version"
    with urlopen(url, timeout=20) as response:  # noqa: S310
        return json.loads(response.read().decode())["resVersion"]


async def export(out_dir: Path) -> list[tuple[str, int, int]]:
    install_unity_patches()
    client = torappu.Client(
        torappu.Version(client_version="", res_version=latest_res_version()),
        None,
        torappu.get_config(),
    )
    await client.init(prefer_cached_manifest=True)
    saved: list[tuple[str, int, int]] = []
    try:
        path = await client.fetch_asset_bundle(BUNDLE)
        environment = UnityPy.load(*client.anon_paths, path)
        for obj in environment.objects:
            if obj.type.name != "Sprite":
                continue
            sprite = obj.read()
            name = (sprite.m_Name or "").lower()
            if not name.startswith("brand_"):
                continue
            image = sprite.image
            if image is None:
                continue
            # В атласе у спрайтов прозрачные поля: обрезаем по альфе, чтобы
            # логотип занимал всю картинку и не «висел» в пустоте.
            bbox = image.convert("RGBA").split()[-1].getbbox()
            if bbox:
                image = image.crop(bbox)
            image.save(out_dir / f"{name}.png", optimize=True)
            saved.append((name, image.width, image.height))
    finally:
        await client.aclose()
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    saved = anyio.run(export, args.out)
    for name, width, height in sorted(saved):
        print(f"{name}.png  {width}×{height}")
    print(f"всего: {len(saved)}; каталог: {os.fspath(args.out)}")


if __name__ == "__main__":
    main()
