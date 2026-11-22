#!/usr/bin/env python3
"""Дописывает в `avgfx/*/index.json` поле `scalingMode` систем частиц.

Unity масштабирует частицы по-разному (`ParticleSystemScalingMode`):

    0 Hierarchy — размер умножается на мировой масштаб (все родители);
    1 Local     — только на локальный масштаб самого эмиттера (по умолчанию);
    2 Shape     — размер не масштабируется, масштабируется только форма.

Старая выгрузка это поле не сохраняла, поэтому читалка рисовала частицы без
учёта масштаба узлов (у `avg_fire_01` родитель `static_offset` увеличен в 2
раза — эффект выходил вдвое мельче). Скрипт не перекачивает текстуры: он
открывает бандл, читает только `scalingMode` и обновляет index.json.

Запуск:

    uv run --project /path/to/torappu python scripts/avgfx/patch_scaling.py \
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
from UnityPy.classes import GameObject, ParticleSystem, Transform
from UnityPy.files.ObjectReader import ObjectReader

import torappu
from torappu.core.utils.unity import install_unity_patches


def node_path(
    system: ParticleSystem, objects: list[ObjectReader[Any]]
) -> tuple[str | None, str | None]:
    """Путь эмиттера и, если родитель не разрешился, его хвост.

    У глубоко вложенных систем `avg/fx/battle.ab` часть `m_Father` ссылается
    на объекты в анонимных бандлах, которые мы намеренно не грузим (их 225).
    Тогда полный путь собрать нельзя, но имена до обрыва уже дают уникальный
    хвост вида `intro/blood_03/trail (1)` — по нему и матчим.
    """
    try:
        game_object: GameObject = system.m_GameObject.read()
    except Exception:
        return None, None

    transform = None
    for pointer in game_object.m_Components:
        if not getattr(pointer, "m_PathID", 0):
            continue
        try:
            component = pointer.read()
        except Exception:
            continue
        if isinstance(component, Transform):
            transform = component
            break
    if transform is None:
        return None, None

    names: list[str] = []
    current = transform
    # Ключ — PathID GameObject'а: `read()` каждый раз возвращает новый объект,
    # поэтому `id()` не ловит цикл, и обход зависает на само-родителе.
    seen: set[tuple[int, int]] = set()
    complete = True
    while current is not None and len(names) < 64:
        pointer = getattr(current, "m_GameObject", None)
        key = (getattr(pointer, "m_PathID", 0), getattr(pointer, "m_FileID", 0))
        if key in seen:
            complete = False
            break
        seen.add(key)
        try:
            owner = pointer.read()
            names.append(owner.m_Name or "node")
        except Exception:
            complete = False
            break
        father = getattr(current, "m_Father", None)
        if father is None or not getattr(father, "m_PathID", 0):
            break
        try:
            current = father.read()
        except Exception:
            complete = False
            break
    ordered = list(reversed(names))
    return ("/".join(ordered) if complete else None), "/".join(ordered)


async def patch_stem(stem: str, client: Any, root: Path) -> int:
    out_dir = root / stem
    index_file = out_dir / "index.json"
    if not index_file.exists():
        return 0
    index = json.loads(index_file.read_text(encoding="utf-8"))
    systems = index.get("systems") or []
    if not systems:
        return 0
    if all("scalingMode" in system for system in systems):
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

    env = UnityPy.load(path)
    by_path: dict[str, int] = {}
    by_suffix: list[tuple[str, int]] = []
    for obj in env.objects:
        if obj.type.name != "ParticleSystem":
            continue
        system = obj.read()
        full, suffix = node_path(system, env.objects)
        mode = int(getattr(system, "scalingMode", 1) or 0)
        if full:
            by_path[full] = mode
        if suffix:
            by_suffix.append((suffix, mode))

    patched = 0
    for system in systems:
        node = system.get("node", "")
        mode = by_path.get(node)
        if mode is None:
            # Хвост пути уникален внутри бандла: `intro/blood_03/trail (1)`.
            matches = {value for suffix, value in by_suffix if node.endswith("/" + suffix)}
            if len(matches) == 1:
                mode = matches.pop()
        if mode is None:
            continue
        system["scalingMode"] = mode
        patched += 1
    index_file.write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    return patched


def latest_res_version() -> str:
    import json
    from urllib.request import urlopen

    url = "https://ak-conf.hypergryph.com/config/prod/official/Android/version"
    with urlopen(url, timeout=20) as response:  # noqa: S310
        return str(json.loads(response.read().decode("utf-8"))["resVersion"])


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
                patched = await patch_stem(stem, client, args.dir)
            except Exception as error:  # noqa: BLE001
                print(f"! {stem}: {error}", file=sys.stderr)
                continue
            total += patched
            if index % 20 == 0:
                print(f"  {index}/{len(stems)}")
        print(f"scalingMode записан для {total} систем")
    finally:
        await client.aclose()


if __name__ == "__main__":
    anyio.run(main)
