#!/usr/bin/env bash
# Переносит свежую выгрузку avgfx в zoot-data.
# Использование: scripts/avgfx/sync_export.sh /tmp/opencode/avgfx-new
set -euo pipefail

SRC="${1:?укажите каталог выгрузки}"
DST="${2:-/media/num/Something/NUM/ZOOT-DATA/avgfx}"

if [ ! -f "$SRC/avg_snow_01/index.json" ]; then
  echo "в $SRC нет выгрузки (нет avg_snow_01/index.json)" >&2
  exit 1
fi

count=$(find "$SRC" -maxdepth 2 -name index.json | wc -l)
echo "эффектов в выгрузке: $count"

rm -rf "$DST"
mkdir -p "$DST"
# Копируем только каталоги эффектов: логи и скрипты рядом с выгрузкой
# не должны попадать в zoot-data (иначе экспорт примет их за stem).
find "$SRC" -maxdepth 1 -type d -name 'avg_*' -exec cp -r {} "$DST"/ \;

echo "готово: $(find "$DST" -maxdepth 2 -name index.json | wc -l) index.json"
du -sh "$DST"
