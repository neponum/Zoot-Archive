import { CacheService } from '../cacheService';

export const STORY_VARIABLES_URL = 'https://torappu.prts.wiki/gamedata/latest/story/story_variables.json';

let inMemoryVariables: Record<string, any> | null = null;
let fetchPromise: Promise<Record<string, any>> | null = null;

// Base common fallbacks in case network is delayed or offline
const BASE_FALLBACK_VARIABLES: Record<string, any> = {
  axia_name: '小小小天使',
  avatar_sys: 'system_100_mys',
  avatar_doberm: 'char_130_doberm',
  avatar_jesica: 'char_235_jesica',
  avatar_amiya: 'char_002_amiya',
  avatar_closure: 'npc_007_closure',
  avatar_adnach: 'char_211_adnach',
  avatar_ansel: 'char_212_ansel',
  avatar_w: 'npc_113_cqbw',
  avatar_fang: 'char_123_fang',
  avatar_beagle: 'char_122_beagle',
  avatar_hibisc: 'char_120_hibisc',
  avatar_lava: 'char_121_lava',
  avatar_melan: 'char_208_melan',
  avatar_ace: 'npc_007_ace',
  avatar_nearl: 'char_148_nearl',
  avatar_grani: 'char_220_grani',
  avatar_skadi: 'char_263_skadi',
  avatar_chen: 'char_010_chen',
  avatar_hoshiguma: 'char_103_angel',
  avatar_swire: 'char_308_swire',
  avatar_lin: 'npc_lin',
  avatar_wei: 'npc_wei',
  avatar_fumizuki: 'npc_fumizuki',
  avatar_kaltsit: 'char_003_kalts',
  avatar_silverash: 'char_172_svrash',
  avatar_pramanix: 'char_174_slbell',
  avatar_cliffheart: 'char_173_slchan',
  avatar_courier: 'char_198_blackd',
  avatar_matterhorn: 'char_199_yak',
  avatar_phantom: 'char_507_rsidne',
  avatar_mizuki: 'char_437_mizuki',
  avatar_sami: 'char_1032_excu',
  nbs: ' ',
  bg_width: 0.5,
  bg_height: 1.5
};

export async function fetchStoryVariables(): Promise<Record<string, any>> {
  if (inMemoryVariables && Object.keys(inMemoryVariables).length > 50) {
    return inMemoryVariables;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      // Check cache first
      const cached = await CacheService.getCachedText('story_variables_json_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            inMemoryVariables = { ...BASE_FALLBACK_VARIABLES, ...parsed };
            return inMemoryVariables;
          }
        } catch {
          // ignore cache parse error
        }
      }

      // Fetch from PRTS Torappu
      const response = await fetch(STORY_VARIABLES_URL, {
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') {
          inMemoryVariables = { ...BASE_FALLBACK_VARIABLES, ...data };
          await CacheService.cacheText('story_variables_json_cache', JSON.stringify(data));
          return inMemoryVariables;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch story variables from PRTS Torappu, using fallback:', e);
    }

    inMemoryVariables = BASE_FALLBACK_VARIABLES;
    return inMemoryVariables;
  })();

  return fetchPromise;
}

// Eager preload in background
if (typeof window !== 'undefined') {
  fetchStoryVariables().catch(() => {});
}

export function getStoryVariable(key: string): any {
  const cleanKey = key.startsWith('$') ? key.substring(1) : key;
  if (inMemoryVariables && cleanKey in inMemoryVariables) {
    return inMemoryVariables[cleanKey];
  }
  return BASE_FALLBACK_VARIABLES[cleanKey];
}

export function resolveStoryValue(val: string): string {
  if (!val) return val;
  if (val.startsWith('$')) {
    const varName = val.substring(1);
    const resolved = getStoryVariable(varName);
    if (resolved !== undefined && resolved !== null) {
      return String(resolved);
    }
  }
  return val;
}

export function resolveStoryVariablesInText(
  text: string, 
  options?: { 
    lang?: string; 
    customNickname?: string; 
    customVars?: Record<string, string> 
  }
): string {
  if (!text) return text;
  let result = text;

  const nickname = options?.customNickname || (options?.lang === 'ru_RU' ? 'Доктор' : options?.lang === 'zh_CN' ? '博士' : 'Doctor');

  // Replace Doctor nickname tags
  result = result.replace(/\{@nickname(?::[^}]+)?\}/gi, nickname);
  result = result.replace(/\{@player_name(?::[^}]+)?\}/gi, nickname);

  // Replace variable interpolations like {$var_name} or {var_name}
  result = result.replace(/\{(\$?[a-zA-Z0-9_]+)\}/g, (match, varName) => {
    const cleanKey = varName.startsWith('$') ? varName.substring(1) : varName;
    if (options?.customVars && cleanKey in options.customVars) {
      return options.customVars[cleanKey];
    }
    const resolved = getStoryVariable(cleanKey);
    if (resolved !== undefined && resolved !== null) {
      return String(resolved);
    }
    return match;
  });

  return result;
}
