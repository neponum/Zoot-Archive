#!/usr/bin/env node
/**
 * Собирает галерею «ключевых изображений» глав для панели CHAPTER RECOLLECTION.
 *
 * Источник — таблица `stage_table.json`:
 *   - `cgGalleryGroups`   — какие изображения относятся к главе (по setId);
 *   - `cgGalleryDisplays` — подпись, сцена и состав изображения;
 *   - `cgGalleryCgs`      — склейки (VERTICAL/HORIZONTAL) из нескольких файлов.
 *
 * Берём CN-таблицу (она полнее), а подписи подставляем из EN, если они есть.
 * Файлы арта лежат на torappu.prts.wiki: `assets/avg/images/` или
 * `assets/avg/background/` в зависимости от `cgSource`.
 *
 * Результат — `public/data/archive/story/gallery.json`, который карта
 * подгружает лениво при открытии панели.
 *
 * Запуск: npm run sync:story-gallery
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outFile = path.join(
  projectRoot,
  'public/data/archive/story/gallery.json'
);

const GAMEDATA =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master';
const cacheDir = path.join(os.tmpdir(), 'zoot-gamedata');

async function fetchText(url, cache) {
  const file = path.join(cacheDir, cache);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

const load = async (branch, name) =>
  JSON.parse(
    await fetchText(
      `${GAMEDATA}/${branch}/gamedata/excel/${name}`,
      `${name.replace(/\.json$/, '')}_${branch}.json`
    )
  );

async function main() {
  const [cn, en] = await Promise.all([
    load('cn', 'stage_table.json'),
    load('en', 'stage_table.json'),
  ]);

  const enDisplays = en.cgGalleryDisplays ?? {};
  const groups = cn.cgGalleryGroups ?? {};
  const displays = cn.cgGalleryDisplays ?? {};
  const cgs = cn.cgGalleryCgs ?? {};

  const sets = {};
  let total = 0;

  for (const [setId, group] of Object.entries(groups)) {
    const items = [];
    for (const displayId of group.displays ?? []) {
      const display = displays[displayId];
      if (!display) continue;

      const source = display.cgSource === 'BACKGROUND' ? 'background' : 'images';
      const localised = enDisplays[displayId];
      const composite = cgs[display.cgList[0]];

      let imgs;
      let layout = 'N';
      if (composite?.compositeList?.length) {
        layout = composite.compositeType === 'HORIZONTAL' ? 'H' : 'V';
        imgs = composite.compositeList.map((piece) => ({
          id: String(piece.cgId).toLowerCase(),
          w: piece.width,
          h: piece.height,
        }));
      } else {
        // В `cgList` может быть несколько кадров одной и той же сцены
        // (анимация/варианты). Галерея в игре показывает по одному
        // изображению на запись, поэтому берём первый кадр.
        imgs = [{ id: String(display.cgList[0]).toLowerCase() }];
      }

      const item = {
        n: localised?.displayName || display.displayName || '',
        s: display.relatedStoryId || '',
        src: source,
        t: layout,
        imgs,
      };
      items.push(item);
      total += 1;
    }
    if (items.length) sets[setId] = items;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sets,
  };

  fs.writeFileSync(outFile, `${JSON.stringify(payload)}\n`, 'utf8');
  process.stdout.write(
    `✨ Галерея: ${Object.keys(sets).length} глав, ${total} изображений → ${path.relative(
      projectRoot,
      outFile
    )}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
