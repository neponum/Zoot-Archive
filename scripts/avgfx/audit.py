#!/usr/bin/env python3
"""Аудит выгруженных эффектов `avgfx`: где читалка рисует не то, что игра.

Проверяет то, на чём уже обжигались:

* `_DissolveTex` + `_Amount` — шейдер растворения (у `avg_062_black_01` это
  виньетка, а не сплошная пелена);
* mesh-частицы без `meshSize` (встроенный Quad Unity — там множитель 1);
* основная текстура — сплошной белый квадрат, а форма задаётся другим слотом;
* аддитивное смешивание у почти чёрной текстуры (эффект не виден);
* `scalingMode = 0` с масштабом контейнера больше экрана;
* непустые `_MainUSpeed`/`_MainVSpeed` (текстура должна ползти, у нас статична);
* `_MaskTex`/`_AlphaTex`/`_NoiseTex` в материале.

Запуск:

    python3 scripts/avgfx/audit.py --dir /path/to/zoot-data/avgfx \
        --map src/data/avgEffectMap.json \
        --stories /path/to/STORY-SCRIPTS/original/zh_CN/gamedata/story \
        --out docs/effects-audit.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

VAR_PATTERN = re.compile(r"\$(e[bB]?_[A-Za-z0-9_]+)")
EXTRA_SLOTS = ("_MaskTex", "_AlphaTex", "_NoiseTex", "_DisturbTex", "_DissolveTex")


def texture_stats(path: Path) -> dict[str, float] | None:
    try:
        image = Image.open(path).convert("RGBA")
    except Exception:  # noqa: BLE001
        return None
    width, height = image.size
    if width * height > 512 * 512:
        image = image.resize((256, 256))
    pixels = list(image.getdata())
    total = len(pixels)
    opaque = sum(1 for p in pixels if p[3] > 8)
    mean_alpha = sum(p[3] for p in pixels) / total / 255
    mean_lum = sum(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in pixels) / total / 255
    return {
        "coverage": opaque / total,
        "alpha": mean_alpha,
        "luminance": mean_lum,
    }


def audit_effect(directory: Path) -> tuple[list[str], dict[str, float]]:
    index = json.loads((directory / "index.json").read_text(encoding="utf-8"))
    materials = index.get("materials") or {}
    notes: list[str] = []
    stats: dict[str, float] = {}

    cache: dict[str, dict[str, float] | None] = {}

    def stat(file: str | None) -> dict[str, float] | None:
        if not file:
            return None
        if file not in cache:
            cache[file] = texture_stats(directory / file)
        return cache[file]

    for system in index.get("systems") or []:
        renderer = system.get("renderer") or {}
        node = system.get("node", "").split("/")[-1]
        names = renderer.get("materials") or []
        main_file = renderer.get("texture")
        main = stat(main_file)
        if main and main_file:
            stats[main_file] = main

        if renderer.get("mode") == 4 and not renderer.get("meshSize"):
            notes.append(f"{node}: mesh без размера (встроенный Quad?)")

        if renderer.get("blend") == "add" and main and main["luminance"] < 0.08:
            notes.append(f"{node}: аддитив по тёмной текстуре ({main_file})")

        for name in names:
            material = materials.get(name) or {}
            textures = material.get("textures") or {}
            floats = material.get("floats") or {}

            amount = floats.get("_Amount")
            dissolve = (textures.get("_DissolveTex") or {}).get("file")
            if dissolve and isinstance(amount, (int, float)) and amount > 0.001:
                if main and main["coverage"] > 0.98 and main["alpha"] > 0.98:
                    notes.append(
                        f"{node}: форма из _DissolveTex (Amount={amount:.2f}), "
                        f"_MainTex — сплошной квадрат"
                    )

            for slot in EXTRA_SLOTS:
                if slot == "_DissolveTex":
                    continue
                if (textures.get(slot) or {}).get("file"):
                    notes.append(f"{node}: слот {slot} не учитывается")

            for key in ("_MainUSpeed", "_MainVSpeed", "_DissolveUSpeed", "_DissolveVSpeed"):
                value = floats.get(key)
                if isinstance(value, (int, float)) and abs(value) > 0.001:
                    notes.append(f"{node}: {key}={value} (текстура должна ползти)")

            opacity = floats.get("_Opacity")
            if isinstance(opacity, (int, float)) and 0 < opacity < 0.99:
                notes.append(f"{node}: _Opacity={opacity:.2f} не учитывается")

    scaling = Counter(system.get("scalingMode") for system in index.get("systems") or [])
    return notes, {"systems": len(index.get("systems") or []), **{f"mode{k}": v for k, v in scaling.items()}}


def collect_usage(stories: Path) -> dict[str, list[tuple[str, int]]]:
    usage: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for root, _, files in os.walk(stories):
        for name in sorted(files):
            if not name.endswith(".txt"):
                continue
            path = Path(root) / name
            relative = path.relative_to(stories).with_suffix("").as_posix()
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except Exception:  # noqa: BLE001
                continue
            for number, line in enumerate(lines, 1):
                for match in VAR_PATTERN.finditer(line):
                    variable = match.group(1)
                    if len(usage[variable]) < 4:
                        usage[variable].append((relative, number))
    return usage


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", required=True, type=Path)
    parser.add_argument("--map", required=True, type=Path)
    parser.add_argument("--stories", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    mapping = json.loads(args.map.read_text(encoding="utf-8"))
    by_stem: dict[str, list[str]] = defaultdict(list)
    for variable, stem in mapping.items():
        by_stem[stem.lower()].append(variable)

    usage = collect_usage(args.stories)

    rows = []
    for directory in sorted(p for p in args.dir.iterdir() if p.is_dir()):
        if not (directory / "index.json").exists():
            continue
        notes, meta = audit_effect(directory)
        variables = by_stem.get(directory.name.lower(), [])
        episodes: list[str] = []
        for variable in variables:
            for path, line in usage.get(variable, []):
                episodes.append(f"`/story/{path}` ({variable}, строка {line})")
        rows.append(
            {
                "stem": directory.name,
                "variables": variables,
                "episodes": episodes[:3],
                "notes": notes,
                "meta": meta,
            }
        )

    clean = [row for row in rows if not row["notes"]]
    flagged = [row for row in rows if row["notes"]]
    unlisted = [row for row in rows if not row["episodes"]]

    out = ["# Аудит эффектов avgfx", ""]
    out.append(f"Всего эффектов: **{len(rows)}**, без замечаний: **{len(clean)}**, "
               f"с замечаниями: **{len(flagged)}**, без эпизода для проверки: **{len(unlisted)}**.")
    out.append("")
    out.append("## Где проверять")
    out.append("")
    out.append("| эффект | переменная | эпизод |")
    out.append("|---|---|---|")
    for row in rows:
        variable = ", ".join(row["variables"]) or "—"
        episode = row["episodes"][0] if row["episodes"] else "нет в сценариях"
        out.append(f"| `{row['stem']}` | {variable} | {episode} |")
    out.append("")
    out.append("## Замечания")
    out.append("")
    if not flagged:
        out.append("Замечаний нет.")
    for row in flagged:
        out.append(f"### `{row['stem']}`")
        for note in row["notes"][:12]:
            out.append(f"- {note}")
        out.append("")

    args.out.write_text("\n".join(out), encoding="utf-8")
    print(f"эффектов {len(rows)}, с замечаниями {len(flagged)}, без эпизода {len(unlisted)}")
    print(f"отчёт: {args.out}")


if __name__ == "__main__":
    main()
