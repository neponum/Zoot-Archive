export const STORY_LINES_DATA = [
  { id: 'main', topText: 'Main Story / 主题曲', bottomText: '为了明日', logo: 'main' },
  { id: 'rhodes', topText: 'Story Line • RL', bottomText: '方舟', logo: 'rhodes' },
  { id: 'laterano', topText: 'Story Line • LA', bottomText: '那被祝福的', logo: 'Laterano' },
  { id: 'kjerag', topText: 'Story Line • KJ', bottomText: '山雪与银铁', logo: 'kjerag' },
  { id: 'siracusa', topText: 'Story Line • SR', bottomText: '叙拉古', logo: 'siracusa' },
  { id: 'kazimierz', topText: 'Story Line • KZ', bottomText: '卡西米尔', logo: 'kazimierz' },
  { id: 'sui', topText: 'Story Line • SUI', bottomText: '岁', logo: 'sui' },
  { id: 'rhine', topText: 'Story Line • RL', bottomText: '莱茵生命', logo: 'rhine' },
  { id: 'abyssal', topText: 'Story Line • AB', bottomText: '深海猎人', logo: 'abyssal' },
  { id: 'leithanien', topText: 'Story Line • LT', bottomText: '莱塔尼亚', logo: 'Leithanien' },
  { id: 'tara', topText: 'Story Line • TR', bottomText: '塔拉', logo: 'tara' },
  { id: 'siesta', topText: 'Story Line • ST', bottomText: '汐斯塔', logo: 'siesta' },
  { id: 'ts', topText: 'Story Line • TS', bottomText: '特蕾西娅', logo: 'ts' },
];

// Добавьте сюда префиксы или полные ID эпизодов, чтобы они попадали в нужную стори линию
export const STORY_LINE_FILTERS: Record<string, string[]> = {
  'main': ['main_'],
  'rhodes': ['act9d0', 'act18d0', 'act8mini', 'act33side', 'act37side', 'act18mini'],
  'laterano': ['act16side', 'act26side', 'act42side'],
  'kjerag': ['act14side', 'act30side', 'act46side'],
  'siracusa': ['act21side', 'act38side', 'act20mini'],
  'kazimierz': ['act13d5', 'act9mini', 'act13side', 'act12mini'],
  'sui': ['act6d5', 'act16d5', 'act15side', 'act23side', 'act14mini', 'act31side', 'act40side', 'act19mini', 'act49side'],
  'rhine': ['act15d0', 'act19side', 'act25side', 'act47side'],
  'abyssal': ['1stact', 'act18d3', 'act17side', 'act34side', 'act39side'],
  'leithanien': ['act11d0', 'act16side', 'act29side'],
  'tara': ['act22side', 'act41side'],
  'siesta': ['act3d0', 'act12d0', 'act12side', 'act20side', 'act27side', 'act35side', 'act44side'],
  'ts': ['act5d0', 'act28side', 'act43side', 'act48side', 'act4d0', 'act7d5', 'act10d5', 'act13d0', 'act15d5', 'act10d5', 'act7mini', 'act10mini', 'act11mini', 'act15mini', 'act16mini', 'act17mini']
};
