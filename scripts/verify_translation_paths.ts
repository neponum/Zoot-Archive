/**
 * Проверяет, что загрузчик находит переводы после раскладки zoot-data по папкам эпизодов.
 *
 * Прогон: npx tsx scripts/verify_translation_paths.ts [путь-к-клону-zoot-data]
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getTranslationCsvCandidates } from '../src/utils/translationPaths';
import type { Language } from '../src/types';

const RAW_PREFIX = 'https://raw.githubusercontent.com/neponum/zoot-data/main';
const LANG: Language = 'ru_RU';
const REPO = process.argv[2] || '/media/num/Something/NUM/ZOOT-DATA';
const LANG_DIR = join(REPO, 'translation', LANG);

function toLocalPath(url: string): string {
  return join(REPO, url.replace(`${RAW_PREFIX}/`, ''));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.csv')) out.push(full);
  }
  return out;
}

/** Имя файла в репозитории: story/<episode>/<storyBaseName>_<translator>.csv */
function splitFileName(fileName: string): { episode: string; bareName: string; suffix: string } {
  const parts = fileName.split('/');
  // До 2026-11-19 эпизоды лежали прямо в корне языковой папки.
  const episode = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
  const file = parts[parts.length - 1];
  const stem = file.replace(/\.csv$/, '');
  const match = stem.match(/_(neksi0762|frostymisery17|naoshka_v|ilarhion|num4ar|nep0num|neponum|vendigo|myshanin)$/);
  return {
    episode,
    bareName: match ? stem.slice(0, -(match[0].length)) : stem,
    suffix: match ? match[0] : '',
  };
}

// Только сюжетные переводы: dossiers/ и voices/ загрузчик читает иначе.
const STORY_DIR = join(LANG_DIR, 'story');
const files = walk(existsSync(STORY_DIR) ? STORY_DIR : LANG_DIR);
const missing: string[] = [];
const notFirstCandidate: string[] = [];
const episodes = new Set<string>();

for (const file of files) {
  const name = file.slice((existsSync(STORY_DIR) ? STORY_DIR : LANG_DIR).length + 1);
  const { episode, bareName, suffix } = splitFileName(name);
  episodes.add(episode);

  const candidates = getTranslationCsvCandidates(LANG, bareName, suffix);
  if (!candidates.some(c => existsSync(toLocalPath(c)))) missing.push(name);
  else if (candidates[0] !== `${RAW_PREFIX}/translation/${LANG}/story/${name}`)
    notFirstCandidate.push(name);
}

console.log(`Репозиторий: ${REPO}`);
console.log(`Файлов: ${files.length}, папок эпизодов: ${episodes.size}`);
console.log(`Не найдено загрузчиком: ${missing.length}`);
if (missing.length) console.log(missing.slice(0, 20).join('\n'));
console.log(`Найдено не по первому кандидату (нужен фолбэк): ${notFirstCandidate.length}`);
if (notFirstCandidate.length) console.log(notFirstCandidate.slice(0, 20).join('\n'));

if (missing.length > 0) process.exit(1);

// Файлы без метаданных переводчика — отдельный сигнал качества.
const headerless = files.filter(f => !readFileSync(f, 'utf8').slice(0, 200).includes('__translator__'));
console.log(`Без строки __translator__: ${headerless.length}`);