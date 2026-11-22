export const TORAPPU_ASSET_BASE = 'https://torappu.prts.wiki/assets';

const STORYLINE_ICON_CODES: Record<string, string> = {
  AE_arc: 'ae',
  KA_arc: 'ka',
  KJ_arc: 'kj',
  LA_arc: 'la',
  LE_arc: 'le',
  MS_arc: 'ms',
  RH_arc: 'rh',
  RI_arc: 'rl',
  SI_arc: 'si',
  ST_arc: 'st',
  SU_arc: 'su',
  TA_arc: 'ta',
  TS_arc: 'ts',
  UR_arc: 'ur',
};

export function getStorylineIconUrl(logo: string): string {
  const code = STORYLINE_ICON_CODES[logo] || logo.replace(/_arc$/i, '').toLowerCase();
  return `${TORAPPU_ASSET_BASE}/mixstory/deco/storyline_${code}.png`;
}

export function getOperatorAvatarUrl(operatorId: string, variant: 1 | 2 = 1): string {
  const suffix = variant === 2 ? '_2' : '';
  return `${TORAPPU_ASSET_BASE}/char_avatar/${operatorId}${suffix}.png`;
}

export function getAssistantAvatarUrl(operatorId: string): string {
  return getOperatorAvatarUrl(operatorId, 2);
}

export function getOperatorPortraitUrl(operatorId: string): string {
  return `${TORAPPU_ASSET_BASE}/char_portrait/${operatorId}_1.png`;
}

export function getOperatorCardUrl(operatorId: string): string {
  return `${TORAPPU_ASSET_BASE}/char_arts/${operatorId}_1.png`;
}

const MIXSTORY_KV_BY_MAIN: Record<string, string> = {
  main_0: 'evil_time_part1',
  main_1: 'evil_time_part2',
  main_2: 'seperated_hearts',
  main_3: 'stinging_shock',
  main_4: 'burning_run',
  main_5: 'necessary_solutions',
  main_6: 'partial_necrosis',
  main_7: 'the_birth_of_tragedy',
  main_8: 'roaring_flare',
  main_9: 'stormwatch',
  main_10: 'shatterpoint',
  main_11: 'return_to_mist',
  main_12: 'all_quiet_under_the_thunder',
  main_13: 'the_whirlpool_that_is_passion',
  main_14: 'absolved_will_be_the_seekers',
  main_15: 'dissociative_recombination',
  main_16: 'abnormal_spectrum',
};

const MIXSTORY_KV_BY_EVENT: Record<string, string> = {
  act49side: 'first_of_a_thousand_autumns',
  act51side: 'people_a_people',
  act53side: 'till_the_lands_become_an_orange',
  act16side: 'guiding_ahead',
  act18d0: 'a_walk_in_the_dusk',
  act19side: 'dorothys_vision',
  act20side: 'ideal_city_carnival_in_the_endless_summer',
  act27side: 'so_long_adele',
  act35side: 'adventure_that_cannot_waits_for_the_sun',
  act7mini: 'preludinglights',
};

function storyTitleToSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getMixstorySlug(episodeId: string, englishName?: string): string | null {
  if (episodeId === 'main_17') return null;
  return MIXSTORY_KV_BY_MAIN[episodeId]
    || MIXSTORY_KV_BY_EVENT[episodeId]
    || (englishName ? storyTitleToSlug(englishName) : '')
    || null;
}

export function getMixstoryKvUrl(episodeId: string, englishName?: string): string | null {
  const slug = getMixstorySlug(episodeId, englishName);
  if (!slug) return null;
  return `${TORAPPU_ASSET_BASE}/mixstory/kv/kv_${slug}.png`;
}

export function getMixstoryStoryBgUrl(episodeId: string, englishName?: string): string | null {
  const slug = getMixstorySlug(episodeId, englishName);
  if (!slug) return null;
  return `${TORAPPU_ASSET_BASE}/mixstory/retrobkg/storybg_${slug}.png`;
}
