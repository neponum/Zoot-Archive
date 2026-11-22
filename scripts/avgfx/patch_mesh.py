#!/usr/bin/env python3
"""Дописывает в `avgfx/*/index.json` размер мешей у mesh-частиц.

У `ParticleSystemRenderer` в режиме `Mesh` (`renderer.mode == 4`) `startSize`
масштабирует вершины меша, а не задаёт размер в юнитах: у маски
`avg_062_black_01` `startSize` = 23.5, у дыма `avg_071_smock_01` — 150. Без
размера меша читалка рисовала такие частицы квадратом со стороной
`startSize`, из-за чего маски выходили меньше экрана, а дым — гигантским.

Скрипт открывает бандл, читает `m_LocalAABB` меша и пишет в renderer:

    "mesh": "Plane004",
    "meshSize": [1.2754, 1.2344]   # полный размах меша (2 × extent)

Размер частицы в юнитах = `startSize × meshSize`. Текстуры не трогаются.

Запуск:

    uv run --project /path/to/torappu python scripts/avgfx/patch_mesh.py \
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


def mesh_span(renderer: Any) -> tuple[str | None, list[float] | None]:
    pointer = getattr(renderer, "m_Mesh", None)
    if pointer is None or not getattr(pointer, "m_PathID", 0):
        return None, None
    try:
        mesh = pointer.read()
        bounds = mesh.m_LocalAABB
    except Exception:  # noqa: BLE001
        return None, None
    extent = bounds.m_Extent
    span = [
        round(abs(float(extent.x)) * 2, 4),
        round(abs(float(extent.y)) * 2, 4),
    ]
    if span[0] <= 0 or span[1] <= 0:
        return getattr(mesh, "m_Name", None), None
    return getattr(mesh, "m_Name", None), span


async def patch_stem(stem: str, client: Any, root: Path) -> int:
    index_file = root / stem / "index.json"
    if not index_file.exists():
        return 0
    index = json.loads(index_file.read_text(encoding="utf-8"))
    systems = index.get("systems") or []
    if not systems:
        return 0
    if all(
        (system.get("renderer") or {}).get("mode") != 4
        or "meshSize" in (system.get("renderer") or {})
        for system in systems
    ):
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
    env = UnityPy.load(*client.anon_paths, path)
    own = {obj.assets_file.name for obj in UnityPy.load(path).objects}

    by_path: dict[str, tuple[str | None, list[float] | None]] = {}
    by_suffix: list[tuple[str, tuple[str | None, list[float] | None]]] = []
    for obj in env.objects:
        if obj.type.name != "ParticleSystemRenderer":
            continue
        if obj.assets_file.name not in own:
            continue
        renderer = obj.read()
        full, suffix = node_path(renderer, env.objects)
        value = mesh_span(renderer)
        if full:
            by_path[full] = value
        if suffix:
            by_suffix.append((suffix, value))

    patched = 0
    for system in systems:
        renderer = system.get("renderer") or {}
        if renderer.get("mode") != 4 or "meshSize" in renderer:
            continue
        node = system.get("node", "")
        value = by_path.get(node)
        if value is None or value[1] is None:
            matches = [
                item
                for suffix, item in by_suffix
                if node.endswith("/" + suffix) and item[1] is not None
            ]
            unique = {tuple(item[1]) for item in matches}
            value = matches[0] if len(unique) == 1 else None
        if value is None or value[1] is None:
            continue
        renderer["mesh"] = value[0]
        renderer["meshSize"] = value[1]
        system["renderer"] = renderer
        patched += 1

    index_file.write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    return patched


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", required=True, type=Path)
    parser.add_argument("--res", default=None)
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
        print(f"meshSize записан для {total} mesh-систем")
    finally:
        await client.aclose()


if __name__ == "__main__":
    anyio.run(main)
