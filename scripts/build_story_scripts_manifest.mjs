/**
 * Собирает список всех сценариев игры для фоновой синхронизации текста.
 *
 * Приложение не хранит тексты у себя: оно лишь знает пути и качает файлы
 * с torappu/raw GitHub в локальный кэш. Список путей вшивается в приложение,
 * чтобы не запрашивать дерево репозитория на каждом запуске.
 *
 * Запуск:
 *   npm run sync:story-scripts
 *   STORY_SCRIPTS_DIR=/path/to/gamedata/story npm run sync:story-scripts
 */
import fs from 'node:fs';
import path from 'node:path';

const root =
  process.env.STORY_SCRIPTS_DIR ||
  path.resolve('../STORY-SCRIPTS/original/zh_CN/gamedata/story');
const outFile = path.resolve('public/data/archive/story/scripts.json');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
      const relative = path.relative(root, full).split(path.sep).join('/');
      acc.push(relative.replace(/\.txt$/i, ''));
    }
  }
  return acc;
}

if (!fs.existsSync(root)) {
  console.warn(`⚠️  Каталог сценариев не найден: ${root}`);
  console.warn('   Манифест не изменён (в CI каталога может не быть).');
  process.exit(0);
}

const files = walk(root).sort();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: files.length,
      // Пути одинаковы для официальных языков; русский — это zh_CN + CSV-overlay.
      sourceLanguage: 'zh_CN',
      baseLanguages: ['zh_CN', 'en_US', 'ja_JP', 'ko_KR'],
      russianOverlay: true,
      files,
    },
    null,
    0
  )
);

console.log(`✅ ${outFile} — ${files.length} сценариев (${(fs.statSync(outFile).size / 1024).toFixed(0)} КБ)`);
