export const STORY_LINES_DATA = [
  { id: 'main', topText: 'Main Theme', bottomText: 'For Tomorrow', logo: 'MS_arc' },
  { id: 'rhodes', topText: 'Story Line • RI', bottomText: 'The Ark', logo: 'RI_arc' },
  { id: 'ursus', topText: 'Story Line • UR', bottomText: 'Wildfire', logo: 'UR_arc' },
  { id: 'laterano', topText: 'Story Line • LA', bottomText: 'The Blessed', logo: 'LA_arc' },
  { id: 'kjerag', topText: 'Story Line • KJ', bottomText: 'Snow and Silver Steel', logo: 'KJ_arc' },
  { id: 'siracusa', topText: 'Story Line • SI', bottomText: "Sette Colli's Sprouts", logo: 'SI_arc' },
  { id: 'kazimierz', topText: 'Story Line • KA', bottomText: 'Under the Neon', logo: 'KA_arc' },
  { id: 'sui', topText: 'Story Line • SU', bottomText: 'Through the Ages', logo: 'SU_arc' },
  { id: 'rhine', topText: 'Story Line • RH', bottomText: 'Those Who Take The Future', logo: 'RH_arc' },
  { id: 'abyssal', topText: 'Story Line • AE', bottomText: 'Glimpse of the Depths', logo: 'AE_arc' },
  { id: 'leithanien', topText: 'Story Line • LE', bottomText: 'Spire Mirages', logo: 'LE_arc' },
  { id: 'tara', topText: 'Story Line • TA', bottomText: 'Rekindled Flame', logo: 'TA_arc' },
  { id: 'siesta', topText: 'Story Line • ST', bottomText: 'Summertime Beats', logo: 'ST_arc' },
  { id: 'ts', topText: 'Story Line • TS', bottomText: 'Tales of Terra', logo: 'TS_arc' },
];

// Добавьте сюда префиксы или полные ID эпизодов, чтобы они попадали в нужную стори линию
export const STORY_LINE_FILTERS: Record<string, string[]> = {
  'main': ['main_'],
  'rhodes': ['act9d0', 'act18d0', 'act8mini', 'act18mini', 'act33side', 'act37side'],
  'ursus': ['act10d5', 'act51side'],
  'laterano': ['act16side', 'act26side', 'act42side'],
  'kjerag': ['act14side', 'act30side', 'act46side'],
  'siracusa': ['act21side', 'act38side', 'act20mini'],
  'kazimierz': ['1stact', 'act13d5', 'act13side', 'act9mini', 'act12mini'],
  'sui': ['act6d5', 'act16d5', 'act15side', 'act23side', 'act14mini', 'act31side', 'act40side', 'act19mini', 'act49side'],
  'rhine': ['act15d0', 'act19side', 'act25side', 'act47side'],
  'abyssal': ['act18d3', 'act17side', 'act34side', 'act39side'],
  'leithanien': ['act11d0', 'act18side', 'act29side'],
  'tara': ['act22side', 'act41side'],
  'siesta': ['act3d0', 'act12d0', 'act12side', 'act20side', 'act27side', 'act35side', 'act44side'],
  'ts': [
    'act4d0', 'act5d0', 'act7d5', 'act13d0', 'act15d5',
    'act7mini', 'act10mini', 'act11mini', 'act13mini', 'act15mini', 'act16mini', 'act17mini', 'act21mini',
    'act17d0', 'act24side', 'act28side', 'act32side', 'act36side', 'act43side', 'act45side', 'act48side', 'act50side', 'act53side'
  ],
  'is': ['is_1', 'is_2', 'is_3', 'is_4', 'is_5', 'is_6', 'is_7', 'rogue_'],
  'ra': ['ra_1', 'ra_2', 'act1sandbox', 'sandbox_'],
  'side_content': ['act8d2', 'act13d2', 'act17d7', 'act23d7', 'act31d7', 'act40d7', 'act3fun', 'act4fun', 'act5fun', 'act6fun', 'act1fun', 'act2fun', 'af_']
};
