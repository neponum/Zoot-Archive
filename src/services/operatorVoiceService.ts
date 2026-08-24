import { Language, OperatorVoiceLine, OperatorCvInfo, OperatorVoiceData } from '../types';
import { CacheService } from './cacheService';

export type { OperatorVoiceLine, OperatorCvInfo, OperatorVoiceData };

// Canonical Russian translations for all Arknights voice titles
export const VOICE_TITLE_RU_MAP: Record<string, string> = {
  'appointed as assistant': 'Назначение ассистентом',
  'talk 1': 'Разговор 1',
  'talk 2': 'Разговор 2',
  'talk 3': 'Разговор 3',
  'talk after promotion 1': 'Разговор после повышения 1',
  'talk after promotion 2': 'Разговор после повышения 2',
  'talk after trust increase 1': 'Разговор при доверии 1',
  'talk after trust increase 2': 'Разговор при доверии 2',
  'talk after trust increase 3': 'Разговор при доверии 3',
  'idle': 'Бездействие',
  'onboard': 'Прибытие оперативника',
  'watching battle record': 'Просмотр боевых записей',
  'promotion 1': 'Повышение (Элита 1)',
  'promotion 2': 'Повышение (Элита 2)',
  'added to squad': 'Включение в отряд',
  'appointed as squad leader': 'Назначение командиром отряда',
  'depart': 'Выход на операцию',
  'begin operation': 'Начало операции',
  'selecting operator 1': 'Выбор оперативника 1',
  'selecting operator 2': 'Выбор оперативника 2',
  'deployment 1': 'Развертывание 1',
  'deployment 2': 'Развертывание 2',
  'in battle 1': 'В бою 1',
  'in battle 2': 'В бою 2',
  'in battle 3': 'В бою 3',
  'in battle 4': 'В бою 4',
  '4-star result': 'Завершение сложной операции (4★)',
  '3-star result': 'Безупречная победа (3★)',
  'sub 3-star result': 'Завершение операции (<3★)',
  'operation failure': 'Провал операции',
  'assigned to facility': 'Назначение на базу',
  'tap': 'Касание',
  'trust tap': 'Касание (Доверие)',
  'title': 'Экран входа / Название',
  'greeting': 'Приветствие',
  'new year\'s blessing': 'Новогоднее поздравление',
  'anniversary celebration': 'Годовщина',
  'birthday': 'День рождения',
  // Chinese title fallbacks
  '任命助理': 'Назначение ассистентом',
  '交谈1': 'Разговор 1',
  '交谈2': 'Разговор 2',
  '交谈3': 'Разговор 3',
  '晋升后交谈1': 'Разговор после повышения 1',
  '晋升后交谈2': 'Разговор после повышения 2',
  '信赖提升后交谈1': 'Разговор при доверии 1',
  '信赖提升后交谈2': 'Разговор при доверии 2',
  '信赖提升后交谈3': 'Разговор при доверии 3',
  '闲置': 'Бездействие',
  '干员报到': 'Прибытие оперативника',
  '观看作战记录': 'Просмотр боевых записей',
  '精英化晋升1': 'Повышение (Элита 1)',
  '精英化晋升2': 'Повышение (Элита 2)',
  '编入队伍': 'Включение в отряд',
  '任命队长': 'Назначение командиром отряда',
  '行动出发': 'Выход на операцию',
  '行动开始': 'Начало операции',
  '选中干员1': 'Выбор оперативника 1',
  '选中干员2': 'Выбор оперативника 2',
  '部署1': 'Развертывание 1',
  '部署2': 'Развертывание 2',
  '作战中1': 'В бою 1',
  '作战中2': 'В бою 2',
  '作战中3': 'В бою 3',
  '作战中4': 'В бою 4',
  '作战中': 'В бою',
  '完成高难行动': 'Завершение сложной операции (4★)',
  '3星结束行动': 'Безупречная победа (3★)',
  '非3星结束行动': 'Завершение операции (<3★)',
  '行动失败': 'Провал операции',
  '进驻设施': 'Назначение на базу',
  '戳一下': 'Касание',
  '信赖触摸': 'Касание (Доверие)',
  '标题': 'Экран входа / Название',
  '问候': 'Приветствие',
  '新年祝福': 'Новогоднее поздравление',
  '周年庆典': 'Годовщина',
  '生日': 'День рождения',
  // Japanese title fallbacks
  '秘書任命': 'Назначение ассистентом',
  '会話1': 'Разговор 1',
  '会話2': 'Разговор 2',
  '会話3': 'Разговор 3',
  '昇進後会話1': 'Разговор после повышения 1',
  '昇進後会話2': 'Разговор после повышения 2',
  '信頼度アップ会話1': 'Разговор при доверии 1',
  '信頼度アップ会話2': 'Разговор при доверии 2',
  '信頼度アップ会話3': 'Разговор при доверии 3',
  '放置': 'Бездействие',
  '着任': 'Прибытие оперативника',
  '経験値強化': 'Просмотр боевых записей',
  '昇進1': 'Повышение (Элита 1)',
  '昇進2': 'Повышение (Элита 2)',
  '編成': 'Включение в отряд',
  '隊長任命': 'Назначение командиром отряда',
  '作戦出発': 'Выход на операцию',
  '作戦開始': 'Начало операции',
  'オペレーター選択1': 'Выбор оперативника 1',
  'オペレーター選択2': 'Выбор оперативника 2',
  '配置1': 'Развертывание 1',
  '配置2': 'Развертывание 2',
  '作戦中1': 'В бою 1',
  '作戦中2': 'В бою 2',
  '作戦中3': 'В бою 3',
  '作戦中4': 'В бою 4',
  '星4終了': 'Завершение сложной операции (4★)',
  '星3終了': 'Безупречная победа (3★)',
  '星2以下終了': 'Завершение операции (<3★)',
  '作戦失敗': 'Провал операции',
  '施設配置': 'Назначение на базу',
  'タッチ': 'Касание',
  '信頼度タッチ': 'Касание (Доверие)'
};

export const CV_LANG_LABELS: Record<string, { ru: string; en: string; flag: string }> = {
  JP: { ru: 'Японский', en: 'Japanese', flag: '🇯🇵' },
  CN_MANDARIN: { ru: 'Китайский', en: 'Chinese', flag: '🇨🇳' },
  EN: { ru: 'Английский', en: 'English', flag: '🇬🇧' },
  KR: { ru: 'Корейский', en: 'Korean', flag: '🇰🇷' },
  RUS: { ru: 'Русский', en: 'Russian', flag: '🇷🇺' },
  ITA: { ru: 'Итальянский', en: 'Italian', flag: '🇮🇹' },
  GER: { ru: 'Немецкий', en: 'German', flag: '🇩🇪' },
  FRE: { ru: 'Французский', en: 'French', flag: '🇫🇷' },
  SPA: { ru: 'Испанский', en: 'Spanish', flag: '🇪🇸' },
  LAT: { ru: 'Латынь', en: 'Latin', flag: '🏛️' },
  CN_TOPOLECT: { ru: 'Диалект', en: 'Regional Dialect', flag: '🏮' },
  LINKAGE: { ru: 'Коллаборация', en: 'Collab Special', flag: '⭐' }
};

function getVoiceCategory(titleEn: string, titleZh: string): 'talk' | 'combat' | 'management' | 'other' {
  const en = (titleEn || '').toLowerCase();
  const zh = titleZh || '';

  if (
    en.includes('talk') || 
    en.includes('idle') || 
    en.includes('greeting') || 
    en.includes('trust') || 
    en.includes('tap') ||
    en.includes('blessing') ||
    en.includes('celebration') ||
    en.includes('birthday') ||
    zh.includes('交谈') ||
    zh.includes('闲置') ||
    zh.includes('问候') ||
    zh.includes('触摸') ||
    zh.includes('祝福') ||
    zh.includes('庆典')
  ) {
    return 'talk';
  }

  if (
    en.includes('battle') || 
    en.includes('operation') || 
    en.includes('deploy') || 
    en.includes('result') || 
    en.includes('failure') || 
    en.includes('depart') ||
    en.includes('selecting') ||
    zh.includes('作战') ||
    zh.includes('行动') ||
    zh.includes('部署') ||
    zh.includes('选中')
  ) {
    return 'combat';
  }

  if (
    en.includes('assistant') || 
    en.includes('promotion') || 
    en.includes('squad') || 
    en.includes('facility') || 
    en.includes('onboard') ||
    en.includes('watching') ||
    zh.includes('助理') ||
    zh.includes('晋升') ||
    zh.includes('队长') ||
    zh.includes('队伍') ||
    zh.includes('设施') ||
    zh.includes('报到') ||
    zh.includes('记录')
  ) {
    return 'management';
  }

  return 'other';
}

export function getCanonicalVoiceTitle(rawTitle: string | undefined, lang: Language = 'ru_RU'): string {
  if (!rawTitle) return '';
  const isRu = lang === 'ru_RU' || lang === 'ru_RU_CN';
  if (!isRu) return rawTitle;

  const lower = rawTitle.toLowerCase().trim();
  if (VOICE_TITLE_RU_MAP[lower]) {
    return VOICE_TITLE_RU_MAP[lower];
  }
  if (VOICE_TITLE_RU_MAP[rawTitle.trim()]) {
    return VOICE_TITLE_RU_MAP[rawTitle.trim()];
  }

  return rawTitle;
}

// In-memory cache for fetched charword_tables
let cachedZhCharWordTable: any = null;
let cachedEnCharWordTable: any = null;
let cachedJaCharWordTable: any = null;
let isFetchingCharWordTable = false;
const fetchListeners: Array<() => void> = [];

async function loadCharWordTables(): Promise<{ zh: any; en: any; ja: any }> {
  if (cachedZhCharWordTable && cachedEnCharWordTable && cachedJaCharWordTable) {
    return { zh: cachedZhCharWordTable, en: cachedEnCharWordTable, ja: cachedJaCharWordTable };
  }

  if (isFetchingCharWordTable) {
    return new Promise((resolve) => {
      fetchListeners.push(() => {
        resolve({ zh: cachedZhCharWordTable, en: cachedEnCharWordTable, ja: cachedJaCharWordTable });
      });
    });
  }

  isFetchingCharWordTable = true;

  try {
    const zhUrl = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/charword_table.json';
    const enUrl = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/charword_table.json';
    const jaUrl = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ja_JP/gamedata/excel/charword_table.json';

    const proxiedZhUrl = `/api/proxy?url=${encodeURIComponent(zhUrl)}`;
    const proxiedEnUrl = `/api/proxy?url=${encodeURIComponent(enUrl)}`;
    const proxiedJaUrl = `/api/proxy?url=${encodeURIComponent(jaUrl)}`;

    const [zhRes, enRes, jaRes] = await Promise.all([
      fetch(proxiedZhUrl).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(async () => {
        const direct = await fetch(zhUrl);
        return direct.json();
      }).catch(() => ({ charWords: {}, voiceLangDict: {} })),
      fetch(proxiedEnUrl).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(async () => {
        const direct = await fetch(enUrl);
        return direct.json();
      }).catch(() => ({ charWords: {}, voiceLangDict: {} })),
      fetch(proxiedJaUrl).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(async () => {
        const direct = await fetch(jaUrl);
        return direct.json();
      }).catch(() => ({ charWords: {}, voiceLangDict: {} }))
    ]);

    cachedZhCharWordTable = zhRes;
    cachedEnCharWordTable = enRes;
    cachedJaCharWordTable = jaRes;

    return { zh: cachedZhCharWordTable, en: cachedEnCharWordTable, ja: cachedJaCharWordTable };
  } finally {
    isFetchingCharWordTable = false;
    while (fetchListeners.length > 0) {
      const cb = fetchListeners.shift();
      if (cb) cb();
    }
  }
}

/**
 * Builds the Torappu PRTS audio URL for any voice language package.
 */
export function buildAudioUrlForLang(
  charId: string, 
  voiceId: string, 
  voiceLangType: string = 'JP',
  dictEntry?: { wordkey?: string; voicePath?: string | null }
): string {
  const vId = voiceId.toLowerCase();
  const cId = charId.toLowerCase();
  const customFolder = (dictEntry?.wordkey || charId).toLowerCase();

  let targetUrl = '';

  switch (voiceLangType) {
    case 'JP':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice/${cId}/${vId}.mp3`;
      break;
    case 'CN_MANDARIN':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_cn/${cId}/${vId}.mp3`;
      break;
    case 'EN':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_en/${cId}/${vId}.mp3`;
      break;
    case 'KR':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_kr/${cId}/${vId}.mp3`;
      break;
    case 'LINKAGE':
      if (dictEntry?.voicePath && dictEntry.voicePath.includes('Voice_CN')) {
        targetUrl = `https://torappu.prts.wiki/assets/audio/voice_cn/${cId}/${vId}.mp3`;
      } else {
        targetUrl = `https://torappu.prts.wiki/assets/audio/voice/${cId}/${vId}.mp3`;
      }
      break;
    case 'RUS':
    case 'ITA':
    case 'GER':
    case 'FRE':
    case 'SPA':
    case 'LAT':
    case 'CN_TOPOLECT':
    default:
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_custom/${customFolder}/${vId}.mp3`;
      break;
  }

  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Helper to get the correct audio URL for a voice line given a voice language selection.
 */
export function getLineAudioUrl(line: OperatorVoiceLine, voiceLangType: string): string {
  if (line.audioUrls && line.audioUrls[voiceLangType]) {
    return line.audioUrls[voiceLangType];
  }
  if (line.audioUrls && line.audioUrls.JP) {
    return line.audioUrls.JP;
  }
  return line.audioUrl;
}

/**
 * Fetch and extract voice lines for a specific operator with full multi-language audio support.
 */
export async function getOperatorVoiceData(
  rawCharId: string, 
  uiLang: Language = 'ru_RU'
): Promise<OperatorVoiceData | null> {
  if (!rawCharId) return null;

  try {
    const { zh, en, ja } = await loadCharWordTables();
    if (!zh || !zh.charWords) return null;

    const cleanId = rawCharId.toLowerCase().trim();
    const idWithoutPrefix = cleanId.replace(/^char_/, '');
    const idWithPrefix = cleanId.startsWith('char_') ? cleanId : `char_${cleanId}`;
    
    const zhWords = zh.charWords || {};
    const enWords = en?.charWords || {};
    const jaWords = ja?.charWords || {};
    const voiceLangDict = zh.voiceLangDict || {};

    // Build target keys set for matching all aliases, variants, and wordKeys
    const targetKeys = new Set<string>([cleanId, idWithoutPrefix, idWithPrefix]);

    // Extract CVs / Voice Actors & Available Dub Languages
    const cvList: OperatorCvInfo[] = [];
    const availableLangs: string[] = [];

    const cvData = voiceLangDict[cleanId] || 
      voiceLangDict[idWithPrefix] || 
      voiceLangDict[idWithoutPrefix] ||
      Object.values(voiceLangDict).find((v: any) => {
        const vCharId = (v.charId || '').toLowerCase();
        if (targetKeys.has(vCharId)) return true;
        if (v.wordkeys && Array.isArray(v.wordkeys)) {
          return v.wordkeys.some((wk: string) => targetKeys.has(wk.toLowerCase()));
        }
        return false;
      }) as any;

    if (cvData) {
      if (cvData.charId) targetKeys.add(cvData.charId.toLowerCase());
      if (cvData.wordkeys && Array.isArray(cvData.wordkeys)) {
        cvData.wordkeys.forEach((wk: string) => targetKeys.add(wk.toLowerCase()));
      }

      if (cvData.dict) {
        for (const [langKey, langInfo] of Object.entries<any>(cvData.dict)) {
          if (langInfo.cvName && langInfo.cvName.length > 0) {
            const names = Array.isArray(langInfo.cvName) ? langInfo.cvName : [langInfo.cvName];
            const labelObj = CV_LANG_LABELS[langKey] || { ru: langKey, en: langKey, flag: '🎙️' };
            
            cvList.push({
              langType: langKey,
              langLabel: uiLang === 'ru_RU' || uiLang === 'ru_RU_CN' ? labelObj.ru : labelObj.en,
              cvNames: names.filter(Boolean),
              wordkey: langInfo.wordkey,
              voicePath: langInfo.voicePath
            });

            if (!availableLangs.includes(langKey)) {
              availableLangs.push(langKey);
            }
          }
        }
      }
    }

    // Default to at least JP if no dict found
    if (availableLangs.length === 0) {
      availableLangs.push('JP');
    }

    // Find all matching voice entries by charId or wordKey
    const matchingEntries: OperatorVoiceLine[] = [];
    const wordKeySet = new Set<string>();

    for (const [key, itemZh] of Object.entries<any>(zhWords)) {
      const itemCharId = (itemZh.charId || '').toLowerCase();
      const itemWordKey = (itemZh.wordKey || '').toLowerCase();

      const isMatch = 
        targetKeys.has(itemCharId) || 
        targetKeys.has(itemWordKey) ||
        cleanId === itemCharId ||
        cleanId === itemWordKey ||
        itemCharId.endsWith(cleanId) ||
        cleanId.endsWith(itemCharId);

      if (isMatch) {
        wordKeySet.add(itemZh.wordKey || itemZh.charId);

        const itemEn = enWords[key] || Object.values(enWords).find((e: any) => 
          (e.charId?.toLowerCase() === itemCharId || e.wordKey?.toLowerCase() === itemWordKey) && 
          e.voiceId === itemZh.voiceId
        ) as any;

        const itemJa = jaWords[key] || Object.values(jaWords).find((j: any) => 
          (j.charId?.toLowerCase() === itemCharId || j.wordKey?.toLowerCase() === itemWordKey) && 
          j.voiceId === itemZh.voiceId
        ) as any;

        const titleZh = itemZh.voiceTitle || '';
        const titleEn = itemEn?.voiceTitle || itemZh.voiceTitle || '';
        const titleJa = itemJa?.voiceTitle || '';
        const titleRu = VOICE_TITLE_RU_MAP[titleEn.toLowerCase()] || 
                        VOICE_TITLE_RU_MAP[titleZh] || 
                        VOICE_TITLE_RU_MAP[titleJa] ||
                        titleEn || 
                        titleZh;

        const textZh = itemZh.voiceText || '';
        const textEn = itemEn?.voiceText || textZh;
        const textJa = itemJa?.voiceText || '';
        
        let localizedText = textEn;
        if (uiLang === 'zh_CN') {
          localizedText = textZh;
        } else if (uiLang === 'ru_RU' || uiLang === 'ru_RU_CN') {
          // Display EN or RU translation
          localizedText = textEn || textZh;
        }

        let localizedTitle = titleEn;
        if (uiLang === 'zh_CN') {
          localizedTitle = titleZh;
        } else if (uiLang === 'ru_RU' || uiLang === 'ru_RU_CN') {
          localizedTitle = titleRu;
        }

        const category = getVoiceCategory(titleEn, titleZh);

        // Pre-build audio URLs for all available language dubs for this operator
        const audioUrls: Record<string, string> = {};
        for (const lType of availableLangs) {
          const dictEntry = cvList.find(c => c.langType === lType);
          audioUrls[lType] = buildAudioUrlForLang(itemZh.charId || cleanId, itemZh.voiceId, lType, dictEntry);
        }

        const primaryAudioUrl = audioUrls.JP || audioUrls[availableLangs[0]] || buildAudioUrlForLang(itemZh.charId || cleanId, itemZh.voiceId, 'JP');

        matchingEntries.push({
          charWordId: key,
          charId: itemZh.charId || cleanId,
          wordKey: itemZh.wordKey || itemZh.charId || cleanId,
          voiceId: itemZh.voiceId,
          voiceTitle: localizedTitle,
          voiceTitleEn: titleEn,
          voiceTitleZh: titleZh,
          voiceTitleRu: titleRu,
          voiceText: localizedText,
          voiceTextJa: textJa,
          voiceTextEn: textEn,
          voiceTextZh: textZh,
          voiceAsset: itemZh.voiceAsset,
          category,
          audioUrls,
          audioUrl: primaryAudioUrl,
          unlockType: itemZh.unlockType,
          lockDescription: itemZh.lockDescription
        });
      }
    }

    return {
      charId: cleanId,
      lines: matchingEntries,
      cvList,
      availableLangs,
      wordKeys: Array.from(wordKeySet)
    };
  } catch (err) {
    console.error('Failed to get operator voice data:', err);
    return null;
  }
}
