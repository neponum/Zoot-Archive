import { StoryEpisode } from '../types';

export const EXTRA_STORIES: StoryEpisode[] = [
  // ==========================================
  // INTEGRATED STRATEGIES (IS) / ИНТЕГРИРОВАННЫЕ СТРАТЕГИИ
  // ==========================================
  {
    id: 'is_1',
    name: 'Грибной туман Кэоби',
    englishName: "Ceobe's Fungimist",
    chineseName: '密林悍将归来 · 极境作战',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_fungi',
    startTime: 1598342400,
    year: 2,
    chapters: [
      {
        id: 'is1_entry',
        code: 'IS1-PROLOGUE',
        name: 'Вступление: Грибной туман Кэоби (Entry)',
        storyTxt: 'activities/act12d6/level_act12d6_entry',
        iconId: 'is1_entry',
        storyPic: 'entry_fungi'
      },
      {
        id: 'is1_ending_1',
        code: 'IS1-E1',
        name: 'Финал I: Сладкие грибы и дикие джунгли (Ending 1)',
        storyTxt: 'activities/act12d6/level_act12d6_ending_1',
        iconId: 'is1_e1',
        storyPic: 'entry_fungi'
      },
      {
        id: 'is1_ending_2',
        code: 'IS1-E2',
        name: 'Финал II: Приключение в Акагуле (Ending 2)',
        storyTxt: 'activities/act12d6/level_act12d6_ending_2',
        iconId: 'is1_e2',
        storyPic: 'entry_fungi'
      },
      {
        id: 'is1_ending_3',
        code: 'IS1-E3',
        name: 'Финал III: Пробуждение от грибного сна (Ending 3)',
        storyTxt: 'activities/act12d6/level_act12d6_ending_3',
        iconId: 'is1_e3',
        storyPic: 'entry_fungi'
      }
    ]
  },
  {
    id: 'is_2',
    name: 'Фантом и Алый Бриллиант',
    englishName: 'Phantom & Crimson Solitaire',
    chineseName: '傀影与猩红孤钻',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_crimson',
    startTime: 1641369600,
    year: 3,
    chapters: [
      {
        id: 'is2_entry',
        code: 'IS2-PROLOGUE',
        name: 'Вступление: Пролог замка труппы (Entry)',
        storyTxt: 'obt/roguelike/ro1/level_rogue1_entry',
        iconId: 'is2_entry',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ending_1',
        code: 'IS2-E1',
        name: 'Финал I: Финал балла (舞会终场)',
        storyTxt: 'obt/roguelike/ro1/level_rogue1_ending_1',
        iconId: 'is2_e1',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ending_2',
        code: 'IS2-E2',
        name: 'Финал II: Гротескная комедия (滑稽喜剧)',
        storyTxt: 'obt/roguelike/ro1/level_rogue1_ending_2',
        iconId: 'is2_e2',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ending_3',
        code: 'IS2-E3',
        name: 'Финал III: Торжественное открытие занавеса (盛大揭幕)',
        storyTxt: 'obt/roguelike/ro1/level_rogue1_ending_3',
        iconId: 'is2_e3',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ending_4',
        code: 'IS2-E4',
        name: 'Финал IV: Глава молчания (沉默之章)',
        storyTxt: 'obt/roguelike/ro1/level_rogue1_ending_4',
        iconId: 'is2_e4',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ref_1',
        code: 'IS2-REF-1',
        name: 'Заметки труппы I (Ref Archive I)',
        storyTxt: 'obt/roguelike/ro1/ref/ref_rogue_1',
        iconId: 'is2_ref1',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_ref_2',
        code: 'IS2-REF-2',
        name: 'Заметки труппы II (Ref Archive II)',
        storyTxt: 'obt/roguelike/ro1/ref/ref_rogue_1_2',
        iconId: 'is2_ref2',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_tr_6',
        code: 'IS2-TR-6',
        name: 'Обучение: Часть B-6 (Tutorial B-6)',
        storyTxt: 'obt/roguelike/ro1/tutorial_rogue1_b-6',
        iconId: 'is2_tr6',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_tr_7',
        code: 'IS2-TR-7',
        name: 'Обучение: Часть B-7 (Tutorial B-7)',
        storyTxt: 'obt/roguelike/ro1/tutorial_rogue1_b-7',
        iconId: 'is2_tr7',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_tr_8',
        code: 'IS2-TR-8',
        name: 'Обучение: Часть B-8 (Tutorial B-8)',
        storyTxt: 'obt/roguelike/ro1/tutorial_rogue1_b-8',
        iconId: 'is2_tr8',
        storyPic: 'entry_crimson'
      },
      {
        id: 'is2_tr_9',
        code: 'IS2-TR-9',
        name: 'Обучение: Часть B-9 (Tutorial B-9)',
        storyTxt: 'obt/roguelike/ro1/tutorial_rogue1_b-9',
        iconId: 'is2_tr9',
        storyPic: 'entry_crimson'
      }
    ]
  },
  {
    id: 'is_3',
    name: 'Мизуки и Лазурное Древо',
    englishName: 'Mizuki & Caerula Arbor',
    chineseName: '水月与深蓝之树',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_mizuki',
    startTime: 1664265600,
    year: 4,
    chapters: [
      {
        id: 'is3_entry',
        code: 'IS3-PROLOGUE',
        name: 'Вступление: Лазурные воды (Entry)',
        storyTxt: 'obt/roguelike/ro2/level_rogue2_entry',
        iconId: 'is3_entry',
        storyPic: 'entry_mizuki'
      },
      {
        id: 'is3_ending_1',
        code: 'IS3-E1',
        name: 'Финал I: Простота есть счастье (平凡即是喜乐)',
        storyTxt: 'obt/roguelike/ro2/level_rogue2_ending_1',
        iconId: 'is3_e1',
        storyPic: 'entry_mizuki'
      },
      {
        id: 'is3_ending_2',
        code: 'IS3-E2',
        name: 'Финал II: Эпоха безмолвия (静谧时代)',
        storyTxt: 'obt/roguelike/ro2/level_rogue2_ending_2',
        iconId: 'is3_e2',
        storyPic: 'entry_mizuki'
      },
      {
        id: 'is3_ending_3',
        code: 'IS3-E3',
        name: 'Финал III: Цена затихших волн (息潮的代价)',
        storyTxt: 'obt/roguelike/ro2/level_rogue2_ending_3',
        iconId: 'is3_e3',
        storyPic: 'entry_mizuki'
      },
      {
        id: 'is3_ending_4',
        code: 'IS3-E4',
        name: 'Финал IV: Глубины цвета звездного неба (如星空般深蓝)',
        storyTxt: 'obt/roguelike/ro2/level_rogue2_ending_4',
        iconId: 'is3_e4',
        storyPic: 'entry_mizuki'
      }
    ]
  },
  {
    id: 'is_4',
    name: 'Экспедиция в Йоклумаркар',
    englishName: "Expeditioner's Joklumarkar",
    chineseName: '探索者的银凇止境',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_sami',
    startTime: 1689062400,
    year: 5,
    chapters: [
      {
        id: 'is4_entry',
        code: 'IS4-PROLOGUE',
        name: 'Вступление: Экспедиция в ледники Сами (Entry)',
        storyTxt: 'obt/roguelike/ro3/level_rogue3_entry',
        iconId: 'is4_entry',
        storyPic: 'entry_sami'
      },
      {
        id: 'is4_ending_1',
        code: 'IS4-E1',
        name: 'Финал I: Преодолевая горы (越过群山)',
        storyTxt: 'obt/roguelike/ro3/level_rogue3_ending_1',
        iconId: 'is4_e1',
        storyPic: 'entry_sami'
      },
      {
        id: 'is4_ending_2',
        code: 'IS4-E2',
        name: 'Финал II: Пока не наступит зимняя ночь (直至冬夜降临)',
        storyTxt: 'obt/roguelike/ro3/level_rogue3_ending_2',
        iconId: 'is4_e2',
        storyPic: 'entry_sami'
      },
      {
        id: 'is4_ending_3',
        code: 'IS4-E3',
        name: 'Финал III: Взгляд из бездны (自深处的一瞥)',
        storyTxt: 'obt/roguelike/ro3/level_rogue3_ending_3',
        iconId: 'is4_e3',
        storyPic: 'entry_sami'
      },
      {
        id: 'is4_ending_4',
        code: 'IS4-E4',
        name: 'Финал IV: Начало и конец (终始)',
        storyTxt: 'obt/roguelike/ro3/level_rogue3_ending_4',
        iconId: 'is4_e4',
        storyPic: 'entry_sami'
      },
      {
        id: 'is4_ref',
        code: 'IS4-REF',
        name: 'Экспедиционный архив Сами (Ref Journal)',
        storyTxt: 'obt/roguelike/ro3/ref_rogue_3',
        iconId: 'is4_ref',
        storyPic: 'entry_sami'
      }
    ]
  },
  {
    id: 'is_5',
    name: 'Сказания горнила Сарказов',
    englishName: "Sarkaz's Furnaceside Fables",
    chineseName: '萨卡兹的无终奇语',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_sarkaz',
    startTime: 1721116800,
    year: 6,
    chapters: [
      {
        id: 'is5_entry',
        code: 'IS5-PROLOGUE',
        name: 'Вступление: Сказания у горнила (Entry)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_entry',
        iconId: 'is5_entry',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ending_1',
        code: 'IS5-E1',
        name: 'Финал I: Взгляд в грядущее (憧憬未来)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_ending_1',
        iconId: 'is5_e1',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ending_2',
        code: 'IS5-E2',
        name: 'Финал II: Повесть о двух королях (双王记)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_ending_2',
        iconId: 'is5_e2',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ending_3',
        code: 'IS5-E3',
        name: 'Финал III: Город ангелов (天使之城)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_ending_3',
        iconId: 'is5_e3',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ending_4',
        code: 'IS5-E4',
        name: 'Финал IV: Уход в Дхьяну (遁入阇那)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_ending_4',
        iconId: 'is5_e4',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ending_5',
        code: 'IS5-E5',
        name: 'Финал V: Легенды древнего огня (Ending 5)',
        storyTxt: 'obt/roguelike/ro4/level_rogue4_ending_5',
        iconId: 'is5_e5',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ref',
        code: 'IS5-REF',
        name: 'Архив горнила I (Ref Archive I)',
        storyTxt: 'obt/roguelike/ro4/ref_rogue_4',
        iconId: 'is5_ref',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ref_dlc1',
        code: 'IS5-REF-DLC1',
        name: 'Архив горнила DLC 1 (Ref DLC 1)',
        storyTxt: 'obt/roguelike/ro4/ref_rogue_4_dlc1',
        iconId: 'is5_ref_dlc1',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_ref_dlc2',
        code: 'IS5-REF-DLC2',
        name: 'Архив горнила DLC 2 (Ref DLC 2)',
        storyTxt: 'obt/roguelike/ro4/ref_rogue_4_dlc2',
        iconId: 'is5_ref_dlc2',
        storyPic: 'entry_sarkaz'
      },
      {
        id: 'is5_tr',
        code: 'IS5-TR',
        name: 'Обучение: Испытание огнем (Tutorial)',
        storyTxt: 'obt/roguelike/ro4/tutorial_rogue4_d-tr',
        iconId: 'is5_tr',
        storyPic: 'entry_sarkaz'
      }
    ]
  },
  {
    id: 'is_6',
    name: 'Сад диковин Суй',
    englishName: "Sui's Garden of Grotesqueries",
    chineseName: '岁的界园志异',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_sui_rogue',
    startTime: 1737014400,
    year: 6,
    chapters: [
      {
        id: 'is6_entry',
        code: 'IS6-PROLOGUE',
        name: 'Вступление: Сад диковин Суй (Entry)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_entry',
        iconId: 'is6_entry',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ending_1',
        code: 'IS6-E1',
        name: 'Финал I: Умиротворение по закону (依律镇抚)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_ending_1',
        iconId: 'is6_e1',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ending_2',
        code: 'IS6-E2',
        name: 'Финал II: След на свитке (长卷留痕)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_ending_2',
        iconId: 'is6_e2',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ending_3',
        code: 'IS6-E3',
        name: 'Финал III: Черно-белый узор тайны (黑白入玄)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_ending_3',
        iconId: 'is6_e3',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ending_4',
        code: 'IS6-E4',
        name: 'Финал IV: Живописная глубина (Ending 4)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_ending_4',
        iconId: 'is6_e4',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ending_5',
        code: 'IS6-E5',
        name: 'Финал V: Тайны свитка Суй (Ending 5)',
        storyTxt: 'obt/roguelike/ro5/level_rogue5_ending_5',
        iconId: 'is6_e5',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ref',
        code: 'IS6-REF',
        name: 'Архив свитка Суй I (Ref Archive I)',
        storyTxt: 'obt/roguelike/ro5/ref_rogue_5',
        iconId: 'is6_ref',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ref_dlc1',
        code: 'IS6-REF-DLC1',
        name: 'Архив свитка Суй DLC 1 (Ref DLC 1)',
        storyTxt: 'obt/roguelike/ro5/ref_rogue_5_dlc1',
        iconId: 'is6_ref_dlc1',
        storyPic: 'entry_sui_rogue'
      },
      {
        id: 'is6_ref_dlc2',
        code: 'IS6-REF-DLC2',
        name: 'Архив свитка Суй DLC 2 (Ref DLC 2)',
        storyTxt: 'obt/roguelike/ro5/ref_rogue_5_dlc2',
        iconId: 'is6_ref_dlc2',
        storyPic: 'entry_sui_rogue'
      }
    ]
  },
  {
    id: 'is_7',
    name: 'Черный поток древесного моря',
    englishName: 'Black Stream Tree Sea',
    chineseName: '沉沦者的黑流树海',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_tree_sea',
    startTime: 1749888000,
    year: 7,
    chapters: [
      {
        id: 'is7_entry',
        code: 'IS7-PROLOGUE',
        name: 'Вступление: Вход в поток (Entry)',
        storyTxt: 'obt/roguelike/ro6/level_rogue6_entry',
        iconId: 'is7_entry',
        storyPic: 'entry_tree_sea'
      },
      {
        id: 'is7_ending_1',
        code: 'IS7-E1',
        name: 'Финал I: Принудительный перезапуск (强制重启)',
        storyTxt: 'obt/roguelike/ro6/level_rogue6_ending_1',
        iconId: 'is7_e1',
        storyPic: 'entry_tree_sea'
      },
      {
        id: 'is7_ending_2',
        code: 'IS7-E2',
        name: 'Финал II: Реконструкция измерений (维度重构)',
        storyTxt: 'obt/roguelike/ro6/level_rogue6_ending_2',
        iconId: 'is7_e2',
        storyPic: 'entry_tree_sea'
      },
      {
        id: 'is7_ending_3',
        code: 'IS7-E3',
        name: 'Финал III: Черный поток времени (Ending 3)',
        storyTxt: 'obt/roguelike/ro6/level_rogue6_ending_3',
        iconId: 'is7_e3',
        storyPic: 'entry_tree_sea'
      },
      {
        id: 'is7_ref',
        code: 'IS7-REF',
        name: 'Архив темы VI (Ref Archive)',
        storyTxt: 'obt/roguelike/ro6/ref_rogue_6',
        iconId: 'is7_ref',
        storyPic: 'entry_tree_sea'
      }
    ]
  },

  // ==========================================
  // RECLAMATION ALGORITHM (RA) / АЛГОРИТМ ПРИМИРЕНИЯ
  // ==========================================
  {
    id: 'ra_1',
    name: 'Хроники песчаных отмелей: Сезон 1',
    englishName: 'Tales Within the Sand: Season 1',
    chineseName: '生息演算 · 沙洲遗事 (一期)',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_sand_tales',
    startTime: 1706832000,
    year: 5,
    chapters: [
      {
        id: 'ra1_entry',
        code: 'RA2-1-ENTRY',
        name: 'Вступление: Возвращение в пустыню (Entry)',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_entry',
        iconId: 'ra1_entry',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra1_01',
        code: 'RA2-1-01',
        name: 'Глава 1: Древние тайны песков',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_1',
        iconId: 'ra1_01',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra1_ending_1',
        code: 'RA2-1-E1',
        name: 'Финал I: Судьба Аслана (Ending 1)',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_1',
        iconId: 'ra1_e1',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra1_ending_2',
        code: 'RA2-1-E2',
        name: 'Финал II: Наследие пустыни (Ending 2)',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_2',
        iconId: 'ra1_e2',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra1_ending_3',
        code: 'RA2-1-E3',
        name: 'Финал III: Песчаный рассвет (Ending 3)',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_3',
        iconId: 'ra1_e3',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra1_guide',
        code: 'RA2-1-GUIDE',
        name: 'Руководство по испытаниям пустыни',
        storyTxt: 'obt/sandboxperm/sandbox_1/sandbox_1_challenge_mode_guide',
        iconId: 'ra1_guide',
        storyPic: 'entry_sand_tales'
      }
    ]
  },
  {
    id: 'ra_2',
    name: 'Хроники песчаных отмелей: Сезон 2',
    englishName: 'Tales Within the Sand: Season 2',
    chineseName: '生息演算 · 沙洲遗事 (二期)',
    entryType: 'ACTIVITY',
    storyEntryPicId: 'entry_sand_tales',
    startTime: 1722470400,
    year: 6,
    chapters: [
      {
        id: 'ra2_entry',
        code: 'RA2-2-ENTRY',
        name: 'Вступление: Вторая экспедиция в оазисы (Entry)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_entry',
        iconId: 'ra2_entry',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_ending_1',
        code: 'RA2-2-E1',
        name: 'Финал I: Забытый город (Ending 1)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_1',
        iconId: 'ra2_e1',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_ending_2',
        code: 'RA2-2-E2',
        name: 'Финал II: Эхо песчаных бурь (Ending 2)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_2',
        iconId: 'ra2_e2',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_ending_3',
        code: 'RA2-2-E3',
        name: 'Финал III: Подземные оазисы (Ending 3)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_3',
        iconId: 'ra2_e3',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_ending_4',
        code: 'RA2-2-E4',
        name: 'Финал IV: Великое воссоединение (Ending 4)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_4',
        iconId: 'ra2_e4',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_amy',
        code: 'RA2-2-AMY',
        name: 'Заметки исследователя Ами (Notes AMY)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_xb2amy',
        iconId: 'ra2_amy',
        storyPic: 'entry_sand_tales'
      },
      {
        id: 'ra2_smy',
        code: 'RA2-2-SMY',
        name: 'Заметки торговца Сяо (Notes SMY)',
        storyTxt: 'obt/sandboxperm/sandbox_2/sandbox_2_xb2smy',
        iconId: 'ra2_smy',
        storyPic: 'entry_sand_tales'
      }
    ]
  }
];
