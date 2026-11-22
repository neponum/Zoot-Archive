#!/usr/bin/env python3
"""Скачать эффекты AVG (`avg/effects/**`) и выгрузить их в JSON + WebP.

Основа — распаковщик `MooncellWiki/torappu` (UnityPy + клиент ресурсов),
он же даёт доступ к бандлам, которых нет на `torappu.prts.wiki`.

Запуск (из checkout'а torappu, чтобы был доступен пакет):

    uv run --project /path/to/torappu python scripts/avgfx/export.py \
        --out /tmp/avgfx avg_snow_01 avg_firefly_01

На выходе на каждый эффект:

    <out>/<stem>/index.json      дерево префаба + системы частиц + материалы
    <out>/<stem>/<texture>.webp  текстуры, на которые ссылаются материалы
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct

from pathlib import Path
from typing import Any

import anyio
import UnityPy
from UnityPy.classes import GameObject, Material, Mesh, ParticleSystem, Texture2D
from UnityPy.files.ObjectReader import ObjectReader

import torappu
from torappu.core.utils.unity import install_unity_patches

# -- сериализация Unity-структур ---------------------------------------------

# Форматы каналов вершин Unity: (struct-код, размер, делитель нормализации).
MESH_FORMATS: dict[int, tuple[str, int, float]] = {
    0: ("f", 4, 1.0),
    1: ("e", 2, 1.0),
    2: ("B", 1, 255.0),
    3: ("b", 1, 127.0),
    4: ("H", 2, 65535.0),
    5: ("h", 2, 32767.0),
    6: ("I", 4, 1.0),
    7: ("i", 4, 1.0),
}


def sanitize(name: str) -> str:
    return re.sub(r"[^0-9A-Za-z_.-]+", "_", name)


def vec3(value: Any) -> list[float] | None:
    if value is None:
        return None
    return [round(float(value.x), 5), round(float(value.y), 5), round(float(value.z), 5)]


def quat(value: Any) -> list[float] | None:
    if value is None:
        return None
    # UnityPy отдаёт (x, y, z, w) в полях Quaternionf
    return [
        round(float(value.x), 5),
        round(float(value.y), 5),
        round(float(value.z), 5),
        round(float(value.w), 5),
    ]


def color(value: Any) -> list[float] | None:
    if value is None:
        return None
    return [
        round(float(value.r), 5),
        round(float(value.g), 5),
        round(float(value.b), 5),
        round(float(value.a), 5),
    ]


def keyframes(animation_curve: Any) -> list[list[float]]:
    keys = getattr(animation_curve, "m_Curve", None) or []
    return [
        [
            round(float(key.time), 5),
            round(float(key.value), 5),
            round(float(key.inSlope), 4),
            round(float(key.outSlope), 4),
        ]
        for key in keys
    ]


def curve(value: Any) -> dict[str, Any] | None:
    """MinMaxCurve → компактный вид.

    state: 0 — константа, 1 — две константы, 2 — кривая, 3 — две кривые.
    """
    if value is None:
        return None
    state = int(getattr(value, "minMaxState", 0) or 0)
    data: dict[str, Any] = {
        "state": state,
        "scalar": round(float(getattr(value, "scalar", 0) or 0), 5),
        "min": round(float(getattr(value, "minScalar", 0) or 0), 5),
    }
    max_curve = getattr(value, "maxCurve", None)
    min_curve = getattr(value, "minCurve", None)
    if state in (2, 3) and max_curve is not None:
        data["keys"] = keyframes(max_curve)
    if state == 3 and min_curve is not None:
        data["minKeys"] = keyframes(min_curve)
    return data


def gradient(value: Any) -> dict[str, Any] | None:
    """MinMaxGradient → константа или список ключей [t, r, g, b, a]."""
    if value is None:
        return None
    state = int(getattr(value, "minMaxState", 0) or 0)
    if state in (0, 2):
        return {"state": state, "color": color(value.maxColor)}
    packed = value.maxGradient
    if packed is None:
        return {"state": state, "color": color(value.maxColor)}

    num_colors = int(getattr(packed, "m_NumColorKeys", 2) or 2)
    num_alphas = int(getattr(packed, "m_NumAlphaKeys", 2) or 2)
    colors: list[list[float]] = []
    for index in range(max(0, min(8, num_colors))):
        key = getattr(packed, f"key{index}", None)
        time = getattr(packed, f"ctime{index}", 0) or 0
        if key is None:
            continue
        rgba = color(key)
        if rgba is None:
            continue
        colors.append([round(time / 65535, 5), *rgba])
    alphas: list[list[float]] = []
    for index in range(max(0, min(8, num_alphas))):
        time = getattr(packed, f"atime{index}", 0) or 0
        source = getattr(packed, f"key{index}", None)
        alpha = float(getattr(source, "a", 1.0)) if source is not None else 1.0
        alphas.append([round(time / 65535, 5), round(alpha, 5)])
    return {
        "state": state,
        "colors": colors,
        "alphas": alphas,
        "color": color(value.maxColor),
    }


def streamed_frames(data: list[int]) -> list[dict[str, Any]]:
    """Распаковка сжатого клипа Unity (`m_StreamedClip`).

    Формат (AssetStudio): кадр — `time` (float) + `numKeys` (int), затем
    ключи: `index` (int), четыре float-коэффициента, где `coeff[3]` — значение,
    `coeff[2]` — наклон на выходе.
    """
    if not data:
        return []
    buffer = struct.pack(f"<{len(data)}I", *data)
    position = 0
    frames: list[dict[str, Any]] = []
    while position + 8 <= len(buffer):
        time, count = struct.unpack_from("<fi", buffer, position)
        position += 8
        if count < 0 or count > 4096:
            break
        keys = []
        for _ in range(count):
            if position + 20 > len(buffer):
                break
            index, _c0, _c1, _c2, value = struct.unpack_from("<iffff", buffer, position)
            position += 20
            keys.append({"index": index, "value": value})
        frames.append({"time": time, "keys": keys})
    return frames


def clip_animations(tree: dict[str, Any]) -> list[dict[str, Any]]:
    """Кривые клипа: путь (CRC узла), атрибут и ключи."""
    muscle = tree.get("m_MuscleClip") or {}
    data = (((muscle.get("m_Clip") or {}).get("data") or {}).get("m_StreamedClip") or {}).get("data") or []
    frames = streamed_frames(data)
    if not frames:
        return []

    curves: dict[int, list[list[float]]] = {}
    for frame in frames:
        time = float(frame["time"])
        if time in (float("inf"), float("-inf")) or time != time:
            continue
        for key in frame["keys"]:
            curves.setdefault(int(key["index"]), []).append(
                [round(time, 4), round(float(key["value"]), 5)]
            )
    if not curves:
        return []

    bindings = (tree.get("m_ClipBindingConstant") or {}).get("genericBindings") or []

    def binding_for(index: int) -> dict[str, Any] | None:
        count = 0
        for binding in bindings:
            if int(binding.get("typeID") or 0) == 4:
                attribute = int(binding.get("attribute") or 0)
                count += 3 if attribute in (1, 3, 4) else 4 if attribute == 2 else 1
            else:
                count += 1
            if count > index:
                return binding
        return None

    result: list[dict[str, Any]] = []
    for index, keys in sorted(curves.items()):
        if len(keys) < 2:
            continue
        binding = binding_for(index)
        if binding is None:
            continue
        result.append(
            {
                "path": int(binding.get("path") or 0),
                "attribute": int(binding.get("attribute") or 0),
                "typeId": int(binding.get("typeID") or 0),
                "customType": int(binding.get("customType") or 0),
                "index": index,
                "keys": keys[:64],
            }
        )
    return result


def shape(module: Any) -> dict[str, Any] | None:
    if module is None or not getattr(module, "enabled", False):
        return None
    radius = getattr(module, "radius", None)
    radius_value = getattr(radius, "value", radius)
    box = [getattr(module, "boxX", None), getattr(module, "boxY", None), getattr(module, "boxZ", None)]
    return {
        "type": int(getattr(module, "type", 0) or 0),
        "radius": round(float(radius_value), 4) if radius_value is not None else None,
        "angle": round(float(getattr(module, "angle", 0) or 0), 4),
        "scale": vec3(getattr(module, "m_Scale", None)),
        "pos": vec3(getattr(module, "m_Position", None)),
        "rot": vec3(getattr(module, "m_Rotation", None)),
        "box": [round(float(value), 4) if value is not None else None for value in box],
    }


def uv_module(module: Any) -> dict[str, Any] | None:
    """Анимация по атласу (`tilesX×tilesY`): у светлячков это 2×2."""
    if module is None or not getattr(module, "enabled", False):
        return None
    tiles_x = int(getattr(module, "tilesX", 1) or 1)
    tiles_y = int(getattr(module, "tilesY", 1) or 1)
    if tiles_x * tiles_y <= 1:
        return None
    return {
        "tilesX": tiles_x,
        "tilesY": tiles_y,
        "animationType": int(getattr(module, "animationType", 0) or 0),
        "rowMode": int(getattr(module, "rowMode", 0) or 0),
        "cycles": float(getattr(module, "cycles", 1) or 1),
        "frameOverTime": curve(getattr(module, "frameOverTime", None)),
    }


# -- выгрузка одного бандла --------------------------------------------------


class Exporter:
    def __init__(
        self,
        env: UnityPy.Environment,
        out_dir: Path,
        objects: list[ObjectReader[Any]],
    ) -> None:
        self.env = env
        self.out_dir = out_dir
        self.objects = objects
        self.images: dict[str, str] = {}
        self.textures: dict[str, str] = {}
        self.luminance: dict[str, float] = {}
        self.materials: dict[str, dict[str, Any] | None] = {}

    # текстуры ---------------------------------------------------------------
    def export_texture(self, texture: Any) -> str | None:
        if texture is None or not getattr(texture, "m_Name", None):
            return None
        name = texture.m_Name
        if name in self.textures:
            return self.textures[name]
        try:
            image = texture.image
        except Exception:
            return None
        if image is None:
            return None
        filename = sanitize(f"{name}.webp")
        path = self.out_dir / filename
        image.save(path, "WEBP", quality=90, method=4)
        digest = hashlib.sha1(path.read_bytes()).hexdigest()[:12]
        self.images[filename] = digest
        self.textures[name] = filename
        self.luminance[filename] = self._mean_luminance(image)
        return filename

    @staticmethod
    def _mean_luminance(image: Any) -> float:
        """Средняя яркость непрозрачных пикселей — по ней выбираем blend."""
        try:
            small = image.convert("RGBA").resize((64, 64))
            pixels = list(small.getdata())
        except Exception:
            return 1.0
        total = 0.0
        weight = 0.0
        for r, g, b, a in pixels:
            if a < 13:
                continue
            total += (0.2126 * r + 0.7152 * g + 0.0722 * b) * (a / 255)
            weight += a / 255
        return round(total / weight / 255, 4) if weight else 1.0

    # материалы --------------------------------------------------------------
    def export_material(self, pointer: Any) -> dict[str, Any] | None:
        if pointer is None or getattr(pointer, "m_PathID", 0) == 0:
            return None
        try:
            material: Material = pointer.read()
        except Exception:
            return None
        name = material.m_Name
        if name in self.materials:
            return self.materials[name]
        props = material.m_SavedProperties
        textures: dict[str, Any] = {}
        for slot, value in props.m_TexEnvs:
            texture_pointer = value.m_Texture
            if getattr(texture_pointer, "m_PathID", 0) == 0:
                continue
            try:
                texture = texture_pointer.read()
            except Exception:
                continue
            filename = self.export_texture(texture)
            if filename is None:
                continue
            textures[slot] = {
                "file": filename,
                "scale": [round(float(value.m_Scale.x), 4), round(float(value.m_Scale.y), 4)],
                "offset": [round(float(value.m_Offset.x), 4), round(float(value.m_Offset.y), 4)],
            }
        shader_name = None
        try:
            if getattr(material.m_Shader, "m_PathID", 0):
                shader_name = material.m_Shader.read().m_Name
        except Exception:
            shader_name = None
        record = {
            "name": name,
            "shader": shader_name,
            "floats": {
                slot: round(float(value), 4)
                for slot, value in props.m_Floats
                if isinstance(value, (int, float))
            },
            "colors": {slot: color(value) for slot, value in props.m_Colors},
            "textures": textures,
        }
        self.materials[name] = record
        return record

    # компоненты -------------------------------------------------------------
    def particle_system(
        self, system: ParticleSystem, path: str, path_id: int = 0
    ) -> dict[str, Any]:
        initial = system.InitialModule
        emission = system.EmissionModule
        renderer = self.renderer_for(system)
        data: dict[str, Any] = {
            "node": path,
            # PathID нужен суб-эмиттерам: они ссылаются на систему по нему.
            "id": int(path_id or 0),
            "duration": round(float(system.lengthInSec), 4),
            "loop": bool(system.looping),
            "prewarm": bool(system.prewarm),
            "playOnAwake": bool(system.playOnAwake),
            "delay": curve(system.startDelay),
            "speed": round(float(system.simulationSpeed), 4),
            "max": int(initial.maxNumParticles or 0),
            "life": curve(initial.startLifetime),
            "startSpeed": curve(initial.startSpeed),
            "startSize": curve(initial.startSize),
            "startSizeY": curve(initial.startSizeY) if initial.size3D else None,
            "startRotation": curve(initial.startRotation),
            "gravity": curve(initial.gravityModifier),
            "startColor": gradient(initial.startColor),
            "rate": curve(emission.rateOverTime),
            "rateOverDistance": curve(emission.rateOverDistance),
            "bursts": [
                {
                    "time": round(float(burst.time), 4),
                    "count": curve(getattr(burst, "countCurve", None)),
                    "cycles": int(burst.cycleCount),
                    "interval": round(float(burst.repeatInterval), 4),
                }
                for burst in (getattr(emission, "m_Bursts", None) or [])
            ],
            "shape": shape(system.ShapeModule),
            # У выключенных модулей Unity хранит значения по умолчанию
            # (`rotationOverLife` = 0.785 рад/с у 73% систем), и применять их
            # нельзя: маска начинала вращаться, дым — расти.
            "sizeOverLife": curve(system.SizeModule.curve) if system.SizeModule.enabled else None,
            "rotationOverLife": curve(system.RotationModule.curve)
            if system.RotationModule.enabled
            else None,
            "colorOverLife": gradient(system.ColorModule.gradient)
            if system.ColorModule.enabled
            else None,
            "uv": uv_module(system.UVModule),
            "renderer": renderer,
        }

        # Trail: полосы, которые тянутся за частицей (искры, слэши).
        trail = getattr(system, "TrailModule", None)
        if trail is not None and getattr(trail, "enabled", False):
            data["trail"] = {
                "ratio": round(float(getattr(trail, "ratio", 1) or 1), 4),
                "lifetime": curve(getattr(trail, "lifetime", None)),
                "minVertexDistance": round(
                    float(getattr(trail, "minVertexDistance", 0.1) or 0.1), 4
                ),
                "widthOverTrail": curve(getattr(trail, "widthOverTrail", None)),
                "colorOverTrail": gradient(getattr(trail, "colorOverTrail", None)),
                "dieWithParticles": bool(getattr(trail, "dieWithParticles", True)),
            }

        # Суб-эмиттеры: частица при рождении/смерти запускает другую систему.
        sub = getattr(system, "SubModule", None)
        if sub is not None and getattr(sub, "enabled", False):
            emitters = []
            for item in getattr(sub, "subEmitters", None) or []:
                emitters.append(
                    {
                        "type": int(getattr(item, "type", 0) or 0),
                        "probability": round(float(getattr(item, "probability", 1) or 1), 3),
                        "emitter": int(getattr(getattr(item, "emitter", None), "m_PathID", 0) or 0),
                    }
                )
            if emitters:
                data["subEmitters"] = emitters
        if hasattr(system, "VelocityModule"):
            velocity = system.VelocityModule
            data["velocity"] = {
                "enabled": bool(getattr(velocity, "enabled", False)),
                "space": int(getattr(velocity, "space", 0) or 0),
                "x": curve(getattr(velocity, "x", None)),
                "y": curve(getattr(velocity, "y", None)),
                "z": curve(getattr(velocity, "z", None)),
            }
        return data

    def renderer_for(self, system: ParticleSystem) -> dict[str, Any] | None:
        game_object = system.m_GameObject
        for obj in self.objects:
            if obj.type.name != "ParticleSystemRenderer":
                continue
            renderer = obj.read()
            if renderer.m_GameObject.m_PathID != game_object.m_PathID:
                continue
            mesh_name, mesh_size = self.mesh_span(renderer)
            materials = [
                self.export_material(pointer)
                for pointer in renderer.m_Materials
                if getattr(pointer, "m_PathID", 0)
            ]
            main = next((m for m in materials if m and "_MainTex" in m["textures"]), None)
            if main is None:
                main = next((m for m in materials if m and m["textures"]), None)
            texture = None
            blend = "alpha"
            tint = [1.0, 1.0, 1.0, 1.0]
            if main is not None:
                texture_slot = main["textures"].get("_MainTex") or next(
                    iter(main["textures"].values()), None
                )
                texture = texture_slot["file"] if texture_slot else None
                shader = (main.get("shader") or "").lower()
                dst = main["floats"].get("_DstBlend", 0)
                if "add" in shader or dst == 1:
                    blend = "add"
                elif "alpha" in shader or dst in (2, 5, 10):
                    blend = "alpha"
                else:
                    # Шейдер лежит в отдельном анонимном бандле, имя не всегда
                    # доступно. Тёмные текстуры (дым, маски) в аддитивном
                    # режиме просто исчезают — для них обычное смешивание.
                    lum = self.luminance.get(texture or "")
                    blend = "alpha" if lum is not None and lum < 0.22 else "add"
                tint = main["colors"].get("_Color") or tint
            return {
                "mode": int(getattr(renderer, "m_RenderMode", 0) or 0),
                "lengthScale": round(float(getattr(renderer, "m_LengthScale", 0) or 0), 4),
                "velocityScale": round(float(getattr(renderer, "m_VelocityScale", 0) or 0), 4),
                "maxSize": round(float(getattr(renderer, "m_MaxParticleSize", 0) or 0), 4),
                "minSize": round(float(getattr(renderer, "m_MinParticleSize", 0) or 0), 4),
                # В режиме Mesh `startSize` масштабирует вершины меша, а не
                # задаёт размер в юнитах. Без размаха меша маски и дым
                # рисовались квадратом со стороной `startSize`.
                "mesh": mesh_name,
                "meshSize": mesh_size,
                "alignment": int(getattr(renderer, "m_RenderAlignment", 0) or 0),
                "sortMode": int(getattr(renderer, "m_SortMode", 0) or 0),
                "pivot": vec3(getattr(renderer, "m_Pivot", None)),
                "texture": texture,
                "blend": blend,
                "tint": tint,
                "materials": [m["name"] for m in materials if m],
            }
        return None

    def mesh_span(self, renderer: Any) -> tuple[str | None, list[float] | None]:
        """Имя меша и его полный размах (2 × extent) для mesh-частиц."""
        pointer = getattr(renderer, "m_Mesh", None)
        if pointer is None or getattr(pointer, "m_PathID", 0) == 0:
            return None, None
        try:
            mesh: Mesh = pointer.read()
            extent = mesh.m_LocalAABB.m_Extent
        except Exception:  # noqa: BLE001
            return None, None
        span = [
            round(abs(float(extent.x)) * 2, 4),
            round(abs(float(extent.y)) * 2, 4),
        ]
        if span[0] <= 0 or span[1] <= 0:
            return getattr(mesh, "m_Name", None), None
        return getattr(mesh, "m_Name", None), span

    def mesh(self, pointer: Any) -> dict[str, Any] | None:
        """Геометрия меша квада: вершины, UV и индексы.

        `Mesh.m_Vertices` у этих мешей пустой — данные лежат inline в
        `m_VertexData.m_DataSize` (поток вершин с каналами). Без геометрии
        квад рисовался прямоугольником, и лучи `avg_sunshine_01` (лента
        `AVG_plane_06`) выглядели пятном на весь кадр.
        """
        if pointer is None or getattr(pointer, "m_PathID", 0) == 0:
            return None
        try:
            tree = pointer.read_typetree()
        except Exception:  # noqa: BLE001
            return None
        vertex = tree.get("m_VertexData") or {}
        count = int(vertex.get("m_VertexCount") or 0)
        data = vertex.get("m_DataSize") or b""
        channels = vertex.get("m_Channels") or []
        indices = list(tree.get("m_IndexBuffer") or [])
        if count <= 0 or not isinstance(data, (bytes, bytearray)) or len(data) < count:
            return None
        if len(channels) <= 4 or not indices or len(indices) > 6000:
            return None
        stride = len(data) // count

        def sample(channel: dict[str, Any], index: int) -> list[float] | None:
            fmt, size, scale = MESH_FORMATS.get(int(channel.get("format") or 0), ("f", 4, 1.0))
            dimension = int(channel.get("dimension") or 0)
            if dimension <= 0:
                return None
            start = index * stride + int(channel.get("offset") or 0)
            if start < 0 or start + size * dimension > len(data):
                return None
            values = struct.unpack_from(f"<{fmt * dimension}", data, start)
            return [float(value) / scale for value in values]

        verts: list[list[float]] = []
        uvs: list[list[float]] = []
        for index in range(count):
            position = sample(channels[0], index)
            uv = sample(channels[4], index)
            if position is None or uv is None:
                return None
            verts.append([round(position[0], 4), round(position[1], 4)])
            uvs.append([round(uv[0], 4), round(uv[1], 4)])
        return {
            "name": tree.get("m_Name") or "",
            "verts": verts,
            "uv": uvs,
            "indices": indices,
        }


# -- обход дерева префаба ----------------------------------------------------


def root_transforms(objects: list[ObjectReader[Any]]) -> list[ObjectReader[Any]]:
    transforms = [
        (obj, obj.read()) for obj in objects if obj.type.name in ("Transform", "RectTransform")
    ]
    child_ids = {
        (obj.assets_file.name, child.m_PathID)
        for obj, data in transforms
        for child in getattr(data, "m_Children", []) or []
    }
    return [obj for obj, _ in transforms if (obj.assets_file.name, obj.path_id) not in child_ids]


def walk_game_object(
    exporter: Exporter,
    obj: ObjectReader[Any],
    path: str,
    systems: list[dict[str, Any]],
) -> dict[str, Any]:
    go: GameObject = obj.read()
    name = go.m_Name or "node"
    node_path = f"{path}/{name}" if path else name
    node: dict[str, Any] = {
        "name": name,
        "path": node_path,
        "active": bool(getattr(go, "m_IsActive", True)),
        "components": [],
        "kids": [],
    }
    for pointer in go.m_Components:
        if getattr(pointer, "m_PathID", 0) == 0:
            continue
        component = pointer.read()
        kind = type(component).__name__
        # RectTransform наследует Transform, но UnityPy отдаёт для него
        # отдельный класс: без этой ветки обход обрывался на узлах UI
        # (`static_offset`), и эффекты с частицами внутри такого узла
        # выгружались пустыми — 11 эффектов оставались без систем.
        if kind in ("Transform", "RectTransform"):
            node["pos"] = vec3(component.m_LocalPosition)
            node["rot"] = quat(component.m_LocalRotation)
            node["scale"] = vec3(component.m_LocalScale)
            for child in component.m_Children:
                child_transform = child.deref().read()
                child_go = child_transform.m_GameObject.deref()
                node["kids"].append(
                    walk_game_object(exporter, child_go, node_path, systems)
                )
        elif kind == "ParticleSystem":
            data = exporter.particle_system(component, node_path, pointer.m_PathID)
            systems.append(data)
            node["components"].append({"type": "particles"})
        elif kind == "ParticleSystemRenderer":
            node["components"].append({"type": "ParticleSystemRenderer"})
        elif kind == "MeshRenderer":
            node["components"].append(
                {
                    "type": "MeshRenderer",
                    "materials": [
                        exporter.export_material(pointer)
                        for pointer in component.m_Materials
                        if getattr(pointer, "m_PathID", 0)
                    ],
                }
            )
        elif kind == "MeshFilter":
            mesh = exporter.mesh(getattr(component, "m_Mesh", None))
            if mesh is not None:
                node["components"].append({"type": "MeshFilter", "mesh": mesh})
        elif kind == "MonoBehaviour":
            # Дерево читается у ObjectReader, а не у прочитанного компонента:
            # у `MonoBehaviour` нет `read_typetree`, и раньше все поля
            # выгружались пустыми (`fields: null`, `script: null`).
            try:
                tree = pointer.read_typetree()
            except Exception:
                tree = None
            node["components"].append(
                {
                    "type": "behaviour",
                    "script": (tree or {}).get("m_Script"),
                    "fields": tree,
                }
            )
    return node


# -- основной проход ---------------------------------------------------------


async def export_bundle(stem: str, client: Any, out_root: Path) -> dict[str, Any]:
    asset = next(
        (
            name
            for name in client.asset_to_bundle
            if name.startswith("avg/effects/") and name.rsplit("/", 1)[-1] == stem
        ),
        f"avg/effects/background/{stem}",
    )
    bundle = client.asset_to_bundle.get(asset, f"{asset}.ab")
    path = await client.fetch_asset_bundle(bundle)

    # Имена SerializedFile самого бандла: в env с anon-файлами лежат ещё шейдеры
    # и чужие префабы, обходить их не нужно.
    own_files = {
        obj.assets_file.name for obj in UnityPy.load(path).objects
    }
    env = UnityPy.load(*client.anon_paths, path)
    objects = [
        obj for obj in env.objects if obj.assets_file.name in own_files
    ]
    out_dir = out_root / stem
    out_dir.mkdir(parents=True, exist_ok=True)
    # повторный прогон не должен оставлять текстуры прошлой версии
    for stale in out_dir.glob("*.webp"):
        stale.unlink()
    exporter = Exporter(env, out_dir, objects)

    systems: list[dict[str, Any]] = []
    roots: list[dict[str, Any]] = []

    # Бандлы `avg/effects/battle/*` — общая библиотека на сотни префабов.
    # Нужный лежит в контейнере бандла: `dyn/avg/effects/.../<stem>.prefab`.
    entry = next(
        (
            key
            for key in env.container
            if key.lower().endswith(f"/{stem}.prefab")
            or key.lower() == f"{stem}.prefab"
        ),
        None,
    )
    if entry is not None:
        reader = env.container[entry]
        if reader.type.name == "GameObject":
            roots.append(walk_game_object(exporter, reader, "", systems))

    if not roots:
        for transform in root_transforms(objects):
            go = transform.read().m_GameObject.deref()
            roots.append(walk_game_object(exporter, go, "", systems))

    # Анимации клипов: квады вращаются/раскрываются, а не стоят.
    animations: list[dict[str, Any]] = []
    for obj in objects:
        if obj.type.name != "AnimationClip":
            continue
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        curves = clip_animations(tree)
        if not curves:
            continue
        animations.append(
            {
                "name": tree.get("m_Name") or "",
                "stop": round(float((tree.get("m_MuscleClip") or {}).get("m_StopTime") or 0), 4),
                "sampleRate": round(float(tree.get("m_SampleRate") or 30), 2),
                "curves": curves,
            }
        )

    # Контроллер эффекта (`_effectDuration`, `_fadeType`) — общая длительность
    # и тип затухания, по ним анимируются квады `MeshRenderer`.
    effects: list[dict[str, Any]] = []
    for obj in objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            tree = obj.read_typetree()
        except Exception:
            continue
        if "_effectDuration" not in tree:
            continue
        effects.append(
            {
                "duration": round(float(tree.get("_effectDuration") or 0), 4),
                "fadeType": int(tree.get("_fadeType") or 0),
                "loop": int(tree.get("_isLoop") or 0),
            }
        )

    # Меши квадов: одна и та же геометрия нужна нескольким узлам
    # (`sunshine_01/02/03` делят `AVG_plane_06`), поэтому храним её один раз.
    meshes: dict[str, Any] = {}

    def collect_meshes(node: dict[str, Any]) -> None:
        for component in node["components"]:
            if component.get("type") != "MeshFilter":
                continue
            mesh = component.get("mesh")
            if not isinstance(mesh, dict):
                continue
            name = mesh.get("name") or ""
            meshes.setdefault(name, {"v": mesh["verts"], "uv": mesh["uv"], "idx": mesh["indices"]})
            component["mesh"] = name
        for kid in node.get("kids") or []:
            collect_meshes(kid)

    for root in roots:
        collect_meshes(root)

    durations = [s["duration"] for s in systems if s.get("duration")]
    index = {
        "stem": stem,
        "bundle": bundle,
        "version": 1,
        "duration": max(durations) if durations else 0,
        "loop": all(s.get("loop", True) for s in systems) if systems else True,
        "prefabs": roots,
        "systems": systems,
        "effects": effects,
        "animations": animations,
        "meshes": meshes,
        "materials": {name: record for name, record in exporter.materials.items() if record},
        "images": exporter.images,
    }
    (out_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    total = sum((out_dir / name).stat().st_size for name in exporter.images)
    return {
        "stem": stem,
        "systems": len(systems),
        "materials": len(index["materials"]),
        "images": len(exporter.images),
        "jsonBytes": (out_dir / "index.json").stat().st_size,
        "imageBytes": total,
    }


def latest_res_version() -> str:
    """Свежий res_version с официального конфига (Android)."""
    import json
    from urllib.request import urlopen

    url = "https://ak-conf.hypergryph.com/config/prod/official/Android/version"
    with urlopen(url, timeout=20) as response:  # noqa: S310
        return str(json.loads(response.read().decode("utf-8"))["resVersion"])


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stems", nargs="+", help="имена эффектов, напр. avg_snow_01")
    parser.add_argument("--out", required=True, type=Path, help="каталог выгрузки")
    parser.add_argument("--res", default=None, help="res_version (по умолчанию последняя)")
    args = parser.parse_args()

    install_unity_patches()
    config = torappu.get_config()
    res_version = args.res or latest_res_version()
    client = torappu.Client(
        torappu.Version(client_version="", res_version=res_version),
        None,
        config,
    )
    try:
        await client.init(prefer_cached_manifest=True)
        results = []
        for stem in args.stems:
            results.append(await export_bundle(stem, client, args.out))
        print(json.dumps(results, ensure_ascii=False, indent=2))
    finally:
        await client.aclose()


if __name__ == "__main__":
    anyio.run(main)
