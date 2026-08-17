import operatorNamesMapRaw from '../data/operator_names_map.json';

export function getCleanOperatorName(rawName: string | undefined): string {
  if (!rawName) return '';
  let cleaned = rawName.trim();
  cleaned = cleaned.replace(/[\s\-_]*(?:\(Set\s*\d+\)|Set\s*\d+|\(Record\s*\d+\)|Record\s*\d+|\(Story\s*\d+\)|Story\s*\d+|档案\d+|记录\d+|密录\d+|[\-_]\s*\d+)$/i, '');
  cleaned = cleaned.replace(/[\s\-_]+(?:Set|Record|Story|档案|记录|密录)?[\s\-_]*\d+$/i, '');
  return cleaned.trim();
}

export interface OperatorDetails {
  displayName: string;
  englishName: string;
  chineseName: string;
  russianName?: string;
}

export function extractOperatorKey(id: string): string {
  if (!id) return '';
  let cleanId = id.toLowerCase().trim();
  
  if (cleanId.startsWith('operator_')) {
    cleanId = cleanId.substring('operator_'.length);
  }

  // Remove story_, or_, set_, record_
  cleanId = cleanId.replace(/^(story_|or_|set_|record_)/, '');
  
  // Remove trailing set/record/story suffixes
  cleanId = cleanId.replace(/(_set_?\d+|_record_?\d+|_set|_record|_story_?\d+|_story)$/, '');

  // Remove char_ ID prefixes if present
  cleanId = cleanId.replace(/^char_\d+_?/, '').replace(/^char_/, '').replace(/^\d+_/, '');

  const parts = cleanId.split('_');
  return parts[0] || cleanId;
}

export function isOperatorEpisode(epOrId: any): boolean {
  if (!epOrId) return false;
  const id = typeof epOrId === 'string' ? epOrId : (epOrId.id || '');
  const entryType = typeof epOrId === 'object' ? epOrId.entryType : undefined;

  if (entryType === 'NONE') return true;

  const lower = id.toLowerCase().trim();
  return lower.startsWith('operator_') ||
         lower.startsWith('or_') ||
         lower.startsWith('set_') ||
         lower.startsWith('story_') ||
         lower.startsWith('record_') ||
         lower.startsWith('char_') ||
         lower.includes('_set_') ||
         lower.includes('_record_');
}

export const PROFESSION_NAMES: Record<string, { ru: string; en: string; iconColor: string }> = {
  PIONEER: { ru: 'Авангард', en: 'Vanguard', iconColor: 'emerald' },
  WARRIOR: { ru: 'Гвардеец', en: 'Guard', iconColor: 'rose' },
  SNIPER: { ru: 'Снайпер', en: 'Sniper', iconColor: 'sky' },
  TANK: { ru: 'Защитник', en: 'Defender', iconColor: 'amber' },
  MEDIC: { ru: 'Медик', en: 'Medic', iconColor: 'teal' },
  SUPPORT: { ru: 'Поддержка', en: 'Supporter', iconColor: 'violet' },
  CASTER: { ru: 'Заклинатель', en: 'Caster', iconColor: 'blue' },
  SPECIAL: { ru: 'Специалист', en: 'Specialist', iconColor: 'fuchsia' },
};

export const FACTION_NAMES: Record<string, { ru: string; en: string }> = {
  rhodes: { ru: 'Родос Айленд', en: 'Rhodes Island' },
  yan: { ru: 'Ян', en: 'Yan' },
  lungmen: { ru: 'Лунмэнь', en: 'Lungmen' },
  victoria: { ru: 'Виктория', en: 'Victoria' },
  kazimierz: { ru: 'Казимеж', en: 'Kazimierz' },
  leithanien: { ru: 'Лейтания', en: 'Leithanien' },
  ursus: { ru: 'Урсус', en: 'Ursus' },
  siracusa: { ru: 'Сиракуза', en: 'Siracusa' },
  columbia: { ru: 'Колумбия', en: 'Columbia' },
  laterano: { ru: 'Латерано', en: 'Laterano' },
  iberia: { ru: 'Иберия', en: 'Iberia' },
  sami: { ru: 'Сами', en: 'Sami' },
  kjerag: { ru: 'Кьераг', en: 'Kjerag' },
  higashi: { ru: 'Хигаси', en: 'Higashi' },
  minos: { ru: 'Минос', en: 'Minos' },
  sargon: { ru: 'Саргон', en: 'Sargon' },
  abyssal: { ru: 'Охотники Бездны', en: 'Abyssal Hunters' },
  babel: { ru: 'Вавилон', en: 'Babel' },
  rim: { ru: 'Рим Биллитон', en: 'Rim Billiton' },
  siesta: { ru: 'Сиеста', en: 'Siesta' },
  bs: { ru: 'Blacksteel Worldwide', en: 'Blacksteel Worldwide' },
  penguin: { ru: 'Penguin Logistics', en: 'Penguin Logistics' },
  lee: { ru: 'Детективное агентство Ли', en: "Lee's Detective Agency" },
  karlan: { ru: 'Карлан Коммершиал', en: 'Karlan Commercial' },
  glasgow: { ru: 'Банда Глазго', en: 'Glasgow Gang' },
  dublinn: { ru: 'Дублинн', en: 'Dublinn' },
  reunion: { ru: 'Воссоединение', en: 'Reunion' },
};

export const HANDBOOK_TITLE_MAP: Record<string, string> = {
  // English titles
  'Basic Info': 'Базовые данные',
  'Physical Exam': 'Физический осмотр',
  'Performance Review': 'Проверка характеристик',
  'Profile': 'Личное дело',
  'Clinical Analysis': 'Клинический анализ',
  'Archive File 1': 'Архивный файл I',
  'Archive File 2': 'Архивный файл II',
  'Archive File 3': 'Архивный файл III',
  'Archive File 4': 'Архивный файл IV',
  'Promotion Record': 'Запись о повышении',
  'Class Conversion Record 1': 'Запись о смене класса I',
  'Class Conversion Record 2': 'Запись о смене класса II',
  'Class Conversion Record': 'Запись о смене класса',
  'Trust File': 'Архив доверия',
  'Special Record': 'Специальная запись',

  // Chinese titles
  '基础档案': 'Базовые данные',
  '综合体检': 'Физический осмотр',
  '综合体检测试': 'Физический осмотр',
  '综合性能检测结果': 'Проверка характеристик',
  '客观履历': 'Личное дело',
  '个人档案': 'Личное дело',
  '干员档案': 'Личное дело',
  '临床诊断分析': 'Клинический анализ',
  '临床诊断': 'Клинический анализ',
  '档案资料一': 'Архивный файл I',
  '档案资料二': 'Архивный файл II',
  '档案资料三': 'Архивный файл III',
  '档案资料四': 'Архивный файл IV',
  '档案资料1': 'Архивный файл I',
  '档案资料2': 'Архивный файл II',
  '档案资料3': 'Архивный файл III',
  '档案资料4': 'Архивный файл IV',
  '档案资料（一）': 'Архивный файл I',
  '档案资料（二）': 'Архивный файл II',
  '档案资料（三）': 'Архивный файл III',
  '档案资料（四）': 'Архивный файл IV',
  '晋升记录': 'Запись о повышении',
  '晋升资料': 'Запись о повышении',
  '升变记录一': 'Запись о смене класса I',
  '升变记录二': 'Запись о смене класса II',
  '升变记录': 'Запись о смене класса',
  '升变资料': 'Запись о смене класса',
  '信赖档案': 'Архив доверия',
  '附加记录': 'Специальная запись',
  '特殊记录': 'Специальная запись',
};

export function getCanonicalHandbookTitle(rawTitle: string | undefined, lang: string = 'ru_RU'): string {
  if (!rawTitle) return '';
  const isRu = lang === 'ru_RU' || lang === 'ru_RU_CN';
  if (!isRu) return rawTitle;

  const cleaned = rawTitle.replace(/[【】\[\]]/g, '').trim();

  if (HANDBOOK_TITLE_MAP[cleaned]) {
    return HANDBOOK_TITLE_MAP[cleaned];
  }

  const lower = cleaned.toLowerCase();
  for (const [key, val] of Object.entries(HANDBOOK_TITLE_MAP)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase()) || cleaned.includes(key)) {
      return val;
    }
  }

  // Regex checks for numbers
  if (/archive\s*file\s*1|档案资料[一1]/i.test(cleaned)) return 'Архивный файл I';
  if (/archive\s*file\s*2|档案资料[二2]/i.test(cleaned)) return 'Архивный файл II';
  if (/archive\s*file\s*3|档案资料[三3]/i.test(cleaned)) return 'Архивный файл III';
  if (/archive\s*file\s*4|档案资料[四4]/i.test(cleaned)) return 'Архивный файл IV';
  if (/basic\s*info|基础/i.test(cleaned)) return 'Базовые данные';
  if (/physical|体检|性能/i.test(cleaned)) return 'Физический осмотр';
  if (/clinical|诊断/i.test(cleaned)) return 'Клинический анализ';
  if (/profile|履历|档案/i.test(cleaned)) return 'Личное дело';
  if (/promotion|晋升/i.test(cleaned)) return 'Запись о повышении';
  if (/conversion|升变/i.test(cleaned)) return 'Запись о смене класса';

  return rawTitle;
}

export const OPERATOR_NAME_MAP: Record<string, OperatorDetails> = (operatorNamesMapRaw as unknown) as Record<string, OperatorDetails>;

export function getOperatorRussianName(charId: string, nameEn: string): string {
  const cleanId = extractOperatorKey(charId);
  const cleanEn = nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCharId = charId.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (OPERATOR_NAME_MAP[charId]?.russianName) return OPERATOR_NAME_MAP[charId].russianName!;
  if (OPERATOR_NAME_MAP[cleanCharId]?.russianName) return OPERATOR_NAME_MAP[cleanCharId].russianName!;
  if (OPERATOR_NAME_MAP[cleanId]?.russianName) return OPERATOR_NAME_MAP[cleanId].russianName!;
  if (OPERATOR_NAME_MAP[cleanEn]?.russianName) return OPERATOR_NAME_MAP[cleanEn].russianName!;
  if (OPERATOR_NAME_MAP[nameEn.toLowerCase()]?.russianName) return OPERATOR_NAME_MAP[nameEn.toLowerCase()].russianName!;

  return nameEn;
}

export function getOperatorDetails(opKey: string, lang: string = 'ru_RU'): { displayName: string; englishName: string; chineseName: string } {
  const cleanKey = extractOperatorKey(opKey);
  const info = OPERATOR_NAME_MAP[cleanKey] || OPERATOR_NAME_MAP[opKey.toLowerCase()] || OPERATOR_NAME_MAP[opKey.toLowerCase().replace(/[^a-z0-9]/g, '')];

  const formattedFallback = cleanKey.length > 0 ? (cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)) : 'Operator';

  if (!info) {
    return {
      displayName: formattedFallback,
      englishName: formattedFallback,
      chineseName: '',
    };
  }

  const isRussian = lang === 'ru_RU' || lang === 'ru_RU_CN';
  const isChinese = lang === 'zh_CN';

  let displayName = info.englishName;
  if (isRussian && info.russianName) {
    displayName = info.russianName;
  } else if (isChinese && info.chineseName) {
    displayName = info.chineseName;
  }

  return {
    displayName: displayName || info.englishName || formattedFallback,
    englishName: info.englishName || formattedFallback,
    chineseName: info.chineseName || '',
  };
}
