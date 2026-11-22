#!/usr/bin/env python3
"""Собирает CSV-шаблоны перевода для эпизодов, которых ещё нет в `zoot-data`.

Формат совпадает с файлами `translation/<lang>/story/<chapter>/<episode>.csv`:

    ID,Character,Original Text,Reference,Translation
    __translator__,,Translator,,<автор>
    __language__,,Language,en_US,ru_RU
    __episode__,,Episode ID,,<глава>
    __chapter__,,Chapter Name,<путь>,<название>
    ,,,,
    char-1,<имя>,<имя>,<en>,<ru>
    ,,,,
    line-12,,<текст>,<en>,<ru>

Колонка `Translation` остаётся пустой — её заполняет переводчик. Читалка
пропускает пустые переводы и показывает оригинал, поэтому файл можно класть в
репозиторий до перевода.

Пример:

    python3 scripts/build_translation_csv.py \
        --lang ru_RU --chapter act55side \
        --stories /path/to/STORY-SCRIPTS/original/zh_CN/gamedata/story \
        --out /path/to/zoot-data/translation/ru_RU/story/act55side \
        --title "时间啊，向前！"
"""

from __future__ import annotations

import argparse
import csv
import json
import io
import re
from pathlib import Path

TAG_PREFIX = re.compile(
    r"^(\s*(?:\[(?:[^\"'\]]|\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$"
)
NAME = re.compile(r'name="([^"]+)"')
# Текст, который лежит не после тега, а внутри него: его тоже переводят,
# и читалка ищет перевод по точному совпадению `Original Text`.
INNER_TEXT = (
    re.compile(r'\[Subtitle[^\]]*text="([^"]+)"', re.IGNORECASE),
    re.compile(r'\[Sticker[^\]]*text="([^"]+)"', re.IGNORECASE),
    re.compile(r'options="([^"]+)"', re.IGNORECASE),
)


def parse_lines(raw: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for index, line in enumerate(raw.split("\n")):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("//") or trimmed.upper().startswith("[HEADER"):
            continue
        match = TAG_PREFIX.match(line)
        prefix, text = (match.group(1), match.group(2)) if match else ("", line)
        if re.search(r"\[delay\b", prefix, re.IGNORECASE):
            continue
        text = text.strip()
        if not text:
            for pattern in INNER_TEXT:
                match = pattern.search(prefix)
                if match:
                    text = match.group(1)
                    break
        if not text:
            continue
        rows.append({"id": f"line-{index}", "name": NAME.search(line).group(1) if NAME.search(line) else "", "text": text})
    return rows


def build_csv(source: str, reference: str, chapter: str, episode: str, title: str) -> str:
    lines = parse_lines(source)
    reference_lines = parse_lines(reference)
    reference_by_id = {row["id"]: row["text"] for row in reference_lines}

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(["ID", "Character", "Original Text", "Reference", "Translation"])
    writer.writerow(["__translator__", "", "Translator", "", "tbd"])
    writer.writerow(["__language__", "", "Language", "en_US", "ru_RU"])
    writer.writerow(["__episode__", "", "Episode ID", "", chapter])
    writer.writerow(["__chapter__", "", "Chapter Name", f"activities/{chapter}/{episode}", title])
    writer.writerow(["", "", "", "", ""])

    seen: dict[str, int] = {}
    for row in lines:
        name = row["name"]
        if name and name not in seen:
            seen[name] = len(seen) + 1
    for name, number in seen.items():
        writer.writerow([f"char-{number}", name, name, "", ""])
    if seen:
        writer.writerow(["", "", "", "", ""])

    for row in lines:
        writer.writerow([row["id"], row["name"], row["text"], reference_by_id.get(row["id"], ""), ""])
    return buffer.getvalue()


def episode_folder(base: str) -> str:
    """`level_act55side_st01` → `act55side`, `story_amiya_1_1` → `memory`."""
    if base.startswith("level_"):
        return base[len("level_"):].split("_", 1)[0]
    if base.startswith("story_"):
        return "memory"
    return "misc"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", default="ru_RU")
    parser.add_argument("--chapter", default=None, help="каталог главы, например act55side")
    parser.add_argument("--stories", required=True, type=Path, help=".../zh_CN/gamedata/story")
    parser.add_argument("--reference", type=Path, default=None, help=".../en_US/gamedata/story")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--title", default="")
    parser.add_argument("--titles", type=Path, default=None, help="JSON storyTxt → название")
    parser.add_argument(
        "--missing",
        action="store_true",
        help="только сценарии без CSV (обходит весь каталог сценариев)",
    )
    args = parser.parse_args()

    titles: dict[str, str] = {}
    if args.titles and args.titles.exists():
        titles = json.loads(args.titles.read_text(encoding="utf-8"))

    args.out.mkdir(parents=True, exist_ok=True)

    if args.missing:
        files = sorted(args.stories.glob("**/level_*.txt"))
        # Имена всех уже существующих CSV (с суффиксом переводчика).
        bases = {csv_path.stem for csv_path in args.out.glob("**/*.csv")}
        total = 0
        for path in files:
            base = path.stem
            if any(name == base or name.startswith(base + "_") for name in bases):
                continue
            relative = path.relative_to(args.stories).with_suffix("").as_posix()
            reference = ""
            if args.reference:
                candidate = args.reference / f"{relative}.txt"
                if candidate.exists():
                    reference = candidate.read_text(encoding="utf-8")
            payload = build_csv(
                path.read_text(encoding="utf-8"),
                reference,
                episode_folder(base),
                base,
                titles.get(relative, args.title),
            )
            target = args.out / episode_folder(base) / f"{base}.csv"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(payload, encoding="utf-8", newline="")
            total += 1
        print(f"готово: {total} шаблонов в {args.out}")
        return

    if not args.chapter:
        raise SystemExit("нужен --chapter или --missing")
    source_dir = args.stories / "activities" / args.chapter
    files = sorted(source_dir.glob("*.txt"))
    if not files:
        raise SystemExit(f"нет сценариев в {source_dir}")

    total = 0
    for path in files:
        episode = path.stem
        reference = ""
        if args.reference:
            candidate = args.reference / "activities" / args.chapter / f"{episode}.txt"
            if candidate.exists():
                reference = candidate.read_text(encoding="utf-8")
        payload = build_csv(path.read_text(encoding="utf-8"), reference, args.chapter, episode, args.title)
        (args.out / f"{episode}.csv").write_text(payload, encoding="utf-8", newline="")
        total += 1
    print(f"готово: {total} файлов в {args.out}")


if __name__ == "__main__":
    main()
