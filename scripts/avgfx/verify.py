#!/usr/bin/env python3
"""Проверка: что читалка реально нарисует для каждого эффекта `avgfx`.

Скрипт повторяет решения `StoryFxCanvas.compileSystems`/`spawnParticle` и
ищет эффекты, которые в читалке остаются пустыми или теряют слои:

* система без текстуры или с `Default-Particle` — пропускается;
* нет ни одной живой системы — эффект пустой;
* нулевой `rate` и пустые `bursts` — частицы не появляются;
* нулевой размер/альфа или позиция далеко за кадром — частиц не видно;
* `MeshRenderer`-квады (материалы с реальной текстурой) — читалка их не рисует;
* слоты, которые рендерер не поддерживает (`_DisturbTex`, `_MainUSpeed`, …).

Запуск:

    python3 scripts/avgfx/verify.py --dir /path/to/zoot-data/avgfx \
        --out docs/effects-render-audit.md
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path

UNIT = 100
# Полукадр сцены 1280×720 плюс запас: всё, что дальше, на экран не попадает.
FRAME_X = 1600
FRAME_Y = 1200


def qmul(a: list[float], b: list[float]) -> list[float]:
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ]


def qrot(q: list[float], v: list[float]) -> list[float]:
    x, y, z, w = q
    ix = w * v[0] + y * v[2] - z * v[1]
    iy = w * v[1] + z * v[0] - x * v[2]
    iz = w * v[2] + x * v[1] - y * v[0]
    iw = -x * v[0] - y * v[1] - z * v[2]
    return [
        ix * w + iw * -x + iy * -z - iz * -y,
        iy * w + iw * -y + iz * -x - ix * -z,
        iz * w + iw * -z + ix * -y - iy * -x,
    ]


def build_transforms(prefabs: list[dict]) -> dict[str, dict]:
    result: dict[str, dict] = {}

    def walk(node: dict, parent: dict) -> None:
        local_pos = node.get("pos") or [0, 0, 0]
        local_rot = node.get("rot") or [0, 0, 0, 1]
        local_scale = node.get("scale") or [1, 1, 1]
        scaled = [
            local_pos[0] * parent["scale"][0],
            local_pos[1] * parent["scale"][1],
            local_pos[2] * parent["scale"][2],
        ]
        rotated = qrot(parent["rot"], scaled)
        transform = {
            "pos": [
                parent["pos"][0] + rotated[0],
                parent["pos"][1] + rotated[1],
                parent["pos"][2] + rotated[2],
            ],
            "rot": qmul(parent["rot"], local_rot),
            "scale": [
                parent["scale"][0] * local_scale[0],
                parent["scale"][1] * local_scale[1],
                parent["scale"][2] * local_scale[2],
            ],
        }
        result[node["path"]] = transform
        for kid in node.get("kids") or []:
            walk(kid, transform)

    root = {"pos": [0, 0, 0], "rot": [0, 0, 0, 1], "scale": [1, 1, 1]}
    for node in prefabs:
        walk(node, root)
    return result


def hermite(keys: list[list[float]], t: float, fallback: float) -> float:
    if not keys:
        return fallback
    if t <= keys[0][0]:
        return keys[0][1]
    for index in range(1, len(keys)):
        if t > keys[index][0]:
            continue
        t0, v0 = keys[index - 1][0], keys[index - 1][1]
        out_slope = keys[index - 1][3] if len(keys[index - 1]) > 3 else 0
        t1, v1 = keys[index][0], keys[index][1]
        in_slope = keys[index][2] if len(keys[index]) > 2 else 0
        span = max(1e-6, t1 - t0)
        u = (t - t0) / span
        u2, u3 = u * u, u * u * u
        return (
            (2 * u3 - 3 * u2 + 1) * v0
            + (u3 - 2 * u2 + u) * span * out_slope
            + (-2 * u3 + 3 * u2) * v1
            + (u3 - u2) * span * in_slope
        )
    return keys[-1][1]


def curve_max(value: dict | None) -> float:
    """Максимум кривой на отрезке [0, 1] — по ключам, иначе по скаляру."""
    if not value:
        return 0.0
    if value.get("state", 0) >= 2 and value.get("keys"):
        keys = value["keys"]
        samples = [hermite(keys, i / 24, value.get("scalar", 0)) for i in range(25)]
        return max(samples)
    if value.get("state") == 1:
        return max(value.get("scalar", 0), value.get("min", 0))
    if value.get("state") == 3:
        keys = value.get("keys") or []
        min_keys = value.get("minKeys") or []
        if keys or min_keys:
            samples = [
                max(
                    hermite(keys, i / 24, value.get("scalar", 0)),
                    hermite(min_keys, i / 24, value.get("min", 0)),
                )
                for i in range(25)
            ]
            return max(samples)
        return max(value.get("scalar", 0), value.get("min", 0))
    return value.get("scalar", 0)


def alpha_of(gradient: dict | None) -> float:
    if not gradient:
        return 1.0
    constant = gradient.get("color") or [1, 1, 1, 1]
    alpha = constant[3] if len(constant) > 3 else 1.0
    if gradient.get("state", 0) <= 0:
        return alpha
    colors = gradient.get("colors") or []
    if colors:
        alpha = max(entry[4] if len(entry) > 4 else 1.0 for entry in colors)
    for entry in gradient.get("alphas") or []:
        alpha = max(alpha, entry[1] if len(entry) > 1 else 0)
    return alpha


def check_effect(directory: Path) -> dict:
    index = json.loads((directory / "index.json").read_text(encoding="utf-8"))
    images = set((index.get("images") or {}).keys())
    materials = index.get("materials") or {}
    transforms = build_transforms(index.get("prefabs") or [])

    blank_reasons: list[str] = []
    alive = 0
    notes: list[str] = []

    for system in index.get("systems") or []:
        renderer = system.get("renderer") or {}
        node = (system.get("node") or "").split("/")[-1]
        # `mode = 5` (None) — невидимые системы-эмиттеры для trails.
        if renderer.get("mode") == 5:
            continue
        texture = renderer.get("texture")
        if not texture or "default-particle" in texture.lower() or texture not in images:
            continue
        alive += 1

        # `rateOverTime` у части префабов пуст, а поток задан
        # `rateOverDistance` — читалка теперь берёт максимум из двух.
        rate = max(curve_max(system.get("rate")), curve_max(system.get("rateOverDistance")))
        bursts = sum(
            curve_max(burst.get("count")) * max(1, burst.get("cycles") or 1)
            for burst in system.get("bursts") or []
        )
        if rate <= 0.0001 and bursts <= 0.0001:
            blank_reasons.append(f"{node}: нечему появляться (rate=0, bursts=0)")
            continue

        # Система без размера, но с суб-эмиттерами — это эмиттер-невидимка:
        # сама она не рисуется, зато запускает видимые системы.
        if system.get("subEmitters"):
            continue
        # У систем с trail видимый слой — полоса, её ширина не зависит
        # от `startSize`.
        if system.get("trail"):
            continue
        size = curve_max(system.get("startSize"))
        size_y = curve_max(system.get("startSizeY")) if system.get("startSizeY") else size
        mesh = renderer.get("meshSize") or [1, 1]
        scale = 1
        if system.get("scalingMode") == 1:
            local = (transforms.get(system.get("node")) or {}).get("scale") or [1, 1, 1]
            scale = max(abs(local[0]) or 1, abs(local[1]) or 1)
        width = size * UNIT * (mesh[0] or 1) * scale
        height = size_y * UNIT * (mesh[1] or 1) * scale
        if width < 0.6 and height < 0.6:
            blank_reasons.append(f"{node}: нулевой размер частицы")

        alpha = alpha_of(system.get("startColor")) * alpha_of(system.get("colorOverLife"))
        tint = renderer.get("tint") or [1, 1, 1, 1]
        alpha *= tint[3] if len(tint) > 3 else 1
        if alpha <= 0.01:
            blank_reasons.append(f"{node}: нулевая альфа")

        pos = (transforms.get(system.get("node")) or {}).get("pos") or [0, 0, 0]
        if abs(pos[0]) > FRAME_X or abs(pos[1]) > FRAME_Y:
            blank_reasons.append(
                f"{node}: позиция за кадром ({pos[0]:.0f}, {pos[1]:.0f})"
            )

    # Квады MeshRenderer: вторая половина эффекта (слэши, линии, блики).
    quads: list[str] = []
    quads_used: list[str] = []
    meshes_used: list[str] = []
    meshes = index.get("meshes") or {}
    transforms = build_transforms(index.get("prefabs") or [])

    for node in walk_nodes(index.get("prefabs") or []):
        if not node.get("active", True):
            continue
        transform = transforms.get(node["path"])
        if not transform:
            continue
        # Меш квада: силуэт берётся из геометрии, поэтому проверки «лист на
        # весь кадр» к таким слоям не применяются.
        mesh = next(
            (
                component.get("mesh")
                for component in node.get("components") or []
                if component.get("type") == "MeshFilter"
                and component.get("mesh") in meshes
            ),
            None,
        )
        for component in node.get("components") or []:
            if component.get("type") != "MeshRenderer":
                continue
            for material in component.get("materials") or []:
                if not material:
                    continue
                textures = material.get("textures") or {}
                file = (textures.get("_MainTex") or {}).get("file")
                if not file or file not in images:
                    continue
                floats = material.get("floats") or {}
                amount = floats.get("_Amount")
                dissolve = (textures.get("_DissolveTex") or {}).get("file")
                if not dissolve or not isinstance(amount, (int, float)):
                    amount = None
                main = (material.get("colors") or {}).get("_MainColor")
                tint = float(main[3]) if isinstance(main, list) and len(main) == 4 else 1.0
                stats = quad_stats(
                    directory / file,
                    directory / dissolve if dissolve and amount is not None else None,
                    amount,
                    floats.get("_BorderWidth"),
                    tint,
                )
                if stats is None:
                    continue
                alpha, luminance, edge = stats
                # `_DstBlend` 0/1 — аддитивный материал: чёрный край не виден.
                additive = floats.get("_DstBlend") in (0, 1)
                if alpha < 0.02:
                    continue
                if not mesh and not additive and alpha > 0.9 and (luminance < 0.12 or luminance > 0.94):
                    continue
                if not mesh and not additive and edge > 0.15:
                    continue
                suffix = f", меш {mesh}" if mesh else ""
                quads.append(f"{node['name']} ({material.get('name')}{suffix})")
                quads_used.append(f"{node['name']} ({material.get('name')}, {file}{suffix})")
                if mesh:
                    meshes_used.append(mesh)

    unsupported = []
    for system in index.get("systems") or []:
        renderer = system.get("renderer") or {}
        for name in renderer.get("materials") or []:
            material = materials.get(name) or {}
            textures = material.get("textures") or {}
            floats = material.get("floats") or {}
            for slot in ("_DisturbTex", "_MaskTex", "_AlphaTex", "_NoiseTex"):
                if (textures.get(slot) or {}).get("file"):
                    unsupported.append(f"{slot}")
            for key in ("_MainUSpeed", "_MainVSpeed"):
                value = floats.get(key)
                if isinstance(value, (int, float)) and abs(value) > 0.001:
                    unsupported.append(f"{key}={value}")

    distortion_only = False
    if alive == 0 and not quads_used:
        for node in walk_nodes(index.get("prefabs") or []):
            for component in node.get("components") or []:
                if component.get("type") != "MeshRenderer":
                    continue
                for material in component.get("materials") or []:
                    textures = (material or {}).get("textures") or {}
                    distort = (
                        (textures.get("_DisturTex") or {}).get("file")
                        or (textures.get("_DisturbTex") or {}).get("file")
                    )
                    if distort and not (textures.get("_MainTex") or {}).get("file"):
                        distortion_only = True

    trails = [
        (system.get("node") or "").split("/")[-1]
        for system in index.get("systems") or []
        if system.get("trail")
    ]
    subs = [
        (system.get("node") or "").split("/")[-1]
        for system in index.get("systems") or []
        if system.get("subEmitters")
    ]

    return {
        "stem": directory.name,
        "trails": trails,
        "subEmitters": subs,
        "distortionOnly": distortion_only,
        "systems": len(index.get("systems") or []),
        "alive": alive,
        "blank_reasons": blank_reasons,
        "quads": quads,
        "quads_used": quads_used,
        "meshes": sorted(set(meshes_used)),
        "unsupported": sorted(set(unsupported)),
    }


def quad_stats(
    main: Path,
    dissolve: Path | None,
    amount: float | None,
    border: float | None,
    tint: float = 1.0,
) -> tuple[float, float, float] | None:
    """Средняя альфа и яркость квада после растворения (как в читалке)."""
    try:
        from PIL import Image
        import numpy as np
    except Exception:  # noqa: BLE001
        return None
    try:
        image = np.asarray(Image.open(main).convert("RGBA").resize((24, 24))).astype(np.float32)
    except Exception:  # noqa: BLE001
        return None
    alpha = image[..., 3] / 255
    if dissolve is not None and amount is not None:
        try:
            mask = np.asarray(Image.open(dissolve).convert("RGBA").resize((24, 24))).astype(np.float32)[..., 0] / 255
            alpha = alpha * np.clip((mask - amount) / max(border or 1, 1e-4), 0, 1)
        except Exception:  # noqa: BLE001
            pass
    # `_MainColor.a` — общая прозрачность квада, как в читалке.
    alpha = alpha * tint
    rgb = image[..., :3] / 255
    weight = float(alpha.sum())
    luminance = float(((0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) * alpha).sum() / weight) if weight else 0.0
    edge = float(
        (alpha[0].sum() + alpha[-1].sum() + alpha[:, 0].sum() + alpha[:, -1].sum())
        / max(1, 2 * alpha.shape[0] + 2 * alpha.shape[1])
    )
    return float(alpha.mean()), luminance, edge


def walk_nodes(prefabs: list[dict]):
    for node in prefabs:
        yield node
        yield from walk_nodes(node.get("kids") or [])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    rows = [
        check_effect(directory)
        for directory in sorted(p for p in args.dir.iterdir() if p.is_dir())
        if (directory / "index.json").exists()
    ]

    distortion = [row for row in rows if row["distortionOnly"]]
    blank = [
        row
        for row in rows
        if row["alive"] == 0 and not row["quads_used"] and not row["distortionOnly"]
    ]
    no_emission = [row for row in rows if row["alive"] > 0 and row["blank_reasons"]]
    quads = [row for row in rows if row["quads"]]
    quads_only = [row for row in rows if row["alive"] == 0 and row["quads_used"]]
    unsupported = [row for row in rows if row["unsupported"]]

    out = ["# Проверка воспроизведения эффектов avgfx", ""]
    out.append(f"Всего эффектов: **{len(rows)}**.")
    out.append("")
    out.append(f"- пустые (ни частиц, ни квадов): **{len(blank)}**")
    out.append(f"- только искажение (`_DisturTex`, нужен шейдер): **{len(distortion)}**")
    out.append(f"- только квады `MeshRenderer` (частиц нет): **{len(quads_only)}**")
    out.append(f"- частицы есть, но не появляются/не видны: **{len(no_emission)}**")
    out.append(f"- рисуют квады `MeshRenderer`: **{len(quads_only) + len([r for r in rows if r['alive'] and r['quads_used']])}**")
    out.append(f"- используют неподдерживаемые слоты: **{len(unsupported)}**")
    trails = [row for row in rows if row.get("trails")]
    subs = [row for row in rows if row.get("subEmitters")]
    out.append(f"- квады по настоящей геометрии меша: **{len([r for r in rows if r.get('meshes')])}**")
    out.append(f"- с trail-полосами: **{len(trails)}**")
    out.append(f"- с суб-эмиттерами: **{len(subs)}**")
    out.append("")
    out.append("## Пустые эффекты")
    out.append("")
    out.append("| эффект | систем | причина |")
    out.append("|---|---|---|")
    for row in blank:
        out.append(
            f"| `{row['stem']}` | {row['systems']} | "
            "нет ни живой системы частиц, ни квада с текстурой |"
        )
    out.append("")
    out.append("## Только искажение")
    out.append("")
    out.append(
        "Эти эффекты — шейдерный сдвиг кадра (`_DisturbTex`) без собственной "
        "текстуры: в 2D-канвасе их не воспроизвести, нужен шейдер поверх сцены."
    )
    out.append("")
    for row in distortion:
        out.append(f"- `{row['stem']}`")
    out.append("")
    out.append("## Только квады `MeshRenderer`")
    out.append("")
    for row in quads_only:
        out.append(f"### `{row['stem']}`")
        for quad in row["quads_used"][:8]:
            out.append(f"- {quad}")
        out.append("")
    out.append("## Не появляются частицы")
    out.append("")
    if not no_emission:
        out.append("Нет.")
    for row in no_emission:
        out.append(f"### `{row['stem']}`")
        for reason in row["blank_reasons"][:8]:
            out.append(f"- {reason}")
        out.append("")
    out.append("## Слои MeshRenderer")
    out.append("")
    for row in quads:
        out.append(f"### `{row['stem']}`")
        for quad in row["quads"][:10]:
            out.append(f"- {quad}")
        out.append("")
    out.append("## Все эффекты")
    out.append("")
    out.append("| эффект | статус |")
    out.append("|---|---|")
    for row in rows:
        if row["alive"] == 0 and row["quads_used"]:
            status = "только квады"
        elif row["alive"] == 0:
            status = "пусто"
        elif row["quads_used"]:
            status = "частицы + квады"
        else:
            status = "частицы"
        if row["alive"] and row["blank_reasons"]:
            status += ", часть систем молчит"
        out.append(f"| `{row['stem']}` | {status} |")
    out.append("")
    out.append("## Неподдерживаемые слоты материала")
    out.append("")
    counter = Counter()
    for row in unsupported:
        for item in row["unsupported"]:
            counter[item.split("=")[0]] += 1
    for item, count in counter.most_common():
        out.append(f"- `{item}` — {count} эффектов")
    out.append("")

    args.out.write_text("\n".join(out), encoding="utf-8")
    print(
        f"эффектов {len(rows)}: пустых {len(blank)}, без эмиссии {len(no_emission)}, "
        f"с MeshRenderer {len(quads)}, с неподдерживаемыми слотами {len(unsupported)}"
    )
    print(f"отчёт: {args.out}")


if __name__ == "__main__":
    main()
