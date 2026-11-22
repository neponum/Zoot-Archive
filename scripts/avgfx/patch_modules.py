#!/usr/bin/env python3
"""Убирает из `avgfx/*/index.json` данные выключенных модулей частиц.

Unity сериализует значения модуля даже когда он выключен, и у большинства
систем это не нули: у 73% эффектов `rotationOverLife` = 0.785 рад/с (45°/с).
Читалка применяла его как настоящий — чёрная маска `avg_062_black_01`
поворачивалась на 90° за время жизни, открывая углы экрана, а дым рос по
чужой кривой.

Скрипт открывает бандл и для каждой системы, у которой `SizeModule`,
`RotationModule` или `ColorModule` выключены, пишет `null` вместо данных.
Текстуры не трогаются.

Запуск:

    uv run --project /path/to/torappu python scripts/avgfx/patch_modules.py \
        --dir /path/to/zoot-data/avgfx
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import anyio
import UnityPy

import torappu
from torappu.core.utils.unity import install_unity_patches

sys.path.insert(0, str(Path(__file__).resolve().parent))
from patch_scaling import latest_res_version, node_path  # noqa: E402

FLAGS = ("sizeOverLife", "rotationOverLife", "colorOverLife")


def module_state(system: Any) -> dict[str, bool]:
    return {
        "sizeOverLife": bool(system.SizeModule.enabled),
        "rotationOverLife": bool(system.RotationModule.enabled),
        "colorOverLife": bool(system.ColorModule.enabled),
    }


async def patch_stem(stem: str, client: Any, root: Path) -> int:
    index_file = root / stem / "index.json"
    if not index_file.exists():
        return 0
    index = json.loads(index_file.read_text(encoding="utf-8"))
    systems = index.get("systems") or []
    if not systems:
        return 0

    asset = next(
        (
            name
            for name in client.asset_to_bundle
            if name.startswith("avg/effects/")
            and name.rsplit("/", 1)[-1] == stem
        ),
        f"avg/effects/background/{stem}",
    )
    bundle = client.asset_to_bundle.get(asset, f"{asset}.ab")
    path = await client.fetch_asset_bundle(bundle)
    # Анонимные бандлы (225 штук) нужны только для резолва внешних мешей и
    # материалов; здесь читаются компоненты самого бандла. Второй
    # `UnityPy.load` запрещён: LZHAM распаковывается заново, и прогон
    # растягивается вдвое.
    env = UnityPy.load(path)
    own = {obj.assets_file.name for obj in env.objects}

    by_path: dict[str, dict[str, bool]] = {}
    by_suffix: list[tuple[str, dict[str, bool]]] = []
    for obj in env.objects:
        if obj.type.name != "ParticleSystem":
            continue
        if obj.assets_file.name not in own:
            continue
        system = obj.read()
        full, suffix = node_path(system, env.objects)
        state = module_state(system)
        if full:
            by_path[full] = state
        if suffix:
            by_suffix.append((suffix, state))

    patched = 0
    changed = False
    for system in systems:
        node = system.get("node", "")
        state = by_path.get(node)
        if state is None:
            matches = [item for suffix, item in by_suffix if node.endswith("/" + suffix)]
            unique = {tuple(sorted(item.items())) for item in matches}
            state = matches[0] if len(unique) == 1 else None
        if state is None:
            continue
        for flag in FLAGS:
            if state[flag]:
                continue
            if system.get(flag) is not None:
                system[flag] = None
                changed = True
        patched += 1

    if changed:
        index_file.write_text(
            json.dumps(index, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    return patched


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", required=True, type=Path)
    parser.add_argument("--res", default=None)
    parser.add_argument(
        "--shard",
        default=None,
        help="i/n — обработать только каждую n-ю часть списка (i от 0)",
    )
    args = parser.parse_args()

    install_unity_patches()
    config = torappu.get_config()
    res_version = args.res or latest_res_version()
    client = torappu.Client(
        torappu.Version(client_version="", res_version=res_version), None, config
    )
    stems = sorted(
        entry.name for entry in args.dir.iterdir() if (entry / "index.json").exists()
    )
    if args.shard:
        shard, count = (int(part) for part in args.shard.split("/"))
        stems = [
            stem for position, stem in enumerate(stems) if position % count == shard
        ]
    total = 0
    try:
        await client.init(prefer_cached_manifest=True)
        for index, stem in enumerate(stems, 1):
            try:
                total += await patch_stem(stem, client, args.dir)
            except Exception as error:  # noqa: BLE001
                print(f"! {stem}: {error}", file=sys.stderr)
                continue
            if index % 20 == 0:
                print(f"  {index}/{len(stems)}")
        print(f"модули проверены у {total} систем")
    finally:
        await client.aclose()


if __name__ == "__main__":
    anyio.run(main)
