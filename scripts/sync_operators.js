import fs from 'fs';
import path from 'path';

/**
 * Syncs src/data/operator_names_map.json from src/data/operators_database.json
 * Run via: npm run sync:operators
 */

const dbPath = path.resolve('./src/data/operators_database.json');
const outputPath = path.resolve('./src/data/operator_names_map.json');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at ${dbPath}`);
  process.exit(1);
}

try {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const map = {};

  const ruNames = {
    "SilverAsh": "Сильвераш",
    "Amiya": "Амия",
    "Kal'tsit": "Кальцит",
    "Ch'en": "Чэнь",
    "Texas": "Техас",
    "Exusiai": "Эксузай",
    "Lappland": "Лаппланд",
    "Skadi": "Скади",
    "Specter": "Спектр",
    "W": "W",
    "Blaze": "Блейз",
    "Saria": "Сария",
    "Eyjafjalla": "Эйяфьялла",
    "Ifrit": "Ифрит",
    "Mostima": "Мостима",
    "Ceobe": "Цеоба",
    "Bagpipe": "Бэгпайп",
    "Phantom": "Фантом",
    "Surtr": "Суртр",
    "Mudrock": "Мадрок",
    "Mountain": "Маунтин",
    "Thorns": "Торнс",
    "Nearl": "Нирл",
    "Shining": "Шайнинг",
    "Nightingale": "Найтингейл",
    "Hoshiguma": "Хошигума",
    "Siege": "Сидж",
    "Angelina": "Анджелина",
    "Suzuran": "Судзуран",
    "Rosa": "Роса",
    "Ptilopsis": "Птилопсис",
    "Zima": "Зима",
    "Istina": "Истина",
    "Gummy": "Гуми",
    "Vigna": "Винья",
    "Myrtle": "Миртл",
    "Elysium": "Элизиум",
    "Perfumer": "Парфюмер",
    "Gavial": "Гавиал",
    "Cuora": "Куора",
    "Melantha": "Меланта",
    "Kroos": "Крус",
    "Fang": "Фанг",
    "Beagle": "Бигл",
    "Hibiscus": "Гибискус",
    "Ansel": "Ансель",
    "Lava": "Лава",
    "Steward": "Стюард",
    "Adnachiel": "Аднахиэль",
    "Orchid": "Оркид",
    "Plume": "Плюм",
    "Vanilla": "Ванилла",
    "Popukar": "Попукар",
    "Spot": "Спот",
    "Midnight": "Миднайт",
    "Catapult": "Катапульта",
    "Lancet-2": "Ланцет-2",
    "Castle-3": "Кастл-3",
    "Thermal-EX": "Термал-EX",
    "Justice Knight": "Джастис Найт",
    "U-Official": "U-Официал",
    "Friston-3": "Фристон-3",
    "PhonoR-0": "ФоноR-0"
  };

  for (const op of db) {
    const id = op.id || '';
    const nameEn = op.nameEn || op.nameZh || id;
    const nameZh = op.nameZh || '';

    let cleanId = id.toLowerCase()
      .replace(/^char_/, '')
      .replace(/^\d+_/, '')
      .replace(/_[a-z0-9]+$/, '');

    const parts = id.split('_');
    let charNameKey = parts.length > 2 ? parts[2] : parts[1] || id;

    const entry = {
      displayName: nameEn,
      englishName: nameEn,
      chineseName: nameZh,
      russianName: ruNames[nameEn] || nameEn
    };

    if (id) map[id] = entry;
    if (id) map[id.toLowerCase()] = entry;
    if (cleanId) map[cleanId] = entry;
    if (charNameKey) map[charNameKey] = entry;
    const cleanEn = nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanEn) map[cleanEn] = entry;
  }

  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2), 'utf8');
  console.log(`✅ [SYNC SUCCESS] Updated ${outputPath} (${Object.keys(map).length} lookup keys derived from ${db.length} operators)`);
} catch (e) {
  console.error(`❌ [SYNC FAILED] ${e.message}`);
  process.exit(1);
}
