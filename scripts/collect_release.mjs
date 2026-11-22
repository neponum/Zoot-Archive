#!/usr/bin/env node
/**
 * Собирает готовые артефакты в `release/` и считает SHA-256.
 *
 * Запуск после `npm run android:apk`:
 *   node scripts/collect_release.mjs
 *
 * В релиз GitHub кладём ровно эти файлы плюс SHA256SUMS.txt: подписи нет,
 * поэтому хэши — единственный способ проверить загрузку.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'release');

const SOURCES = [
  {
    dir: join(root, 'android/app/build/outputs/apk/debug'),
    match: (name) => name.endsWith('.apk'),
    rename: 'rhodes-android-beta.apk',
  },
];

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const collected = [];

for (const source of SOURCES) {
  if (!existsSync(source.dir)) continue;
  for (const name of readdirSync(source.dir)) {
    if (!source.match(name)) continue;
    const from = join(source.dir, name);
    const to = join(outDir, source.rename ?? basename(name));
    copyFileSync(from, to);
    collected.push(to);
  }
}

if (collected.length === 0) {
  console.error('Нечего собирать: сначала выполните сборку приложений.');
  process.exit(1);
}

const lines = collected
  .sort()
  .map((file) => `${sha256(file)}  ${basename(file)}`);

writeFileSync(join(outDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);

console.log(`Собрано файлов: ${collected.length}`);
for (const line of lines) console.log(`  ${line}`);
