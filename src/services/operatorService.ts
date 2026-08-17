import { Language, OperatorData, OperatorHandbookSection, StoryEpisode } from '../types';
import { getOperatorRussianName, PROFESSION_NAMES, FACTION_NAMES, HANDBOOK_TITLE_MAP, getCanonicalHandbookTitle } from '../utils/operatorUtils';
import { fetchChapterList } from './storyService';

export interface ParsedDossierItem {
  key: string;
  label: string;
  value: string;
}

export interface ParsedDossierSection {
  title: string;
  originalTitle: string;
  type: 'basic' | 'exam' | 'clinical' | 'archive' | 'record' | 'text';
  items?: ParsedDossierItem[];
  rawText: string;
}

export interface EnrichedOperator extends OperatorData {
  avatarUrl: string;
  portraitUrl: string;
  displayName: string;
  professionName: string;
  factionName: string;
  positionName: string;
  hasStories: boolean;
  parsedHandbook: ParsedDossierSection[];
}

let rawDatabasePromise: Promise<OperatorData[]> | null = null;
let cachedByLang: Record<string, EnrichedOperator[]> = {};

const GITHUB_HANDBOOK_URLS: Record<string, string> = {
  zh_CN: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/json/gamedata/zh_CN/gamedata/excel/handbook_info_table.json',
  en_US: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/json/gamedata/en_US/gamedata/excel/handbook_info_table.json',
};

const TITLE_TRANSLATIONS: Record<string, string> = {
  '基础档案': 'Basic Info',
  '综合性能检测结果': 'Physical Exam',
  '客观履历': 'Profile',
  '档案资料一': 'Archive File 1',
  '档案资料二': 'Archive File 2',
  '档案资料三': 'Archive File 3',
  '档案资料四': 'Archive File 4',
  '晋升记录': 'Promotion Record',
  '临床诊断分析': 'Clinical Analysis',
  '能力测试': 'Ability Check'
};

const cachedHandbookDicts: Record<string, any> = {};
const handbookFetchPromises: Record<string, Promise<any>> = {};

/**
 * Downloads or retrieves handbook dict for a specified game language from GitHub
 */
export async function fetchHandbookTable(langKey: 'zh_CN' | 'en_US'): Promise<any> {
  if (cachedHandbookDicts[langKey]) {
    return cachedHandbookDicts[langKey];
  }

  if (handbookFetchPromises[langKey]) {
    return handbookFetchPromises[langKey];
  }

  const url = GITHUB_HANDBOOK_URLS[langKey] || GITHUB_HANDBOOK_URLS.en_US;

  handbookFetchPromises[langKey] = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(data => {
      const dict = data.handbookDict || {};
      cachedHandbookDicts[langKey] = dict;
      return dict;
    })
    .catch(err => {
      console.warn(`Failed to fetch handbook table for ${langKey} from GitHub:`, err);
      delete handbookFetchPromises[langKey];
      return {};
    });

  return handbookFetchPromises[langKey];
}

/**
 * Dynamically fetches and parses handbook for a specific operator on demand from GitHub RAW
 */
export async function fetchOperatorHandbookAsync(
  opId: string,
  uiLang: Language = 'ru_RU'
): Promise<OperatorHandbookSection[]> {
  try {
    const [zhDict, enDict] = await Promise.all([
      fetchHandbookTable('zh_CN'),
      fetchHandbookTable('en_US')
    ]);

    const hz = zhDict ? zhDict[opId] : null;
    const he = enDict ? enDict[opId] : null;

    if (!hz && !he) return [];

    const handbookSections: OperatorHandbookSection[] = [];
    const storyTextAudio = hz?.storyTextAudio || he?.storyTextAudio || [];

    storyTextAudio.forEach((s: any, idx: number) => {
      const sEn = he && he.storyTextAudio ? he.storyTextAudio[idx] : null;
      const sZh = hz && hz.storyTextAudio ? hz.storyTextAudio[idx] : null;

      const titleZh = (sZh && sZh.storyTitle) || (s && s.storyTitle) || '';
      const titleEn = (sEn && sEn.storyTitle) || TITLE_TRANSLATIONS[titleZh] || titleZh;
      const textZh = (sZh && sZh.stories && sZh.stories[0] && sZh.stories[0].storyText) || (s.stories && s.stories[0] && s.stories[0].storyText) || '';
      const textEn = (sEn && sEn.stories && sEn.stories[0] && sEn.stories[0].storyText) || '';

      handbookSections.push({
        titleZh,
        titleEn,
        textZh,
        textEn
      });
    });

    return handbookSections;
  } catch (err) {
    console.warn('Failed to load operator handbook on demand:', err);
    return [];
  }
}

async function loadRawDatabase(): Promise<OperatorData[]> {
  if (!rawDatabasePromise) {
    rawDatabasePromise = import('../data/operators_database.json').then((m) => (m.default || m) as OperatorData[]);
  }
  return rawDatabasePromise;
}

/**
 * Returns all playable operators with their dossier info and linked story episodes.
 */
export async function getOperatorsList(uiLang: Language = 'ru_RU'): Promise<EnrichedOperator[]> {
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  const isZh = uiLang === 'zh_CN';
  const langKey = `${uiLang}`;

  if (cachedByLang[langKey]) {
    return cachedByLang[langKey];
  }

  // Load raw database dynamically
  const rawOperatorsData = await loadRawDatabase();

  // Fetch story episodes to connect operator paradox simulations
  let episodes: StoryEpisode[] = [];
  try {
    episodes = await fetchChapterList();
  } catch (err) {
    console.warn('Failed to load story episodes for operators:', err);
  }

  // Build a map of operator stories
  const operatorStoriesMap = new Map<string, StoryEpisode>();
  for (const ep of episodes) {
    if (ep.entryType === 'MAINLINE' || ep.entryType === 'ACTIVITY' || ep.entryType === 'MINI') continue;
    const isOp = ep.entryType === 'NONE' || ep.id.startsWith('operator_') || ep.id.startsWith('or_') || ep.id.startsWith('set_') || ep.id.startsWith('story_') || ep.id.includes('_set_') || ep.id.includes('_record_');
    if (isOp) {
      // Extract clean operator key
      let cleanId = ep.id.toLowerCase()
        .replace(/^operator_/, '')
        .replace(/^(story_|or_|set_|record_)/, '')
        .replace(/(_set_?\d+|_record_?\d+|_set|_record|_story_?\d+|_story)$/, '')
        .replace(/^char_\d+_?/, '')
        .replace(/^char_/, '');
      const parts = cleanId.split('_');
      const opKey = parts[0] || cleanId;

      if (!operatorStoriesMap.has(opKey)) {
        operatorStoriesMap.set(opKey, {
          ...ep,
          chapters: [...ep.chapters]
        });
      } else {
        const existing = operatorStoriesMap.get(opKey)!;
        for (const ch of ep.chapters) {
          if (!existing.chapters.some(c => c.id === ch.id)) {
            existing.chapters.push(ch);
          }
        }
      }
    }
  }

  const enriched: EnrichedOperator[] = (rawOperatorsData as OperatorData[]).map((op) => {
    const ruName = getOperatorRussianName(op.id, op.nameEn);
    let displayName = op.nameEn;
    if (isRu) {
      displayName = ruName || op.nameEn;
    } else if (isZh) {
      displayName = op.nameZh || op.nameEn;
    }

    // Class and Faction labels
    const profInfo = PROFESSION_NAMES[op.profession] || { ru: op.profession, en: op.profession };
    const factionInfo = FACTION_NAMES[op.nationId?.toLowerCase()] || { ru: op.nationId || 'Неизвестно', en: op.nationId || 'Unknown' };
    const posInfo = op.position === 'MELEE' 
      ? { ru: 'Ближний бой', en: 'Melee' } 
      : (op.position === 'RANGED' ? { ru: 'Дальний бой', en: 'Ranged' } : { ru: 'Универсал', en: 'All' });

    // Avatar and Portrait URLs (Official headshots & bust portraits)
    // yuanyan3060 provides full coverage of all operators up to the latest CN release
    const avatarUrl = `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${op.id}.png`;
    const portraitUrl = `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/${op.id}_1.png`;

    // Match with Paradox Story
    const cleanIdPart = op.id.replace('char_', '').split('_')[1] || '';
    const cleanFull = op.id.replace('char_', '').toLowerCase();
    const enNameClean = op.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');

    const storyEp = operatorStoriesMap.get(cleanIdPart) 
      || operatorStoriesMap.get(cleanFull)
      || operatorStoriesMap.get(enNameClean)
      || operatorStoriesMap.get(op.nameEn.toLowerCase())
      || (op.id === 'char_002_amiya' ? operatorStoriesMap.get('amiya') : undefined);

    const hasStories = !!(storyEp && storyEp.chapters && storyEp.chapters.length > 0);

    // Parse handbook sections
    const parsedHandbook = parseOperatorHandbook(op.handbook || [], uiLang);

    return {
      ...op,
      nameRu: ruName,
      displayName,
      professionName: isRu ? profInfo.ru : profInfo.en,
      factionName: isRu ? factionInfo.ru : factionInfo.en,
      positionName: isRu ? posInfo.ru : posInfo.en,
      avatarUrl,
      portraitUrl,
      hasStories,
      chapters: storyEp?.chapters || [],
      storyEpisode: storyEp,
      parsedHandbook
    };
  });

  // Default sorting: 6-star first, then by display name
  enriched.sort((a, b) => {
    if (b.rarity !== a.rarity) {
      return b.rarity - a.rarity;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  cachedByLang[langKey] = enriched;
  return enriched;
}

/**
 * Parses handbook raw text into structured key-value pairs where possible
 */
export function parseOperatorHandbook(
  handbook: OperatorHandbookSection[],
  uiLang: Language = 'ru_RU'
): ParsedDossierSection[] {
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  const isZh = uiLang === 'zh_CN';

  return handbook.map((section, idx) => {
    let rawText = (isZh ? section.textZh : (section.textEn || section.textZh)) || '';
    const originalTitle = section.titleEn || section.titleZh || `File ${idx + 1}`;
    
    // Translated Title
    let title = originalTitle;
    if (isRu) {
      title = getCanonicalHandbookTitle(section.titleZh || section.titleEn || originalTitle, 'ru_RU');
    } else if (isZh && section.titleZh) {
      title = section.titleZh;
    }

    // Determine type
    let type: ParsedDossierSection['type'] = 'text';
    const lowerTitle = originalTitle.toLowerCase();
    if (lowerTitle.includes('basic') || lowerTitle.includes('基础档案')) type = 'basic';
    else if (lowerTitle.includes('physical') || lowerTitle.includes('exam') || lowerTitle.includes('综合体检') || lowerTitle.includes('综合性能') || lowerTitle.includes('维护检测')) type = 'exam';
    else if (lowerTitle.includes('clinical') || lowerTitle.includes('临床诊断') || lowerTitle.includes('体检')) type = 'clinical';
    else if (lowerTitle.includes('archive') || lowerTitle.includes('档案资料')) type = 'archive';
    else if (lowerTitle.includes('promotion') || lowerTitle.includes('晋升') || lowerTitle.includes('conversion') || lowerTitle.includes('升变') || lowerTitle.includes('密录')) type = 'record';

    // Parse structured tags like [Code Name] Amiya [Gender] Female or 【代号】阿米娅 【性别】女
    const items: ParsedDossierItem[] = [];
    if (type === 'basic' || type === 'exam' || lowerTitle.includes('basic') || lowerTitle.includes('基础') || lowerTitle.includes('体检') || lowerTitle.includes('性能') || lowerTitle.includes('检测')) {
      const tagRegex = /(?:\[([^\]]+)\]|【([^】]+)】)\s*([^\[【\n\r]+)/g;
      let match;
      while ((match = tagRegex.exec(rawText)) !== null) {
        const key = (match[1] || match[2] || '').trim();
        const value = (match[3] || '').trim();
        if (key && value) {
          items.push({
            key,
            label: isRu ? translateHandbookField(key) : key,
            value: isRu ? translateFieldValue(value) : value
          });
        }
      }
    }

    // Translate narrative/clinical section text for Russian
    if (isRu) {
      rawText = translateDossierNarrative(rawText, type);
    }

    return {
      title,
      originalTitle,
      type,
      items: items.length > 0 ? items : undefined,
      rawText
    };
  });
}

function translateHandbookField(field: string): string {
  const f = field.trim().toLowerCase();
  if (f.includes('code name') || f.includes('代号')) return 'Кодовое имя';
  if (f.includes('gender assignment') || f.includes('设定性别')) return 'Заданный пол';
  if (f.includes('gender') || f.includes('性别')) return 'Пол';
  if (f.includes('combat experience') || f.includes('战斗经验')) return 'Боевой опыт';
  if (f.includes('place of birth') || f.includes('birthplace') || f.includes('出身地') || f.includes('产地')) return 'Место рождения / Регион';
  if (f.includes('date of birth') || f.includes('birthday') || f.includes('生日')) return 'Дата рождения';
  if (f.includes('date of release') || f.includes('出厂日') || f.includes('出厂时间')) return 'Дата выпуска';
  if (f.includes('model') || f.includes('型号')) return 'Модель';
  if (f.includes('manufacturer') || f.includes('制造商')) return 'Производитель';
  if (f.includes('weight') || f.includes('重量')) return 'Вес';
  if (f.includes('race') || f.includes('种族')) return 'Раса';
  if (f.includes('height') || f.includes('身高')) return 'Рост';
  if (f.includes('cell-originium') || f.includes('体细胞与源石融合率')) return 'Слияние клеток с ориджиниумом';
  if (f.includes('blood originium') || f.includes('血液源石结晶密度')) return 'Плотность кристаллов в крови';
  if (f.includes('infection') || f.includes('矿石病')) return 'Статус заражения';
  if (f.includes('physical strength') || f.includes('物理强度')) return 'Физическая сила';
  if (f.includes('mobility') || f.includes('战场机动') || f.includes('通过性')) return 'Мобильность / Проходимость';
  if (f.includes('physical resilience') || f.includes('endurance') || f.includes('生理耐受') || f.includes('续航')) return 'Физиологическая выносливость / Автономность';
  if (f.includes('tactical') || f.includes('战术规划')) return 'Тактический ум';
  if (f.includes('combat skill') || f.includes('战斗技巧')) return 'Боевые навыки';
  if (f.includes('originium arts') || f.includes('assimilation') || f.includes('源石技艺')) return 'Ассимиляция ориджиниумом';
  if (f.includes('top speed') || f.includes('最高速度')) return 'Максимальная скорость';
  if (f.includes('climb') || f.includes('爬坡能力')) return 'Преодоление подъёмов';
  if (f.includes('brake') || f.includes('制动效能')) return 'Эффективность торможения';
  if (f.includes('structural') || f.includes('结构稳定性')) return 'Структурная стабильность';
  if (f.includes('streaming') || f.includes('直播经验')) return 'Опыт стримов';
  return field;
}

const RACE_MAP_RU: Record<string, string> = {
  feline: 'Фелин',
  cautus: 'Каутус',
  kuranta: 'Куранта',
  lupo: 'Лупо',
  vouivre: 'Ваивр',
  sarkaz: 'Сарказ',
  sankta: 'Санкта',
  draco: 'Драко',
  lung: 'Лун',
  liberi: 'Либери',
  caprinae: 'Каприни',
  elafia: 'Элафия',
  itra: 'Итра',
  anaty: 'Анати',
  archosauria: 'Архозавр',
  savra: 'Савра',
  zalak: 'Залак',
  aegir: 'Эгир',
  ursus: 'Урсус',
  forte: 'Форте',
  cerato: 'Церато',
  petram: 'Петрам',
  pythia: 'Пифия',
  rebbah: 'Реббах',
  kylin: 'Цилинь',
  durin: 'Дурин',
  manticore: 'Мантикора',
  aslan: 'Аслан',
  chimera: 'Химера',
  oni: 'Они',
  vulpis: 'Вульпо',
  perro: 'Перро',
  anura: 'Анура',
  pilosa: 'Пилоза',
  aquatic: 'Морское существо',
  unknown: 'Неизвестно',
  undisclosed: 'Не разглашается',
  classified: 'Засекречено',
};

const FACTION_MAP_RU: Record<string, string> = {
  lungmen: 'Лунмэнь',
  kazimierz: 'Казимеж',
  ursus: 'Урсус',
  victoria: 'Виктория',
  columbia: 'Колумбия',
  yan: 'Янь',
  higashi: 'Хигаси',
  leithanien: 'Лейтания',
  laterano: 'Латерано',
  iberia: 'Иберия',
  sargon: 'Саргон',
  kjerag: 'Кьераг',
  siracusa: 'Сиракузы',
  'rim billiton': 'Рим Биллитон',
  minos: 'Минос',
  sami: 'Саами',
  aegir: 'Эгир',
  bolivar: 'Боливар',
  siesta: 'Сиеста',
  'rhodes island': 'Родос Айленд',
  'blacksteel worldwide': 'Blacksteel Worldwide',
  'penguin logistics': 'Penguin Logistics',
};

function translateFieldValue(val: string): string {
  const v = val.trim();
  const lower = v.toLowerCase();

  // Basic standards
  if (lower === 'female' || lower === '女') return 'Женский';
  if (lower === 'male' || lower === '男') return 'Мужской';
  if (lower === 'standard' || lower === '标准') return 'Стандарт';
  if (lower === 'normal' || lower === '普通') return 'Обычный';
  if (lower === 'excellent' || lower === '优良') return 'Отлично';
  if (lower === 'outstanding' || lower === '卓越') return 'Превосходно';
  if (lower === 'flawed' || lower === 'defective' || lower === '缺陷') return 'Недостаточно';
  if (lower === 'great' || lower === '良好') return 'Хорошо';
  if (lower === 'classified' || lower === '保密') return 'Засекречено';
  if (lower === 'unknown' || lower === '未知') return 'Неизвестно';
  if (lower === 'undisclosed' || lower === '未公开') return 'Не разглашается';
  if (lower === 'none' || lower === 'no combat experience' || lower === '没有战斗经验' || lower === '无') return 'Отсутствует';

  // Combat experience patterns
  if (/^(\d+)\s*(?:years?|年)$/i.test(v)) {
    const years = parseInt(RegExp.$1, 10);
    const label = years === 1 ? '1 год' : (years >= 2 && years <= 4 ? `${years} года` : `${years} лет`);
    return label;
  }
  if (lower.includes('half a year') || lower.includes('半年')) return 'Полгода';
  if (lower.includes('more than 10 years') || lower.includes('over 10 years') || lower.includes('10年以上')) return 'Более 10 лет';
  if (lower.includes('more than 20 years') || lower.includes('over 20 years') || lower.includes('20年以上')) return 'Более 20 лет';

  // Races
  if (RACE_MAP_RU[lower]) return RACE_MAP_RU[lower];

  // Places of Birth
  if (FACTION_MAP_RU[lower]) return FACTION_MAP_RU[lower];

  // Infection sentences
  if (lower.includes('confirmed uninfected') || lower.includes('非感染者')) {
    return 'По результатам медицинского обследования признан(а) неинфицированным(ой).';
  }
  if (lower.includes('confirmed infected') || lower.includes('感染者')) {
    return 'По результатам медицинского обследования подтверждено инфицирование орипатией.';
  }

  // Date translations (e.g. "Mar 25", "3月25日", "October 10")
  const dateMatch = v.match(/^([A-Za-z]+)\s*(\d{1,2})$/i) || v.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (dateMatch) {
    if (v.includes('月')) {
      const monthNum = parseInt(dateMatch[1], 10);
      const day = dateMatch[2];
      const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${day} ${months[monthNum - 1]}`;
      }
    } else {
      const mStr = dateMatch[1].toLowerCase().slice(0, 3);
      const day = dateMatch[2];
      const mMonthMap: Record<string, string> = {
        jan: 'января', feb: 'февраля', mar: 'марта', apr: 'апреля', may: 'мая', jun: 'июня',
        jul: 'июля', aug: 'августа', sep: 'сентября', oct: 'октября', nov: 'ноября', dec: 'декабря'
      };
      if (mMonthMap[mStr]) {
        return `${day} ${mMonthMap[mStr]}`;
      }
    }
  }

  return val;
}

function translateDossierNarrative(text: string, type: ParsedDossierSection['type']): string {
  if (!text) return '';
  let res = text;

  // Replace common header tags in narrative text with canonical Russian tags
  res = res.replace(/\[Cell-Originium Assimilation\]/gi, '【Слияние клеток с ориджиниумом】');
  res = res.replace(/【体细胞与源石融合率】/g, '【Слияние клеток с ориджиниумом】');
  res = res.replace(/\[Blood Originium-Crystal Density\]/gi, '【Плотность кристаллов ориджиниума в крови】');
  res = res.replace(/【血液源石结晶密度】/g, '【Плотность кристаллов ориджиниума в крови】');

  // Clinical opening formulas
  res = res.replace(
    /Imaging tests reveal clear,\s*normal outlines of internal organs,\s*and no abnormal shadows have been detected\.\s*Originium granules have not been detected in the circulatory system and there are no other signs of infection\.\s*At this time,\s*this operator can be confirmed to be uninfected\./gi,
    'Рентгенограмма показывает чёткие, нормальные контуры внутренних органов без патологических теней. В кровеносной системе кристаллы ориджиниума не обнаружены, признаков заражения нет. На текущий момент оперативник признан неинфицированным.'
  );
  res = res.replace(
    /造影检测结果显示，该干员体内脏器轮廓清晰，未见异常阴影，循环系统内源石颗粒检测未见异常，无矿石病感染迹象，现阶段可确认为非矿石病感染者。/g,
    'Рентгенограмма показывает чёткие, нормальные контуры внутренних органов без патологических теней. В кровеносной системе кристаллы ориджиниума не обнаружены, признаков заражения нет. На текущий момент оперативник признан неинфицированным.'
  );

  res = res.replace(
    /Imaging tests show the outlines of internal organs are blurred,\s*with dark spots and abnormal shadows visible\.\s*Originium granules have been detected in the circulatory system,\s*confirming Oripathy infection\./gi,
    'Рентгенограмма показывает размытые контуры внутренних органов с тёмными пятнами и аномальными тенями. В кровеносной системе обнаружены гранулы ориджиниума, подтверждающие инфицирование Орипатией.'
  );
  res = res.replace(
    /造影检测结果显示，该干员体内脏器轮廓模糊，可见异常阴影，循环系统内源石颗粒检测异常，有矿石病感染迹象，现阶段可确认为矿石病感染者。/g,
    'Рентгенограмма показывает размытые контуры внутренних органов с тёмными пятнами и аномальными тенями. В кровеносной системе обнаружены гранулы ориджиниума, подтверждающие инфицирование Орипатией.'
  );

  return res;
}
