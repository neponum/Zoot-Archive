// Auto-generated from official Arknights stage_table & torappu.prts.wiki mixstory data
export interface StoryEpisodeItem {
  code: string;
  name: string;
  tag?: string;
  desc?: string;
}

export interface StorySetData {
  name: string;
  year: number;
  kv: string;
  title: string;
  bgid: string;
  main: boolean;
  group: string;
  deco?: string;
  desc: string;
  tags: string[];
  rewardOp?: string | null;
  episodes: StoryEpisodeItem[];
  /** Прямые ссылки на арт для глав, которых ещё нет в сгенерированном наборе. */
  logoUrl?: string;
  artUrl?: string;
  /** storyTxt первой сцены — открывает читалку без списка операций. */
  startStoryTxt?: string;
}

export type StoryLineNode =
  | {
      t: "split";
      sub: string;
      icon: string;
      bg: string;
    }
  | {
      t: "main" | "set";
      s: string;
    }
  | {
      t: "cross";
      s: string;
      to: number | string;
      unlock?: string;
    };

export interface StoryLineData {
  id: string;
  name: string;
  abbr: string;
  bg: string;
  items: StoryLineNode[];
}

export const STORYMAP_DATA: {
  lines: StoryLineData[];
  sets: Record<string, StorySetData>;
} = {
  "lines": [
    {
      "id": "mainLine",
      "name": "For Tomorrow",
      "abbr": "ms",
      "bg": "bg_mainline_0",
      "items": [
        {
          "t": "split",
          "sub": "HOUR OF AN AWAKENING",
          "icon": "act_0",
          "bg": ""
        },
        {
          "t": "set",
          "s": "setId_mainline_0_1"
        },
        {
          "t": "set",
          "s": "setId_mainline_0_2"
        },
        {
          "t": "set",
          "s": "setId_mainline_0_3"
        },
        {
          "t": "set",
          "s": "setId_mainline_0_4"
        },
        {
          "t": "split",
          "sub": "SHATTER OF A VISION",
          "icon": "act_1",
          "bg": ""
        },
        {
          "t": "set",
          "s": "setId_mainline_1_1"
        },
        {
          "t": "set",
          "s": "setId_mainline_1_2"
        },
        {
          "t": "set",
          "s": "setId_mainline_1_3"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act9d0",
          "to": 1,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_1_4"
        },
        {
          "t": "set",
          "s": "setId_mainline_1_5"
        },
        {
          "t": "split",
          "sub": "SHADOW OF A DYING SUN",
          "icon": "act_2",
          "bg": ""
        },
        {
          "t": "set",
          "s": "setId_mainline_2_1"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act18d0",
          "to": 1,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_2_2"
        },
        {
          "t": "set",
          "s": "setId_mainline_2_3"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act22side",
          "to": 11,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_2_4"
        },
        {
          "t": "set",
          "s": "setId_mainline_2_5"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act33side",
          "to": 1,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_2_6"
        },
        {
          "t": "split",
          "sub": "NEXUS POINT OF FUTURE",
          "icon": "act_3",
          "bg": ""
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act37side",
          "to": 1,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_3_1"
        },
        {
          "t": "set",
          "s": "setId_mainline_3_2"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act51side",
          "to": 2,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_mainline_3_3"
        }
      ]
    },
    {
      "id": "ssLine_1",
      "name": "The Ark",
      "abbr": "rl",
      "bg": "bg_ssline_1",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act9d0"
        },
        {
          "t": "cross",
          "s": "setId_mainline_1_4",
          "to": 0,
          "unlock": "st_06-03"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act18d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act8mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act33side"
        },
        {
          "t": "cross",
          "s": "setId_mainline_2_6",
          "to": 0,
          "unlock": "st_13-03"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act37side"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act41side",
          "to": 11,
          "unlock": "main_03-08"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act18mini"
        }
      ]
    },
    {
      "id": "ssLine_13",
      "name": "Wildfire",
      "abbr": "ur",
      "bg": "bg_ssline_13",
      "items": [
        {
          "t": "cross",
          "s": "setId_mainline_0_2",
          "to": 0,
          "unlock": "main_00-11"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act10d5"
        },
        {
          "t": "cross",
          "s": "setId_mainline_3_1",
          "to": 0,
          "unlock": "main_03-08"
        },
        {
          "t": "cross",
          "s": "setId_mainline_3_2",
          "to": 0,
          "unlock": "st_15-03"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act51side"
        },
        {
          "t": "cross",
          "s": "setId_mainline_3_3",
          "to": 0,
          "unlock": "st_16-02"
        }
      ]
    },
    {
      "id": "ssLine_2",
      "name": "The Blessed",
      "abbr": "la",
      "bg": "bg_ssline_2",
      "items": [
        {
          "t": "cross",
          "s": "setId_ssLine_act5d0",
          "to": 13,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act16side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act26side"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act29side",
          "to": 10,
          "unlock": "main_01-10"
        },
        {
          "t": "cross",
          "s": "setId_mainline_3_1",
          "to": 0,
          "unlock": "main_03-08"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act42side"
        }
      ]
    },
    {
      "id": "ssLine_3",
      "name": "Snow and Silver Steel",
      "abbr": "kj",
      "bg": "bg_ssline_3",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act14side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act30side"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act25side",
          "to": 8,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act46side"
        }
      ]
    },
    {
      "id": "ssLine_4",
      "name": "Sette Colli's Sprouts",
      "abbr": "si",
      "bg": "bg_ssline_4",
      "items": [
        {
          "t": "cross",
          "s": "setId_ssLine_act5d0",
          "to": 13,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act21side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act38side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act20mini"
        }
      ]
    },
    {
      "id": "ssLine_5",
      "name": "Under the Neon",
      "abbr": "ka",
      "bg": "bg_ssline_5",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act13d5"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act9mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act13side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act12mini"
        }
      ]
    },
    {
      "id": "ssLine_6",
      "name": "Through the Ages",
      "abbr": "su",
      "bg": "bg_ssline_6",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act6d5"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act16d5"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act15side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act23side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act14mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act31side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act40side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act19mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act49side"
        }
      ]
    },
    {
      "id": "ssLine_7",
      "name": "Those Who Take The Future",
      "abbr": "rh",
      "bg": "bg_ssline_7",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act15d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act19side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act25side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act47side"
        }
      ]
    },
    {
      "id": "ssLine_8",
      "name": "Glimpse of the Depths",
      "abbr": "ae",
      "bg": "bg_ssline_8",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_1stact"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act18d3"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act17side"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act25side",
          "to": 8,
          "unlock": "main_01-10"
        },
        {
          "t": "cross",
          "s": "setId_mainline_2_6",
          "to": 0,
          "unlock": "st_13-03"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act34side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act39side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act52side"
        }
      ]
    },
    {
      "id": "ssLine_9",
      "name": "Spire Mirages",
      "abbr": "le",
      "bg": "bg_ssline_9",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act11d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act18side"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act26side",
          "to": 3,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act29side"
        }
      ]
    },
    {
      "id": "ssLine_10",
      "name": "Rekindled Flame",
      "abbr": "ta",
      "bg": "bg_ssline_10",
      "items": [
        {
          "t": "cross",
          "s": "setId_mainline_2_1",
          "to": 0,
          "unlock": "main_03-08"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act22side"
        },
        {
          "t": "cross",
          "s": "setId_mainline_2_4",
          "to": 0,
          "unlock": "st_13-03"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act37side",
          "to": 1,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act41side"
        }
      ]
    },
    {
      "id": "ssLine_11",
      "name": "Summertime Beats",
      "abbr": "st",
      "bg": "bg_ssline_11",
      "items": [
        {
          "t": "set",
          "s": "setId_ssLine_act3d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act12d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act12side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act20side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act27side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act35side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act44side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act53side"
        }
      ]
    },
    {
      "id": "ssLine_12",
      "name": "Tales of Terra",
      "abbr": "ts",
      "bg": "bg_ssline_12",
      "items": [
        {
          "t": "cross",
          "s": "setId_mainline_1_1",
          "to": 0,
          "unlock": "main_03-08"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act4d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act7d5"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act13d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act15d5"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act5d0"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act7mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act10mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act11mini"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act16mini"
        },
        {
          "t": "cross",
          "s": "setId_mainline_2_6",
          "to": 0,
          "unlock": "st_13-03"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act17mini"
        },
        {
          "t": "cross",
          "s": "setId_mainline_2_1",
          "to": 0,
          "unlock": "main_03-08"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act28side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act43side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act15mini"
        },
        {
          "t": "cross",
          "s": "setId_ssLine_act35side",
          "to": 12,
          "unlock": "main_01-10"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act48side"
        },
        {
          "t": "set",
          "s": "setId_ssLine_act21mini"
        }
      ]
    }
  ],
  "sets": {
    "setId_mainline_0_1": {
      "name": "Evil Time Part 1",
      "year": 1,
      "kv": "kv_evil_time_part1",
      "title": "title_evil_time_part1",
      "bgid": "storybg_evil_time_part1",
      "main": true,
      "group": "main_0",
      "deco": "deco_evil_time_part1",
      "desc": "The sarcophagus opens, machinery hums, and you slowly open your eyes.\nCatastrophe looms above the mobile city of Chernobog as flames spread across its districts.\nFear and fury converge into a tempest known as the Reunion Movement.\nAnd you, stripped of your memories, will lead Rhodes Island straight through the eye of the storm.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "0-1",
          "name": "Collapse",
          "desc": "The enemy's vanguard has appeared to your three o'clock. Deploy melee Operators to stop them."
        },
        {
          "code": "TR-1",
          "name": "Battlefield Treatment",
          "desc": "Learn how to use Medic Operators."
        },
        {
          "code": "0-2",
          "name": "Protection",
          "desc": "The enemy has sent more troops. Please make sure you have at least 1 Medic Operator in the squad for healing."
        },
        {
          "code": "TR-2",
          "name": "Directed Aim",
          "desc": "Learn about the Operators' range and direction."
        },
        {
          "code": "0-3",
          "name": "Pursuit",
          "desc": "Enemy unmanned drones have entered the battlefield. Please deploy your Sniper Operators to deal with them."
        },
        {
          "code": "TR-3",
          "name": "Precise Strike",
          "desc": "Learn how to take on aerial units with Sniper Operators."
        },
        {
          "code": "0-4",
          "name": "Brawl",
          "desc": "More enemy drones have entered the battlefield. Please make sure your Sniper Operators are in a position to deal with them."
        },
        {
          "code": "TR-4",
          "name": "Vanguard",
          "desc": "Learn how to use Vanguard Operators and the importance of Blocking"
        },
        {
          "code": "0-5",
          "name": "Corruption",
          "desc": "Enemy hounds are extremely fast and can easily slip through our defenses early on. Please deploy a Vanguard Operator to stop them."
        },
        {
          "code": "0-6",
          "name": "Assault",
          "desc": "The path at the bottom of the battlefield has been opened. Please deploy multiple Vanguard Operators to stop the hounds."
        },
        {
          "code": "TR-5",
          "name": "Originium Arts",
          "desc": "Learn how to take on high-defense units with Caster Operators."
        },
        {
          "code": "0-7",
          "name": "Infection",
          "desc": "Enemy units equipped with shields have high physical defense. Please deploy Caster Operators to defeat them."
        },
        {
          "code": "TR-6",
          "name": "AoE Attacks",
          "desc": "Learn about the synergy between Defender Operators and AoE Caster Operators."
        },
        {
          "code": "0-8",
          "name": "Hunting",
          "desc": "Swarms of Originium Slugs are approaching from 9 o'clock. It's recommended to deploy AoE Caster Operators."
        },
        {
          "code": "0-9",
          "name": "Nearl",
          "desc": "More enemy Originium Slugs and shielded soldiers have arrived on the battlefield. Use a combination of Defender Operators and AoE Caster Operators to suppress them."
        },
        {
          "code": "TR-7",
          "name": "Combat Skills",
          "desc": "Learn how to use Skills and how to take on strong enemies with Defender Operators."
        },
        {
          "code": "0-10",
          "name": "Dilemma",
          "desc": "Enemy Junkmen have high HP and ATK. Please deploy Defender Operators to block them, and deploy high-damage Operators to defeat them."
        },
        {
          "code": "0-11",
          "name": "Blockade Running",
          "desc": "Mixed enemy troops are coming from the west. Please make good use of the tactics you just learned, and assemble a suitable squad to deal with them."
        },
        {
          "code": "TR-S-1",
          "name": "Comprehensive Combat Exercise 1",
          "desc": "Doctor, try handling a more complicated situation on the battlefield!"
        },
        {
          "code": "ST-20",
          "name": "Prologue, Part 1",
          "tag": "Interlude",
          "desc": "In the heart of Chernobog, a young girl awakens the person within the coffin - the Doctor.\nThe girl, named Amiya, tries to explain the situation to the Doctor, but the Reunion Movement suddenly attacks them at this time."
        },
        {
          "code": "ST-21",
          "name": "Prologue, Part 2",
          "tag": "Interlude",
          "desc": "Dobermann, leader of the rescue team, briefs everyone on the current situation.\nDuring the briefing, PRTS, the logistics management system of Rhodes Island, establishes contact with Amiya and reintegrates the Doctor into the system."
        }
      ]
    },
    "setId_mainline_0_2": {
      "name": "Evil Time Part 2",
      "year": 1,
      "kv": "kv_evil_time_part2",
      "title": "title_evil_time_part2",
      "bgid": "storybg_evil_time_part2",
      "main": true,
      "group": "main_1",
      "deco": "deco_evil_time_part2",
      "desc": "Blackened Originium spires pierce the streets as the countdown to the Catastrophe reaches zero.\nEvery step out of Chernobog demands sacrifice amidst ash and shattered steel.\nAcross the burning plaza, Talulah stands atop the ruins in silence.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "1-1",
          "name": "Isolated Island",
          "desc": "The battlefield is narrower than before, and the enemies have gotten stronger.\nPlease make sure your Operators have been upgraded before entering the battlefield."
        },
        {
          "code": "1-2",
          "name": "Sprawl",
          "desc": "At the same time, members of the Reserve Op Team have run into new enemies on their way to help... Please pay attention to the surprise attack from the north.\n Unable to edit the squad"
        },
        {
          "code": "1-3",
          "name": "Running Wild",
          "desc": "This battlefield is wider and enemies will attack from two paths.\nPlease note that enemies coming from the southern path have higher defense. Think carefully about where to deploy your Operators."
        },
        {
          "code": "1-4",
          "name": "Omen",
          "desc": "The battlefield is even wider this time. You will need at least 3 melee Operators to block all the enemies."
        },
        {
          "code": "1-5",
          "name": "Paralysis",
          "desc": "This battle takes place on Chernobog's main street. Please have at least 4 melee Operators in the squad to block all the enemies."
        },
        {
          "code": "TR-8",
          "name": "Obstructions",
          "desc": "Learn how to use Roadblocks."
        },
        {
          "code": "1-6",
          "name": "Catastrophe",
          "desc": "Roadblocks help us control enemy movements when they approach from multiple directions. \nPlease deploy Roadblocks to control the flow of battle. \n Deploy to block a tile on the map. Enemies will attack it if no path is available."
        },
        {
          "code": "TR-9",
          "name": "Indirect Protection",
          "desc": "Learn to take advantage of whatever may be available on the battlefield."
        },
        {
          "code": "1-7",
          "name": "The Tyrant",
          "desc": "Please combine your Operators' firepower with the Stun Generator on the battlefield to stop the enemy attack.\n Pay a cost to activate it, damaging and stunning nearby enemies."
        },
        {
          "code": "1-8",
          "name": "Resolve",
          "desc": "Be careful of the large number of approaching enemies, but keep an eye on the agile Reunion leader.\nThe Stun Generator can stop her movement for a short time.\n Pay a cost to activate it, damaging and stunning nearby enemies."
        },
        {
          "code": "TR-10",
          "name": "Squad Defense",
          "desc": "Learn how to protect weak Operators with the deployment order."
        },
        {
          "code": "1-9",
          "name": "Rout",
          "desc": "Enemies won't slow down their attack even during a Catastrophe.\nPlease pay attention to enemy ranged units and protect your own ranged Operators."
        },
        {
          "code": "1-10",
          "name": "Remnants",
          "desc": "We are not far from the outskirts of Chernobog. Hang in there and victory will be ours.\nPlease pay attention to enemy ranged units and protect your own ranged Operators."
        },
        {
          "code": "1-11",
          "name": "The Forgotten",
          "desc": "At the same time, Reserve Op Team members have run into W, one of the enemy's leaders, on their way to help... Observe W's movements carefully while defending against the enemy attack.\n Unable to edit the squad"
        },
        {
          "code": "1-12",
          "name": "Pyrrhic Victory",
          "desc": "W's troops have launched their attack from Chernobog's labyrinthine streets. Make good use of the environment.\n Pay a cost to activate it, damaging and stunning nearby enemies."
        }
      ]
    },
    "setId_mainline_0_3": {
      "name": "Separated Hearts",
      "year": 1,
      "kv": "kv_seperated_hearts",
      "title": "title_seperated_hearts",
      "bgid": "storybg_seperated_hearts",
      "main": true,
      "group": "main_2",
      "deco": "deco_seperated_hearts",
      "desc": "Escaping the ashes of Chernobog, Rhodes Island approaches the neon metropolis of Lungmen.\nNegotiations with the Lungmen Guard Department hang on a razor-thin balance of trust.\nIn the rain-slicked slums below the city plates, unseen eyes track a lone Infected girl.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "TR-11",
          "name": "Tactical Blockage",
          "desc": "Learn to use Supporter and Caster Operators to take on the enemy's armored units."
        },
        {
          "code": "2-1",
          "name": "To Lungmen",
          "desc": "The paths on the battlefield are tortuous. Consider using Supporter Operators to suppress the enemy's elite units."
        },
        {
          "code": "S2-1",
          "name": "Slow-1",
          "desc": "Please pay attention to the enemy's shielded soldiers, who have high defense."
        },
        {
          "code": "2-2",
          "name": "War of Words",
          "desc": "More enemies with high defense have appeared in the center of the battlefield. Supporter and Caster Operators can reduce their combat power significantly."
        },
        {
          "code": "S2-2",
          "name": "Slow-2",
          "desc": "Please pay attention to the aerial units to the north and south."
        },
        {
          "code": "S2-3",
          "name": "Blockade-1",
          "desc": "Deploy Roadblocks in the right places to stop enemies advancing from two directions.\n Deploy it to block the enemy's advance"
        },
        {
          "code": "S2-4",
          "name": "Blockade-2",
          "desc": "The battlefield is even more complicated now. Think carefully before deploying the Roadblocks.\n Deploy it to block the enemy's advance"
        },
        {
          "code": "2-3",
          "name": "Presumption of Innocence",
          "desc": "Enemies are coming from too many directions this time, complicating your deployment.\nUse Roadblocks to control the enemy's advance.\n Deploy it to block the enemy's advance."
        },
        {
          "code": "TR-12",
          "name": "Casters",
          "desc": "Learn how to reduce the damage taken from enemy AOE units by deploying Operators in formation."
        },
        {
          "code": "2-4",
          "name": "Penguin Logistics",
          "desc": "Enemy Elite Casters confirmed.\nThis type of enemy can pose a huge threat to your Operators. Scatter them."
        },
        {
          "code": "S2-5",
          "name": "Caster-1",
          "desc": "The enemy's Elite Casters have scattered. Protocol advises taking them out one by one with Sniper Operators."
        },
        {
          "code": "S2-6",
          "name": "Caster-2",
          "desc": "The enemy's Elite Casters remain the biggest threat. Scatter your Operators to reduce damage taken."
        },
        {
          "code": "S2-7",
          "name": "Caster-3",
          "desc": "The enemy has sent even more Elite Casters. Scatter the Operators as previous."
        },
        {
          "code": "TR-13",
          "name": "Proactive Deployment",
          "desc": "Learn to intercept the enemy's key units with Operators."
        },
        {
          "code": "2-5",
          "name": "Falling Objects",
          "desc": "Massive deployment of enemy Elite Casters confirmed.\nProtocol advises destroying them one by one."
        },
        {
          "code": "2-6",
          "name": "Hold on Tight",
          "desc": "The roof is wide enough to deploy a variety of formations.\nStill, watch out for surprise attacks..."
        },
        {
          "code": "TR-14",
          "name": "Terrain Attack",
          "desc": "Learn to destroy tough enemies using the environment."
        },
        {
          "code": "2-7",
          "name": "A Matter of Public Health",
          "desc": "Enemy's new aerial units have been confirmed on your 1 o'clock and 7 o'clock. Please exercise caution."
        },
        {
          "code": "S2-8",
          "name": "Trap-1",
          "desc": "The roof is not surrounded by railings. Make good use of that and things will be much easier."
        },
        {
          "code": "S2-9",
          "name": "Trap-2",
          "desc": "Enemies have become stronger. Using the terrain is still the key to victory."
        },
        {
          "code": "2-8",
          "name": "No Promises",
          "desc": "Some vantage points on the roof are ideal for sniping the enemy's aerial units.\nAlso, the roof is not surrounded by railings. Can we use that to our advantage...?\n Operators deployed on it will attack a bit more slowly but their ATK against aerial units will be increased significantly"
        },
        {
          "code": "2-9",
          "name": "Cubiculum Obscurum",
          "desc": "The battlefield is narrow this time. Please make sure you have enough melee Operators to stop enemies.\n Operators deployed on it will attack a bit more slowly but their ATK against aerial units will be increased significantly"
        },
        {
          "code": "S2-10",
          "name": "Suffocation-1",
          "desc": "Please pay attention to the surprise attack from the south."
        },
        {
          "code": "S2-11",
          "name": "Suffocation-2",
          "desc": "The battlefield is completely divided again. Try to defend against enemies from both directions."
        },
        {
          "code": "S2-12",
          "name": "Suffocation-3",
          "desc": "Please pay attention to the surprise attack launched by enemy aerial units from the east and west."
        },
        {
          "code": "2-10",
          "name": "Beyond Cure",
          "desc": "Skullshatterer attacks with her troops! This complicated battlefield will be a test of your skills.\n Operators deployed on it are healed over time."
        },
        {
          "code": "TR-S-2",
          "name": "Comprehensive Combat Exercise 2",
          "desc": "Doctor, try handling a more complicated situation on the battlefield!"
        }
      ]
    },
    "setId_mainline_0_4": {
      "name": "Stinging Shock",
      "year": 1,
      "kv": "kv_stinging_shock",
      "title": "title_stinging_shock",
      "bgid": "storybg_stinging_shock",
      "main": true,
      "group": "main_3",
      "deco": "deco_stinging_shock",
      "desc": "Beyond the outer perimeter of Lungmen, the pursuit reaches the desolate wasteland.\nShattered ideals and old friendships clash amidst the ruins of an abandoned industrial zone.\nMisha's choice becomes the fulcrum upon which both Reunion and Rhodes Island pivot.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "3-1",
          "name": "Meeting",
          "desc": "When fighting in the wild, Operators can take cover in some forms of terrain to reduce damage taken, but please pay attention to the enemy's invisible troops.\n Operators deployed on it will not be targeted by enemy ranged attacks."
        },
        {
          "code": "3-2",
          "name": "Memory",
          "desc": "The enemy has sent even more ranged units.\nEliminate them first as they pose a greater threat.\n Operators deployed on it will not be targeted by enemy ranged attacks."
        },
        {
          "code": "3-3",
          "name": "Convolution",
          "desc": "Enemies equipped with a Detector can disable the effect of Bushes.\nBe aware of the enemy leader, who has the ability to disrupt our formation.\n Operators deployed on it will not be targeted by enemy ranged attacks."
        },
        {
          "code": "TR-15",
          "name": "Strategic Redeployment",
          "desc": "Learn to retreat Operators in time to pass the final test."
        },
        {
          "code": "3-4",
          "name": "Crack",
          "desc": "An previously unknown enemy leader and an elite team are launching a ferocious attack from 6 o'clock.\nDeploy operators to engage immediately!\n Operators deployed on it will not be targeted by enemy ranged attacks."
        },
        {
          "code": "3-5",
          "name": "Call",
          "desc": "Enemy's Invisible Casters have been confirmed on the battlefield.\nEliminate them first as they pose a greater threat.\n Operators deployed on it will not be targeted by enemy ranged attacks."
        },
        {
          "code": "3-6",
          "name": "Decision",
          "desc": "The enemy has deployed many invisible ranged units.\nUse the Detector to launch a counterattack.\n Once activated, it will reveal nearby invisible enemies for a period of time."
        },
        {
          "code": "3-7",
          "name": "Roar",
          "desc": "The battlefield is complicated. Use Roadblocks to guide enemies into range of our Snipers.\n Deploy it to block the enemy's advance\n Once activated, it will reveal nearby invisible enemies for a period of time."
        },
        {
          "code": "3-8",
          "name": "Dusk",
          "desc": "Skullshatterer is coming at us with her troops again, only more dangerous...\n Operators deployed on it will have higher DEF"
        },
        {
          "code": "S3-1",
          "name": "Lurking-1",
          "desc": "Please pay attention to the joint attack of enemy's invisible units and Casters."
        },
        {
          "code": "S3-2",
          "name": "Lurking-2",
          "desc": "Enemy only focuses their attack on one spot, but still it's recommended to deploy Operators in the rear."
        },
        {
          "code": "S3-3",
          "name": "Recon-1",
          "desc": "Making good use of the Bushes and the Detector is the key to victory.\n Operators deployed on it will not be targeted by enemy's ranged attack\n Once activated, it will disable the invisibility of nearby enemies for a certain period"
        },
        {
          "code": "S3-4",
          "name": "Recon-2",
          "desc": "Enemies are attacking from different routes this time. Please make sure you have enough melee Operators to stop them.\n Operators deployed on it will not be targeted by enemy's ranged attack"
        },
        {
          "code": "S3-5",
          "name": "Recon-3",
          "desc": "The route is simple this time. It will be a test for your Operators' strength."
        },
        {
          "code": "S3-6",
          "name": "Ignition-1",
          "desc": "This battle requires us to concentrate our firepower upon swarms of enemies."
        },
        {
          "code": "S3-7",
          "name": "Concealed-1",
          "desc": "A large number of invisible enemies have surrounded the battlefield. Prepare to face them with a solid frontline and far-sighted scouts."
        }
      ]
    },
    "setId_mainline_1_1": {
      "name": "Burning Run",
      "year": 1,
      "kv": "kv_burning_run",
      "title": "title_burning_run",
      "bgid": "storybg_burning_run",
      "main": true,
      "group": "main_4",
      "deco": "deco_burning_run",
      "desc": "Reconnaissance squads report abnormal Originium readings inside the abandoned city sector.\nFrost crystals begin to creep across steel bulkheads despite the scorching summer air.\nA chilling song echoes across the wasteland, heralding the arrival of the Yeti Squadron.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "4-1",
          "name": "Consolation",
          "desc": "Melee soldiers of another race have been confirmed in Chernobog. Please be careful."
        },
        {
          "code": "4-2",
          "name": "A Walk in the Rain",
          "desc": "Ranged soldiers of another race have joined the battle.\nProtocol advises deploying physical Operators to counter them."
        },
        {
          "code": "4-3",
          "name": "Artificial Cold",
          "desc": "High-energy Originium radiation has been detected in Chernobog.\nIf enemy units absorb this radiation...\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly."
        },
        {
          "code": "4-4",
          "name": "Nerves of Steel",
          "desc": "The enemy has launched their final attack and approaches from all directions! Deploy Operators to repel them immediately.\nDeploy it to block the enemy's advance.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly."
        },
        {
          "code": "4-5",
          "name": "Bureaucracy",
          "desc": "Enemy melee Arts units have been confirmed on the battlefield. Avoid engaging in melee combat with them. Stay alert."
        },
        {
          "code": "4-6",
          "name": "Ignorance",
          "desc": "Unknown creatures infected with Oripathy have been found on the battlefield. They deal massive damage to nearby Operators when they die.\nIn addition, please look out for Heated Paths. They emit burning gas.\n Deals massive damage to Operators and enemies on it at intervals."
        },
        {
          "code": "4-7",
          "name": "Mutual Benefits",
          "desc": "A large number of creatures infected with Oripathy have appeared on the battlefield!\nThink carefully about when to destroy them.\n Deals massive damage to Operators and enemies on it at intervals."
        },
        {
          "code": "4-8",
          "name": "Acute Stress Disorder",
          "desc": "A force of mixed enemy troops advances on us from the east. Prepare to engage."
        },
        {
          "code": "4-9",
          "name": "Bad to the Bone",
          "desc": "Enemy Elite Casters of another race have been confirmed on the battlefield.\nThey seem to have special powers. Please be careful.\n Deals massive damage to Operators and enemies on it at intervals."
        },
        {
          "code": "4-10",
          "name": "Extinguished Flames",
          "desc": "FrostNova and her elite team have the area completely surrounded.\nAll we can do now is to engage and hold them at our perimeter."
        },
        {
          "code": "S4-1",
          "name": "Cluster-1",
          "desc": "Make good use of the Active Originium in the middle of the battlefield and things will be much easier.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly"
        },
        {
          "code": "S4-2",
          "name": "Cluster-2",
          "desc": "Enemies are coming from more directions. Still it's recommended to build your defense around the Active Originium.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly"
        },
        {
          "code": "S4-3",
          "name": "Cluster-3",
          "desc": "The alien force has split into two. It may be a good choice to consume their HP by the Active Originium.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly"
        },
        {
          "code": "S4-4",
          "name": "Myriapoda-1",
          "desc": "Please be careful of the Originium Slugs in the south and the north and don't let them go through our defense."
        },
        {
          "code": "S4-5",
          "name": "Myriapoda-2",
          "desc": "The battlefield is narrow this time. Please think carefully about where to deploy Operators."
        },
        {
          "code": "S4-6",
          "name": "Myriapoda-3",
          "desc": "The battlefield is even narrower. It's recommended to upgrade Operators to get through it."
        },
        {
          "code": "S4-7",
          "name": "Rage-1",
          "desc": "Please pay attention to the joint attack of enemy's Originium Slugs and alien elite Casters."
        },
        {
          "code": "S4-8",
          "name": "Rage-2",
          "desc": "Scatter the Operators and use ranged Operators to take out the Originium Slugs from afar."
        },
        {
          "code": "S4-9",
          "name": "Rage-3",
          "desc": "There is not much space for melee Operators this time. Try using Specialist Operators to cope with the tough enemies on the left."
        },
        {
          "code": "S4-10",
          "name": "Stand Firm-1",
          "desc": "A large number of elite enemies have appeared. Please be careful."
        }
      ]
    },
    "setId_mainline_1_2": {
      "name": "Necessary Solutions",
      "year": 1,
      "kv": "kv_necessary_solutions",
      "title": "title_necessary_solutions",
      "bgid": "storybg_necessary_solutions",
      "main": true,
      "group": "main_5",
      "deco": "deco_necessary_solutions",
      "desc": "Reunion's surprise assault seizes the L.G.D. headquarters in the dead of night.\nCh'en and Rhodes Island strike back through the vertical labyrinth of Lungmen's core.\nAt the summit of the central tower, two ideals face off beneath the storm clouds.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "5-1",
          "name": "Cycle of Enmity",
          "desc": "Enemy units have been spotted in the wilds outside Lungmen. Beware of the swift moving Breakers and well-protected Spec Ops Casters in particular."
        },
        {
          "code": "5-2",
          "name": "Inexpressible",
          "desc": "A large number of Reunion forces have been spotted in urbanized areas of Lungmen. Beware of Breakers approaching from 12 o'clock."
        },
        {
          "code": "5-3",
          "name": "Courage and Mortality",
          "desc": "Enemy Spec Ops Caster Leaders have spread throughout the battlefield. They can break our operators in an instant without proper preparation against their Arts attacks. Plan carefully."
        },
        {
          "code": "5-4",
          "name": "Nobody's Home",
          "desc": "A swarm of enemy drones approaches from 4 directions. Beware of a new type of enemy drone, the bomb-carrying Bombtails."
        },
        {
          "code": "5-5",
          "name": "Unending War",
          "desc": "An enhanced version of the enemy Bombtail drone has entered the battle. Their AOE damaging explosive bombs can make quick work of our defensive line. Do what you can to counter them beforehand."
        },
        {
          "code": "5-6",
          "name": "Surprise Attack",
          "desc": "The enemy's Arts Master drones are highly maneuverable and capable of launching Arts attacks from above. Counter them with our newly developed Drone Jammer. \n can stop nearby enemy drones from firing, greatly reduce their speed, and prevent them from activating special abilities after being deployed."
        },
        {
          "code": "5-7",
          "name": "In Life and in Death",
          "desc": "Frost Drones greatly reduce the Attack Speed of our nearby units. Counter them with operators or Jammers to prevent them from using their abilities. \n can stop nearby enemy drones from firing, greatly reduce their speed, and prevent them from activating special abilities after being deployed."
        },
        {
          "code": "5-8",
          "name": "Intimate Knowledge",
          "desc": "A group of strange enemy soldiers with regeneration abilities have arrived on the battlefield. Eliminate them as quickly as possible. Arrange your deployment to avoid enemy Turrets. \n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "5-9",
          "name": "The Devil",
          "desc": "Things just keep getting stranger... Enemy Veteran Junkmen now have regenerative abilities as well. Take care to eliminate them as quickly as possible. \n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "5-10",
          "name": "The Dark Before Dawn",
          "desc": "We are now deep behind enemy lines and there is no going back. Use your tactical expertise and find a way through the crossfire between Mephisto and Faust! \n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "5-11",
          "name": "Decisive Counterattack",
          "desc": "Victories are short, but wars are long, and our enemies are unknown."
        },
        {
          "code": "S5-1",
          "name": "Entrenched-1",
          "desc": "The enemies continue their massed assault. Beware of the Wraiths sneaking in from above."
        },
        {
          "code": "S5-2",
          "name": "Entrenched-2",
          "desc": "The situation in the field is getting more complicated. Carefully deploy melee Operators to stop the swarm of enemy Breakers."
        },
        {
          "code": "S5-3",
          "name": "Biting Cold-1",
          "desc": "Well armored Frost Drones are causing havoc with our forces. Counter them with Caster Operators."
        },
        {
          "code": "S5-4",
          "name": "Biting Cold-2",
          "desc": "The enemy force is a mix of Arts Masters and Frost Drones making it increasingly difficult to handle. Make use of Sniper and Caster Operators and don't forget our Jammers! \n can stop nearby enemy drones from firing, greatly reduce their speed, and prevent them from activating special abilities after being deployed."
        },
        {
          "code": "S5-5",
          "name": "Panic-1",
          "desc": "Possessed Soldier Leaders can regenerate faster and pose a serious threat. Take them out first. \n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "S5-6",
          "name": "Panic-2",
          "desc": "Defense Crushers are enemy elite units specialized in defense. Their attacks can also stun our melee units. Take advantage of their slow moving speed to counter them. \n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "S5-7",
          "name": "Hover-1",
          "desc": "A large number of unmanned enemy drones have appeared on this operation. Please take charge of the anti-air defense.\n Stops nearby enemy drones from firing, greatly reduces their speed, and prevents them from activating special abilities."
        },
        {
          "code": "S5-8",
          "name": "Hover-2",
          "desc": "Enemies attack from different directions in this battle. Be careful of the large number of Casters that are approaching."
        },
        {
          "code": "S5-9",
          "name": "Abnormality-1",
          "desc": "A number of possessed enemies have appeared during this battle. Please make sure to fortify your defenses."
        },
        {
          "code": "H5-1",
          "name": "Operation Inferno-1",
          "desc": "The enemy is attacking with the full force of their drone armada! Proper use of Snipers and Casters is the key to victory. \n can stop nearby enemy drones from firing, greatly reduce their speed, and prevent them from activating special abilities after being deployed."
        },
        {
          "code": "H5-2",
          "name": "Operation Inferno-2",
          "desc": "The terrain on this battlefield is relatively simple, but beware of enemy Casters. Consider deploying units with high Arts Res to draw their fire or take advantage of the holes on the ground."
        },
        {
          "code": "H5-3",
          "name": "Operation Inferno-3",
          "desc": "The battlefield is full of winding roads and blanketed in a poisonous haze. These factors have greatly hindered our ranged Operators' effectiveness. Consider deploying more Medic Operators maintain consistent healing. \n Operators lose HP constantly"
        },
        {
          "code": "H5-4",
          "name": "Operation Inferno-4",
          "desc": "Faust has returned even stronger than before, and all Turrets on the field have been greatly enhanced. Plan your deployment positions and operators carefully to repel Faust's ferocious attack! \n periodically fire bolts, dealing Physical damage to our units."
        }
      ]
    },
    "setId_mainline_1_3": {
      "name": "Partial Necrosis",
      "year": 1,
      "kv": "kv_partial_necrosis",
      "title": "title_partial_necrosis",
      "bgid": "storybg_partial_necrosis",
      "main": true,
      "group": "main_6",
      "deco": "deco_partial_necrosis",
      "desc": "Ice spreads across the lower districts of Lungmen as the Yeti Squadron makes its final stand.\nAmidst the frozen ruins, FrostNova confronts Rhodes Island with unwavering conviction.\nIn the quiet aftermath of the blizzard, the embers of her resolve join Rhodes Island.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "6-1",
          "name": "Deadlock",
          "desc": "Heavily-armored Infected hosts have appeared in Lungmen's urban districts. Not only are they able to shrug off most blows, but they are also capable of regenerating. Exercise caution when dealing with them."
        },
        {
          "code": "6-2",
          "name": "Misunderstandings",
          "desc": "What kind of abominations are those?! New, grotesque Infected combatants have been seen throughout the combat zones of Lungmen. Their speed and power greatly exceed that of regular hosts, so please be careful!"
        },
        {
          "code": "6-3",
          "name": "Lost at Once",
          "desc": "The ranks of these aggressive hosts continue to grow, and they will soon apply heavy pressure to our formation. However, their lives seem to also be quickly burning out..."
        },
        {
          "code": "6-4",
          "name": "Festering Scars",
          "desc": "This area is under attack by aggressive hosts that hurl projectiles at us. Please beware of their long-range attacks."
        },
        {
          "code": "6-5",
          "name": "Who to Kill?",
          "desc": "A large number of both melee and ranged Possessed Soldiers have appeared. Perhaps a well-planned defense can halt their onslaught..."
        },
        {
          "code": "6-6",
          "name": "Leave it Behind",
          "desc": "He has never forgotten the promise he once made..."
        },
        {
          "code": "6-7",
          "name": "Broken Strings",
          "desc": "As the commander of Rhodes Island, you must direct your Operators in a battle against Faust, one of the leaders of Reunion. Be careful.\n periodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "6-8",
          "name": "It Fell From the Sky!",
          "desc": "The legendary Yeti Squadron, an elite anti-Ursus squad of Infected, has appeared in a Chernobog sub-city. Their fighting style is unlike any Reunion forces we've encountered before, so make sure not to underestimate them."
        },
        {
          "code": "TR-16",
          "name": "Harsh Environment",
          "desc": "Learn about the 'Cold' and 'Frozen' status effects."
        },
        {
          "code": "6-9",
          "name": "Different Perspective",
          "desc": "The Yeti Squadron, in addition to fielding casters that specialize in ice-based Arts, has also released Originium Slugs that explode in a shower of rime upon death. Please exercise caution."
        },
        {
          "code": "6-10",
          "name": "Bells of Liberation",
          "desc": "The icecleavers, a special group of combatants of the Yeti Squadron, deal massive damage to frozen Operators. Stay calm when fighting them."
        },
        {
          "code": "6-11",
          "name": "'Times Like These'",
          "desc": "A large number of Yeti Squadron troops have launched an offensive against us, and an arduous battle looms ahead. Make good use of our Operators' various strengths and aim to defeat the enemy."
        },
        {
          "code": "6-12",
          "name": "Snow Upon the Tundra",
          "desc": "The Yeti Squadron has placed special Originium facilities around the battlefield. Please be prepared to respond accordingly. \nPeriodically releases a frigid wave that will inflict Cold to affected allied units."
        },
        {
          "code": "6-13",
          "name": "No Light Without Fire",
          "desc": "She has never forgotten about that certain place..."
        },
        {
          "code": "6-14",
          "name": "Frost Upon the Tundra",
          "desc": "The 'Oneiros' drones controlled by the Yeti Squadron are capable of inflicting Arts damage in an area upon our Operators, as well as inflicting the Cold status. Please prioritize taking them down.\nPeriodically releases a frigid wave that will inflict Cold to affected allied units."
        },
        {
          "code": "6-15",
          "name": "Nostalgia",
          "desc": "Enemy icecleavers have been spotted in conjunction with Oneiros drones. As this will surely be a very difficult battle, please plan carefully to deal with various status abnormalities and enemy attacks."
        },
        {
          "code": "6-16",
          "name": "Black Rabbit, White Rabbit",
          "desc": "Before us stands the commander of the Yeti Squadron, FrostNova, enhanced with a terrifying power we've never seen before. As she is one of the strongest warriors in Reunion, we must utilize every bit of our strength to overcome her.\n Periodically releases a frigid wave that will inflict Cold to affected allied units."
        },
        {
          "code": "6-17",
          "name": "Winter's End",
          "desc": "We chose to fight to the bitter end. She did as well."
        },
        {
          "code": "6-18",
          "name": "Only You Know",
          "desc": "She has never forgotten about that night..."
        },
        {
          "code": "S6-1",
          "name": "Condensation-1",
          "desc": "The Yeti Squadron is utilizing Infused Glacial Originium Slugs in their assault upon us. Please be careful of these aberrant creatures."
        },
        {
          "code": "S6-2",
          "name": "Condensation-2",
          "desc": "A failure to handle the synergy between Infused Glacial Originium Slugs and Icecleavers will result in massive losses."
        },
        {
          "code": "S6-3",
          "name": "Hoarfrost-1",
          "desc": "An attack from a large number of Infused Glacial Originium Slugs, followed by a wave of Icecleavers, will inflict catastrophic damage to insufficiently prepared squads."
        },
        {
          "code": "S6-4",
          "name": "Hoarfrost-2",
          "desc": "Surrounded by a harsh environment filled with Originium Ice Crystals and powerful Icecleavers, how are we to mount a response to this attack? \nPeriodically releases a frigid wave that will inflict Cold to affected allied units."
        },
        {
          "code": "H6-1",
          "name": "Operation Cocytus-1",
          "desc": "Elite enemy troops, as well as Enraged Possessed Soldiers, have launched an offensive against us. Please make use of the central road to mount an effective defense."
        },
        {
          "code": "H6-2",
          "name": "Operation Cocytus-2",
          "desc": "The Possessed Soldiers are launching a vicious two-pronged attack, and we must stay calm if we are to deal with the threat.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and Attack Speed will be increased significantly."
        },
        {
          "code": "H6-3",
          "name": "Operation Cocytus-3",
          "desc": "The location of the Infused Glacial Originium Slugs will pose a significant threat to our Operators. Please think carefully about how to deal with these troublesome creatures."
        },
        {
          "code": "H6-4",
          "name": "Operation Cocytus-4",
          "desc": "The fully empowered FrostNova has returned to the battlefield. Use your tactical acumen to endure the blizzard! \nPeriodically releases a frigid wave that will inflict Cold to affected allied units."
        }
      ]
    },
    "setId_mainline_1_4": {
      "name": "The Birth of Tragedy",
      "year": 2,
      "kv": "kv_the_birth_of_tragedy",
      "title": "title_the_birth_of_tragedy",
      "bgid": "storybg_the_birth_of_tragedy",
      "main": true,
      "group": "main_7",
      "deco": "deco_the_birth_of_tragedy",
      "desc": "The core city of Chernobog groans as its propulsion engines ignite toward collision.\nRhodes Island infiltrates the command tower to halt the catastrophic trajectory.\nOld comrades and sworn enemies cross paths along the scorching steel corridors.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "7-1",
          "name": "32:00:00",
          "desc": "A person walks into the sunset, alone."
        },
        {
          "code": "7-2",
          "name": "Night of Farewells",
          "desc": "Remnants of Reunion's forces remain entrenched in the streets of Lungmen, desperately resisting to the bitter end. Prepare for combat."
        },
        {
          "code": "7-3",
          "name": "Renegade Blade",
          "desc": "Mephisto's Herd is no longer under the control of its leader, but their bottomless aggression has prompted them to attack Rhodes Island's ship. Put them out of their misery."
        },
        {
          "code": "7-4",
          "name": "Side by Side-1",
          "desc": "The spearhead of Reunion's reconnaissance force has appeared at the location where we established a concealed facility. Be careful, these are no ordinary Reunion grunts that we're dealing with."
        },
        {
          "code": "7-5",
          "name": "Side by Side-2",
          "desc": "Various Reunion members patrol the passages of the hub layer in the heart of Chernobog. Don't take them lightly; their uniforms... are the same as the Infected guerillas that once fought in the northern tundra of Ursus."
        },
        {
          "code": "TR-17",
          "name": "Focused Strike",
          "desc": "Learn how to counter the commanding tactics of Reunion's guerrilla forces."
        },
        {
          "code": "7-6",
          "name": "Forgotten Lands",
          "desc": "We've encountered guerilla messengers on our way to the central area of the core city. They employ a unique method of communication and commanding, and we may perhaps be able to draw some inspiration from fighting against them..."
        },
        {
          "code": "7-7",
          "name": "26:37:14",
          "desc": "A knot that, to this day, has still not been untied."
        },
        {
          "code": "7-8",
          "name": "Fury of the Silent-1",
          "desc": "We've found a strange Sarkaz Originium altar in the hub layer... The altar seems to have a strange effect upon the surrounding environment, but we can also leverage it to mount a defense against the enemy.\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        },
        {
          "code": "7-9",
          "name": "Fury of the Silent-2",
          "desc": "Our enemies are no longer fighting in the characteristic style of scattered guerillas. Now is a head-on clash between tactics. Formulate your combat strategy appropriately, and deal a critical blow to the enemy.\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        },
        {
          "code": "7-10",
          "name": "Flames of the Faint",
          "desc": "Sarkaz warriors have entered the battlefield, but be wary - they don't seem to be from the same faction as the guerillas. They even seem to draw inspiration from the Originium altars...?!\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        },
        {
          "code": "7-11",
          "name": "Stained-1",
          "desc": "Sarkaz Casters have appeared on the battlefield, and it seems like the Originium Altars may be affecting their Arts. However, don't panic - we have ways of dealing with them.\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        },
        {
          "code": "7-12",
          "name": "Stained-2",
          "desc": "As Reunion's elite warriors, the Sarkaz Mercenaries have shown formidable strength. Only by defeating them can we continue forward.\n Periodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units.\n Deploy to block the enemy's route"
        },
        {
          "code": "7-13",
          "name": "Aegis of the Infected-1",
          "desc": "The horn has been sounded. Face the legendary guerillas of Ursus, and turn their own tactics against them! However, those heavily-armored guerilla warriors are indeed the most terrifying combatants of the Ursus army..."
        },
        {
          "code": "7-14",
          "name": "Guerilla-1",
          "desc": "The mortars used by the guerillas pose a significant threat to us. These weapons taken from Ursus's military arsenal are terrifying incarnations of the very essence of war."
        },
        {
          "code": "7-15",
          "name": "Guerilla-2",
          "desc": "The guerillas' Vertical Strike Squad has withstood harsh trials and brutal wars. They've fought Ursus for more than a decade, and their will is nigh indomitable. We have but a single moment for a chance at victory."
        },
        {
          "code": "7-16",
          "name": "Unrivaled",
          "desc": "Who has witnessed a battle like this before? Who can survive such a battlefield? Even a simple skirmish has struck fear into our hearts. We do not have the ability to defeat them. We must escape to where they cannot see us."
        },
        {
          "code": "7-17",
          "name": "Aegis of the Infected-2",
          "desc": "We cannot destroy them, so we will do our best not to be destroyed by them. We must achieve a tactical victory. We strive to paralyze their spinal cord and expose the giant's head to us.\n Periodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        },
        {
          "code": "7-18",
          "name": "Death of a Patriot",
          "desc": "They are commanded by the 'Aegis' of the Infected. The most ancient bloodline among the warriors of Sarkaz. Ursus's indomitable incarnation of war. The backbone of the Reunion Movement. Yelena's father.\n Periodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units.\nUpon explosion, deals heavy damage to enemies in the surrounding tiles and amplifies the damage they take for 15 seconds."
        },
        {
          "code": "7-19",
          "name": "11:15:38",
          "desc": "It's like a city driving towards finality."
        },
        {
          "code": "7-20",
          "name": "??:??:??",
          "desc": "Throw open the doors that lead to this world."
        },
        {
          "code": "S7-1",
          "name": "Ambush-1",
          "desc": "Make good use of neural interference landmines to deal with guerillas that are difficult to injure through normal means.\nUpon explosion, deals heavy damage to enemies in the surrounding tiles and amplifies the damage they take for 15 seconds."
        },
        {
          "code": "S7-2",
          "name": "Ambush-2",
          "desc": "Use interference mines to establish a defensive line, expand our advantages, and accomplish our strategic goals.\nUpon explosion, deals heavy damage to enemies in the surrounding tiles and amplifies the damage they take for 15 seconds."
        },
        {
          "code": "H7-1",
          "name": "Operation Starfire-1",
          "desc": "Guerilla warfare does not preclude a frontal attack. Such a battle almost always leads to a decisive victory or a marked defeat. In this open terrain, who will benefit from this battle?\nIn this battle, Operator deployment is not restricted by melee/ranged designations.\n Deploy to block the enemy's route"
        },
        {
          "code": "H7-2",
          "name": "Operation Starfire-2",
          "desc": "This war of attrition has sapped us of our energy, but only miserable defeat awaits us should we give up now. Hold on! There must be an opening in the enemy's assault..."
        },
        {
          "code": "H7-3",
          "name": "Operation Starfire-3",
          "desc": "In a harsh environment, the side that better adapts to the conditions has more chances to seize victory. However, who can afford these kinds of sacrifices?\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units.\nUpon explosion, deals heavy damage to enemies in the surrounding tiles and amplifies the damage they take for 15 seconds."
        },
        {
          "code": "H7-4",
          "name": "Operation Starfire-4",
          "desc": "If you've never seen their formation in the past, you will not understand why they were feared by all living creatures upon the battlefield. Perhaps there are people out there who can describe how Ursus crushed civilization itself...\nPeriodically emits Pulse Waves to the surrounding tiles, damaging both allied and enemy units."
        }
      ]
    },
    "setId_mainline_1_5": {
      "name": "Roaring Flare",
      "year": 2,
      "kv": "kv_roaring_flare",
      "title": "title_roaring_flare",
      "bgid": "storybg_roaring_flare",
      "main": true,
      "group": "main_8",
      "deco": "deco_roaring_flare",
      "desc": "Memories of the Ursus tundra intertwine with the roaring flames of the present.\nAmiya and Ch'en unsheathe their blades to confront the curse of the Deathless Black Snake.\nWhen the fire subsides, the truth behind Reunion's fall is laid bare.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "R8-1",
          "name": "Yesterday, the Chaff Cracked",
          "desc": "In the remote tundra, patrol squads, dressed in black beetle-like uniforms, comb through remote villages to hunt down the Infected. \nBlocks the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units."
        },
        {
          "code": "M8-1",
          "name": "Today, Sanguine Overlows",
          "desc": "10:32:09 The war continues, but the situation has changed."
        },
        {
          "code": "TR-18",
          "name": "Civilian Evacuation",
          "desc": "Learn how to evacuate civilians from conflict zones. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units. \n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "R8-2",
          "name": "Innocent Flesh and Blood",
          "desc": "In the tundras of Ursus, every living creature is under suspicion. They may be murderers, thugs, spies, or simply innocents. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units. \n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "R8-3",
          "name": "Oatstalk, Easily Alight",
          "desc": "Righteous anger from witnessing such brutality is justified. Ursus's manglers are well-trained, and their fangs do not cease just because of their victims' emotions. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units. \n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "M8-2",
          "name": "Silence, Born of Excessive Speech",
          "desc": "Kal'tsit has never demonstrated impatience when explaining a story to others. She is either very good at controlling herself, or she actually enjoys it."
        },
        {
          "code": "R8-4",
          "name": "Sparks, Extinguished in a Touch",
          "desc": "Sometimes, protecting others is not a goal, but a process. Also, Ursus's crossbowmen also privately believe that killing others is not a goal, but a process. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "M8-3",
          "name": "Death, Comes When Beckoned",
          "desc": "In reality, just witnessing an atrocity is enough to make one become a part of it."
        },
        {
          "code": "R8-5",
          "name": "Cold, Only Perceived",
          "desc": "The lowest recorded temperatures of the Northwestern Tundras are sometimes not as bone-chilling as the words of certain individuals. \n Life Points will be deducted by 1 when killed by an enemy.\n Periodically releases a frigid wave that will inflict Cold on affected enemy units."
        },
        {
          "code": "M8-4",
          "name": "Will, Phantom Wisps",
          "desc": "All ideals, once transmitted, will eventually be corrupted or altered. Only through practice can an ideal be proven, and as we know, once something happens, it cannot be undone."
        },
        {
          "code": "R8-6",
          "name": "War, Sprawling Without Cease",
          "desc": "The mightiest and meekest both share the same tenacity. \n Life Points will be deducted by 1 when killed by an enemy.\n Periodically releases gas in the surrounding 4 tiles, inflicting heavy damage to enemies."
        },
        {
          "code": "M8-5",
          "name": "Ruination, Long Awaited",
          "desc": "With enough effort, drops of water can pierce through stone. Everything you've experienced will coalesce into the truth and spread across this land."
        },
        {
          "code": "R8-7",
          "name": "Baptism by Tractor Fire",
          "desc": "Within the Ursus Army, the history of the Artillery Corps is not particularly lengthy. They are more than happy to arm themselves with the newest technology, and have little concern to spare for who their enemies are. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "R8-8",
          "name": "The Heart, Fickle and Impermanent",
          "desc": "If you wish to prove yourself before a legend, you must first approach perfection. Only the commoners shall bleed. Only the noble shall face slander. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "M8-6",
          "name": "Farewell, to Reunite Once More",
          "desc": "07:29:28 Though some friends may be willing to share your pain, you should perhaps reach out to them. And some may never have been your friends in the first place."
        },
        {
          "code": "R8-9",
          "name": "Reunited, Only to Separate",
          "desc": "To lose. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "R8-10",
          "name": "Silent Butcher",
          "desc": "The Empire of Ursus has lost many elites throughout its many wars, but is always able to cultivate more. Just as an empire should. \n Deploy to block the enemy's route.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "M8-7",
          "name": "Malediction, Bound for Retribution",
          "desc": "She has not yet died, but she has already seen too much death."
        },
        {
          "code": "R8-11",
          "name": "Snowfall, Blackening the Earth",
          "desc": "Yet, they do not regard anyone as an 'enemy.' The dead and the incompetent have never been among their ranks.\n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "M8-8",
          "name": "Awakening, a Dream's End",
          "desc": "An origin, a purpose, a fate, a demise. A tragedy that claims the Herd, all of them. Who can truly choose their own life?"
        },
        {
          "code": "JT8-1",
          "name": "Ire, Flowing Wilderward",
          "desc": "'So I wish to make a wager with you.'"
        },
        {
          "code": "JT8-2",
          "name": "Behold, the Twilight Comes",
          "desc": "Memory and reality have both been completely released, and she knows her time has come. \n(Part of this story cannot be skipped the first time you experience it.)\nPeriodically deals great damage to any units on it."
        },
        {
          "code": "JT8-3",
          "name": "Arise, Treading Through Flames",
          "desc": "06:26:33 Split flame with sword, defeat the past with the present, and confront the chaotic with one's self. Rage, and know no compromise. Rage, and keep no silence. \nReleases fireballs in the four cardinal directions, dealing Arts damage and inflicting [Burning Breath] (Deals increasing True damage each second, but can be resisted)"
        },
        {
          "code": "END8-1",
          "name": "An Epilogue, or a Beginning",
          "desc": "Lungmen, Ursus, Rhodes Island, all three are picking up the pieces. Things are far from over, but everything is at an end, for now.\nGood night."
        },
        {
          "code": "H8-1",
          "name": "Operation Erebus-1",
          "desc": "A precious yet fragile life. \n Can block the movement of Ursus Civilians and Talulah, the Fighter; Can be destroyed by your units.\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "H8-2",
          "name": "Operation Erebus-2",
          "desc": "A scorching yet unrelenting flame."
        },
        {
          "code": "H8-3",
          "name": "Operation Erebus-3",
          "desc": "A broken yet harrowing song."
        },
        {
          "code": "H8-4",
          "name": "Operation Erebus-4",
          "desc": "An arrogant yet terrifying god. \n Releases fireballs in the four cardinal directions, dealing Arts damage and inflicting [Burning Breath] (Deals increasing True damage each second, but can be resisted)\n Life Points will be deducted by 1 when killed by an enemy."
        },
        {
          "code": "EG-1",
          "name": "Burnt Fragment 1",
          "tag": "Interlude",
          "desc": "A matter of honesty."
        },
        {
          "code": "EG-2",
          "name": "Burnt Fragment 2",
          "tag": "Interlude",
          "desc": "A matter of protection."
        },
        {
          "code": "EG-3",
          "name": "Burnt Fragment 3",
          "tag": "Interlude",
          "desc": "A matter of choice."
        },
        {
          "code": "EG-4",
          "name": "Burnt Fragment 4",
          "tag": "Interlude",
          "desc": "A matter of trust."
        },
        {
          "code": "EG-5",
          "name": "Burnt Fragment 5",
          "tag": "Interlude",
          "desc": "A matter of self."
        }
      ]
    },
    "setId_mainline_2_1": {
      "name": "Stormwatch",
      "year": 3,
      "kv": "kv_stormwatch",
      "title": "title_stormwatch",
      "bgid": "storybg_stormwatch",
      "main": true,
      "group": "main_9",
      "deco": "deco_stormwatch",
      "desc": "In the wake of the Chernobog-Lungmen crisis, a new shadow rises in the County of Hillock.\nDublinn's purple banners march across the Victorian borderlands amidst Taran unrest.\nBagpipe and Outcast uncover a conspiracy fuelled by stolen Originium dirty bombs.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "9-1",
          "name": "Storm Assault",
          "desc": "Victoria's 7th Frontline Infantry Battalion, 2nd Tempest Platoon, makes landfall on County Hillock."
        },
        {
          "code": "9-2",
          "name": "The Ghost Crisis",
          "desc": "A well hidden enemy might as well be a ghost. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-3",
          "name": "A Game of Cards",
          "desc": "Those standing in the sunlight haven't yet noticed the shadows gathering atop their very heads. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-4",
          "name": "Low Fires All About",
          "desc": "In this city, there's either conflict or the rumblings of it. Just where is the lighter of this fire hiding? \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-5",
          "name": "Critical Value",
          "desc": "The downpour is here, the enemy is everywhere, and the frustration is slowly reaching the breaking point. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-6",
          "name": "Dublinn",
          "desc": "In the wake of a surprise attack, the ghosts climb out of the ashes. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "TR-19",
          "name": "Ruins Operation",
          "desc": "A combat drill in battlefield ruins. Learn how to make use of a city's pillar constructions when they've been wrecked by the flames of war, in order to better strike against the enemy.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes.\n Directly knocks down a Tattered Pillar one tile in front."
        },
        {
          "code": "9-7",
          "name": "Hide-and-Seek",
          "desc": "The ghosts have shown in formation amidst the blaze's light, but the thief still hides behind the scenes. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \n Directly knocks down a Tattered Pillar one tile in front. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-8",
          "name": "Verse in the Ashes",
          "desc": "A great flame may have burned this land to its end, but I see someone's soul, on the other side of the scales."
        },
        {
          "code": "9-9",
          "name": "The Innocent",
          "desc": "There is evil taking place, and the innocent die for an ideal. Strange stone statues have appeared on the battlefield, rising silent above the ruins. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-10",
          "name": "Thunder's Rumble",
          "desc": "To purge the shadows that creep into every corner, the city is forced to tear apart its own flesh. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \n Directly knocks down a Tattered Pillar one tile in front. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-11",
          "name": "Tug-o'-War",
          "desc": "We strive to take back this city. But will the ghosts go easily? \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-12",
          "name": "Apparitional Waves",
          "desc": "Eliminate one, and there are even more. The enemy pours forth endlessly, only the city itself seeming to pay the price. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \n Directly knocks down a Tattered Pillar one tile in front. \n Operators deployed on it and enemies who have passed it will take constant damage, but their ATK and ASPD will be increased significantly. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-13",
          "name": "Battlefield Rescue",
          "desc": "Even if it must cross a raging inferno, Rhodes Island will not abandon a single Infected who needs help. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-14",
          "name": "Banner in the Wind",
          "desc": "Battered in the storm and rain, some hold their position firm, and some bravely step forth. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-15",
          "name": "Scalding Earth",
          "desc": "The enemy's flames push through the city ruins. Those of conviction tread the firelight and forge on. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-16",
          "name": "Breakout",
          "desc": "The enemy spills into every street, looking to hide their secrets. Only those who go forth with courage can prevent a massacre. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-17",
          "name": "Victorian Soldier",
          "desc": "From one end of the city to the other, a Victorian soldier fends off an army. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-18",
          "name": "'Daybreak'",
          "desc": "Her light struck through the dark veil above. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \n Directly knocks down a Tattered Pillar one tile in front. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-19",
          "name": "Gunfire in the Night",
          "desc": "Mandragora is in no way impossible to overcome, but our objective is not to defeat her alone. The dark clouds conceal the sun, and the night that follows will be interminably long, but it is fortunate that there remain those who pass on hope. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \n Directly knocks down a Tattered Pillar one tile in front. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "9-20",
          "name": "The Approaching Storm",
          "desc": "We sail for the storm."
        },
        {
          "code": "9-21",
          "name": "Relit",
          "desc": "Never did the fire of the tundra die out."
        },
        {
          "code": "S9-1",
          "name": "Holding Ruins",
          "desc": "The unrelenting firefight has destroyed the streets, but we still must come up with every way to stop the enemy. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "S9-2",
          "name": "Back to the Flames",
          "desc": "Those holding their homeland fast have found themselves encircled, but the city has its own ways when it comes to handling enemies.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "S9-3",
          "name": "Beneath the Ash",
          "desc": "The enemy believes they can burn this place to the ground. But we will rise from the ashes.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "S9-4",
          "name": "No Retreat",
          "desc": "Amidst brick and rubble, there is no retreat for either side.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "H9-1",
          "name": "Operation Anemoi-1",
          "desc": "The enemy is coming thick and fast, in phalanx formation, with a vicious offense, but so long as we hold this choke point, victory should be simple."
        },
        {
          "code": "H9-2",
          "name": "Operation Anemoi-2",
          "desc": "Enemy fireballs cover the whole battlefield. Stay calm under fire and protect yourself.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "H9-3",
          "name": "Operation Anemoi-3",
          "desc": "The enemy has dispatched even more Companion Guards and Shadowblades. Form a defensive line carefully, and we will win a chance at victory.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "H9-4",
          "name": "Operation Hyades-1",
          "desc": "The battlefield's dire terrain will likely be of hindrance to our formation, but it can also effectively curb the enemy. \n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes.\n Periodically deals great damage to any units on it."
        },
        {
          "code": "H9-5",
          "name": "Operation Hyades-2",
          "desc": "Proper timing in clearing the Tattered Pillars will make important changes to the terrain and significantly reduce the challenge of this battle.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        },
        {
          "code": "H9-6",
          "name": "Operation Hyades-3",
          "desc": "As the ghosts climb out of the Empire's vast shadow, their burning fury will not be easily quelled. Stand your own ground, and once again face the vengeance of Mandragora and the warriors of Dublinn.\n Can be knocked down by neighboring Operators, dealing True damage to the two tiles it falls on and forming rubble that blocks routes."
        }
      ]
    },
    "setId_mainline_2_2": {
      "name": "Shatterpoint",
      "year": 3,
      "kv": "kv_shatterpoint",
      "title": "title_shatterpoint",
      "bgid": "storybg_shatterpoint",
      "main": true,
      "group": "main_10",
      "deco": "deco_shatterpoint",
      "desc": "Londinium's ancient walls close around the Military Commission of Kazdel.\nBehind the mist and cannon fire of the Victorian capital, the Shard's Originium storm gathers.\nRhodes Island slips through the underground viaducts into the heart of the siege.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "10-1",
          "name": "The Pursued",
          "desc": "You see the shadow of the nomadic city of Londinium, and so too have they seen you."
        },
        {
          "code": "10-2",
          "name": "Raid Target",
          "desc": "The walls tower before us. The thoroughways are a labyrinth. We need a guide. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-3",
          "name": "Heads Down",
          "desc": "Have you seen those Sarkaz in the street, coming in your direction? Pretend like you haven't. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "TR-20",
          "name": "Below the City Walls",
          "desc": "A simulation of the defense capabilities of Londinium's Citadel Artillery. Its fire destroys all, and hence the stronghold has never fallen. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block."
        },
        {
          "code": "10-4",
          "name": "Warning Shot",
          "desc": "The daily life the people desperately cling to melts away in a single massive rumble. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-5",
          "name": "Breath of the City",
          "desc": "Veins pulse from deep underground, their sound covered by the military vehicles making through the streets. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-6",
          "name": "Kin or Otherwise",
          "desc": "There's many a reason they agree to work together. They choose at times to be allies, at times to be enemies, and at times, they have no other choice. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-7",
          "name": "Bound by Pain",
          "desc": "Gargantuan machines, welded together part by metal part. Every attack, grievous. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-8",
          "name": "No Time to Mourn",
          "desc": "Save our soldiers, or at least remember their names. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-9",
          "name": "Friends in Far Places",
          "desc": "With so many acquaintances, at least one should sincerely want to help you. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-10",
          "name": "Shadows of Days Past",
          "desc": "Memories cast their shadows at you. Fear, hatred, the insurmountable gap between life and death, and your old acquaintances. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-11",
          "name": "Battered and Bruised",
          "desc": "From within the crevices between ruined buildings, they strain to see a sliver of sunlight. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-12",
          "name": "At Vendetta's Close",
          "desc": "After so long, still she dreams of another possibility, a way she could have taken her vengeance. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-13",
          "name": "Crossroads",
          "desc": "After an interminable journey, each and every person has chosen the path they long to take."
        },
        {
          "code": "10-14",
          "name": "Aim",
          "desc": "You realize that under such sight, you never had anywhere to hide. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-15",
          "name": "Fleeing Through Fire",
          "desc": "The ground is subsiding, their refuge is collapsed, and the soldiers bear nothing but wrenches and hammers. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-16",
          "name": "Bloodblade on High",
          "desc": "Both the workers who built Londinium and the lofty noble aristocrats are to be forced by calamity down the same road. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-17",
          "name": "A Citadel and Its Walls",
          "desc": "Victoria's child is braced against this land, and still, though riven and worn, it has not yet fallen. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "10-18",
          "name": "Reflection of an Ideal",
          "desc": "There was once someone who could answer all our questions, but now we must find a new answer together."
        },
        {
          "code": "10-19",
          "name": "Sparks Afar",
          "desc": "And out from the ashes climbs a will, sweeping on a Draco's flames."
        },
        {
          "code": "H10-1",
          "name": "Operation Helios-1",
          "desc": "In every alley and byway of Sudean were soldiers fighting with their lives. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nAbilities of Manfred: \nDeals additional Necrosis damage, and recovers his [Military Training] effect significantly faster."
        },
        {
          "code": "H10-2",
          "name": "Operation Helios-2",
          "desc": "The enemy ascends onto the city wall. The defense artillery's bombardment continues. We need to find a way to live. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nAbilities of Manfred:\n In his second form, his floating cannon will attack one additional target (if there are none, it will instead attack twice)."
        },
        {
          "code": "H10-3",
          "name": "Operation Helios-3",
          "desc": "Long has fear circled about this vast battlefield. We cross this litany of ruins to confront the Sarkaz army once again. \n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block. \nAbilities of Manfred: \nWhile present, all rebirthable enemies and reborn creations will deal continuous Arts damage to their surroundings, and Manfred recovers his [Military Training] effect significantly faster."
        }
      ]
    },
    "setId_mainline_2_3": {
      "name": "Return To Mist",
      "year": 4,
      "kv": "kv_return_to_mist",
      "title": "title_return_to_mist",
      "bgid": "storybg_return_to_mist",
      "main": true,
      "group": "main_11",
      "deco": "deco_return_to_mist",
      "desc": "Steam knights, Sarkaz Royal Courts, and Victorian dukes clash across Londinium's districts.\nAncient bloodlines and forgotten oaths awaken beneath the shadow of the Lifebone.\nEvery street becomes a crucible where the future of Victoria is forged.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "11-1",
          "name": "Keeping Up Honors",
          "desc": "While still beyond the notice of pure and simple children, the seeds have been irrevocably planted for so many things.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-2",
          "name": "A Sliver of Light",
          "desc": "Nobody can promise the coming of peace, but that won't stop them in their stride.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-3",
          "name": "Steam Rising",
          "desc": "People aren't obstinate, life is. Living is. Irrevocable loss is.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-4",
          "name": "The Stuff of Ideals",
          "desc": "What is sought is but a peaceful land that allows survival."
        },
        {
          "code": "11-5",
          "name": "Equivalent Exchange",
          "desc": "Here, history stands silently, laden with dust. Is it titles that give people honor, or vice versa?\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-6",
          "name": "Culture Unfolding",
          "desc": "War cannot destroy a nation. Not until its culture, too, begins to die out.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "TR-21",
          "name": "Twigs",
          "desc": "It is the unknown that nurtures fear, so we must first take full stock of their essence.\n Produces Rot Eaters when destroyed or at the end of the stage."
        },
        {
          "code": "11-7",
          "name": "Unto the Flood",
          "desc": "When you look upon the battlefield and see children bearing weapons, what crosses your mind?\n Produces Rot Eaters when destroyed or at the end of the stage.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-8",
          "name": "At a Standstill",
          "desc": "War, when befalling the commoner, is a great mountain that can crush in an instant, capable of destroying all hope they once had.\n Produces Rot Eaters when destroyed or at the end of the stage.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-9",
          "name": "A Life for a Life",
          "desc": "Helplessness is the base shade to all life.\n Produces Rot Eaters when destroyed or at the end of the stage.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\n Friendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-10",
          "name": "Swords Crossed",
          "desc": "Before the flames of war catch alight, tranquility brings its own terror."
        },
        {
          "code": "11-11",
          "name": "What We Know is Unalike",
          "desc": "Our arms should be faced at the enemy, not at one another.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-12",
          "name": "Come as a Torrent",
          "desc": "The one stood here has no particular status nor reputation; her goal is simply that peace may return to the people's lives.\n Produces Rot Eaters when destroyed or at the end of the stage.\n Forms an AOE barrier for allies.\n\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-13",
          "name": "Ne'er to Stop",
          "desc": "The way back is cut off. We can only press onward.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\n Friendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-14",
          "name": "A Face-to-Face Meeting",
          "desc": "But that ideal is antithetical to the now, making it all the more lamentably dire.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-15",
          "name": "The Earth Shakes",
          "desc": "Yet hate cannot be dispelled.\n Produces Rot Eaters when destroyed or at the end of the stage.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-16",
          "name": "Glory's Hunting Grounds",
          "desc": "Step by step, they stride into the hunting grounds laid for them beforehand, heading to meet a cheated death.\n Deploy to block the enemy's route.\n Operators deployed on this tile will restore HP over time.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-17",
          "name": "Answer Me",
          "desc": "Thunderclaps writhe to bursting in the dark clouds' midst, and fall on anyone unwilling to lament."
        },
        {
          "code": "11-18",
          "name": "This is Not What I Wished",
          "desc": "At the end of the line, everyone makes their own choice.\n Forms an AOE barrier for allies.\n Operators deployed on this tile will restore HP over time.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-19",
          "name": "To Single Out Fate",
          "desc": "How does one become a hero? With blood of fire, with a calling, with unwavering perseverance."
        },
        {
          "code": "11-20",
          "name": "The Last Steam Knight",
          "desc": "Victoria—my Victoria—my honor—my country.\n Forms an AOE barrier for allies.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, Redeployment Time is reduced, and Starting DP is increased."
        },
        {
          "code": "11-21",
          "name": "Unavoidable",
          "desc": "You lift your head to the sky. Catastrophe is imminent. War is here."
        },
        {
          "code": "H11-1",
          "name": "Operation Achlys-1",
          "desc": "'They're the battlefield itself.'"
        },
        {
          "code": "H11-2",
          "name": "Operation Achlys-2",
          "desc": "A knight defends the honor in his heart, making the charge at all those that would prevent him.\n Produces Rot Eaters when destroyed or at the end of the stage.\nAbilities of 'The Last Steam Knight':\n[Pneumatic Pressurization] reduces damage taken while active, and no longer Stuns after ending."
        },
        {
          "code": "H11-3",
          "name": "Operation Achlys-3",
          "desc": "The enemy will not stop, and the Sarkaz's witchcraft inspires fear, but we can only confront them to the bitter end."
        },
        {
          "code": "H11-4",
          "name": "Operation Achlys-4",
          "desc": "The will in these ruins is still not fallen—shall not be surmounted—cannot be exhausted—will do nothing but last forever.\n Produces Rot Eaters when destroyed or at the end of the stage.\n  Forms an AOE barrier for allies.\nAbilities of 'The Last Steam Knight':\n[Pneumatic Pressurization] reduces damage taken while active, and no longer Stuns after ending; [Unto My Last Breath] seals off all unitless tiles within range once it locks onto targets."
        }
      ]
    },
    "setId_mainline_2_4": {
      "name": "All Quiet Under the Thunder",
      "year": 4,
      "kv": "kv_all_quiet_under_the_thunder",
      "title": "title_all_quiet_under_the_thunder",
      "bgid": "storybg_all_quiet_under_the_thunder",
      "main": true,
      "group": "main_12",
      "deco": "deco_all_quiet_under_the_thunder",
      "desc": "Outside the walls of Londinium, the Ducal coalitions maneuver for supremacy.\nInside the quarantined borough, Ines, Hoederer, and W navigate a web of betrayal.\nThe countdown to the Shard's activation draws the frontline ever closer.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "12-1",
          "name": "Heat Wave",
          "desc": "The soldier seems to like the hot wind blowing on the deck. It reminds him of the warmth of the fire when cooking supper back home."
        },
        {
          "code": "TR-22",
          "name": "Know Right From Wrong",
          "desc": "'The most dangerous thing on the battlefield is not the downpour of enemy fire you'll face. It's imposters trying to win your sympathy.'\nAllies have greatly reduced cost limit."
        },
        {
          "code": "12-2",
          "name": "Reception Party",
          "desc": "Fine, you're the symbol of Victoria's invincibility, our saviors here to help us. Can we get going now?\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-3",
          "name": "Benevolent Betrayal",
          "desc": "Villains seem to always have the upper hand over the virtuous. Not because they are stronger, but because they see morality as a weapon, instead of a standard.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-4",
          "name": "Unity is Luxury",
          "desc": "All are equal before the flames of war. Do not entrust all your hope to others and lose sight of your own strength.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-5",
          "name": "Brittle Steel",
          "desc": "A reed survives the fierce gales, while a mighty oak topples. The old workers seem to know this well.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-6",
          "name": "Whose War",
          "desc": "When the sounds of cannon fire ring in their ears, soldiers and civilians alike ponder the same question.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-7",
          "name": "Discourse of Life and Death",
          "desc": "Do not forget that while we debate the ultimate proposition of life and death, there is another group struggling between life and death and providing evidence for our arguments.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "TR-23",
          "name": "Devil's Temptation",
          "desc": "'After three days without food, the devil gave the starving man a poisonous apple. Can the temptation to gorge himself overcome his fear of immediate death?'\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit."
        },
        {
          "code": "12-8",
          "name": "Reunion Under Fire",
          "desc": "Reunions are not always accompanied by flowers.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-9",
          "name": "Years of Passion",
          "desc": "No matter how I look at them, something about these old clothes seems off. Did someone wash them for me?\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-10",
          "name": "Broadcast Hotline is Busy",
          "desc": "'You're standing right here. How come your voice is in the broadcast?'\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-11",
          "name": "Ticking Clock",
          "desc": "Given the same amount of time, the knowledge that each man can obtain is never equal."
        },
        {
          "code": "12-12",
          "name": "Hats Off",
          "desc": "The loyal subjects are saluting before the king's procession.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-13",
          "name": "Against the Light",
          "desc": "No one can proclaim themselves able to bear the responsibility of the country's future.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced.\nSome characters cannot be deployed in this stage"
        },
        {
          "code": "12-14",
          "name": "Ears Muffed",
          "desc": "When bombarded by noise, we have two choices. We can cover our ears, or block the source of it.\nAllies have greatly reduced cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-15",
          "name": "Battered and Bruised",
          "desc": "Shapeless rumors can penetrate impregnable defenses.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-16",
          "name": "Clouds Burn Red",
          "desc": "Don't look up! Don't stare!\nAllies have greatly reduced cost limit."
        },
        {
          "code": "12-17",
          "name": "The Abandoned",
          "desc": "'If sacrifices are unavoidable, why not save them for the reaper?'\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-18",
          "name": "Good Night",
          "desc": "We received no air-raid alarms today. We wish everybody the most pleasant of dreams.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-19",
          "name": "Fly, Fireworks",
          "desc": "When you make a wish before the flames, perhaps the gift you yearn for will fall from the sky.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-20",
          "name": "Sincere Invitation",
          "desc": "A face-to-face meeting that transcends even time. Alas, you did not receive an invitation.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nEnvironmental Conditions:\nAllied units' HP and ATK are significantly increased, Redeployment Time is reduced."
        },
        {
          "code": "12-21",
          "name": "Quiet On the Front",
          "desc": "The horns of battle are yet to be blown. The soldiers are afraid to even gasp for air."
        },
        {
          "code": "H12-1",
          "name": "Operation Astrape-1",
          "desc": "'Who ever said that the battlefield is only where the cannon fire reaches?'\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nAbilities of 'Damazti Cluster': Attacks deal increased Corrosion Damage."
        },
        {
          "code": "H12-2",
          "name": "Operation Astrape-2",
          "desc": "Large numbers of refugees are pouring toward the safe zone. We need more support!\nAllies have greatly reduced cost limit."
        },
        {
          "code": "H12-3",
          "name": "Operation Astrape-3",
          "desc": "The tide of battle can change in an instant, but the gushing tides of people is the greatest cover for the Sarkaz.\nAllies have greatly reduced cost limit.\nAbilities of 'Damazti Cluster': Attacks deal increased Corrosion Damage; Isomorphic Fragments +1."
        },
        {
          "code": "H12-4",
          "name": "Operation Astrape-4",
          "desc": "The thunder is silent, and the long night is without light, but Victoria's glory must stand eternal.\nAllies have greatly reduced cost limit.\n When destroyed, grants a certain amount of DP and cost limit.\nAbilities of 'Damazti Cluster': Attacks deal heavy Corrosion Damage; Isomorphic Fragments +1. [Lifeline Burst] discharge frequency is greatly increased."
        }
      ]
    },
    "setId_mainline_2_5": {
      "name": "The Whirlpool that is Passion",
      "year": 5,
      "kv": "kv_the_whirlpool_that_is_passion",
      "title": "title_the_whirlpool_that_is_passion",
      "bgid": "storybg_the_whirlpool_that_is_passion",
      "main": true,
      "group": "main_13",
      "deco": "deco_the_whirlpool_that_is_passion",
      "desc": "Crimson vines of the Nachzehrer King's army spread across the scarred battlefield.\nLogos and the elite operators of Rhodes Island hold the breach against ancient witchcraft.\nAmidst the ashes of elegies, the path to the palace opens.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "13-1",
          "name": "Across the Battlefield's Line",
          "desc": "One war can wear many faces."
        },
        {
          "code": "13-2",
          "name": "The Injury at Hand",
          "desc": "We're all longing for the future, but what do we do right now?\n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-3",
          "name": "Not a Moment's Rest",
          "desc": "Until the dust settles, no one can catch their breath.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-4",
          "name": "The Mercenary's Day",
          "desc": "Careful: the danger never left.\n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-5",
          "name": "Anguish Hangs O'er",
          "desc": "Fate twists in an instant. Seize the opportunity.\n Once fully charged, deals area True damage to both allies and enemies, centered on the friendly unit with the highest Block.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-6",
          "name": "In the Name of Example",
          "desc": "We make miracles.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "TR-24",
          "name": "Led to Pursue",
          "desc": "The uncanny altar is in operation. Destroy it.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an ."
        },
        {
          "code": "13-7",
          "name": "The Bloodcalling Altar",
          "desc": "Follow illusion's remnants, and chase after their source.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-8",
          "name": "An Unplanned Meeting",
          "desc": "An unexpected reunion, though none of us resemble who we once were.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-9",
          "name": "Those Espying the Crown",
          "desc": "It's no use fleeing. The bloodline's predestiny will always catch up in the end."
        },
        {
          "code": "13-10",
          "name": "The Promised Land Drifts",
          "desc": "Make staunch your ego, and confront the lamentations of their souls.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-11",
          "name": "A Town Amidst the Clouds",
          "desc": "This place is enshrouded in false peace.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-12",
          "name": "Shattered Greenhouse",
          "desc": "In the midst of a war, how luxurious a wisp of hope harbored by a tiny greenhouse is.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-13",
          "name": "In Carcass Bones",
          "desc": "Before us are the Sarkaz elite troops guarding the Feranmut skeleton. We must defeat them to continue forward.\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-14",
          "name": "Fireworks Sear Scarlet",
          "desc": "And the fireworks no longer represent celebration, and we bid farewell to our former lives.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-15",
          "name": "Briefly Gathered",
          "desc": "Pool our information. Communicate our achievements. We are about to part ways once more.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-16",
          "name": "'We'",
          "desc": "We lap at our wounds in the ruins. We seek a new direction in our duress.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-17",
          "name": "Someone Speak Your Mind",
          "desc": "Be sincere as we communicate, be honest as we enter the fray again.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-18",
          "name": "Throw Out Your Chest",
          "desc": "March on! For victory we live, and for honor we die!\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-19",
          "name": "The Osseous Aisle",
          "desc": "The enemy is pushing through this corridor of bones. Defeat them.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-20",
          "name": "Sanguinary Billows",
          "desc": "Witness his arrogance.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-21",
          "name": "The Archon in Sanguine",
          "desc": "Regent's crimson, iron upon the nameless sea.\n Spawns Blood Amber, and periodically releases a searing Blood Mist turning Blood Amber into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an .\nEnvironmental Conditions:\nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "13-22",
          "name": "Disaster Coalesces",
          "desc": "Hardships converge. Disaster is nigh."
        },
        {
          "code": "H13-1",
          "name": "Operation Charybdis-1",
          "desc": "'We fight for ourselves.'\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an ."
        },
        {
          "code": "H13-2",
          "name": "Operation Charybdis-2",
          "desc": "The enemy atop the skeleton has rendezvoused with their main force. The following battle will be hard-fought.\n Releases a Pulse Wave that absorbs all Blood Amber within range and converts them into Bloodborn Spawn.\n Pay a DP cost to activate it, deploying an ."
        },
        {
          "code": "H13-3",
          "name": "Operation Charybdis-3",
          "desc": "Illusions warp and skip. Blood rushes and surges.\nAbilities of Duq'arael, 'Regent's Crimson':Recovers faster after being attacked by ; Friendly units affected by 1st form Blood Mist and 2nd form [Blood Affliction] are forcibly retreated when their HP is 25% or lower."
        },
        {
          "code": "H13-4",
          "name": "Operation Charybdis-4",
          "desc": "Bloodlines of antiquity burst forth, with voices resounding through the battlefield, lingering and clinging on and on.\nAbilities of Duq'arael, 'Regent's Crimson':Recovers faster after being attacked by ; 1st form [Moon-Devouring Bloodmist] selects one additional target; 2nd form [Crimson Edict] spawns Blood Ambers more quickly and Blood Mist duration is extended."
        }
      ]
    },
    "setId_mainline_2_6": {
      "name": "Absolved Will Be the Seekers",
      "year": 5,
      "kv": "kv_absolved_will_be_the_seekers",
      "title": "title_absolved_will_be_the_seekers",
      "bgid": "storybg_absolved_will_be_the_seekers",
      "main": true,
      "group": "main_14",
      "deco": "deco_absolved_will_be_the_seekers",
      "desc": "At the nexus of the Assimilated Universe, the Feranmuts and the Myriad Souls converge.\nTheresa's lingering will and the Doctor's past collide within the crystal sea of Originium.\nAcross ten thousand years of sorrow, a new dawn is chosen for Terra.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "14-1",
          "name": "Fallen From Memory",
          "desc": "Prepare to seek the ending."
        },
        {
          "code": "14-2",
          "name": "Operation Meeting",
          "desc": "The origin of all has been revealed, and all shall return to it.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "TR-25",
          "name": "Special Environment Adaptive Ops",
          "desc": "Learn to fight in extreme Originium environments.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery."
        },
        {
          "code": "14-3",
          "name": "Hammer and Anvil, Vanquished",
          "desc": "Here, we wage war on death.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-4",
          "name": "Breaking the Silence",
          "desc": "Hold on. Hope guides us forward.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-5",
          "name": "Cave Search",
          "desc": "A strange place, a strange figure.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-6",
          "name": "Field of Vision",
          "desc": "This time, the chase will not be in vain.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-7",
          "name": "Countermeasures",
          "desc": "Do not lose heart, however grim the situation.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-8",
          "name": "Close Support",
          "desc": "Fight war with war, and death with death.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-9",
          "name": "Response to Saturation Attacks",
          "desc": "Opportunity is fleeting in the ever-changing tempo of war.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-10",
          "name": "From the Light",
          "desc": "Unwavering faith is the blade that will cut through the darkness and slay despair.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery."
        },
        {
          "code": "14-11",
          "name": "Of Heroes",
          "desc": "'Slaves of war, captives of blood, you shall not pass.'\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-12",
          "name": "Followers",
          "desc": "'We will always be together.'\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-13",
          "name": "Descent from the Origin",
          "desc": "An ancient wound reopens."
        },
        {
          "code": "14-14",
          "name": "High-Altitude Interception",
          "desc": "The skeleton emerges from the fabric of reality. Everything hangs in the balance.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-15",
          "name": "Linebreaker",
          "desc": "Keep your focus as you dash through the cold steel skeleton.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-16",
          "name": "Hull Breach",
          "desc": "Rise above the obsession of the past and let it drive you forward.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-17",
          "name": "Battle for the Core",
          "desc": "Death intertwines with conflict, and rage joins with sorrow.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-18",
          "name": "Roaring Inferno",
          "desc": "Death bellows, death struggles, death falls.\nWho shall witness the death that belongs to the Sarkaz?\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-19",
          "name": "Inside the Crystal",
          "desc": "The void is boundless, and the possibilities limitless.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-20",
          "name": "Procession of Kings",
          "desc": "Soothe the raging river of souls.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-21",
          "name": "The Myriad Dreams",
          "desc": "A clash of wills and ideals.\nIt takes a King to confront another King.\nEnvironmental Conditions: \nFriendly units' HP and ATK are significantly increased, and Redeployment Time is reduced."
        },
        {
          "code": "14-22",
          "name": "When Sorrow Blooms",
          "desc": "Keep our thoughts in your thoughts."
        },
        {
          "code": "14-23",
          "name": "Night Goes Gentle",
          "desc": "Even death may die."
        },
        {
          "code": "H14-1",
          "name": "Operation Pharos-1",
          "desc": "Stop the march of the Nachzehrer.\n Continuously deals True damage to units on it and greatly reduces their SP recovery.\n Deals True Damage to units in its area every second and greatly reduces their SP recovery."
        },
        {
          "code": "H14-2",
          "name": "Operation Pharos-2",
          "desc": "The maelstrom of shadows roils relentlessly, drawing in hatred."
        },
        {
          "code": "H14-3",
          "name": "Operation Pharos-3",
          "desc": "Burn, burn, until the last shred of soul is exhausted."
        },
        {
          "code": "H14-4",
          "name": "Operation Pharos-4",
          "desc": "Join the procession and bear witness to a hero's departure."
        },
        {
          "code": "EG-6",
          "name": "Lingering Mercy",
          "tag": "Interlude",
          "desc": "The future of sailing upon a gentler land belongs to all of you."
        }
      ]
    },
    "setId_mainline_3_1": {
      "name": "Dissociative Recombination",
      "year": 6,
      "kv": "kv_dissociative_recombination",
      "title": "title_dissociative_recombination",
      "bgid": "storybg_dissociative_recombination",
      "main": true,
      "group": "main_15",
      "deco": "deco_dissociative_recombination",
      "desc": "When the dust of Londinium settles, the deeper fabric of Originium begins to fracture.\nPriestess's protocol stirs within the neural network of PRTS aboard the landship.\nA silent war over the very definition of life and memory begins.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "15-1",
          "name": "The End of Past and Present",
          "tag": "Interlude",
          "desc": "'Tells with silence the last light breaking, And the still hour, Is come of the sea tumbling in harness.'"
        },
        {
          "code": "15-2",
          "name": "Bearer of the Sword",
          "tag": "Before Operation",
          "desc": "'...And death shall have no dominion.'"
        },
        {
          "code": "15-3",
          "name": "In the Name of a Miracle",
          "tag": "Before Operation",
          "desc": "'Shall sleep in the light of a wondrous day, Where hell and heaven shall leave thee free, To the universe of destiny.'"
        },
        {
          "code": "15-4",
          "name": "Brink of the Abyss",
          "tag": "After Operation",
          "desc": "'How do you measure the depth of an abyss? The answer, and your own life, hang upon the same thread.'"
        },
        {
          "code": "15-5",
          "name": "Origin of Conflict",
          "tag": "Before Operation",
          "desc": "'All are but fragments written down in that endless book of cacophonies.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-6",
          "name": "Etched Bone-Deep",
          "tag": "After Operation",
          "desc": "'Humanity guards itself against everything: Fire, storm, cold—anything it can predict. But there is no way for humanity to guard against itself.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes."
        },
        {
          "code": "15-7",
          "name": "Moment of Truth",
          "tag": "Before Operation",
          "desc": "'The only way of discovering the limits of the possible is to venture a little way past them into the impossible.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation.\n Operators deployed on it and enemies who have passed it will take constant damage, but their ATK and ASPD will be increased significantly."
        },
        {
          "code": "15-8",
          "name": "Broken Echoes",
          "tag": "Before Operation",
          "desc": "'If this treachery is a decision of conscious participation, what has caused you to fall into the abyss? What elusive hope has led you on the path of your own destruction?'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-9",
          "name": "Decompression Syndrome",
          "tag": "After Operation",
          "desc": "'I wake to sleep again, and delay my awakening. I touch fate on what I cannot fear. I learn through the journey I must set out on.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes."
        },
        {
          "code": "15-11",
          "name": "Wake From a Long Dream",
          "tag": "Before Operation",
          "desc": "'Henceforth all will be me, and no one will be me. I will be you, and you will not know it. Your dream shall be my awakening.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-12",
          "name": "Bear Witness, the Death of the Gods",
          "tag": "Before Operation",
          "desc": "'An instant later, the constituent matter will still exist, but the intrinsic nature of truth shall die, drowned in the madness of darkness. Countless civilizations have vanished, and the ripples they leave behind continue to fall, crushing, burying, and destroying everything.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-13",
          "name": "I Shall Be Your Eyes",
          "tag": "After Operation",
          "desc": "'...Like a feather on the back of my hand. Dust in sunlight and memory in corners...'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-14",
          "name": "In Dust or Blood",
          "tag": "Before Operation",
          "desc": "'Even if we knew everything, it doesn't necessarily mean we would be able to change everything...'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-15",
          "name": "Rejection of Mourning",
          "tag": "After Operation",
          "desc": "'Even if no one understands, we must continue to walk this path.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes."
        },
        {
          "code": "15-16",
          "name": "Margin of Eternity and Now",
          "tag": "Interlude",
          "desc": "'...The past in your eyes began but a moment ago, but the dead past is simply another name for the present.'"
        },
        {
          "code": "15-17",
          "name": "'Her'",
          "tag": "Before Operation",
          "desc": "'Whoever has no house now will build no more. Whoever is alone now will remain long alone.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces and RES after activation.\nNo melee/ranged deployment restrictions."
        },
        {
          "code": "15-18",
          "name": "Never Doubted, Never Far",
          "tag": "Before Operation",
          "desc": "'You know how to wait. In the long years you wait for a single flower to blossom.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-20",
          "name": "Return to Beginnings",
          "tag": "After Operation",
          "desc": "'It is time that the calcite took the trouble to bloom, that unrest's heart started to beat. It's time for it to be time. It is time.'\n PRTS deploys enemies and Weakening Nodes, and activates Weakening Nodes.\n Reduces opposing forces' DEF and RES after activation."
        },
        {
          "code": "15-21",
          "name": "Where the Land and a Fragment Belong",
          "tag": "Interlude",
          "desc": "'We walk towards the edge of an unknown future, and embrace each other in the fading echoes of the past.'"
        }
      ]
    },
    "setId_mainline_3_2": {
      "name": "Abnormal Spectrum",
      "year": 7,
      "kv": "kv_abnormal_spectrum",
      "title": "title_abnormal_spectrum",
      "bgid": "storybg_abnormal_spectrum",
      "main": true,
      "group": "main_16",
      "desc": "Far to the north inside the frozen expanses of Ursus, an ancient slumber is broken.\nRhodes Island ventures into the snowbound frontier where Imperial secrets lie buried.\nBefore the coming winter consumes the land, the truth of the Reawakening must be faced.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "16-1",
          "name": "Fool's Salvation",
          "tag": "Interlude",
          "desc": "Fill the emptiness and confusion with words."
        },
        {
          "code": "16-2",
          "name": "Distant Dawn",
          "tag": "Before Operation",
          "desc": "There is no light to bear witness here."
        },
        {
          "code": "16-3",
          "name": "Path in Sight",
          "tag": "Before Operation",
          "desc": "Life is a bog that you keep sinking deeper and deeper into, until it swallows you."
        },
        {
          "code": "16-4",
          "name": "Strength in Numbers",
          "tag": "Before Operation",
          "desc": "Old friends, new friends... let's start by saying hello."
        },
        {
          "code": "16-5",
          "name": "Dividing Line",
          "tag": "Before Operation",
          "desc": "The time has come. Those who stay shall suffer, and even those who leave are not immune."
        },
        {
          "code": "16-6",
          "name": "Flickering Pain",
          "tag": "After Operation",
          "desc": "Fear forces a swift decision, whether correct or not."
        },
        {
          "code": "16-7",
          "name": "Final Ecstasy",
          "tag": "Before Operation",
          "desc": "Everyone knows that happiness is neither lasting nor eternal. So what?"
        },
        {
          "code": "16-8",
          "name": "Nowhere to Find",
          "tag": "After Operation",
          "desc": "A bonfire, a house, an answer, or perhaps a love that can be felt."
        },
        {
          "code": "16-9",
          "name": "Defense of the Mad",
          "tag": "Before Operation",
          "desc": "The definition of a lie is the truth you believe in."
        },
        {
          "code": "16-10",
          "name": "Silenced Cries",
          "tag": "Before Operation",
          "desc": "The saddest thing is that sorrow teaches us nothing."
        },
        {
          "code": "16-11",
          "name": "Tombstone",
          "tag": "After Operation",
          "desc": "Those who have lost their souls greet you here."
        },
        {
          "code": "16-12",
          "name": "Six Feet Under",
          "tag": "Before Operation",
          "desc": "Once, we created. Now, we destroy."
        },
        {
          "code": "16-13",
          "name": "Never Forgotten",
          "tag": "Before Operation",
          "desc": "The unbeliever says that religion is bare-handed violence.\nDeactivated ■■:\nA piece of home that Retreating Miners took with them."
        },
        {
          "code": "16-14",
          "name": "Lone Path",
          "tag": "Before Operation",
          "desc": "Get up, follow the road, go south. Do not forget home, do not go back home."
        },
        {
          "code": "16-15",
          "name": "Roaring Wilds",
          "tag": "Before Operation",
          "desc": "They tread upon home, upon family, upon foe. They salted the soil, dumped bodies in the river... They are everywhere."
        },
        {
          "code": "16-16",
          "name": "Revealing the Truth",
          "tag": "Before Operation",
          "desc": "I shall not accept fiction, nor elaborately dressed falsehood."
        },
        {
          "code": "16-17",
          "name": "Voices Unheard",
          "tag": "Before Operation",
          "desc": "Hear the weeping, hear the cries, hear the echoes of the declaration that they will endure no more.\nA Forgotten ■■: \nLost behind a battered Rock Wall."
        },
        {
          "code": "16-18",
          "name": "The Red Sun Lingers",
          "tag": "After Operation",
          "desc": "Even should the sun and moons stand still, this rage will never end.\nUnexploded ■■:"
        },
        {
          "code": "16-19",
          "name": "Oath of the Mad",
          "tag": "Interlude",
          "desc": "There is something in our blood that is fundamentally incompatible with true progress. The only way to change it is to transform ourselves."
        },
        {
          "code": "EG-7",
          "name": "A Letter",
          "tag": "Interlude",
          "desc": "Rankin, we made it. The village near the Ursus-Kazimierz border, where Reunion is. This warm... egalitarian, idealistic place."
        },
        {
          "code": "EG-8",
          "name": "Events of the Past",
          "tag": "Interlude",
          "desc": "A sunken city resurfaces, an abandoned mining lamp is relit. Anything can happen in times like these."
        },
        {
          "code": "EG-9",
          "name": "Homecoming",
          "tag": "Interlude",
          "desc": "When the guns cease and the screams grow quiet, I'll be back by my mother's side, like when I was born."
        },
        {
          "code": "EG-10",
          "name": "No Way Forward",
          "tag": "Interlude",
          "desc": "The charity of the virtuous shall reach every corner of this great land."
        }
      ]
    },
    "setId_mainline_3_3": {
      "name": "Critical Phase Transition",
      "year": 7,
      "kv": "kv_one_day_more",
      "title": "title_one_day_more",
      "bgid": "storybg_one_day_more",
      "main": true,
      "group": "main_17",
      "desc": "Twenty years ago, the Sarcophagus was sealed off to stop the Ursine Army from turning it into a weapon, yet the First Army has succeeded in firing a weapon whose power source seems to be related to the Sarcophagus.\nUrsus is thrown into turmoil as its mines dry up. Anatoliy, son of the First Army's Marshal, has contracted Oripathy, and is murdering innocents out of despair, until the Marshal brings him someone who appears to be able to cure the pain of Oripathy: Hierda. She 'heals' Anatoliy.\nThe Rhodes Islanders arrive at Deity Grypherburg at the appointed hour in search of the Sarcophagus, and are accompanied by Eloysius to the palace. The Generalik and Hierda head together towards Zelgrad—an Ursine city that has opened itself to the Infected.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "17-1",
          "name": "Breath of the Land",
          "tag": "Interlude",
          "desc": "Come on, let's go. Let's go see it hunt, devour, and wherever else it wants you to see."
        },
        {
          "code": "17-2",
          "name": "Belated Redemption",
          "tag": "Before Operation",
          "desc": "Open your eyes, and look towards the light. Until it burns your eyes, until it gets close to you."
        },
        {
          "code": "TR-28",
          "name": "No Right to Question",
          "tag": "After Operation",
          "desc": "You must understand the rules, and respect how things work in this corner of the land."
        },
        {
          "code": "17-3",
          "name": "A Prick of Conscience",
          "tag": "Before Operation",
          "desc": "You will feel pain if it is left untreated, but empty if you extract it."
        },
        {
          "code": "17-4",
          "name": "Silent Masses",
          "tag": "After Operation",
          "desc": "The axe in your hand is raised, just to cut the nettles silently in the garden."
        },
        {
          "code": "17-5",
          "name": "Merely a Husk",
          "tag": "Before Operation",
          "desc": "Listen, once more. Hear those exquisite expressions, and the hollow pretense that requires no empathy."
        },
        {
          "code": "17-6",
          "name": "Brewing Storm",
          "tag": "After Operation",
          "desc": "Water boils as fate churns."
        },
        {
          "code": "17-7",
          "name": "Unbalanced Reason",
          "tag": "Before Operation",
          "desc": "The collapse it brings about falls only upon those who know nothing of it."
        },
        {
          "code": "17-8",
          "name": "History's Flow",
          "tag": "After Operation",
          "desc": "Those asleep remain in slumber, while those on the deck gaze towards their distant homeland."
        },
        {
          "code": "17-9",
          "name": "Never Pray",
          "tag": "Before Operation",
          "desc": "Take it. Take it? Take it!"
        },
        {
          "code": "17-10",
          "name": "The Measure of Love",
          "tag": "After Operation",
          "desc": "Simply open your arms, and you shall have everything."
        },
        {
          "code": "17-11",
          "name": "Desolation",
          "tag": "Before Operation",
          "desc": "In your cramped sanctuary you murmur silently to yourself: No—This is not my war."
        },
        {
          "code": "17-12",
          "name": "The First Handshake",
          "tag": "After Operation",
          "desc": "Clasp your hands tightly, and keep them closed through the lies and cannonfire."
        },
        {
          "code": "17-13",
          "name": "You Are Not Alone",
          "tag": "Before Operation",
          "desc": "We share the land, we breathe the same air, we endure the same days and nights."
        },
        {
          "code": "17-14",
          "name": "What the Snow Cannot Hide",
          "tag": "Before Operation",
          "desc": "It bends the spine, it eats away warmth, it burns the soul."
        },
        {
          "code": "17-15",
          "name": "A Person's Worth",
          "tag": "Before Operation",
          "desc": "Worthy of salvation, despite the fall."
        },
        {
          "code": "17-16",
          "name": "Onwards, Ever Onwards",
          "tag": "Before Operation",
          "desc": "You cannot turn back. You must not turn back."
        },
        {
          "code": "17-17",
          "name": "Never A Moment's Doubt",
          "tag": "After Operation",
          "desc": "Let's abandon all 'how did we get here' arguments and focus on the reality: We are already here."
        },
        {
          "code": "17-18",
          "name": "A Quiet Soul",
          "tag": "Before Operation",
          "desc": "You hear a hoarse whisper, but the shadow eludes you no matter where you look."
        },
        {
          "code": "17-19",
          "name": "Towards the Wilderness's Cry",
          "tag": "Interlude",
          "desc": "The words of a prophet, emperor, or perhaps just a dreamer."
        },
        {
          "code": "17-20",
          "name": "Crime's Herald, Punishment's Precursor",
          "tag": "Interlude",
          "desc": "Merciful one, please forgive this fool's sins."
        },
        {
          "code": "17-21",
          "name": "Burning in the Night",
          "tag": "Interlude",
          "desc": "Light a flame, and ensure it does not die out."
        },
        {
          "code": "EG-11",
          "name": "After Time",
          "tag": "Interlude",
          "desc": "I will wait for you at the labyrinth's exit."
        }
      ]
    },
    "setId_ssLine_act9d0": {
      "name": "Darknights Memoir",
      "year": 1,
      "kv": "kv_darknights_memoir",
      "title": "title_darknights_memoir",
      "bgid": "storybg_darknights_memoir",
      "main": false,
      "group": "act9d0",
      "desc": "This is the story of a mercenary, venturing through life and death on the battlefield.\nThis is the story of a follower, trusted by others yet failing to protect.\nThis is the story of a dissident, fighting endlessly, scorning life and death all the while.\nThis is the story of W, and her companions.",
      "tags": [
        "Beginner",
        "Special Devices"
      ],
      "rewardOp": "Sideroca",
      "episodes": [
        {
          "code": "DM-1",
          "name": "Buried",
          "tag": "Before Operation",
          "desc": "Hide your thoughts. Hide them from yourself. Raise your sword and staff. A soldier must always move forward."
        },
        {
          "code": "DM-2",
          "name": "By Chance",
          "tag": "Before Operation",
          "desc": "Several accidental betrayals. Several inevitable rescues.\nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "DM-3",
          "name": "Extrusion",
          "tag": "Before Operation",
          "desc": "Would you feel honored to fight alongside living legends and enshrined heroes? Or would you fear for the inevitable tragedy that ensues in every epic?\nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "DM-5",
          "name": "Banner",
          "tag": "After Operation",
          "desc": "A flag trampled into the mud is worthless, but according to some, these pieces of cloth representing these ideals worth fighting for were never flown at all.\nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "DM-6",
          "name": "Far Away",
          "tag": "Before Operation",
          "desc": "This is but one cycle. Each person will walk from one end to the other and repeat the process, again and again."
        },
        {
          "code": "DM-7",
          "name": "Cracked",
          "tag": "Before Operation",
          "desc": "Being betrayed over and over is much like wringing a sponge. It may return to its original shape sooner or later, but it will be wrung again.\nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "DM-8",
          "name": "Separated",
          "tag": "Before Operation",
          "desc": "The only way to overturn fate is to gamble. Only reckless actions with indeterministic results can avoid the inevitable causality of striving for the same goal through different means.\nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "DM-ST-1",
          "name": "Beg for Mercy",
          "tag": "Interlude",
          "desc": "To her child she spoke. To herself she spoke."
        }
      ]
    },
    "setId_ssLine_act18d0": {
      "name": "A Walk in the Dust",
      "year": 2,
      "kv": "kv_a_walk_in_the_dusk",
      "title": "title_a_walk_in_the_dusk",
      "bgid": "storybg_a_walk_in_the_dusk",
      "main": false,
      "group": "act18d0",
      "desc": "The extent of Kal'tsit's influence is immeasurable.\nUrsus, Victoria, and Sargon all bear marks of her presence.\nWhatever her role may be, she firmly and persistently pursues her own vision.\nThose who journey alongside her, too, are busily authoring the stories of their own lives.\nTime stops for no one, and Kal'tsit continues marching onward.",
      "tags": [
        "Beginner",
        "Special Devices"
      ],
      "rewardOp": "Heavyrain",
      "episodes": [
        {
          "code": "WD-1",
          "name": "The Siege of Redhorn",
          "tag": "Before Operation",
          "desc": "The arrival of a squad from Columbia throws an unremarkable Sargon village into turmoil."
        },
        {
          "code": "WD-2",
          "name": "A Bolt From the Blue Oasis",
          "tag": "Before Operation",
          "desc": "Kal'tsit and the survivors travel on foot to a large oasis, where many animals come to slake their thirst. Of course, enemy scouting drones are here too, things that are much less reliant on water.\n Deploys drones as needed to assist enemy combatants."
        },
        {
          "code": "WD-3",
          "name": "Cactus Dunes",
          "tag": "Before Operation",
          "desc": "Elliot silently takes count - a total of three hundred fifteen cacti on the dunes.\n Deploys drones as needed to assist enemy combatants."
        },
        {
          "code": "WD-ST-1",
          "name": "Pine Lilies",
          "tag": "Interlude",
          "desc": "No patch of soil pays any heed to the blossoming of a few clusters of flowers— The land does not care, for the land encompasses all things."
        },
        {
          "code": "WD-5",
          "name": "Reefsteep's Land",
          "tag": "Before Operation",
          "desc": "'The land encircled by reefs,' 'a place where reefs are embraced.' Looking up, Elliot sees no reefs. Are the people here hallucinating?\n Deploys drones as needed to assist enemy combatants."
        },
        {
          "code": "WD-7",
          "name": "Homeland",
          "tag": "Before Operation",
          "desc": "The destitute and homeless are entrusted to the estate of the missing magnate. The mercenary assassin glares beneath the moonlight. At dawn, Old Isin looks up to the stars. The chilly morning wind blows, and he still misses his terrible home.\n Deploys drones as needed to assist enemy combatants."
        },
        {
          "code": "WD-8",
          "name": "Approaching Blizzard",
          "tag": "Before Operation",
          "desc": "Icicles as dark as shadows."
        },
        {
          "code": "WD-ST-2",
          "name": "Visitors From Afar",
          "tag": "Interlude",
          "desc": "He had never felt so strongly about the journey he took in his younger years, until today. He suddenly felt dazed. Though he hated the desert, he never thought about where he could go."
        }
      ]
    },
    "setId_ssLine_act8mini": {
      "name": "Vigilo",
      "year": 3,
      "kv": "kv_vigilo",
      "title": "title_vigilo",
      "bgid": "storybg_vigilo",
      "main": false,
      "group": "act8mini",
      "desc": "A sudden crisis leaves the Doctor and Amiya trapped in the Columbian wastelands. Unexpected aid against unexpected plots, with many possible solutions.\nA Catastrophe looms. The Doctor steps onto the bridge, as if guided by prophecy, to lead Rhodes Island through the crisis. Kal'tsit determines that though the Doctor has lost most episodic memory, a basic understanding of the nature of Originium still remains.\nAfter the Chernobog incident, the Doctor broods over the events of the last three, breakneck months. Caught between confusion and thought, the Doctor recalls an interesting story with a fallen friend.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Spes",
          "tag": "Interlude",
          "desc": "A sudden crisis leaves the Doctor and Amiya trapped in the Columbian wastelands. Unexpected aid against unexpected plots, with many possible solutions."
        },
        {
          "code": "ST-2",
          "name": "Memoria",
          "tag": "Interlude",
          "desc": "A Catastrophe looms. The Doctor steps onto the bridge, as if guided by prophecy, to lead Rhodes Island through the crisis. Kal'tsit determines that though the Doctor has lost most episodic memory, a basic understanding of the nature of Originium still remains."
        },
        {
          "code": "ST-3",
          "name": "Valorem",
          "tag": "Interlude",
          "desc": "After the Chernobog incident, the Doctor broods over the events of the last three, breakneck months. Caught between confusion and thought, the Doctor recalls an interesting story with a fallen friend."
        },
        {
          "code": "ST-4",
          "name": "Cogitatio",
          "tag": "Interlude",
          "desc": "A rebel appears inside Babel, and the target of the attack seems to be the Doctor. Scout arrives in time and detains the intruder, but the Doctor and Theresa have different ideas for how to deal with him."
        },
        {
          "code": "ST-5",
          "name": "Anterior",
          "tag": "Interlude",
          "desc": "Kal'tsit recalls past events related to the doctor. Does this familiar yet foreign person really deserve her trust? The time to make an emotional choice has come."
        },
        {
          "code": "ST-6",
          "name": "Pignus",
          "tag": "Interlude",
          "desc": "While inspecting PRTS, Closure recalls her first encounter with Theresa and the Doctor. After she leaves, the Doctor asks an important question."
        }
      ]
    },
    "setId_ssLine_act33side": {
      "name": "Babel",
      "year": 5,
      "kv": "kv_babel",
      "title": "title_babel",
      "bgid": "storybg_babel",
      "main": false,
      "group": "act33side",
      "desc": "Babel, a land of dreams where the past calls to the future.\nThe tower that resolves differences points towards the truth.\nThe King of Sarkaz steals the flame of hope, and the sparks reignite war.\nKin turn their swords on each other, and heroes rise from the ruins.\nAn assassination puts an end to their differences, but fate is inextricably linked to the truth.\nThe visionary calls out the idealist's epitaph.\nThe King may be gone, but her dreams live on.",
      "tags": [
        "Special Environment",
        "Special Devices",
        "Elemental Injury"
      ],
      "rewardOp": "Odda",
      "episodes": [
        {
          "code": "BB-ST-1",
          "name": "Unfinished Goodbye",
          "tag": "Interlude",
          "desc": "A speck of blood red upon speckless white."
        },
        {
          "code": "BB-1",
          "name": "Great Aspirations",
          "tag": "Before Operation",
          "desc": "I knew this day would come."
        },
        {
          "code": "BB-2",
          "name": "Where Fate Guides",
          "tag": "Before Operation",
          "desc": "Sarkaz has never been destroyed by war. We are strong.\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-3",
          "name": "Silent Crack",
          "tag": "Before Operation",
          "desc": "Today, though, we face the tragic reality of disunity and betrayal.\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-ST-2",
          "name": "Awakening in Exhaustion",
          "tag": "Interlude",
          "desc": "Things have not gone according to plan."
        },
        {
          "code": "BB-4",
          "name": "Long Voyage",
          "tag": "Before Operation",
          "desc": "There will be no reconciliation. I have never shied away from violence.\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-5",
          "name": "Fires of Uprising",
          "tag": "Before Operation",
          "desc": "Some Sarkaz continue to seek a path of peace.\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-6",
          "name": "Flickering Light",
          "tag": "Before Operation",
          "desc": "The banner of war flies high in the distance.\n Deploying Operators requires the assistance of nearby Operators.\n Periodically fires missiles that deal Arts damage to your units while healing enemy units. Can be destroyed."
        },
        {
          "code": "BB-7",
          "name": "Rising Shadow",
          "tag": "Before Operation",
          "desc": "I see the Sarkaz's desire for vengeance.\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-8",
          "name": "Final Countdown",
          "tag": "Before Operation",
          "desc": "If this is your choice...\n Deploying Operators requires the assistance of nearby Operators."
        },
        {
          "code": "BB-9",
          "name": "The Dust Has Settled",
          "tag": "Before Operation",
          "desc": "I'm sorry, child. This should have been my burden."
        },
        {
          "code": "BB-10",
          "name": "Goodbye, Goodbye",
          "tag": "Before Operation",
          "desc": "Farewell, Doctor. All this should have belonged to you.\n Deals Arts damage to your nearby units every second while healing enemy units. When destroyed, 'Amiya' loses a percentage of HP."
        },
        {
          "code": "BB-ST-3",
          "name": "End of Souls",
          "tag": "Interlude",
          "desc": "The Sarkaz wanders across the wilderness of consciousness and soul. It is the final moment of her existence."
        }
      ]
    },
    "setId_ssLine_act37side": {
      "name": "Ending a Grand Overture",
      "year": 6,
      "kv": "kv_ending_a_grand_overture",
      "title": "title_ending_a_grand_overture",
      "bgid": "storybg_ending_a_grand_overture",
      "main": false,
      "group": "act37side",
      "desc": "Vina Victoria looks back from the stairs\nand sees her Glasgow companions, along with the city's scars.\nThe war has already ended, but blood still flows.\nThe one missing from the funeral, the one who betrayed the crown,\nthe one who returned to the ruins of Norport...\nVina Victoria's heroics ended with the war,\nbut she remains Vina.",
      "tags": [
        "Neutral Units"
      ],
      "rewardOp": "Catherine",
      "episodes": [
        {
          "code": "GO-ST-1",
          "name": "Course of History",
          "tag": "Interlude",
          "desc": "'History is like a sailing ship adrift, the course of which no one can predict.'"
        },
        {
          "code": "GO-1",
          "name": "Lingering Scores",
          "tag": "Before Operation",
          "desc": "'Vina isn't afraid to talk with her fist. She's always first into the fray.'"
        },
        {
          "code": "GO-2",
          "name": "Crippling Illness",
          "tag": "Before Operation",
          "desc": "'Sleepless nights due to pain are rare for the Infected of Rhodes Island. I used to think suppressants like that were available everywhere.'\n When skill is activated, begins manufacturing equipment and becomes the endpoint for all freight cars; once SP gauge is full, deploys random equipment on the surrounding 8 Low Ground and deployable High Ground tiles"
        },
        {
          "code": "GO-3",
          "name": "Parliament's Voice",
          "tag": "Before Operation",
          "desc": "'I was so grateful to Allerdale, borderline reverent. Without her, the Glasgow Gang and Rhodes Island would have had nowhere to go.'"
        },
        {
          "code": "GO-4",
          "name": "Alcohol and Placebo",
          "tag": "Before Operation",
          "desc": "'I could almost say I was moved by Vina's speech. The rest of the Exemplars certainly were. They would've carried her straight through the gates of Londinium, if they could.'\n When skill is activated, begins manufacturing equipment and becomes the endpoint for all freight cars; once SP gauge is full, deploys random equipment on the surrounding 8 Low Ground and deployable High Ground tiles"
        },
        {
          "code": "GO-5",
          "name": "Scrap and Nail",
          "tag": "Before Operation",
          "desc": "'The factory equipment was being watched by the Sarkaz, so the workers tried to borrow Vina's hammer to bash through to a secret passage. Guess what? She said yes.'"
        },
        {
          "code": "GO-6",
          "name": "The Dinner Proclamation",
          "tag": "Before Operation",
          "desc": "'We never knew when our next meal was coming. We often had to drive away troublemakers in the middle of a meal.'"
        },
        {
          "code": "GO-7",
          "name": "Rusted Crown",
          "tag": "After Operation",
          "desc": "'Vina was a really bad storyteller, but we managed to figure out how she got here from the palace. From that day on, she would be Siege of the Glasgow Gang, she said.'\n When skill is activated, begins manufacturing equipment and becomes the endpoint for all freight cars; once SP gauge is full, deploys random equipment on the surrounding 8 Low Ground and deployable High Ground tiles"
        },
        {
          "code": "GO-8",
          "name": "Sword Reforged in War",
          "tag": "Before Operation",
          "desc": "'When the steam dissipated, Vina told me that history will remember its heroes.'\n When skill is activated, begins manufacturing equipment and becomes the endpoint for all freight cars; once SP gauge is full, deploys random equipment on the surrounding 8 Low Ground and deployable High Ground tiles"
        },
        {
          "code": "GO-9",
          "name": "A Hero's Final Bow",
          "tag": "Before Operation",
          "desc": "'We all love Victoria, but there's nothing more we can do for her.'\n When skill is activated, begins manufacturing equipment and becomes the endpoint for all freight cars; once SP gauge is full, deploys random equipment on the surrounding 8 Low Ground and deployable High Ground tiles\n Deals Arts damage."
        },
        {
          "code": "GO-ST-2",
          "name": "Fairytale Ending",
          "tag": "Interlude",
          "desc": "'There will come a day that you, Vina, will read these words I wrote down.'"
        }
      ]
    },
    "setId_ssLine_act18mini": {
      "name": "See You Soon",
      "year": 6,
      "kv": "kv_see_you_soon",
      "title": "title_see_you_soon",
      "bgid": "storybg_see_you_soon",
      "main": false,
      "group": "act18mini",
      "desc": "Loughshinny boards the Duke of Wellington's ship with the Doctor's help, and finally ends the ducal alliance's stalemate siege of the city as Eblana's purple flames spread onto the city walls. Loughshinny keeps her promise and returns to Tara.\nAfter the ducal alliance enters the city, Ch'en finally locates Reunion in Londinium, now led by Nine. Reunion saves some innocents affected by the war, and also hears a call to rise up and resist from Ursus.\nAfter the battle at the walls, the defeat of the Sarkaz has led to more chaos in the city. Nowell helps Clovisia, leader of the Self-Salvation Corps, save the innocent citizens. He witnesses her death and lets his obsession go.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Adhaint an Ghrian",
          "tag": "Interlude",
          "desc": "Loughshinny boards the Duke of Wellington's ship with the Doctor's help, and finally ends the ducal alliance's stalemate siege of the city as Eblana's purple flames spread onto the city walls. Loughshinny keeps her promise and returns to Tara."
        },
        {
          "code": "ST-2",
          "name": "Отправляйтесь к Урсусу",
          "tag": "Interlude",
          "desc": "After the ducal alliance enters the city, Ch'en finally locates Reunion in Londinium, now led by Nine. Reunion saves some innocents affected by the war, and also hears a call to rise up and resist from Ursus."
        },
        {
          "code": "ST-3",
          "name": "Passing",
          "tag": "Interlude",
          "desc": "After the battle at the walls, the defeat of the Sarkaz has led to more chaos in the city. Nowell helps Clovisia, leader of the Self-Salvation Corps, save the innocent citizens. He witnesses her death and lets his obsession go."
        },
        {
          "code": "ST-4",
          "name": "Canoes off the Riverside",
          "tag": "Interlude",
          "desc": "A Rose Riverside's Canoe finds the trail of her missing princess in Londinium, but she does not expect yet another parting waiting for her at its end."
        },
        {
          "code": "ST-5",
          "name": "Another Breath of Death",
          "tag": "Interlude",
          "desc": "The Nachzehrer King makes a final stand at the Palace of Westhaleg. He lets the Doctor's group through to Theresis, and enjoys his last war alone."
        },
        {
          "code": "ST-6",
          "name": "All the Unrevealed",
          "tag": "Interlude",
          "desc": "As the Sarkaz troops withdraw, Catastrophe clouds appear over the capitals of all the Core nations. Amiya stops a fleet that tries to intercept the retreating Sarkaz, and Laterano's main server delivers a revelation about the future."
        }
      ]
    },
    "setId_ssLine_act10d5": {
      "name": "Children of Ursus",
      "year": 1,
      "kv": "kv_children_of_ursus",
      "title": "title_children_of_ursus",
      "bgid": "storybg_children_of_ursus",
      "main": false,
      "group": "act10d5",
      "desc": "Dur-nar points out one of Gummy's strange habits when attacking. Gummy tries to overcome it, but fails.\nHer habits are all left by past trauma, and may take a bit of time to fade.\nIstina tries to treat herself inside her dorm, but at that time, May knocks on her door to visit.\nAccompanying May is Natalya, another member of the Ursus Student Self-government Group.\nZima cannot wake up from her nightmare.\nShe always has such dreams. She will always have such dreams.",
      "tags": [],
      "rewardOp": "Absinthe",
      "episodes": [
        {
          "code": "ST-1",
          "name": "Habits",
          "tag": "Interlude",
          "desc": "Dur-nar points out one of Gummy's strange habits when attacking. Gummy tries to overcome it, but fails.\nHer habits are all left by past trauma, and may take a bit of time to fade."
        },
        {
          "code": "ST-2",
          "name": "The Chosen",
          "tag": "Interlude",
          "desc": "Istina tries to treat herself inside her dorm, but at that time, May knocks on her door to visit.\nAccompanying May is Natalya, another member of the Ursus Student Self-government Group."
        },
        {
          "code": "ST-3",
          "name": "Meeting in a Dream",
          "tag": "Interlude",
          "desc": "Zima cannot wake up from her nightmare.\nShe always has such dreams. She will always have such dreams."
        },
        {
          "code": "ST-4",
          "name": "Hypocrisy",
          "tag": "Interlude",
          "desc": "Zima approaches Natalya, her companion in the Ursus Student Self-government Group. Both of them have questions to ask, as well as things they want to confide.\nThe problem has not been solved, but they will face the future together."
        },
        {
          "code": "ST-5",
          "name": "Talking in Riddles",
          "tag": "Interlude",
          "desc": "Leto, honey drunk, regales Beehunter with tales of her 'glorious past.'\nThere are some things that the other members of the Ursus Student Self-government Group may not know."
        },
        {
          "code": "ST-6",
          "name": "Business as Usual",
          "tag": "Interlude",
          "desc": "Amiya receives a request to transfer to the front lines. It is from the one member of Zima's group who is still staying behind in the Logistics Department - Natalya.\nAfter discussion, the Doctor decides to look into the girl who submitted the application."
        },
        {
          "code": "ST-7",
          "name": "Before Spring's Coming",
          "tag": "Interlude",
          "desc": "Zoya escapes from the occupied school, meets her father's colleagues along the way, and learns about the state of Chernobog.\nShe does not know if her mother still lives, and her father has gone to Peterheim Middle School to rescue the students."
        }
      ]
    },
    "setId_ssLine_act51side": {
      "name": "People, A People",
      "year": 7,
      "kv": "kv_people_a_people",
      "title": "title_people_a_people",
      "bgid": "storybg_people_a_people",
      "main": false,
      "group": "act51side",
      "desc": "Deity Grypherburg holds a special hearing on the occupation of Katorga by a student group led by Sonya. Zoya appears as a witness and recalls the day when Student Assembly's decided to protest.\nAt the annual Winter Ball, Natalya meets many kinds of nobles as she probes for information alone. While the nobles bicker over politics, they find themselves surrounded by protesting students.\nThe police appear as the protests intensify, quelling the protest and arresting Sonya. Before the ball starts, Witte is informed of an imminent assassination plot against the Emperor, only to find the Emperor has vanished by the time he arrives.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "PA-ST-1",
          "name": "The Rabble",
          "tag": "Interlude",
          "desc": "I accuse a clamorous wasteland. I see a thousand mouths and hear ten thousand voices. The arguments never end, nor reach a conclusion. Their proud posturing represents the destination of their intention."
        },
        {
          "code": "PA-1",
          "name": "'Welcome to Katorga'",
          "tag": "Before Operation",
          "desc": "I tell of a fragmented night, where youth was extinguished in the snow, while rotten wood lingers in the fireplace."
        },
        {
          "code": "PA-2",
          "name": "In Shackles",
          "tag": "Before Operation",
          "desc": "I collect an ancient debt of blood. You whipped and herded the numbered beasts and let them cry and wail, until they remember that they were human once."
        },
        {
          "code": "PA-3",
          "name": "Sun Shines Upon Grypherburg",
          "tag": "Before Operation",
          "desc": "I beseech a clear night. One spark is all it will take to ignite this dried and pained land, thirsting for new life."
        },
        {
          "code": "PA-4",
          "name": "Behind the Wall",
          "tag": "Before Operation",
          "desc": "I fabricate an intricate dance. The shackles I was given at birth are my pivot. I stand with my back to the candlelight, so that I may see the dark night beyond the wall."
        },
        {
          "code": "PA-5",
          "name": "Noble Betrayal",
          "tag": "Before Operation",
          "desc": "I admit a necessary transgression. I withheld all my opinions, for the scales raised high can no longer discern truth from falsehood."
        },
        {
          "code": "PA-6",
          "name": "Separate Exiles",
          "tag": "Before Operation",
          "desc": "I sketch a crowded path. The hurried footsteps happen to meet upon the same road. No one knows who is right, everyone in exile according to their own fate."
        },
        {
          "code": "PA-7",
          "name": "Two Ends of a Dead Knot",
          "tag": "Before Operation",
          "desc": "I present a tightly tied dead knot. You and I are on each end of the rope, with the frozen tundra of the north and the dried channels of Lake Neva in between. Yet fate inescapable drags me towards your embrace."
        },
        {
          "code": "PA-8",
          "name": "A Thousand Years Later",
          "tag": "Before Operation",
          "desc": "I borrow from you a broken sword. I, too, have a path to carve out on my own. A thousand years since your death, they sculpted you into a statue, locked you in concrete and steel. All so that you can never swing your sword. I shall do what you cannot."
        },
        {
          "code": "PA-ST-2",
          "name": "Flawless Blemish",
          "tag": "Interlude",
          "desc": "I recite the wailing of the children and the laments of the mother. Ursus, thy name a broken poem, thine verses too heavy for my hungry flesh and blood to lift. But after tonight, the fire is lit, and no one can summon the fragile spring back from those lips."
        }
      ]
    },
    "setId_ssLine_act16side": {
      "name": "Guide Ahead",
      "year": 3,
      "kv": "kv_guiding_ahead",
      "title": "title_guiding_ahead",
      "bgid": "storybg_guiding_ahead",
      "main": false,
      "group": "act16side",
      "desc": "A grand and unprecedented Summit of Nations,\nGathering envoys from all lands to the holy city of Laterano.\nBeneath an eternal halo, they share joy and glory;\nAmidst ceaseless gunshots, they fend off pain and darkness.\nForeign travelers marvel at the scenery, while returning Messengers silently pray:\nMay supreme grace be bestowed upon us, may eternal redemption descend to us.\nMay you and I, guided by the light, journey ahead to an unknown horizon.",
      "tags": [
        "Special Devices"
      ],
      "rewardOp": "Enforcer",
      "episodes": [
        {
          "code": "GA-ST-1",
          "name": "Right Place, Right Time",
          "tag": "Interlude",
          "desc": "Many a guest has been invited to this distinguished Lateran assembly, but make no mistake: some visitors are unwelcome, unrequested, and here of their own accord."
        },
        {
          "code": "GA-1",
          "name": "Darkness Beneath the Light",
          "tag": "Before Operation",
          "desc": "He prays within the Ecclesia Requietum for the spirit of the deceased, as if all the clamor is naught to him."
        },
        {
          "code": "GA-2",
          "name": "Time to Stroll",
          "tag": "Before Operation",
          "desc": "He recounts his experiences to the people about him, beginning at Iberia, and ending at Laterano."
        },
        {
          "code": "GA-3",
          "name": "Mixed Blood",
          "tag": "Before Operation",
          "desc": "He has many followers, and among them Sarkaz and Liberi are in the majority. Between them there is no division, but rather recognition as fellow brothers and sisters."
        },
        {
          "code": "GA-4",
          "name": "Ecclesia Requietum",
          "tag": "Before Operation",
          "desc": "In his heart a question lies, yet no person can answer him.\nBoth allied and enemy units will fight for control over this device; When activated, restores SP of surrounding allies"
        },
        {
          "code": "GA-5",
          "name": "Obsequies",
          "tag": "Before Operation",
          "desc": "He seeks out Cecelia, in service not of a calamity, but of an answer.\nBoth allied and enemy units will fight for control over this device; When activated, restores SP of surrounding allies"
        },
        {
          "code": "GA-6",
          "name": "Requiem",
          "tag": "Before Operation",
          "desc": "Whether jests of fate, or inevitable coincidences, nothing can hold him in his stride.\nBoth allied and enemy units will fight for control over this device; When activated, restores SP of surrounding allies"
        },
        {
          "code": "GA-7",
          "name": "Light and Shadow",
          "tag": "Before Operation",
          "desc": "He feels a ridiculous, unbearable angering, a vastly bewildering emptiness.\nBoth allied and enemy units will fight for control over this device; When activated, restores SP of surrounding allies"
        },
        {
          "code": "GA-8",
          "name": "Shadow and Ash",
          "tag": "Before Operation",
          "desc": "When accumulated obsessions and the past's burning fury collide, he comes to an answer.\nBoth allied and enemy units will fight for control over this device; When activated, restores SP of surrounding allies"
        },
        {
          "code": "GA-ST-2",
          "name": "Iris",
          "tag": "Interlude",
          "desc": "The iris fields outside the Ecclesia Requietum are gentle in the breeze; their rustle like a farewell, like soft song."
        }
      ]
    },
    "setId_ssLine_act26side": {
      "name": "Hortus de Escapismo",
      "year": 4,
      "kv": "kv_hortus_de_escapismo",
      "title": "title_hortus_de_escapismo",
      "bgid": "storybg_hortus_de_escapismo",
      "main": false,
      "group": "act26side",
      "desc": "After sixty years of silence, Sanctilaminium Ambrosii sends out a cry for help.\nParadise is stranded in the barrens, and order teeters on the brink of destruction.\nIt can take years to establish a true friendship, yet the collapse of trust can happen in seconds.\nThe pious have no choice but to renounce their faith, and the innocent must take on sin and plea mercy.\nThe young saint asks himself: how do you correct suffering if it was not caused by error?",
      "tags": [
        "Challenging",
        "Neutral Units",
        "Elemental Injury",
        "Special Devices",
        "Special Terrain",
        "Special Tools"
      ],
      "rewardOp": "Insider",
      "episodes": [
        {
          "code": "HE-ST-1",
          "name": "Crown Offering",
          "tag": "Interlude",
          "desc": "The Holy City bestows a radiant crown."
        },
        {
          "code": "HE-1",
          "name": "Home Sweet Home",
          "tag": "Before Operation",
          "desc": "Before this place became a den for Infected creatures, it was once a magnificent building with towering eaves.\n Can calm the emotions of residents."
        },
        {
          "code": "HE-2",
          "name": "River of Life",
          "tag": "Before Operation",
          "desc": "How can we pave the way for life in this desolate wasteland?\n Can calm the emotions of residents.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately"
        },
        {
          "code": "HE-3",
          "name": "No Empty Hands",
          "tag": "Before Operation",
          "desc": "A savvy raider will never return empty-handed.\n Can calm the emotions of residents.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately"
        },
        {
          "code": "HE-4",
          "name": "My Life I Gave for You",
          "tag": "Before Operation",
          "desc": "Behind a quiet and comfortable life is someone protecting you from the wind and rain.\n Can calm the emotions of residents.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately\n Rocks will periodically fall and roll down a slope, dealing damage to friendly units in the way"
        },
        {
          "code": "HE-5",
          "name": "God in His Temple",
          "tag": "Before Operation",
          "desc": "Idols can be desecrated, faith can falter.\n Can calm the emotions of residents.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately\n Rocks will periodically fall and roll down a slope, dealing damage to friendly units in the way"
        },
        {
          "code": "HE-6",
          "name": "Serenade",
          "tag": "Before Operation",
          "desc": "The black-horned angel prays for dawn's arrival.\n Can calm the emotions of residents.\n Rocks will periodically fall and roll down a slope, dealing damage to friendly units in the way"
        },
        {
          "code": "HE-ST-2",
          "name": "In the Garden",
          "tag": "Interlude",
          "desc": "Though no longer unblemished, this flower still has not changed."
        },
        {
          "code": "HE-7",
          "name": "Joined by Love",
          "tag": "Before Operation",
          "desc": "Life may be tough, but we'll pull through along with our brothers.\n Can calm the emotions of residents.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately\n Rocks will periodically fall and roll down a slope, dealing damage to friendly units in the way"
        },
        {
          "code": "HE-8",
          "name": "Devout Follower",
          "tag": "Before Operation",
          "desc": "People always wish to have their prayers answered, searching for a salvation that does not exist.\n A temporary walkway built with planks, easily destroyed by falling rocks, turning into Holes in the process; Ground units that pass it will fall to the bottom and be defeated immediately\n Rocks will periodically fall and roll down a slope, dealing damage to friendly units in the way\n are destroyed upon the stage's start"
        },
        {
          "code": "HE-ST-3",
          "name": "Guide by Light",
          "tag": "Interlude",
          "desc": "I hope we can meet again one day, in the Holy City."
        }
      ]
    },
    "setId_ssLine_act42side": {
      "name": "The Masses' Travels",
      "year": 6,
      "kv": "kv_the_masses_travels",
      "title": "title_the_masses_travels",
      "bgid": "storybg_the_masses_travels",
      "main": false,
      "group": "act42side",
      "desc": "The Second Summit of Nations begins.\nThe land's enemies, the sea's strangers,\nall have gathered at Laterano.\nThe centuries-old order of the Holy City,\nshall be the salvation of all, living or not.\nAt what price cometh salvation?\nOnly the Laterans can know.",
      "tags": [
        "Special Terrain",
        "Neutral Units"
      ],
      "rewardOp": "Sankta Miksaparato",
      "episodes": [
        {
          "code": "MT-ST-1",
          "name": "Fallen",
          "tag": "Interlude",
          "desc": "Demons mutter in their ears, and so the angels' halos are extinguished."
        },
        {
          "code": "MT-1",
          "name": "Order",
          "tag": "Before Operation",
          "desc": "When your calls, ignored for so long, suddenly receive a response, will you shudder with relief as your dreams are realized, or will everything feel... unreal?"
        },
        {
          "code": "MT-2",
          "name": "Prayer",
          "tag": "Before Operation",
          "desc": "A miracle will befall this land when everyone believes that even the most fantastical dream can become reality.\n Operators deployed within will be pulled into the dream"
        },
        {
          "code": "MT-3",
          "name": "Worship",
          "tag": "Before Operation",
          "desc": "The dream has transformed our lives, and there are clues hidden within that allow us to recognize it.\n Operators deployed within will be pulled into the dream"
        },
        {
          "code": "MT-4",
          "name": "Wayfinder",
          "tag": "Before Operation",
          "desc": "The one finding a path forgot the road he walked in on, but he still believes the place he stands is his destined endpoint.\n Operators deployed within will be pulled into the dream"
        },
        {
          "code": "MT-ST-2",
          "name": "Enlightenment",
          "tag": "Interlude",
          "desc": "A new life, a new faith, a new future."
        },
        {
          "code": "MT-5",
          "name": "Communion",
          "tag": "Before Operation",
          "desc": "May our halos be shared. May our Lord share the blessings with all.\n Operators deployed within will be pulled into the dream\n After awakening, provides DP and Deployment Limit"
        },
        {
          "code": "MT-6",
          "name": "Confess",
          "tag": "Before Operation",
          "desc": "Those deep in dream return to reality, while errant angels return to their homeland.\n Operators deployed within will be pulled into the dream\n After awakening, joins battle as an ally"
        },
        {
          "code": "MT-7",
          "name": "Funeral",
          "tag": "Before Operation",
          "desc": "All walk toward the inevitable end. That is why the continuity of meaning is so precious.\n Operators deployed within will be pulled into the dream\n After awakening, joins battle as an ally"
        },
        {
          "code": "MT-8",
          "name": "Pilgrimage",
          "tag": "Before Operation",
          "desc": "The first Saint returns to the Holy City. The term 'Sankta' is redefined.\n Operators deployed within will be pulled into the dream\n After awakening, joins battle as an ally"
        },
        {
          "code": "MT-9",
          "name": "Interpretation",
          "tag": "Before Operation",
          "desc": "The true face of the Law was nothing like what His faithful, His guardians, or His questioners imagined.\n Operators deployed within will be pulled into the dream\n After awakening, speeds up Operator awakening and replenishes SP and ammo"
        },
        {
          "code": "MT-10",
          "name": "Birth",
          "tag": "Before Operation",
          "desc": "The infant severs the umbilical cord connecting it to God, determined to be born as a human—with all the ugliness, transience, and suffering that entails.\n Operators deployed within will be pulled into the dream\n After awakening, helps out in battle by various means"
        },
        {
          "code": "MT-ST-3",
          "name": "Reunion",
          "tag": "Interlude",
          "desc": "When the newborn Sankta meet the Law once more, it will take many years for the two to mend the voids in one another."
        },
        {
          "code": "MT-ST-4",
          "name": "Voyage",
          "tag": "Interlude",
          "desc": "We pray for the future. We walk towards our destined reunion... We are not alone."
        }
      ]
    },
    "setId_ssLine_act14side": {
      "name": "Break the Ice",
      "year": 3,
      "kv": "kv_break_the_ice",
      "title": "title_break_the_ice",
      "bgid": "storybg_break_the_ice",
      "main": false,
      "group": "act14side",
      "desc": "The mountains guard ancient beliefs \nand the snow hides great dangers \nin this realm of snow.\nThe gods have watched over these \nrarely-visited cliffs for a thousand years.\nSmoke rises gently from chimneys in this peaceful land,\nits tranquility broken by a great train rushing through.",
      "tags": [
        "Special Terrain",
        "Special Environment"
      ],
      "rewardOp": "Kjera",
      "episodes": [
        {
          "code": "BI-1",
          "name": "Starting on a Sour Note",
          "tag": "Before Operation",
          "desc": "Clawbeasts in the untamed mountains, drones hovering beneath the shade of trees, and warriors upon the snow. They surely didn't come for some kind of picnic party. \nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted."
        },
        {
          "code": "BI-ST-1",
          "name": "When in Kjerag...",
          "tag": "Interlude",
          "desc": "You find it difficult to turn down such hospitality, so why not have some fun for the time being?"
        },
        {
          "code": "BI-2",
          "name": "Smoothing Things Over",
          "tag": "Before Operation",
          "desc": "Those who are driven by impulsive emotions can be hard to reason with. Give them some space to calm down.\nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted.\nPeriodically applies Cold to all units."
        },
        {
          "code": "BI-3",
          "name": "Inscrutable",
          "tag": "Before Operation",
          "desc": "Unlike the single-minded clawbeasts, humans will weigh the options most likely to give them their desired outcomes.\nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted.\nPeriodically applies Cold to all units."
        },
        {
          "code": "BI-ST-2",
          "name": "Winter Mountain is Coming",
          "tag": "Interlude",
          "desc": "Reality is more terrifying than fiction, and man-made disasters is more unpredictable than natural disasters."
        },
        {
          "code": "BI-4",
          "name": "Find Your Way Through the Snow",
          "tag": "Before Operation",
          "desc": "There are no shortcuts on the road to self-actualization, and this is a truth that the family knows well.\nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted.\nPeriodically applies Cold to all units."
        },
        {
          "code": "BI-5",
          "name": "Hunting Grounds",
          "tag": "Before Operation",
          "desc": "Seasoned hunters don't solely rely on sheer strength to obtain victory. Even the blood they spill during the hunt can become a deadly trap. \nApplies 'Cold' to units on top of it, and changes the direction of enemies when they are shifted.\nDuring Snowfall, all enemies are pushed in a certain direction."
        },
        {
          "code": "BI-ST-3",
          "name": "One Mindless Move",
          "tag": "Interlude",
          "desc": "Many people believe that their loss is determined by a single move, without ever realizing that every step before that was forcing them closer to defeat."
        },
        {
          "code": "BI-6",
          "name": "Diversion",
          "tag": "Before Operation",
          "desc": "Not everyone is willing to trudge along the smooth path that others laid down for them.\nApplies 'Cold' to units on top of it, and changes the direction of enemies when they are shifted.\nDuring Snowfall, all enemies are pushed in a certain direction."
        },
        {
          "code": "BI-7",
          "name": "Breaking the Ice",
          "tag": "Before Operation",
          "desc": "Some people yearn to keep things frozen in time, while others strive to shatter the status quo. \nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted.\nPeriodically applies Cold to all units."
        },
        {
          "code": "BI-8",
          "name": "Check",
          "tag": "Before Operation",
          "desc": "To mercilessly proclaim this word at the pivotal moment between victory and defeat is not to show your cards - it is simply a matter of respect.\nApplies 'Cold' to units on top of it, and increases the distance Frozen enemies on it are shifted.\nPeriodically applies Cold to all units."
        },
        {
          "code": "BI-ST-4",
          "name": "Adjournment",
          "tag": "Interlude",
          "desc": "Human lives are not chess pieces, ceaselessly locked in games over victory or defeat. You gave him an opportunity to accept this offer."
        }
      ]
    },
    "setId_ssLine_act30side": {
      "name": "The Rides to Lake Silberneherze",
      "year": 5,
      "kv": "kv_the_rides_to_lake_silberneherze",
      "title": "title_the_rides_to_lake_silberneherze",
      "bgid": "storybg_the_rides_to_lake_silberneherze",
      "main": false,
      "group": "act30side",
      "desc": "A girl from Ursus walks off the train with her mother's keepsake.\nA Victorian veteran gazes upon his men with a solemn expression.\nAn exiled Kazimierzian champion wipes the blood off her hands.\nThe new masters of Kjerag maneuver for advantage, but its guardian's brow is furrowed.\nThe one in the shadows tugs on the brim of his hat, certain there is something going on.\nThe train to Lake Silberneherze is about to depart.\nTake your seats, ladies and gentlemen.",
      "tags": [
        "Special Tools",
        "Special Devices"
      ],
      "rewardOp": "Harold",
      "episodes": [
        {
          "code": "RS-ST-1",
          "name": "Waiting Room",
          "tag": "Interlude",
          "desc": "The beginning of the journey, the beginning of the plan."
        },
        {
          "code": "RS-1",
          "name": "Important Information",
          "tag": "Before Operation",
          "desc": "A unique ride has unique rules.\n Makes surrounding Operators immune to the Frigid environmental effect."
        },
        {
          "code": "RS-2",
          "name": "Same Train, Different Destination",
          "tag": "Before Operation",
          "desc": "Same train, different destination. True understanding is hard to achieve, even when everyone speaks the same language.\n Makes surrounding Operators immune to the Frigid environmental effect."
        },
        {
          "code": "RS-3",
          "name": "Temporary Stop",
          "tag": "Before Operation",
          "desc": "Accidents happen all the time while traveling. Unexpected temporary stops are among the most common.\n Makes surrounding Operators immune to the Frigid environmental effect."
        },
        {
          "code": "RS-4",
          "name": "Back on Track",
          "tag": "Before Operation",
          "desc": "No one wants the worst outcome. How wonderful it would be, if all was well again.\n Makes surrounding Operators immune to the Frigid environmental effect."
        },
        {
          "code": "RS-ST-2",
          "name": "Mountain Railway",
          "tag": "Interlude",
          "desc": "Facing the problem directly means dealing with surprises that pop up, like the steep and winding uphill slope."
        },
        {
          "code": "RS-5",
          "name": "Train Hopping",
          "tag": "Before Operation",
          "desc": "We must all settle our scores, sooner or later.\n Makes surrounding Operators immune to the Frigid environmental effect.\n Immediately ignites an Emergency Heater."
        },
        {
          "code": "RS-6",
          "name": "Additional Ticket",
          "tag": "Before Operation",
          "desc": "All flukes must be repaid, all actions recorded.\n Makes surrounding Operators immune to the Frigid environmental effect.\n Immediately ignites an Emergency Heater."
        },
        {
          "code": "RS-7",
          "name": "Control Malfunction",
          "tag": "Before Operation",
          "desc": "The safety valve has begun to fail. System-wide errors are sometime caused by the most inconspicuous part.\n Makes surrounding Operators immune to the Frigid environmental effect.\n Immediately ignites an Emergency Heater."
        },
        {
          "code": "RS-8",
          "name": "Terminal Velocity",
          "tag": "Before Operation",
          "desc": "I am of Kjerag. Face me.\n Makes surrounding Operators immune to the Frigid environmental effect.\n Immediately ignites an Emergency Heater."
        },
        {
          "code": "RS-ST-3",
          "name": "Final Destination",
          "tag": "Interlude",
          "desc": "The train has arrived at its final destination, filled with resolution of the past, and hope for the future."
        }
      ]
    },
    "setId_ssLine_act46side": {
      "name": "Retracing Our Steps",
      "year": 7,
      "kv": "kv_retracing_our_steps",
      "title": "title_retracing_our_steps",
      "bgid": "storybg_retracing_our_steps",
      "main": false,
      "group": "act46side",
      "desc": "On an ordinary day, Kjerag is struck by a Catastrophe for the first time in history.\nThe three clans initiate rescue operations after the Catastrophe, but they cannot prevent panic from spreading through the population. Enya realizes that Kjarr has gone missing.\nGnosis goes to the Rhine Lab observation station to inquire about the cause of the Catastrophe. Elena discovers that observation records from before the Catastrophe have been altered, and a researcher, Carolin, has gone missing. Just then, an angry Kjerag mob surrounds the station.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "OS-ST-1",
          "name": "Landslide",
          "tag": "Interlude",
          "desc": "And She said, henceforth you shall walk the path forward alone."
        },
        {
          "code": "OS-1",
          "name": "Amidst the Wailing",
          "tag": "Before Operation",
          "desc": "The wailing fowlbeasts continue to circle above the snow, heralding news of death. More misfortune is still on its way."
        },
        {
          "code": "OS-2",
          "name": "Lovely Neighbors",
          "tag": "Before Operation",
          "desc": "The visitor knocks on the door, bringing fine food and wine and putting on a show of friendship, waiting for a sign of weakness he can exploit."
        },
        {
          "code": "OS-3",
          "name": "Among Snowy Shrubs",
          "tag": "Before Operation",
          "desc": "New friends bring opportunities, if you seize the day."
        },
        {
          "code": "OS-4",
          "name": "Conjoined Lives",
          "tag": "Before Operation",
          "desc": "We put aside our differences and the conflicts of the past, and walk hand-in-hand towards the same future."
        },
        {
          "code": "OS-ST-2",
          "name": "A Pilgrimage, A Knell",
          "tag": "Interlude",
          "desc": "As the others weep, it is time for you to depart. The snow never waits, nor is it ever in a hurry."
        },
        {
          "code": "OS-5",
          "name": "A Lonely Winter's Night",
          "tag": "Before Operation",
          "desc": "Even as those who could be trusted are separated, she sets out on her journey, with her brave heart as companion."
        },
        {
          "code": "OS-6",
          "name": "Emerald",
          "tag": "Before Operation",
          "desc": "Patience is the hunter's virtue. It will help you find a gap, an opportunity, a beginning, and the dawn of friendship."
        },
        {
          "code": "OS-7",
          "name": "Incense and Shadows",
          "tag": "Before Operation",
          "desc": "A secret in a haze, a stick of incense burned down to ash, a rumbling roar, two lovers, three children."
        },
        {
          "code": "OS-8",
          "name": "Proclamation",
          "tag": "Before Operation",
          "desc": "What people believe depends on what they see and hear. Thus the art of deception is born."
        },
        {
          "code": "OS-ST-3",
          "name": "Road of the Heartseekers",
          "tag": "Interlude",
          "desc": "The path of the righteous is narrow, fraught with hardship and snowstorms, with fiends and terrors. For the heart has never been readily found, for the heart is forged through countless trials."
        },
        {
          "code": "OS-9",
          "name": "Cold Steel",
          "tag": "Before Operation",
          "desc": "Some still futilely long for a warm spring."
        },
        {
          "code": "OS-10",
          "name": "By Kjeragandr",
          "tag": "Before Operation",
          "desc": "By Kjeragandr, blessed be Her name."
        },
        {
          "code": "OS-ST-4",
          "name": "'Arrival'",
          "tag": "Interlude",
          "desc": "Whispers and fragments of finality, a single boat that escaped the flood that sweeps all. Good luck, Terra."
        }
      ]
    },
    "setId_ssLine_act21side": {
      "name": "IL Siracusano",
      "year": 4,
      "kv": "kv_il_siracusano",
      "title": "title_il_siracusano",
      "bgid": "storybg_il_siracusano",
      "main": false,
      "group": "act21side",
      "desc": "The invitation is unexpected, but she knew it would come some day.\nThe explosion is premeditated, but he was well aware it would happen eventually.\nThe gunshot resounds through the clouds, and he has waited several decades for it.\nThe farewell is long overdue, and she turns away with no intention to stay.\nThe city is in its rainy season, so don't forget to bring an umbrella.",
      "tags": [
        "Special Environment",
        "Neutral Units"
      ],
      "rewardOp": "Vigil",
      "episodes": [
        {
          "code": "IS-ST-1",
          "name": "Lingering Illness",
          "tag": "Interlude",
          "desc": "Waking with a start on a rainy night, old wounds aching."
        },
        {
          "code": "IS-1",
          "name": "Silent Raindrops",
          "tag": "Before Operation",
          "desc": "The rain has gone on for too long. So long that we could no longer tell truth from lies. So long that we could not see who has walked into the rain."
        },
        {
          "code": "IS-2",
          "name": "The Honorable",
          "tag": "Before Operation",
          "desc": "'Signora Sicilia be my witness, I shall give glory unto my famiglia, never to deceive or betray it.'\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-3",
          "name": "Prime Target",
          "tag": "Before Operation",
          "desc": "To change the absurdity of reality, one must be prepared to make an enemy of the world.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-4",
          "name": "Crack of Thunder",
          "tag": "Before Operation",
          "desc": "There are two eternal truths under this sky: order and violence.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-ST-2",
          "name": "Cut Open",
          "tag": "Interlude",
          "desc": "Truth is revealed from the depths of blood and flesh."
        },
        {
          "code": "IS-5",
          "name": "Old Rules",
          "tag": "Before Operation",
          "desc": "Old laws cannot be shaken without the courage to abandon and sacrifice.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-6",
          "name": "Old Conflicts",
          "tag": "Before Operation",
          "desc": "Stand and face the wheels of old, or be run over by them.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-7",
          "name": "What to be Forgotten",
          "tag": "Before Operation",
          "desc": "Our memories keep us alive and torment us.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-8",
          "name": "Walking on Eggshells",
          "tag": "Before Operation",
          "desc": "You should have picked up the first fowlbeast egg when it appeared.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-ST-3",
          "name": "Troublemaker",
          "tag": "Interlude",
          "desc": "Pain is inevitable when you reach the roots."
        },
        {
          "code": "IS-9",
          "name": "Lies of Civilization",
          "tag": "Before Operation",
          "desc": "Lock and load. The gun can be an instrument of order, or destroy the facade of civilization.\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-10",
          "name": "Signore dei Lupi",
          "tag": "Before Operation",
          "desc": "Wolf of the wild, what has becometh of thee?\n All enemies are boosted and Famiglia Silencer is summoned when Blood Debt is at max."
        },
        {
          "code": "IS-ST-4",
          "name": "Sew Together",
          "tag": "Interlude",
          "desc": "A cut to fester, or a cut to heal?"
        }
      ]
    },
    "setId_ssLine_act38side": {
      "name": "I Portatori dei Velluti",
      "year": 6,
      "kv": "kv_i_portatori_dei_velluti",
      "title": "title_i_portatori_dei_velluti",
      "bgid": "storybg_i_portatori_dei_velluti",
      "main": false,
      "group": "act38side",
      "desc": "Nuova Volsinii, where turbulent undercurrents churn beneath a superficial peace.\nA car accident smashes the fragile tranquility into bits.\nFamiglie and violence have worn innumerable masks, but the banner of order will not tolerate a single stain.\nJudge, killer, Fang, tailor, Infected...\nA cab drives through the city like a specter\nas Lappland meticulously weaves a surprise for a grand performance.\nA plot or a gamble? Just hurry over to the Carnevale, and revel in the fun together!",
      "tags": [
        "Special Terrain",
        "Special Tools",
        "Special Devices",
        "Elemental Injury",
        "Neutral Units"
      ],
      "rewardOp": "Crownslayer",
      "episodes": [
        {
          "code": "PV-ST-1",
          "name": "'New Urban Management Act'",
          "tag": "Interlude",
          "desc": "'The Urban Management Act of Nuova Volsinii is hereby passed into law. Welcome to a new era for Siracusa, citizens.'"
        },
        {
          "code": "PV-1",
          "name": "Astray",
          "tag": "Before Operation",
          "desc": "Take care not to lose your way when sailing through a bog.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allied and enemy units within range"
        },
        {
          "code": "PV-2",
          "name": "Paths Taken",
          "tag": "Before Operation",
          "desc": "Where to go and whom you go with has never been a choice in Siracusa.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-3",
          "name": "Dishonored Guest",
          "tag": "Before Operation",
          "desc": "'Mafia? In this day and age? Oh, please. We're registered, law-abiding citizens now.'\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-4",
          "name": "Honored Guest",
          "tag": "Before Operation",
          "desc": "There are always those who have not given up on the old rules and old pride.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-ST-2",
          "name": "'Prohibition on Revenge'",
          "tag": "Interlude",
          "desc": "Cut away the past and all ties, friend or foe."
        },
        {
          "code": "PV-5",
          "name": "To New Life",
          "tag": "Before Operation",
          "desc": "Our strengths, our weaknesses—our livelihoods.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-6",
          "name": "Vengeance and I",
          "tag": "Before Operation",
          "desc": "New lives become embroiled in trouble, old foes return, and the rage of the fallen is reignited.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-7",
          "name": "Curtains Lifted",
          "tag": "Before Operation",
          "desc": "Outside appearances are one thing, but the evil within dies hard, only waiting for a chance to reemerge.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-8",
          "name": "Selfless Law",
          "tag": "Before Operation",
          "desc": "The trial is swift, and the judgment merciless.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-ST-3",
          "name": "'Carnevale Charter'",
          "tag": "Interlude",
          "desc": "'That's it? You people just don't know how to party!'"
        },
        {
          "code": "PV-9",
          "name": "The Wolf and the Pack",
          "tag": "Before Operation",
          "desc": "The wolf and the pack are one.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-10",
          "name": "Gunshot",
          "tag": "Before Operation",
          "desc": "The city waits for a gunshot.\n After ignition, begins Carnevale, periodically dealing Arts damage to all allies and enemies within range"
        },
        {
          "code": "PV-ST-4",
          "name": "'Management Act Amendment'",
          "tag": "Interlude",
          "desc": "What will take the place of the blood and mud we have wiped away?"
        }
      ]
    },
    "setId_ssLine_act20mini": {
      "name": "Crossing",
      "year": 7,
      "kv": "kv_crossing",
      "title": "title_crossing",
      "bgid": "storybg_crossing",
      "main": false,
      "group": "act20mini",
      "desc": "Leontuzzo has been invited to participate in the Red Wine Championship, an event held in Nuova Volsinii by a Kazimierzian businessman. He watches as Demetri wins, which ends up drawing him into a murder case.\nTop sales representative Tosia leaves the turf wars of Kawalerielki behind her and heads to Nuova Volsinii. Here, she begins to reexamine her sales methods and goals.\nDespite the workers' opposition, Lupina has no choice but to sell the family winery she inherited.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "The Red Wine Murder",
          "tag": "Interlude",
          "desc": "Leontuzzo has been invited to participate in the Red Wine Championship, an event held in Nuova Volsinii by a Kazimierzian businessman. He watches as Demetri wins, which ends up drawing him into a murder case."
        },
        {
          "code": "ST-2",
          "name": "Business Acumen",
          "tag": "Interlude",
          "desc": "Top sales representative Tosia leaves the turf wars of Kawalerielki behind her and heads to Nuova Volsinii. Here, she begins to reexamine her sales methods and goals."
        },
        {
          "code": "ST-3",
          "name": "Witness",
          "tag": "Interlude",
          "desc": "Despite the workers' opposition, Lupina has no choice but to sell the family winery she inherited."
        },
        {
          "code": "ST-4",
          "name": "Crash",
          "tag": "Interlude",
          "desc": "Eirene negotiates with the merchants that are supplying contracts for AST drivers. She finds more than she bargained for in the profitable partnership, and the influence of the mafia is never far off."
        },
        {
          "code": "ST-5",
          "name": "Unheard Sound",
          "tag": "Interlude",
          "desc": "Liesel lost her family once in Nuova Volsinii, until Paola gave her a warm home. But now, with Paola gone, how will Liesel find a new family of her own?"
        },
        {
          "code": "ST-6",
          "name": "Ordine Nuovo",
          "tag": "Interlude",
          "desc": "Leontuzzo, Lavinia, Demetri, and even Signora Sicilia—everyone knows Nuova Volsinii now stands at a crossroads."
        }
      ]
    },
    "setId_ssLine_act13d5": {
      "name": "Maria Nearl",
      "year": 2,
      "kv": "kv_maria_nearl",
      "title": "title_maria_nearl",
      "bgid": "storybg_maria_nearl",
      "main": false,
      "group": "act13d5",
      "desc": "Consumption and entertainment suffuse the modern land of the knights.\nFor the sake of her family's prestige,\na young Maria Nearl embarks on the path to the Kazimierz Major.\nHowever, the young lady has yet to realize the meaning the word 'knight' now carries,\nnor is she aware of the inner workings of modern Kazimierz......\nA long and arduous journey lies ahead of Maria.",
      "tags": [
        "Special Devices",
        "Neutral Units",
        "Special Tools"
      ],
      "rewardOp": "Whislash",
      "episodes": [
        {
          "code": "MN-ST-1",
          "name": "Debut",
          "tag": "Interlude",
          "desc": "A missed cocktail party, and an arbitrarily decided path forward."
        },
        {
          "code": "MN-1",
          "name": "Ellen Select Technology Co.",
          "tag": "Before Operation",
          "desc": "Always providing you the latest products in tech! Build your life, together with Ellen Select! Ellen Select Technology Co., the companion of the era. Multiple drone models at 5% off for a limited time only, please visit the official website! \nContinuously generates currents of airflow. Operators deployed downstream/upstream will deal increased/decreased damage; Enemies moving downstream/upstream will have increased/decreased Movement Speed."
        },
        {
          "code": "MN-2",
          "name": "Roar Guards Co.",
          "tag": "Before Operation",
          "desc": "Brand new model 'Restless Head MK3' on limited sale! Order now to receive a rebate with your sports securities! Roar Guards Co., even strong gales shall bow to you! \nStun all enemies in the four adjacent tiles for a long duration."
        },
        {
          "code": "MN-3",
          "name": "Rose Paper Union",
          "tag": "Before Operation",
          "desc": "Rose Paper Union, with 172 professional media outlets and a brand new intercity web portal service, shall open the window, allowing you to experience all of Terra! \nOperators deployed on this tile will restore HP over time.\nOperators deployed on it and enemies who have passed it will take constant damage, but their ATK and ASPD will be increased significantly."
        },
        {
          "code": "MN-4",
          "name": "Glorious Shield Industries",
          "tag": "Before Operation",
          "desc": "Latest off-road vehicle series 'Soundless Violence' released! Includes free 'Windfury' series vehicle-mounted crossbow for a limited time! Glorious Shield Industries military products, guaranteed to help you conquer the wilderness and repel any Catastrophes! \nPeriodically deals great damage to any units on it."
        },
        {
          "code": "MN-5",
          "name": "Słoma Food Co.",
          "tag": "Before Operation",
          "desc": "A hundred supermarket chains across the country! Happiness lies with warm clothes and tasty food. Non-stop events during the Kazimierz Major! *New gloompincer food products released, give them a try*\nOperators deployed on this tile have slightly reduced ASPD but their ATK against aerial units will be increased significantly."
        },
        {
          "code": "MN-6",
          "name": "Blue Ear Wine Cellar",
          "tag": "Before Operation",
          "desc": "Featuring imported barley from Columbia, Blue Ear Beer goes perfect with the nightly matches! Now with three brand new flavors: salted vegetables, bacon and gemstones! \nPeriodically fire bolts, dealing Physical damage to our units."
        },
        {
          "code": "MN-7",
          "name": "Mieszko Group",
          "tag": "Before Operation",
          "desc": "The city rises within one's hand. Mieszko Group, engineering contractors of Kazimierz, will spread the seeds of civilization across the land. \nIncreases the DEF of neighboring allied units."
        },
        {
          "code": "MN-ST-2",
          "name": "Wineglass",
          "tag": "Interlude",
          "desc": "The lifespan of a glass cup far surpasses that of a hero."
        },
        {
          "code": "MN-8",
          "name": "General Chamber of Commerce",
          "tag": "Before Operation",
          "desc": "Unshakeable and omnipresent. The future belongs to the Kazimierz General Chamber of Commerce. \nOperators deployed on this tile will restore HP over time."
        },
        {
          "code": "MN-ST-3",
          "name": "Silent Departure",
          "tag": "Interlude",
          "desc": "The sounds of the cannon salvo cannot hide the silent anger of self-discipline. This season's Major will not be peaceful."
        }
      ]
    },
    "setId_ssLine_act9mini": {
      "name": "Pinus Sylvestris",
      "year": 3,
      "kv": "kv_pinus_sylvestris",
      "title": "title_pinus_sylvestris",
      "bgid": "storybg_pinus_sylvestris",
      "main": false,
      "group": "act9mini",
      "desc": "A Zalak with a red tail walks about the Grand Knight Territory. An Infected with a red tail attempts to change lives. A Knight with a red tail—has become a leader.\nAshlock Greynuty's competitor in this match is the infamous heel, 'Brassrust' Ingra. A sturdy cannon versus a sharp axe. An Infected knight versus a noble knight. Future versus past. Just which one will claim victory?\n'Flametail' and 'Ashlock' want to recruit capable hands for the Pinus Sylvestris Knightclub, and the 'Wild Mane' Knight, who's been thrown behind bars, is a fine choice. After Wild Mane carefully observes Pinus Sylvestris, she realizes they possess ideals entirely unlike the other Knightclubs...",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Home",
          "tag": "Interlude",
          "desc": "A Zalak with a red tail walks about the Grand Knight Territory. An Infected with a red tail attempts to change lives. A Knight with a red tail—has become a leader."
        },
        {
          "code": "ST-2",
          "name": "Dropping Grey",
          "tag": "Interlude",
          "desc": "Ashlock Greynuty's competitor in this match is the infamous heel, 'Brassrust' Ingra. A sturdy cannon versus a sharp axe. An Infected knight versus a noble knight. Future versus past. Just which one will claim victory?"
        },
        {
          "code": "ST-3",
          "name": "Let Us Ring a Ding Ding",
          "tag": "Interlude",
          "desc": "'Flametail' and 'Ashlock' want to recruit capable hands for the Pinus Sylvestris Knightclub, and the 'Wild Mane' Knight, who's been thrown behind bars, is a fine choice. After Wild Mane carefully observes Pinus Sylvestris, she realizes they possess ideals entirely unlike the other Knightclubs..."
        },
        {
          "code": "ST-4",
          "name": "A Lone Soul",
          "tag": "Interlude",
          "desc": "After rescuing the Plastic Knight from the Armorless Union, 'Fartooth' Justyna recalls the fate that befell her and the home she can't return to."
        },
        {
          "code": "ST-5",
          "name": "Way of the Knights",
          "tag": "Interlude",
          "desc": "Młynar arrives at a worrying conclusion, forcing the Nearl sisters into an even more difficult predicament. 'What does it mean to be a knight?' Maria ponders to herself."
        },
        {
          "code": "ST-6",
          "name": "Somebody",
          "tag": "Interlude",
          "desc": "A sudden change in social status after an overnight phone call has left Malkiewicz terrified. In the end, he realizes there is no way out of his newfound responsibilities."
        },
        {
          "code": "ST-7",
          "name": "Drifting in the Wind",
          "tag": "Interlude",
          "desc": "Young Centaurea is trying to find where her life will lead her, but as the years go by and she becomes more experienced, she realizes she never had the right to choose, and all she can do is drift about in the currents of time."
        }
      ]
    },
    "setId_ssLine_act13side": {
      "name": "Near Light",
      "year": 3,
      "kv": "kv_near_light",
      "title": "title_near_light",
      "bgid": "storybg_near_light",
      "main": false,
      "group": "act13side",
      "desc": "The return of the Radiant Knight \npushes the Special Knight Tournament to a climax. \nAt the same time, in the dark corners where the neon lights do not shine, \nthe suppressed roars are about to break their shackles. \nOn the stage, the paths of the knights cross. \nBelow the stage, the city lingers on the brink. \nSoon, the two paths will converge...",
      "tags": [
        "Special Environment",
        "Special Tools",
        "Special Devices"
      ],
      "rewardOp": "Wild Mane",
      "episodes": [
        {
          "code": "NL-ST-1",
          "name": "Flourishing",
          "tag": "Interlude",
          "desc": "The beginning of the Major signifies the start of another sumptuous feast. The knights maintain their social etiquette before the games begin, a last-ditch show of chivalry."
        },
        {
          "code": "NL-1",
          "name": "Marigold",
          "tag": "Before Operation",
          "desc": "The marigold relishes the sun, but what of the night's moonglow? The moon's light hardly concerns the marigold. \n Operators cannot be deployed on tiles where you do not have visibility. Enemies in areas without visibility are treated as Invisible \n Provides an initial amount of visibility, and can further increase visibility when used"
        },
        {
          "code": "NL-2",
          "name": "Last-Ditch Thrust",
          "tag": "Before Operation",
          "desc": "A person full of faith towards life. A person who harbors malice towards all. In both their hearts is a thorn of resentment, one that stabs at their desires or perhaps any other bit of conscience. \n Provides an initial amount of visibility, and can further increase visibility when used"
        },
        {
          "code": "NL-3",
          "name": "Preparing",
          "tag": "Before Operation",
          "desc": "The person who prepares to climb great mountains and the person who prepares to hunt great beasts may have completely different mental states, but their willingness to face down the unknown is one in the same. \n Provides an initial amount of visibility, and can further increase visibility when used"
        },
        {
          "code": "NL-4",
          "name": "A Poem's Looks",
          "tag": "Before Operation",
          "desc": "If Kazimierz's poetry was a knight, then she could be none other than a woman named Viviana. Her name shines brightly, whereas marigold and moon alike are bland. \n Provides an initial amount of visibility, and can further increase visibility when used"
        },
        {
          "code": "NL-ST-2",
          "name": "Right and Might",
          "tag": "Interlude",
          "desc": "Does power enable people to rebel against fate, or does fate inevitably draw out the power within people?"
        },
        {
          "code": "NL-5",
          "name": "Gossip Kills",
          "tag": "Before Operation",
          "desc": "Anything unspoken is doomed to disappear. \n Provides an initial amount of visibility, and can further increase visibility when used \n When used, permanently provides visibility over a certain tile"
        },
        {
          "code": "NL-6",
          "name": "The Surrounded",
          "tag": "Before Operation",
          "desc": "Every warrior is surrounded by enemies. Every citizen is surrounded by the city. Every city is surrounded by the boundless wilderness. \n When used, permanently provides visibility over a certain tile \nSome Operators cannot be deployed"
        },
        {
          "code": "NL-ST-3",
          "name": "City Fast Asleep",
          "tag": "Interlude",
          "desc": "A gloompincer hiding in the shadows raises its head in this moment. It is the first time it sees the awakened starry sky."
        },
        {
          "code": "NL-7",
          "name": "Afterdream",
          "tag": "Before Operation",
          "desc": "Dreams are an extension of one's beliefs, from the traveler who knows no pause, to the dazed warrior, to the butcher looking up at the sky. \n When used, permanently provides visibility over a certain tile"
        },
        {
          "code": "NL-8",
          "name": "The Last Kheshig",
          "tag": "Before Operation",
          "desc": "The Nightzmora looks back at his past life – the old knight squats before the yellow sand with tears in his eyes, his Khagan sharpening his machete not far away. \n Provides an initial amount of visibility, and can further increase visibility when used \n When used, permanently provides visibility over a certain tile"
        },
        {
          "code": "NL-9",
          "name": "A Sigh",
          "tag": "Before Operation",
          "desc": "Fear derived from imagination is nothing for those who have long realized the truth of life. \n When used, permanently provides visibility over a certain tile"
        },
        {
          "code": "NL-10",
          "name": "The Radiant Knight",
          "tag": "Before Operation",
          "desc": "A knight who harbors faith in her heart came forward, but we mocked her. But should there be no such knights remaining, we would simply blame that on the changing times. \n Provides an initial amount of visibility, and can further increase visibility when used"
        },
        {
          "code": "NL-ST-4",
          "name": "Uncharted and Hereafter",
          "tag": "Interlude",
          "desc": "The sun rises, the veil of night parts. Perhaps nothing has changed, but perhaps the future has already sealed its victory in this moment."
        }
      ]
    },
    "setId_ssLine_act12mini": {
      "name": "An Obscure Wanderer",
      "year": 4,
      "kv": "kv_an_obscure_wanderer",
      "title": "title_an_obscure_wanderer",
      "bgid": "storybg_an_obscure_wanderer",
      "main": false,
      "group": "act12mini",
      "desc": "After leaving the Grand Knight Territory, Młynar passes through a familiar place. Although those he seeks are nowhere to be seen, an old friend of his is.\nDeszcz the attorney's business trip is heavily delayed by an unexpected vehicle breakdown. She spends the night in a village about to be sold for a rock-bottom price thanks to her own work, and gazes at a starry night sky forgotten by Kawalerielki.\nFlametail and Ashlock head for border city Dzwonek and find the Infected currently being provoked there. The only one willing to talk to them is saddled with a criminal charge, and when they meet Młynar along the way, they implore him to lend a helping hand.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Hermit Abode",
          "tag": "Interlude",
          "desc": "After leaving the Grand Knight Territory, Młynar passes through a familiar place. Although those he seeks are nowhere to be seen, an old friend of his is."
        },
        {
          "code": "ST-2",
          "name": "Only the Stars",
          "tag": "Interlude",
          "desc": "Deszcz the attorney's business trip is heavily delayed by an unexpected vehicle breakdown. She spends the night in a village about to be sold for a rock-bottom price thanks to her own work, and gazes at a starry night sky forgotten by Kawalerielki."
        },
        {
          "code": "ST-3",
          "name": "I Have Gazed",
          "tag": "Interlude",
          "desc": "Flametail and Ashlock head for border city Dzwonek and find the Infected currently being provoked there. The only one willing to talk to them is saddled with a criminal charge, and when they meet Młynar along the way, they implore him to lend a helping hand."
        },
        {
          "code": "ST-4",
          "name": "No Peace",
          "tag": "Interlude",
          "desc": "Laying low in Dzwonek, Szewczyk gets dragged into an explosion incident on his way to pick his son up from school."
        },
        {
          "code": "ST-5",
          "name": "Sunken Sun",
          "tag": "Interlude",
          "desc": "Toland receives important corporate documents, and Młynar finds him. Realizing that their old friend is planning to assassinate the Leithanian delegate, the two of them resolve to stop him."
        },
        {
          "code": "ST-6",
          "name": "Empty Armor",
          "tag": "Interlude",
          "desc": "His plot revealed, Czcibor heads down a path of no return, while Młynar waits on his path to assassinating his target."
        },
        {
          "code": "ST-7",
          "name": "Words of Farewell",
          "tag": "Interlude",
          "desc": "In the Grand Knight Territory, Margaret asks about the past after returning from a visit to her grandfather's grave. In the barrenlands, having said their goodbyes to their old friend, Młynar and Toland discuss their future."
        }
      ]
    },
    "setId_ssLine_act6d5": {
      "name": "Ancient Forge",
      "year": 1,
      "kv": "kv_ancient_forge",
      "title": "title_ancient_forge",
      "bgid": "storybg_ancient_forge",
      "main": false,
      "group": "act6d5",
      "desc": "A new celebration approaches and Lungmen is vigorously making preparations, waiting for a faceless enemy only known by the name, 'Nian.'\nThe enemy's arrival brings great chaos and confusion, but fortunately, many passionate citizens team up with the L.G.D. to fight back the enemy. Behind the scenes, the true enemy has already bared her fangs, but in front of her stands the Catastrophe expert, Lava.\nIn order to reclaim the city from Nian, Rhodes Island and Lungmen join forces to make a desperate move. Just when the battle is about to reach its climax... the director decides to interrupt everything.",
      "tags": [],
      "rewardOp": "Snowsant",
      "episodes": [
        {
          "code": "ST-1",
          "name": "Ancient Forge - Act I",
          "tag": "Interlude",
          "desc": "A new celebration approaches and Lungmen is vigorously making preparations, waiting for a faceless enemy only known by the name, 'Nian.'"
        },
        {
          "code": "ST-2",
          "name": "Ancient Forge - Act II",
          "tag": "Interlude",
          "desc": "The enemy's arrival brings great chaos and confusion, but fortunately, many passionate citizens team up with the L.G.D. to fight back the enemy. Behind the scenes, the true enemy has already bared her fangs, but in front of her stands the Catastrophe expert, Lava."
        },
        {
          "code": "ST-3",
          "name": "Ancient Forge - Act III",
          "tag": "Interlude",
          "desc": "In order to reclaim the city from Nian, Rhodes Island and Lungmen join forces to make a desperate move. Just when the battle is about to reach its climax... the director decides to interrupt everything."
        }
      ]
    },
    "setId_ssLine_act16d5": {
      "name": "Who Is Real",
      "year": 2,
      "kv": "kv_who_is_real",
      "title": "title_who_is_real",
      "bgid": "storybg_who_is_real",
      "main": false,
      "group": "act16d5",
      "desc": "Lava and Kroos, who arrived in Yan at the behest of Nian, \nmeet a resident of Yan who encountered some trouble in the wilderness, Mr. Nothing. \nTogether, the three of them follow the clues and search for Mount Hui-ch'i, to look for Nian's sister. \nAn unassuming thatched house reveals a hidden world the moment they enter. \nRegaining their wits, they find themselves in a quaint little Yan town. \nBeneath the coexisting sun and moon, the town besieged by spirits of ink. A mysterious monk whose words bring truth:\nTrue or false, false or true, you and I are but inhabitants of a painting.",
      "tags": [
        "Special Terrain",
        "Special Tools"
      ],
      "rewardOp": "Lava the Purgatory",
      "episodes": [
        {
          "code": "WR-ST-1",
          "name": "A Pincer's Grace",
          "tag": "Interlude",
          "desc": "Knock, enter. The human realm vanishes."
        },
        {
          "code": "WR-1",
          "name": "First Waking",
          "tag": "Before Operation",
          "desc": "In the moment one wakes from dreamland, one often confuses reality and illusion."
        },
        {
          "code": "WR-2",
          "name": "Ink Spirits",
          "tag": "Before Operation",
          "desc": "These small, frightful creatures seem to have no end... are they frightful?\n Operators deployed on it will earn a Hui-Ming attribute."
        },
        {
          "code": "WR-4",
          "name": "Shopkeeper",
          "tag": "Before Operation",
          "desc": "When she was young, she wanted to be a shopkeeper. Only when she grew up did she understand what lay behind that tidiness and good lighting.\n Operators deployed on it will earn a Hui-Ming attribute.\n Deals Arts damage to enemies in the surrounding four tiles, changing Hui-Ming attributes within its range."
        },
        {
          "code": "WR-5",
          "name": "Crude Mounts",
          "tag": "Before Operation",
          "desc": "The mountains follow along the earth, watching each turn of life eons before the man-made cities. This is no concern of theirs.\n Operators deployed on it will earn a Hui-Ming attribute.\n Deals Arts damage to enemies in the surrounding four tiles, changing Hui-Ming attributes within its range."
        },
        {
          "code": "WR-ST-2",
          "name": "A Day's Calamity",
          "tag": "Interlude",
          "desc": "Disaster's sufferers all cry plaintive. The sun and moon do not hear."
        },
        {
          "code": "WR-6",
          "name": "Away in the Painting",
          "tag": "Before Operation",
          "desc": "They're all in a painting, and we know that.\n Operators deployed on it will earn a Hui-Ming attribute."
        },
        {
          "code": "WR-8",
          "name": "A Dream",
          "tag": "Before Operation",
          "desc": "Sense raw the hollowness of Mount P'o, and awareness of the mortal world comes asudden.\n Operators deployed on it will earn a Hui-Ming attribute.\n On first passing through, enemies will change attribute."
        },
        {
          "code": "WR-10",
          "name": "Dusk",
          "tag": "Before Operation",
          "desc": "She binds in a circle her archaic soul, confiding in herself her own history.\n Operators deployed on it will earn a Hui-Ming attribute.\n Deals Arts damage to enemies in the surrounding four tiles, changing Hui-Ming attributes within its range."
        },
        {
          "code": "WR-ST-3",
          "name": "A Question's Answer",
          "tag": "Interlude",
          "desc": "A sudden look back, at the corner of an inkstone's sea."
        }
      ]
    },
    "setId_ssLine_act15side": {
      "name": "Invitation to Wine",
      "year": 3,
      "kv": "kv_invitation_to_wine",
      "title": "title_invitation_to_wine",
      "bgid": "storybg_invitation_to_wine",
      "main": false,
      "group": "act15side",
      "desc": "The dreamer becomes drunk at the ancient pavilion.\nThe spring gusts blow through the mountains, and the shadow reveals its true face through the clouds.\nOld matters yet to be resolved, a new game of chess has begun in Shangshu.\nA visitor from distant Lungmen,\nan antique goblet hidden in a box,\na piece that has long been in the game,\na lonely little boat, rowed into Shancheng.",
      "tags": [
        "Regular Mechanic"
      ],
      "rewardOp": "Kroos the Keen Glint",
      "episodes": [
        {
          "code": "IW-ST-1",
          "name": "The Arrival",
          "tag": "Interlude",
          "desc": "Mere moments after our guest arrives in Shangshu, the wine is already uncorked. This is a fated encounter."
        },
        {
          "code": "IW-1",
          "name": "Apparition",
          "tag": "Before Operation",
          "desc": "Strokes of ink birth spirits. From wares are geists born. A millennium in the human realm elapses in an instant, so surely the sisters must have their own interests."
        },
        {
          "code": "IW-2",
          "name": "Unseekable Place",
          "tag": "Before Operation",
          "desc": "Is that who you seek at the peak of a cloud-shrouded mount, or perhaps, right there in your dreams?"
        },
        {
          "code": "IW-3",
          "name": "Light and Shadow",
          "tag": "Before Operation",
          "desc": "Did the light come first, or did the shadow? A truly insignificant conundrum."
        },
        {
          "code": "IW-4",
          "name": "Candleholder",
          "tag": "Before Operation",
          "desc": "A huge shadow yet lurks beneath civilization. Should it reemerges, naturally someone will come bearing a candle for this realm."
        },
        {
          "code": "IW-ST-2",
          "name": "All Things Have a Soul",
          "tag": "Interlude",
          "desc": "A day without dream sees lives and spirits still."
        },
        {
          "code": "IW-5",
          "name": "Goods and People",
          "tag": "Before Operation",
          "desc": "Who knows if it's better or worse that rules are rules? It's in past regrets, consuming swathes of one's life, that these rules are still upheld."
        },
        {
          "code": "IW-6",
          "name": "Legend",
          "tag": "Before Operation",
          "desc": "A vanished peak, black clouds weighing down. Unpinnable rumors are a city's charm. So long as anyone remembers them, it'll never end."
        },
        {
          "code": "IW-7",
          "name": "Chaos",
          "tag": "Before Operation",
          "desc": "Stones collide, but outside of the board's players, nobody knows which way the game is really going."
        },
        {
          "code": "IW-9",
          "name": "Sui-Xiang",
          "tag": "Before Operation",
          "desc": "It is examining this land closely, now longing, now grieving, now merciful.\nRanged Operators can be deployed on Melee tiles in this stage."
        },
        {
          "code": "IW-ST-3",
          "name": "Another Round",
          "tag": "Interlude",
          "desc": "When the game comes to an end, another is set to begin. If all the realm's a game of weiqi, when will the players ever find a moment of respite?"
        }
      ]
    },
    "setId_ssLine_act23side": {
      "name": "Where Vernal Winds Will Never Blow",
      "year": 4,
      "kv": "kv_where_vernal_winds_will_never_blow",
      "title": "title_where_vernal_winds_will_never_blow",
      "bgid": "storybg_where_vernal_winds_will_never_blow",
      "main": false,
      "group": "act23side",
      "desc": "Climb a hundred-year city, and bid farewell to its hundred-year guardian.\nThe court is as high as jianghu is far. A plot ferments beneath the dust clouds.\nThe wind and sand cannot break the poplar. The walls formed by will do not fear Catastrophe.\nSpeak of the sword, reminisce about old times, while the wine is warm.\nOn the chessboard, love and hatred, all to dust.\nBeat the drums, and see old friends off.",
      "tags": [
        "Special Terrain",
        "Special Devices"
      ],
      "rewardOp": "Jieyun",
      "episodes": [
        {
          "code": "WB-ST-1",
          "name": "Dream of Youth",
          "tag": "Interlude",
          "desc": "'Few are those who truly break away from home.'"
        },
        {
          "code": "WB-1",
          "name": "Spring in the Borderlands",
          "tag": "Before Operation",
          "desc": "Located in a harsh, desolate sandpit, there is no way for peaches to grow in the Lord Exorcist's courtyard.\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-2",
          "name": "Yellow Sands",
          "tag": "Before Operation",
          "desc": "How will the returning city tell dust from sand?\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-3",
          "name": "How Old Trees Grow",
          "tag": "Before Operation",
          "desc": "New leaves have yet to grow on the old tree. Does it remember the ones who planted it?\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-4",
          "name": "Let the Old Times Go",
          "tag": "Before Operation",
          "desc": "The gazer did not want to keep an old friend reminiscing about the old days, or the old workshop.\n Units placed here deal more damage to ground units and take less damage from ground units\n Blocks multiple enemies"
        },
        {
          "code": "WB-ST-2",
          "name": "Believe My Belief",
          "tag": "Interlude",
          "desc": "For vengeance, for loyalty, for the people."
        },
        {
          "code": "WB-5",
          "name": "Rain Forecast",
          "tag": "Before Operation",
          "desc": "Catastrophe is coming. Let those who must leave, leave. Let the debts that must be settled, be settled.\n Units placed here deal more damage to ground units and take less damage from ground units\n Blocks multiple enemies"
        },
        {
          "code": "WB-6",
          "name": "Sight of Autumn",
          "tag": "After Operation",
          "desc": "We fear no wind.\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-7",
          "name": "'Wind Aegis'",
          "tag": "Before Operation",
          "desc": "The fortress that guards the borders has no shortage of those who would guard it.\n Units placed here deal more damage to ground units and take less damage from ground units\n Blocks multiple enemies"
        },
        {
          "code": "WB-8",
          "name": "Ancient Mutters",
          "tag": "Before Operation",
          "desc": "Someone must make a stand for Yumen.\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-9",
          "name": "'Hibernate'",
          "tag": "Before Operation",
          "desc": "Old wounds fester in suspicion and anger. Infinite seasons, finite lifespan, and It has returned home.\n Units placed here deal more damage to ground units and take less damage from ground units"
        },
        {
          "code": "WB-ST-3",
          "name": "Keep the Ploy",
          "tag": "Interlude",
          "desc": "As boring as the chess match is, a winner must be determined."
        }
      ]
    },
    "setId_ssLine_act14mini": {
      "name": "A Death in Chunfen",
      "year": 4,
      "kv": "kv_a_death_in_chunfen",
      "title": "title_a_death_in_chunfen",
      "bgid": "storybg_a_death_in_chunfen",
      "main": false,
      "group": "act14mini",
      "desc": "After leaving Yumen, Qiubai searches for the remnants of the Shanhaizhong gang. Her chase leads her into their den, where she finds a child. After confirming that he only ended up there because of a misunderstanding, she decides to escort him home.\nThe villagers are extremely wary of Fang Xiaoshi, who left the village many years ago. In order to protect him from further danger, Qiubai stays behind and learns about a past event from the Clan Elder.\nAn unexpected mudslide washes away the Chidao outside the village, revealing a nameless corpse. Faced with such a tragedy, the villagers present can only fall into silence.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Afraid to Return Home",
          "tag": "Interlude",
          "desc": "After leaving Yumen, Qiubai searches for the remnants of the Shanhaizhong gang. Her chase leads her into their den, where she finds a child. After confirming that he only ended up there because of a misunderstanding, she decides to escort him home."
        },
        {
          "code": "ST-2",
          "name": "Courtyard Valley",
          "tag": "Interlude",
          "desc": "The villagers are extremely wary of Fang Xiaoshi, who left the village many years ago. In order to protect him from further danger, Qiubai stays behind and learns about a past event from the Clan Elder."
        },
        {
          "code": "ST-3",
          "name": "Neither Gods Nor Demons",
          "tag": "Interlude",
          "desc": "An unexpected mudslide washes away the Chidao outside the village, revealing a nameless corpse. Faced with such a tragedy, the villagers present can only fall into silence."
        },
        {
          "code": "ST-4",
          "name": "Health and Safety",
          "tag": "Interlude",
          "desc": "Just when everyone thought the scheme would go exactly as planned, Mulberry shows up with the village's Messenger in tow, sending the villagers into a panic. Faced with the prospect of the villagers running out of control, Qiubai steps back into the fray."
        },
        {
          "code": "ST-5",
          "name": "Nameless Minion",
          "tag": "Interlude",
          "desc": "In the Yishan Temple, Saga hears the Village Elder's confessions, one-by-one.\nBelow the cliff, Qiubai rescues a boy whose name has just been killed."
        },
        {
          "code": "ST-6",
          "name": "Lone Mountain",
          "tag": "Interlude",
          "desc": "A documentarian with terminal Oripathy takes up his camera and heads for a land on which he has never set foot before."
        }
      ]
    },
    "setId_ssLine_act31side": {
      "name": "Here A People Sows",
      "year": 5,
      "kv": "kv_here_a_people_sows",
      "title": "title_here_a_people_sows",
      "bgid": "storybg_here_a_people_sows",
      "main": false,
      "group": "act31side",
      "desc": "She touches the rice grains with her finger, closes her eyes, and takes a deep breath. It is a scent that has not changed for a thousand years.\nShe opens her eyes again, and those who sweat with her in the fields seem almost the same as the ones a thousand years ago.\nHer spirit has become engrained within this soil over the centuries.\nShe continues to protect this field of gold, even as the land becomes ill and evil grows.\nA thread flies into the Twelve Pagodas and Five Cities, in search of her freedom.\nVernal winds turn to rain, nourishing flora and fauna. She returns a stranger, and free.\nIt is still peace and a good harvest that she seeks.",
      "tags": [
        "Special Tools",
        "Special Devices",
        "Special Environment"
      ],
      "rewardOp": "Wanqing",
      "episodes": [
        {
          "code": "HS-ST-1",
          "name": "A Dream Under Rice",
          "tag": "Interlude",
          "desc": "The bugs of summer chirp, and a dream sleeps beneath the grains."
        },
        {
          "code": "HS-1",
          "name": "Journey to Dahuang",
          "tag": "Before Operation",
          "desc": "Meet new people. Meet new crops.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading."
        },
        {
          "code": "HS-2",
          "name": "Shennong Rites",
          "tag": "Before Operation",
          "desc": "The Shennong Shrine pays tribute not to deities, but to the grain stalk in the heart that does not bend or break.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading."
        },
        {
          "code": "HS-3",
          "name": "Early Seeding",
          "tag": "Before Operation",
          "desc": "The signs of heaven are right. Time to get back on your feet, even if dark clouds draw near.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading."
        },
        {
          "code": "HS-4",
          "name": "Dialogue of Silk and Linen",
          "tag": "Before Operation",
          "desc": "In matters of silk and linen, half the time is spent on bargaining.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading.\nPumps water from one tile behind towards the front, cleansing or spreading Blight."
        },
        {
          "code": "HS-5",
          "name": "Weave the Silk",
          "tag": "Before Operation",
          "desc": "He who wears silk knows more than the five grains. He is here to settle a millennia-long debt.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading.\nPumps water from one tile behind towards the front, cleansing or spreading Blight."
        },
        {
          "code": "HS-ST-2",
          "name": "Sew the Fabric",
          "tag": "Interlude",
          "desc": "A roll of fabric could be cut into clothing, or set into motion a business that knows no end."
        },
        {
          "code": "HS-6",
          "name": "Clouds Burn Red",
          "tag": "Before Operation",
          "desc": "The heavens churn. The earth is red. The clouds roil with the color of blood.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading.\nPumps water from one tile behind towards the front, cleansing or spreading Blight."
        },
        {
          "code": "HS-7",
          "name": "Dream of the Seasons",
          "tag": "After Operation",
          "desc": "In dreams, seasons come and go. See again, born again.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading."
        },
        {
          "code": "HS-8",
          "name": "Sow the Cause",
          "tag": "Before Operation",
          "desc": "The farmer swings his tools, and it spreads through the fields, mountains, and rivers.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading."
        },
        {
          "code": "HS-9",
          "name": "Reap the Consequence",
          "tag": "Before Operation",
          "desc": "The merchant closes his books, and it moves through silk, coin, and crates.\nOperators on Farmland recover HP or take damage based on Blight level.\nStops Blight from spreading.\nPumps water from one tile behind towards the front, cleansing or spreading Blight."
        },
        {
          "code": "HS-ST-3",
          "name": "Brave Wind and Rain",
          "tag": "Interlude",
          "desc": "The wind and rain are cold. It is dark at the top. The game draws to a close."
        }
      ]
    },
    "setId_ssLine_act40side": {
      "name": "Such is the Joy of Our Reunion",
      "year": 6,
      "kv": "kv_such_is_the_joy_of_our_reunion",
      "title": "title_such_is_the_joy_of_our_reunion",
      "bgid": "storybg_such_is_the_joy_of_our_reunion",
      "main": false,
      "group": "act40side",
      "desc": "A rain of parting drenches the shoulders and sleeves of many around the Forbidden City.\nA letter to Victoria, enclosed with unspeakable melancholy.\nA sudden fire burns down half a lifetime's work, difficult to clean.\nA soup stewing for a century—will it manage to grant him a chance on the front line?\nPerhaps that so-called history was never a conspiracy,\njust unavoidable actions taken in unavoidable situations...\nA situation difficult to deal with since antiquity. If we have a reunion, we should enjoy ourselves to the fullest.",
      "tags": [
        "Special Devices",
        "Neutral Units"
      ],
      "rewardOp": "Xingzhu",
      "episodes": [
        {
          "code": "OR-ST-1",
          "name": "Chrysanthemum Tea with Dried Tangerine Peels",
          "tag": "Interlude",
          "desc": "Dried orange peels left to age for forty years, in the same cup with freshly picked chrysanthemum. Do the flavors of yore stand up to a careful tasting?"
        },
        {
          "code": "OR-1",
          "name": "Scallion Tofu",
          "tag": "Before Operation",
          "desc": "Made from spring onions and tofu, it takes quite a bit of skill to give it the proper clean taste.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-2",
          "name": "Malt Sugar Candy",
          "tag": "Before Operation",
          "desc": "'Give the Stove God malt sugar candy on the 23rd of the twelfth lunar month, so he reports only the good things when he goes back to heaven.'\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-3",
          "name": "Oil-Splashed Hand-Pulled Noodles",
          "tag": "Before Operation",
          "desc": "Some dough gets firmer the more you beat them.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-4",
          "name": "Pickled Potherb Mustard",
          "tag": "Before Operation",
          "desc": "Place the vegetables in the pot and seal the lid. You will know it is time when the lid can no longer keep the aroma contained.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-ST-2",
          "name": "Roasted Chestnut",
          "tag": "Interlude",
          "desc": "Try to crack a chestnut with brute force, and you will only hurt yourself. Dip one in oil, another in water, place them in a pot, cover with the rest of the chestnuts, and roast them over a fire. You will know when they are ready when you hear a thundering CRACK."
        },
        {
          "code": "OR-6",
          "name": "Braised Wax Gourd Cube",
          "tag": "Before Operation",
          "desc": "Sculpt a winter gourd into the shape of meat, fill it with vegetarian ham, and cover with velveting sauce. The result looks identical to red braised pork, but it cannot fool the palate.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-7",
          "name": "Meaty Platter",
          "tag": "Before Operation",
          "desc": "A platter of meat from five kinds of beasts. An official once presented this dish to the Lung at a Feast of a Hundred Delicacies, advising the ruler to take equal care of Yan's people from all walks of life.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-8",
          "name": "Golden Rice Crust",
          "tag": "Before Operation",
          "desc": "Golden rice crisp covers the plate. Crack open to reveal the dish beneath.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-9",
          "name": "Longevity Noodles",
          "tag": "Before Operation",
          "desc": "The quality of a bowl of longevity noodles is judged not by its taste, but in who made it, and what blessings it contains.\n Summons 'Sapid Auspice' to deal True damage to all enemies in its path.\n Summons 'Vapid Blight' to deal True damage to all allied units in its path."
        },
        {
          "code": "OR-ST-3",
          "name": "Essence Herbal Soup",
          "tag": "Interlude",
          "desc": "Opaque soup with a sip of clarity. Do not ask the way; seek it yourself."
        }
      ]
    },
    "setId_ssLine_act19mini": {
      "name": "Fantasy in the Mirage",
      "year": 6,
      "kv": "kv_fantasy_in_the_mirage",
      "title": "title_fantasy_in_the_mirage",
      "bgid": "storybg_fantasy_in_the_mirage",
      "main": false,
      "group": "act19mini",
      "desc": "While making her way back to the Tianshi Bureau for study, Lin Qingyan receives a letter from Zuo Le, asking her to investigate Yun Qingping's disappearance. Doing so, however, gets her sucked into a strange little town, and a different, utterly baffling case involving the theft of a secret tome of martial arts.\nAt Mr. Pu's school, Lin Qingyan encounters talking brooms, walking scrolls... and finding out the truth of this town from Mr. Pu, she pieces together that in the fight for the secret tome, an altogether greater mess is brewing for Mangshan Town.\nWhile investigating a robbery, Lin Qingyan retrieves a stone for a dying old man, one that has accompanied him his entire life. After losing and regaining the stone, the old man thinks back on his fated encounters with that collector, scattered throughout his life.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Hu Jun",
          "tag": "Interlude",
          "desc": "While making her way back to the Tianshi Bureau for study, Lin Qingyan receives a letter from Zuo Le, asking her to investigate Yun Qingping's disappearance. Doing so, however, gets her sucked into a strange little town, and a different, utterly baffling case involving the theft of a secret tome of martial arts."
        },
        {
          "code": "ST-2",
          "name": "Mr. Pu",
          "tag": "Interlude",
          "desc": "At Mr. Pu's school, Lin Qingyan encounters talking brooms, walking scrolls... and finding out the truth of this town from Mr. Pu, she pieces together that in the fight for the secret tome, an altogether greater mess is brewing for Mangshan Town."
        },
        {
          "code": "ST-3",
          "name": "The Story of the Stone",
          "tag": "Interlude",
          "desc": "While investigating a robbery, Lin Qingyan retrieves a stone for a dying old man, one that has accompanied him his entire life. After losing and regaining the stone, the old man thinks back on his fated encounters with that collector, scattered throughout his life."
        },
        {
          "code": "ST-4",
          "name": "Bai Jin",
          "tag": "Interlude",
          "desc": "Yun Qingping learns that the one who 'invited' him to Mt. Mang is currently atop the mountain proper. While climbing, he helps rescue a wandering lady's husband from a game of weiqi. Only then does he learn that the game has been ongoing for many years, waiting for someone who could resolve it."
        },
        {
          "code": "ST-5",
          "name": "Errant Swordsman",
          "tag": "Interlude",
          "desc": "The swordsman loses his sword, but meets someone after his own heart—the one whom Lin Qingyan is chasing for the theft of the tome. Thunder breaks the woman's geisthood, and it turns out the swordsman never lost his sword, after all."
        },
        {
          "code": "ST-6",
          "name": "Reaching the Top",
          "tag": "Interlude",
          "desc": "The secret tome that all jianghu seeks turns out to have been stolen by Huai Tianpei at the behest of a Shanhaizhong member by the name of Mo Yi. Mo Yi uses it to summon a massive illusion in the form of Shuo, which Huai Tianpei duels."
        },
        {
          "code": "ST-7",
          "name": "Town Chronicle",
          "tag": "Interlude",
          "desc": "A hundred years ago, Mangshan Town was destroyed by the awakening of the bestial Sui. But with destruction comes rebirth. With the help of Yi, master of the Garden of Grotesqueries, the newly-born geists helped returning townsfolk rebuild their home. They live together in the new Mangshan Town to this day."
        }
      ]
    },
    "setId_ssLine_act49side": {
      "name": "First of A Thousand Autumns",
      "year": 7,
      "kv": "kv_first_of_a_thousand_autumns",
      "title": "title_first_of_a_thousand_autumns",
      "bgid": "storybg_first_of_a_thousand_autumns",
      "main": false,
      "group": "act49side",
      "desc": "After the Feast of a Hundred Delicacies, strange phenomena manifest around Yan. The True Lung makes an agreement with the Grand Commandant and sets the day of the full moon as the deadline before which Yan will send troops to quell the Sui. Zuo Le leaves the Garden of Grotesqueries, hurrying back to Baizao with a token in hand. At the same time, Ch'en enters a dream woven by the Feranmuts.\nFaced with her past and the Feranmut crisis before her, Ch'en refuses to stay uninvolved. The Grand Tutor's sudden visit deepens the wedge between Ch'en and Wei Yenwu, and Ch'en leaves unhappy. When she returns, Wei Yenwu has vanished without a trace.\nZuo Le runs into danger, and Mo Yi lends a hand, but she also takes the chance to snatch the strange token from him. Ch'en passes through a sentry post, and rescues a woman under attack by geists. Scriptgeists pour into the city, sending it into turmoil.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "TA-ST-1",
          "name": "Unfailing Recitation",
          "tag": "Interlude",
          "desc": "Ever in mind."
        },
        {
          "code": "TA-1",
          "name": "Surge Against Rocks",
          "tag": "Before Operation",
          "desc": "The river tells you to go around the great rock in the water, but you would not listen."
        },
        {
          "code": "TA-2",
          "name": "The Great Ghost",
          "tag": "Before Operation",
          "desc": "'Sui' is a ghost, the 'moons' are phantoms; is the passage of time not a ghost as well?"
        },
        {
          "code": "TA-3",
          "name": "Dense Ink Trace",
          "tag": "Before Operation",
          "desc": "The powerful brush strokes leave behind an ink trace that penetrates the paper."
        },
        {
          "code": "TA-4",
          "name": "Small Avalanche",
          "tag": "Before Operation",
          "desc": "Drink all the wine of man dry, dream a dream without end, and carry the burden of a crushing snow."
        },
        {
          "code": "TA-5",
          "name": "Twin Swallow Pincer",
          "tag": "Before Operation",
          "desc": "The player behind the curtain has picked up the stones and entered the game. Is it a friend fighting against Sui together? Or a foe with ulterior motives?"
        },
        {
          "code": "TA-6",
          "name": "Enveloped Edge",
          "tag": "Before Operation",
          "desc": "To go up, first go down; to go left, first go right. Everyone has their own plans, and everyone is held captive within."
        },
        {
          "code": "TA-7",
          "name": "Severed Yearning",
          "tag": "Before Operation",
          "desc": "A thousand ploys exhausted, the body a cage. Parting from the stones, from the self wedged in the gaps, and the one held in mind. Between every gap, a severed slice of memory."
        },
        {
          "code": "TA-8",
          "name": "Golden Erasing Blade",
          "tag": "Before Operation",
          "desc": "Their words can be erased by a writing knife, their pages burned by candle flame. Historical manuscripts are fragile, as is the history they contain."
        },
        {
          "code": "TA-9",
          "name": "Defiant Spirit",
          "tag": "Before Operation",
          "desc": "No looking back? No regrets with every move."
        },
        {
          "code": "TA-10",
          "name": "Capping the Sui",
          "tag": "Before Operation",
          "desc": "The rain fell upon the battlefield for three days, heaven's plaint as the board at last grows clear."
        },
        {
          "code": "TA-11",
          "name": "Eternal Cycle",
          "tag": "Before Operation",
          "desc": "You think yourself clever. Tell me then, why do humans forever chase a reunion they know to be impossible?"
        },
        {
          "code": "TA-ST-2",
          "name": "Unfailing Chronicle",
          "tag": "Interlude",
          "desc": "Let the chronicles preserve what is true, and let a thousand autumns be distilled into this one."
        }
      ]
    },
    "setId_ssLine_act15d0": {
      "name": "Mansfield Break",
      "year": 2,
      "kv": "kv_mansfield_break",
      "title": "title_mansfield_break",
      "bgid": "storybg_mansfield_break",
      "main": false,
      "group": "act15d0",
      "desc": "Years ago, Anthony Simon was incarcerated in Mansfield State Prison. \nAll the while, he has been plotting to escape and uncover the truth. \nLittle did he know, a plot targeting him was unfolding at the same time. \nSilence who coincidentally discovered Anthony's existence, Saria who had already taken action, \nMuelsyse whose intentions remain uncertain, as well as HydeBro and the Director of Energy behind them. \nPerhaps a late-night talk in the bar will shed some light on the truth behind this conspiracy, \nand lift a corner off the veil of secrecy covering Rhine Lab.",
      "tags": [
        "Beginner",
        "Special Devices"
      ],
      "rewardOp": "Robin",
      "episodes": [
        {
          "code": "MB-1",
          "name": "Secret Meeting",
          "tag": "Before Operation",
          "desc": "Unknown callers and late-night bar visits are the very makings of a secret."
        },
        {
          "code": "MB-2",
          "name": "Another Perspective",
          "tag": "Before Operation",
          "desc": "The reasons why one ends up taking risks are often very simple. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-3",
          "name": "The First Raid",
          "tag": "Before Operation",
          "desc": "Enemies and allies both come unexpectedly. \n Imprisons freed enemies within its effect area \nSome Operators cannot be deployed"
        },
        {
          "code": "MB-ST-1",
          "name": "Invitation",
          "tag": "Interlude",
          "desc": "Sometimes, the purpose of an invitation isn't just for company."
        },
        {
          "code": "MB-4",
          "name": "Bravery, Stupidity",
          "tag": "Before Operation",
          "desc": "To be honest, the difference between the two might just come down to two words— self awareness. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-5",
          "name": "Risky Business",
          "tag": "Before Operation",
          "desc": "No risk, no reward. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-6",
          "name": "Making Plans",
          "tag": "Before Operation",
          "desc": "A good plan should account for 90% of the risks and prepare for the unaccounted 10%. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-7",
          "name": "Betrayal",
          "tag": "Before Operation",
          "desc": "Don't put too much stock into the 'friend' you only met recently— you just don't understand him yet. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-8",
          "name": "Denouement",
          "tag": "Before Operation",
          "desc": "Some people can't seem to figure out why they keep failing, just like they can't seem to figure out why others succeed. \n Imprisons freed enemies within its effect area"
        },
        {
          "code": "MB-ST-2",
          "name": "The Cost of Being Righteous",
          "tag": "Interlude",
          "desc": "At least, this price can often be paid with peace of mind."
        }
      ]
    },
    "setId_ssLine_act19side": {
      "name": "Dorothy's Vision",
      "year": 4,
      "kv": "kv_dorothys_vision",
      "title": "title_dorothys_vision",
      "bgid": "storybg_dorothys_vision",
      "main": false,
      "group": "act19side",
      "desc": "Weaved from science, computed from dreams.\nData and experiments have created a behemoth.\nIt floats above Trimounts, gazing silently at all that happens below.\nForward or backwards, the direction of science holds true.\nIt is always progressing, for good or for ill.",
      "tags": [
        "Special Devices",
        "Neutral Units"
      ],
      "rewardOp": "Astgenne",
      "episodes": [
        {
          "code": "DV-ST-1",
          "name": "Retrograde",
          "tag": "Interlude",
          "desc": "To some, the onset of Oripathy is a source of dread; to doctors, it is a source of motivation."
        },
        {
          "code": "DV-1",
          "name": "Trimounts Streets",
          "tag": "Before Operation",
          "desc": "They cannot think yet. If they could, they would still pick up their weapons."
        },
        {
          "code": "DV-2",
          "name": "Pioneer Lodge",
          "tag": "Before Operation",
          "desc": "It is being controlled. The blood of technology flows in its veins."
        },
        {
          "code": "DV-3",
          "name": "Power Armor",
          "tag": "Before Operation",
          "desc": "The sleeping danger will eventually awake. Do not ignore it simply because it has not yet revealed itself. \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-4",
          "name": "Empty Alley",
          "tag": "Before Operation",
          "desc": "Work is not welcome at the bar. \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-5",
          "name": "Dorothy's Promise",
          "tag": "Before Operation",
          "desc": "She points towards a path of hope. \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-S-1",
          "name": "Dilemma",
          "tag": "Interlude",
          "desc": "She collects her thoughts and makes a decision. \n Absorbs nearby experimental products to recover SP. Activates when SP is full. Some characters cannot be deployed in this stage."
        },
        {
          "code": "DV-6",
          "name": "Free From Dream",
          "tag": "Before Operation",
          "desc": "Have the researchers truly found the happiness they sought in their dreams? \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-7",
          "name": "Rogue Signal",
          "tag": "Before Operation",
          "desc": "Is the caster truly in control of all this in the real world? \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-S-2",
          "name": "Checks and Balances",
          "tag": "Interlude",
          "desc": "She encounters the past, and gazes within herself. \n Absorbs nearby experimental products to recover SP. Activates when SP is full. Some characters cannot be deployed in this stage."
        },
        {
          "code": "DV-8",
          "name": "Heart Connection",
          "tag": "Before Operation",
          "desc": "In the test site surrounded by barren lands, the two take a surprising first step. \n Absorbs nearby experimental products to recover SP. Activates when SP is full."
        },
        {
          "code": "DV-ST-2",
          "name": "Embark",
          "tag": "Interlude",
          "desc": "The backpack has been prepared. The wind has blown away the dark clouds. The unknown awaits ahead."
        }
      ]
    },
    "setId_ssLine_act25side": {
      "name": "Lone Trail",
      "year": 4,
      "kv": "kv_lone_trail",
      "title": "title_lone_trail",
      "bgid": "storybg_lone_trail",
      "main": false,
      "group": "act25side",
      "desc": "Kristen's disappearance stirs everyone's emotions.\nThe military and the Maylander Foundation gather in Trimounts.\nKal'tsit chooses to intervene.\nDark clouds gather as a rainstorm draws near.\nIs this a conspiracy, a farce, or one's lone awakening?\nOld grudges now cross paths here, as the past and the present clash.\nTonight, nobody sleeps.",
      "tags": [
        "Special Environment",
        "Special Devices"
      ],
      "rewardOp": "Silence the Paradigmatic",
      "episodes": [
        {
          "code": "CW-ST-1",
          "name": "Dark Clouds",
          "tag": "Interlude",
          "desc": "Rain is coming to Trimounts."
        },
        {
          "code": "CW-1",
          "name": "Dense Fog",
          "tag": "Before Operation",
          "desc": "Does the falling star foretell hope, or disaster?"
        },
        {
          "code": "CW-2",
          "name": "Without a Trace",
          "tag": "Before Operation",
          "desc": "Fickle hints come and go, as does the path ahead."
        },
        {
          "code": "CW-3",
          "name": "Front Stage, Back Stage",
          "tag": "Before Operation",
          "desc": "There are always sacrifices to be made behind the scenes.\n Rocks and Gravity Switches: Can be activated by heavy enemies and Operators with Block 1 or higher to change the direction of gravity; Operator ASPD and enemy Movement Speed are increased when in the direction of gravity, and reduced when opposed to it."
        },
        {
          "code": "CW-ST-2",
          "name": "Restless Waves",
          "tag": "Interlude",
          "desc": "Danger rushes in like a tidal wave."
        },
        {
          "code": "CW-4",
          "name": "Rising Waves",
          "tag": "Before Operation",
          "desc": "To go with the flow, or against it?\n 'Rocks' and Gravity Switches: Can be activated by heavy enemies and Operators with Block 1 or higher to change the direction of gravity; Operator ASPD and enemy Movement Speed are increased when in the direction of gravity, and reduced when opposed to it."
        },
        {
          "code": "CW-5",
          "name": "Beyond the Veil",
          "tag": "Before Operation",
          "desc": "The curtain closes on this farce. Is this the end, or a new beginning?\n 'Rocks' and Gravity Switches: Can be activated by heavy enemies and Operators with Block 1 or higher to change the direction of gravity; Operator ASPD and enemy Movement Speed are increased when in the direction of gravity, and reduced when opposed to it."
        },
        {
          "code": "CW-6",
          "name": "Gathering of Heroes",
          "tag": "Before Operation",
          "desc": "She stands tall at the edge of the passage, as the land moves slowly away."
        },
        {
          "code": "CW-7",
          "name": "Castle in the Sky",
          "tag": "Before Operation",
          "desc": "Even ethereal dreams can come true.\n Gravity Switches and Planetary Debris: Moves along a set path, blocking lanes and dealing physical damage to units they touch. Can be moved by your units in adjacent tiles."
        },
        {
          "code": "CW-8",
          "name": "Between Past and Present",
          "tag": "Before Operation",
          "desc": "The mask must slip, someday.\n Gravity Switches and Planetary Debris: Moves along a set path, blocking lanes and dealing physical damage to units they touch. Can be moved by your units in adjacent tiles."
        },
        {
          "code": "CW-9",
          "name": "Love and Hatred",
          "tag": "Before Operation",
          "desc": "Love and hatred, all a part of life on this land.\n Gravity Switches and Planetary Debris: Moves along a set path, blocking lanes and dealing physical damage to units they touch. Can be moved by your units in adjacent tiles."
        },
        {
          "code": "CW-10",
          "name": "Lost Amongst the Stars",
          "tag": "Before Operation",
          "desc": "Look up, and see how small we are.\n Gravity Switches and Planetary Debris\nNo melee/ranged deployment restrictions, enemy weight is greatly reduced"
        },
        {
          "code": "CW-ST-3",
          "name": "Those Left Behind",
          "tag": "Interlude",
          "desc": "Some jeer, some are in awe, some dance in joy, some spend the night sleepless."
        },
        {
          "code": "CW-ST-4",
          "name": "Door to the Future",
          "tag": "Interlude",
          "desc": "The only certain thing is that we must keep moving forward."
        }
      ]
    },
    "setId_ssLine_act47side": {
      "name": "Unrealized Realities",
      "year": 7,
      "kv": "kv_unrealized_realities",
      "title": "title_unrealized_realities",
      "bgid": "storybg_unrealized_realities",
      "main": false,
      "group": "act47side",
      "desc": "Two years after the Trimounts Incident, all eyes are on Air Expo Columbia, about to open aboard the Propeller Paradise experimental park. The park's administrator, Gordon Tannen, is promoted to Chief Executive when tickets go on sale. As for Rhine Lab, origin of the 'sky fever' phenomenon, the company is preparing to perform some unremarkable technical checks.\nGordon Tannen's secretary finds Nasti and requests that Rhine Lab skip the pre-exhibition technical inspections. The two sides come to a compromise, and Nasti agrees to perform the inspections in the order that Tannen requested. Meanwhile, assistant researcher Sky Jagger shuts down a company by the name of Lucky Cystybeast.\nLucky Cystybeast's owner goes to cancel his registration, but a staff member guides him to a mysterious phone number. A man reports to Gordon Tannen, claiming to be a guide by the name of Oakley, but there is already another guide by the same name on Propeller Paradise.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "UR-ST-1",
          "name": "Reflected in the River",
          "tag": "Interlude",
          "desc": "A Banshee who has strayed far from home."
        },
        {
          "code": "UR-1",
          "name": "Cacophonous Sky",
          "tag": "Before Operation",
          "desc": "Find a spot near the Starpod. Just don't get hit by the billboards."
        },
        {
          "code": "UR-2",
          "name": "Undocumented Passenger",
          "tag": "Before Operation",
          "desc": "Accidents are acceptable to Propeller Paradise, so long as they bring scientific progress, so long as they came from Columbia."
        },
        {
          "code": "UR-3",
          "name": "Stall Protection",
          "tag": "Before Operation",
          "desc": "Do the newest fliers not respond to controls? Crash it a few times, and the manufacturer will either deal with your problem, or be dealt with by the problem."
        },
        {
          "code": "UR-4",
          "name": "Jet Stream Over Clear Skies",
          "tag": "Before Operation",
          "desc": "Open your eyes, and fight your nausea. It's not the sky that's churning, it's just you."
        },
        {
          "code": "UR-ST-2",
          "name": "Test Flight",
          "tag": "Interlude",
          "desc": "A seed born of turbulent times takes root in the skies."
        },
        {
          "code": "UR-5",
          "name": "See and Salute",
          "tag": "Before Operation",
          "desc": "Should you look up at the fantasies floating through the air, or the conductor before you who is less than amused?"
        },
        {
          "code": "UR-6",
          "name": "Intersecting Routes",
          "tag": "Before Operation",
          "desc": "As they passed each other by, they glanced at one another, unsure why the other departed, and how long they can continue to fly."
        },
        {
          "code": "UR-7",
          "name": "Tarmac",
          "tag": "Before Operation",
          "desc": "There is only one destination. It is the rule."
        },
        {
          "code": "UR-8",
          "name": "Roosting Grounds",
          "tag": "Before Operation",
          "desc": "A fowlbeast sharpens its beak on the branches. It tilts its head to look down at the land, and someone there seems to be looking up at it."
        },
        {
          "code": "UR-ST-3",
          "name": "Flight Resumption",
          "tag": "Interlude",
          "desc": "A discussion, a few empty chairs."
        }
      ]
    },
    "setId_ssLine_1stact": {
      "name": "Grani and the Knights' Treasure",
      "year": 1,
      "kv": "kv_grani_and_the_knights_treasure",
      "title": "title_grani_and_the_knights_treasure",
      "bgid": "storybg_grani_and_the_knights_treasure",
      "main": false,
      "group": "1stact",
      "desc": "Dewville, a remote village in Kazimierz has been occupied by bounty hunters.\nThese bounty hunters indiscriminately rampage and ruin, apparently in an attempt to find the knight's treasure said to be buried here.\nAfter receiving a request for help, Mounted Police Grani volunteers to resolve the problem.\nCan she really drive out the bounty hunters?\nWill she find the mysterious knight's treasure?\nWill peace return to Dewville?\nLet's find it out.",
      "tags": [
        "Beginner",
        "Special Terrain"
      ],
      "rewardOp": "Grani",
      "episodes": [
        {
          "code": "GT-1",
          "name": "High Noon",
          "tag": "Before Operation",
          "desc": "Sand is blowing wildly outside Kazimierz. Down from the abandoned gallows there is a greedy, cunning rioter, while behind him stands a knight who has just crossed the desert alone with nothing but the lance in her hand.\nSome Operators cannot be deployed"
        },
        {
          "code": "GT-2",
          "name": "Sophistication",
          "tag": "Before Operation",
          "desc": "People gather in the bar for all sorts of different reasons. They each have their own axe to grind, but after weighing the pros and cons, decide to work together over a few rounds of beer. However, before they can even take two steps out the door, the temporary truce falls apart violently. Such is the life of bounty hunters."
        },
        {
          "code": "GT-3",
          "name": "An Unexpected Journey",
          "tag": "Before Operation",
          "desc": "Nobody is going to give up the treasure without a fight, and the troublemakers just keep coming one after another. Obviously, most of them have no idea what a 'fair fight' means.\nSome Operators cannot be deployed"
        },
        {
          "code": "GT-4",
          "name": "Turn State's Evidence",
          "tag": "Before Operation",
          "desc": "Even more reliable than death and taxes is the unpredictability of life. It even works on your friends, your enemies, and even your own beliefs.\n Operators deployed on these tiles have their DEF reduced by half."
        },
        {
          "code": "GT-5",
          "name": "Different Opinions",
          "tag": "Before Operation",
          "desc": "It's said that no great fortune comes without sin, because the path to wealth is always paved with violence and bloodshed.\n Operators deployed on these tiles have their DEF reduced by half."
        },
        {
          "code": "GT-6",
          "name": "Golden Triangle",
          "tag": "Before Operation",
          "desc": "Everyone has their own path. You choose your path, while she chooses hers. Some roads may be more dangerous than others, but we all reach the same destination in the end.\n Operators deployed on these tiles have their DEF reduced by half."
        },
        {
          "code": "GT-EX-1",
          "name": "True Grit",
          "tag": "After Operation",
          "desc": "These little critters that have crawled up from underground are extremely dangerous. Their homes have been destroyed as a result of the bounty hunters' rampant excavation, so all they know how to do now is to return the favor."
        },
        {
          "code": "GT-EX-3",
          "name": "Dances with Wolves",
          "tag": "After Operation",
          "desc": "'Beware of wolf packs'"
        },
        {
          "code": "GT-HX-1",
          "name": "The Treasure of the Kazimierz Mortica",
          "tag": "After Operation",
          "desc": "It's annoying to dig for treasure underground, because you can never tell whether it's dirt or an Originium Slug that falls into your hair.\n Operators deployed on these tiles have their DEF reduced by half."
        },
        {
          "code": "GT-HX-3",
          "name": "Once Upon a Time in the West",
          "tag": "After Operation",
          "desc": "Heavily armed enemies are constantly pouring in from all directions. It's not their fault — you blocked the only way out, after all.\n Operators deployed on these tiles have their DEF reduced by half.\n Deploy to block the enemy's route"
        }
      ]
    },
    "setId_ssLine_act18d3": {
      "name": "Under Tides",
      "year": 2,
      "kv": "kv_under_tides",
      "title": "title_under_tides",
      "bgid": "storybg_under_tides",
      "main": false,
      "group": "act18d3",
      "desc": "Skadi hears the trill of a long unheard melody at Rhodes Island.\nFollowing the sound, she meets Gladiia.\nYet, this former comrade swiftly disappears after little more than a glimpse.\nShe kidnapped Specter, leaving nothing but a name for Skadi.\n'Sal Viento', a lethargic and mysterious coastal town.\nThere, Skadi will unravel the mystery of her and her companions' bloodline.",
      "tags": [
        "Special Devices",
        "Elemental Injury"
      ],
      "rewardOp": "Gladiia",
      "episodes": [
        {
          "code": "SV-1",
          "name": "Intruder",
          "tag": "Before Operation",
          "desc": "Bounty Hunter, Abyssal Hunter. She always referred to herself as something else. For that was not who she was."
        },
        {
          "code": "SV-2",
          "name": "Singer",
          "tag": "Before Operation",
          "desc": "Don't worry, those who converse with her are ordinary people in a biological sense."
        },
        {
          "code": "SV-3",
          "name": "Outsider",
          "tag": "Before Operation",
          "desc": "If a conspiracy is conspicuous, it may truly be very difficult to defeat, or the mastermind just isn't very bright."
        },
        {
          "code": "SV-4",
          "name": "Ocean",
          "tag": "Before Operation",
          "desc": "She dares not shed her blood upon this land, for she knows what her blood attracts... But when she is out by the sea, she will attract more than just murderers.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-5",
          "name": "Outcast",
          "tag": "After Operation",
          "desc": "Refine yourself through culture.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-6",
          "name": "Anorexia",
          "tag": "Before Operation",
          "desc": "Its black hands extend from the moist depths towards dryness.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-7",
          "name": "Protector",
          "tag": "Before Operation",
          "desc": "Rediscover where you belong beneath the stars.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-ST-1",
          "name": "Waking Nightmare",
          "tag": "Interlude",
          "desc": "Under the roaring waves, a fierce battle dyed the entire ocean red. When she came to, she deemed herself the sole survivor. She was wrong."
        },
        {
          "code": "SV-8",
          "name": "Kin",
          "tag": "Before Operation",
          "desc": "A beautiful monster is a monster nevertheless. A human monster is a monster nevertheless.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-9",
          "name": "Believer",
          "tag": "Before Operation",
          "desc": "He may be very smart, but he is also too paranoid. Taken together, that makes him not very smart. Compared to the boundless ocean, he is nothing.\n Once activated, continually treats surrounding units affected by Nervous Impairment."
        },
        {
          "code": "SV-ST-2",
          "name": "Lucky to Escape",
          "tag": "Interlude",
          "desc": "The problem, unresolved. The friend, unrecovered. The enemy, yet unchained. In the end, all is but a beginning."
        }
      ]
    },
    "setId_ssLine_act17side": {
      "name": "Stultifera Navis",
      "year": 3,
      "kv": "kv_stultifera_navis",
      "title": "title_stultifera_navis",
      "bgid": "storybg_stultifera_navis",
      "main": false,
      "group": "act17side",
      "desc": "A nation sunken in silence has left its legacy upon the waves.\nThe Hunters follow their kin's trail to where the clues converge.\nStultifera Navis, the golden ship, a monument to civilization.\nKal'tsit warns that humanity must unite.\nIberia no longer knows the sea, and Ægir has taken in foreign blood.\nThe sea alone is the source of all life, and the sea alone is unchanging.",
      "tags": [
        "Challenging",
        "Special Environment",
        "Special Tools",
        "Elemental Injury"
      ],
      "rewardOp": "Lumen",
      "episodes": [
        {
          "code": "SN-ST-1",
          "name": "Old Well",
          "tag": "Interlude",
          "desc": "Gran Faro, seaside town—a rare sight these days. Rhodes Islanders, Iberians, and even Alive Until Sunset all gather here. A storm is brewing."
        },
        {
          "code": "SN-1",
          "name": "Center Plaza",
          "tag": "Before Operation",
          "desc": "'A Sea Terror in the Plaza.' Sounds a bit like an Iberian proverb."
        },
        {
          "code": "SN-ST-2",
          "name": "Seaside Path",
          "tag": "Interlude",
          "desc": "Thiago attempts to convince Jordi to leave, and tells him about the truth of Gran Faro. The dark sea leaves no way out."
        },
        {
          "code": "SN-2",
          "name": "Plaza South",
          "tag": "After Operation",
          "desc": "Did they turn to worship the sea because they despaired for the land?"
        },
        {
          "code": "SN-ST-3",
          "name": "Empty Street",
          "tag": "Interlude",
          "desc": "The Hunters encounter AUS and realize that the town is under attack. Elysium is attacked by Ulpianus while protecting the town, and Specter runs into Amaia, believed to have been kidnapped."
        },
        {
          "code": "SN-3",
          "name": "Quiet Trail",
          "tag": "After Operation",
          "desc": "They walk here freely."
        },
        {
          "code": "SN-ST-4",
          "name": "Seaside Street",
          "tag": "Interlude",
          "desc": "In this town of special significance, the Inquisition and Abyssal Hunters must negotiate face-to-face and reach a conclusion. They search once again for the Eye of Iberia, with time at their heels."
        },
        {
          "code": "SN-ST-5",
          "name": "Landing Point",
          "tag": "Interlude",
          "desc": "Remaining in town, Carmen and Kal'tsit attempt to dispose of the wicked cultists before the Penal Battalion arrives, improvising a frontline position. The voyage for the lighthouse's waters is far from plain sailing, and the Hunters have no option but to confront the Sea Terror menace head on—as well as a mysterious guest."
        },
        {
          "code": "SN-4",
          "name": "Lighthouse Entrance",
          "tag": "After Operation",
          "desc": "Before you step through the entrance, you must first sweep aside all obstacles.\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-5",
          "name": "Lighthouse Control Room",
          "tag": "Before Operation",
          "desc": "Lay foes low with bravery's blade. Light the way with hope's flame.\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-6",
          "name": "Central Passage",
          "tag": "Before Operation",
          "desc": "Within the broken mirror, Specter finally sees her completed self.\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-ST-6",
          "name": "Lower Hall",
          "tag": "Interlude",
          "desc": "In the middle of the battle with the mysterious Seaborn, the true master of the ship appears. The decades have not robbed him of his human mind, but he refuses to acknowledge reality, and views the past with anger."
        },
        {
          "code": "SN-ST-7",
          "name": "Ballroom",
          "tag": "Interlude",
          "desc": "On the Stultifera, the Hunters are unable to reach an agreement with Alfonso, just as it is impossible for the cultists and townspeople of Gran Faro to reconcile with the Inquisition. Conflicts deeply-rooted, with a dire need for resolution."
        },
        {
          "code": "SN-7",
          "name": "Golden Corridor",
          "tag": "After Operation",
          "desc": "He distinguishes not between the beautiful and the ugly. He knows no fear, and understands no fatigue—What shall we make of such a person?\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-ST-8",
          "name": "Command Hall",
          "tag": "Interlude",
          "desc": "Hatred drives Thiago to take vengeance on the Inquisition. Hatred blinds Gladiia to the opportunity in front of her, and she parts ways with Ulpianus. However, beneath their hatred is a burning desire to protect one's home, and duty."
        },
        {
          "code": "SN-ST-9",
          "name": "Main Bridge",
          "tag": "Interlude",
          "desc": "Thiago is the protector of his homeland, and he finally bares his fangs at the cultists who would destroy his home. The High Inquisitor fights to the bitter end, and the chaotic hunt aboard the Stultifera has only just begun."
        },
        {
          "code": "SN-8",
          "name": "Observation Post",
          "tag": "After Operation",
          "desc": "It does not fit in with its surroundings.\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-ST-10",
          "name": "Deck Room",
          "tag": "Interlude",
          "desc": "Just as the hunt is about to draw to an end, Amaia intervenes and stops Specter. The Seaborn successfully returns to the ocean and awaits evolution, and Kal'tsit and Carmen, who just embarked on their journey, do not know whether they'll make it in time."
        },
        {
          "code": "SN-ST-11",
          "name": "Main Mast",
          "tag": "Interlude",
          "desc": "While reminiscing with Specter, Amaia catches on to Ulpianus's actions. She must make a sacrifice before the Hunters and the ship's captain can finish off the Seaborn."
        },
        {
          "code": "SN-10",
          "name": "Ceremonial Plaza",
          "tag": "Before Operation",
          "desc": "It stands before you. You may not be its kin, but you are both creations of nature.\nBounces a 'Hand of the Saint' in the deployed direction, stunning and dealing damage to enemies it collides with."
        },
        {
          "code": "SN-ST-12",
          "name": "Gran Faro",
          "tag": "Interlude",
          "desc": "As everything draws to an end, a useful truth is plucked from the wreckages of frustration. The truth is a building material, from which war will be constructed."
        }
      ]
    },
    "setId_ssLine_act34side": {
      "name": "Path of Life",
      "year": 5,
      "kv": "kv_path_of_life",
      "title": "title_path_of_life",
      "bgid": "storybg_path_of_life",
      "main": false,
      "group": "act34side",
      "desc": "The city of Milliarium breaks through a siege,\na representative of Ægir's first attempt to communicate with the land.\nA swarm of We Many comes out in force, moving towards ripples surfacing on both land and sky.\nA lost forefather returns home, a lone Abyssal Hunter sinks into the abyss once more,\nand an extinguished beacon lights up again...\nAn unprecedented ultra Waterway forms in-between the waves, connecting land to sea—\nbetween Ægir and Seaborn, who will rush towards their last chance for life?",
      "tags": [
        "Special Devices",
        "Elemental Injury"
      ],
      "rewardOp": "Underflow",
      "episodes": [
        {
          "code": "BP-ST-1",
          "name": "Tide Watcher",
          "tag": "Interlude",
          "desc": "People dreamed wild dreams about the cities beneath the waves before they saw one with their own eyes."
        },
        {
          "code": "BP-1",
          "name": "First Contact",
          "tag": "Before Operation",
          "desc": "When they saw it for themselves, they understood that it was just another homeland to somebody, no matter how different it may seem."
        },
        {
          "code": "BP-2",
          "name": "Tribunal Welcome",
          "tag": "Before Operation",
          "desc": "People look for the familiar in those whom they have not seen for a while, forgetting the existence of time.\n Deployable for High Ground Operators."
        },
        {
          "code": "BP-3",
          "name": "Like the Marine Snow",
          "tag": "Before Operation",
          "desc": "When the blood of our brethren and the flesh of the Seaborn become mixed in the water, only our will keeps us human.\n Must be charged by a High Ground Operator; allows your units to deal Burn damage when activated."
        },
        {
          "code": "BP-4",
          "name": "Price and Sacrifice",
          "tag": "Before Operation",
          "desc": "A life given willingly is a sacrifice; a live given unwillingly is a price. Both are burdens to bear for the one who ordered them.\n Deployable for High Ground Operators.\n Must be charged by a High Ground Operator; allows your units to deal Burn damage when activated."
        },
        {
          "code": "BP-5",
          "name": "Lethal Fate",
          "tag": "Before Operation",
          "desc": "The Ægir had forgotten the concept of fate, but must face theirs when matters spiral out of control.\n Deployable for High Ground Operators."
        },
        {
          "code": "BP-6",
          "name": "Anathema of Ægir",
          "tag": "Before Operation",
          "desc": "What 'Ægir' represents has never been justice, but the dignity of humanity.\n Deployable for High Ground Operators.\n Removes  and"
        },
        {
          "code": "BP-ST-2",
          "name": "Backflow Current",
          "tag": "Interlude",
          "desc": "The children of the sea proliferate through the city. They will not permit any place in the sea that does not belong to the sea."
        },
        {
          "code": "BP-7",
          "name": "From History",
          "tag": "Before Operation",
          "desc": "And so the forefather passed into history, from whence came the Seaborn, and for the first time his teachings were understood.\n Deployable for High Ground Operators.\n Must be charged by a High Ground Operator; allows your units to deal Burn damage when activated."
        },
        {
          "code": "BP-8",
          "name": "'What is Survival?'",
          "tag": "Before Operation",
          "desc": "Is it the survival of life, or of civilization?\n Must be charged by a High Ground Operator; allows your units to deal Burn damage when activated."
        },
        {
          "code": "BP-ST-3",
          "name": "The Stray and the Companion",
          "tag": "Interlude",
          "desc": "Kindred spirits tread divergent paths; adversaries walk together."
        }
      ]
    },
    "setId_ssLine_act39side": {
      "name": "Exodus from the Pale Sea",
      "year": 6,
      "kv": "kv_exodus_from_the_pale_sea",
      "title": "title_exodus_from_the_pale_sea",
      "bgid": "storybg_exodus_from_the_pale_sea",
      "main": false,
      "group": "act39side",
      "desc": "Thorns goes into the Iberian Salt Flats in search of lost swordsmanship,\nbut is kidnapped by desert bandits and must refine a compass in exchange for his freedom.\nThe alchemists once tamed the sea with this compass,\nand even today the sound of waves can still be heard within the white salt dunes.\nAs sails raise on a dilapidated ship,\nis there anything else you still long for outside the Pale Sea?",
      "tags": [
        "Special Terrain",
        "Special Devices"
      ],
      "rewardOp": "Rose Salt",
      "episodes": [
        {
          "code": "EP-ST-1",
          "name": "Adios, Salt Flat",
          "tag": "Interlude",
          "desc": "Those who could not be contained in shacks flee from the Salt Flat."
        },
        {
          "code": "EP-1",
          "name": "Upside Down on the Pale Sea",
          "tag": "Before Operation",
          "desc": "As he gazed up at the pale sea for the third time that day, he realized he had fallen into a predicament.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated"
        },
        {
          "code": "EP-2",
          "name": "Treatment by Limb Amputation",
          "tag": "Before Operation",
          "desc": "Don't worry about your injured leg. It won't hurt out in the Flat. Only the survivor feels pain.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated\n Periodically fires a shell forward, dealing Physical splash damage; can launch a nearby ground enemy of 3 Weight or less to the center of the explosion"
        },
        {
          "code": "EP-3",
          "name": "Dance of Exsanguination",
          "tag": "Before Operation",
          "desc": "The blood spilled by man and beast alike paints wild strokes across the pale Salt Flat—she is the only one who would see it as a dance.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated"
        },
        {
          "code": "EP-4",
          "name": "Accidental Reunion",
          "tag": "Before Operation",
          "desc": "When they reunited, one was responsible for the fate of an entire fleet—while the other had been sold for the 'hefty' price of three days of saltfin garum.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated\n Periodically fires a shell forward, dealing Physical splash damage; can launch a nearby ground enemy of 3 Weight or less to the center of the explosion"
        },
        {
          "code": "EP-5",
          "name": "Let the Light of the Past Die",
          "tag": "Before Operation",
          "desc": "Is it a bioluminescent lure meant to attract prey, or a lantern that has burned for far too long?\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated"
        },
        {
          "code": "EP-6",
          "name": "When the Way Out Burns",
          "tag": "Before Operation",
          "desc": "He kept trying to cut his losses, control the damage, and leave himself an exit strategy—until every last escape route was swallowed by flames.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated"
        },
        {
          "code": "EP-ST-2",
          "name": "A Flower that Blooms Rot",
          "tag": "Interlude",
          "desc": "All living things decay. The more the devout seek atonement, the heavier their sins become."
        },
        {
          "code": "EP-7",
          "name": "My Compass",
          "tag": "Before Operation",
          "desc": "It was only when he truly reached out that he realized—grasping was an instinct.\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated\n Periodically fires a shell forward, dealing Physical splash damage; can launch a nearby ground enemy of 3 Weight or less to the center of the explosion"
        },
        {
          "code": "EP-8",
          "name": "I Come, I Conquer, I Define",
          "tag": "Before Operation",
          "desc": "'I want to witness it with my own eyes, conquer it with my own hands, and define it on my own terms—'\n Enemies passing through have reduced Movement Speed; after stopping for long enough, they will sink in and be defeated\n Periodically fires a shell forward, dealing Physical splash damage; can launch a nearby ground enemy of 3 Weight or less to the center of the explosion"
        },
        {
          "code": "EP-ST-3",
          "name": "Adios, Tierra",
          "tag": "Interlude",
          "desc": "Those who are paralyzed by fear bid farewell to the land."
        }
      ]
    },
    "setId_ssLine_act52side": {
      "name": "Yet Another Wave",
      "year": 8,
      "kv": "kv_yet_another_wave",
      "title": "title_yet_another_wave",
      "bgid": "storybg_yet_another_wave",
      "main": false,
      "group": "act52side",
      "desc": "",
      "tags": [],
      "rewardOp": null,
      "episodes": []
    },
    "setId_ssLine_act11d0": {
      "name": "Twilight of Wolumonde",
      "year": 1,
      "kv": "kv_twilight_of_wolumonde",
      "title": "title_twilight_of_wolumonde",
      "bgid": "storybg_twilight_of_wolumonde",
      "main": false,
      "group": "act11d0",
      "desc": "Folinic and Suzuran arrive at this place, searching for the missing Atro.\nWolumonde, 'The Eighth Moon' of the Leithanien's Winterwisp Mountains.\nUnder the threat of Catastrophes, the town remains still while suspicion lurks in the people's eyes.\nA great fire extinguishes many lives, but from the ashes more questions rise.\nWith the arrival of Reunion, the conflict between the Infected and the townsfolk reaches a climax.\nWill this incident be resolved? Will there be answers to the mystery?\nPlease investigate the truth hidden in the twilight, alongside the operators of Rhodes Island.",
      "tags": [
        "Beginner",
        "Special Devices"
      ],
      "rewardOp": "Folinic",
      "episodes": [
        {
          "code": "TW-ST-1",
          "name": "Under the Old Oak",
          "tag": "Interlude",
          "desc": "Smoke rises above the branches."
        },
        {
          "code": "TW-1",
          "name": "Silence Maintained",
          "tag": "Before Operation",
          "desc": "They all know to talk, to mince words, to deceive. Not a single word they utter is the truth."
        },
        {
          "code": "TW-2",
          "name": "Outpost Rebellion",
          "tag": "Before Operation",
          "desc": "The facade of peace gradually comes undone, and desires are left unfulfilled for everyone."
        },
        {
          "code": "TW-3",
          "name": "Smoldering Spire",
          "tag": "Before Operation",
          "desc": "Every little trick has been revealed, but that just shows that a deeper conspiracy has succeeded.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        },
        {
          "code": "TW-4",
          "name": "Vengeful Soul",
          "tag": "Before Operation",
          "desc": "Disorder will dredge up the hatred that has slept within the depths of time and the hearts of men. These ancient howls unravel the minds of those who normally would disregard them, and scream for justice.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies\nSome Operators cannot be deployed in this stage"
        },
        {
          "code": "TW-5",
          "name": "Winterwisp's Elegy",
          "tag": "Before Operation",
          "desc": "The poems of the Winterwisp clan appear only in ancient ceremonies and funerals, but where are these rituals, and who is this funeral for?"
        },
        {
          "code": "TW-6",
          "name": "Fanning Flames",
          "tag": "Before Operation",
          "desc": "Now, resentment transcends reason.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        },
        {
          "code": "TW-7",
          "name": "Sundered Land",
          "tag": "Before Operation",
          "desc": "Even rock and mud cannot avoid the maelstrom of conflict.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        },
        {
          "code": "TW-8",
          "name": "Sinking Moonlight",
          "tag": "Before Operation",
          "desc": "Even knowing the truth, none of them will stop. Only the determination of death can push back this primal rage.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        },
        {
          "code": "TW-ST-2",
          "name": "Above the Embers",
          "tag": "Interlude",
          "desc": "The flame ignites the tip of the moon."
        },
        {
          "code": "TW-S-1",
          "name": "The Three Colossi",
          "tag": "After Operation",
          "desc": "Catastrophes wipe out only a portion of life. People will finish the rest.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        },
        {
          "code": "TW-S-2",
          "name": "Bouquet of Mourning",
          "tag": "After Operation",
          "desc": "Only the dead may rest in peace. Such has always been the ways of this land.\nBoth allied and enemy units will fight for control over this device; When activated, deals Arts damage to enemies and heals allies"
        }
      ]
    },
    "setId_ssLine_act18side": {
      "name": "Lingering Echoes",
      "year": 3,
      "kv": "kv_lingering_echoes",
      "title": "title_lingering_echoes",
      "bgid": "storybg_lingering_echoes",
      "main": false,
      "group": "act18side",
      "desc": "Leithanien, land of spires, home to wisdom and music.\nThe shadows of days past are gone, and the light of dawn fills the streets.\nAfterglow Hall, Vyseheim.\nStrings stretched to the breaking point are about to play their last notes.\nKeys of black and white are trapped by the stave lines of destiny.\nA forgotten melody begins to grow in obsession.\nThe sounds of joy drift in the glow, as no one notices that the sun has begun to set.",
      "tags": [
        "Special Environment",
        "Special Devices",
        "Special Tools"
      ],
      "rewardOp": "Czerny",
      "episodes": [
        {
          "code": "LE-ST-1",
          "name": "Grande valse brilliante",
          "tag": "Interlude",
          "desc": "The dancers make their steps in grace; the performers play the opening notes."
        },
        {
          "code": "LE-1",
          "name": "Tritsch-Tratsch-Polka",
          "tag": "Before Operation",
          "desc": "A carefree atmosphere pervades the city's every which where, accompanied by omnipresent merry chatter.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-2",
          "name": "Appassionata, ou Pathétique",
          "tag": "Before Operation",
          "desc": "It's happened plenty of times before. She buries the sorrow deep down, and her enthusiasm grows by the day.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-3",
          "name": "Der Freischütz",
          "tag": "Before Operation",
          "desc": "What the hunter does not know is that while the final magic bullet remains unshot, true relief will elude him.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-4",
          "name": "Surprise",
          "tag": "Before Operation",
          "desc": "Quiet, please, ladies and gentlemen! Loud though that was, it's no cause for alarm!\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-ST-2",
          "name": "The Rite of Spring",
          "tag": "Interlude",
          "desc": "No, they offer sacrifice not to that deceased figure, but to the figments within their own hearts."
        },
        {
          "code": "LE-5",
          "name": "Moonlight",
          "tag": "Before Operation",
          "desc": "Under the chill of the twin moons, even words seem numb with cold.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-6",
          "name": "Danse Macabre",
          "tag": "Before Operation",
          "desc": "We hail from the earth, and shall one day turn to dust upon it... but not today.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-7",
          "name": "Verklärte Nacht",
          "tag": "Before Operation",
          "desc": "The voice of the music sounds on and out, beyond even the sky.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-8",
          "name": "Schicksals",
          "tag": "Before Operation",
          "desc": "His vague awareness that these hands are clutched at his own throat.\n Natural SP recovery speed reduced.\n Restores natural SP recovery speed of allied Operators within."
        },
        {
          "code": "LE-ST-3",
          "name": "From the New World",
          "tag": "Interlude",
          "desc": "Some have but old friends, and no old home."
        }
      ]
    },
    "setId_ssLine_act29side": {
      "name": "Zwillingstürme im Herbst",
      "year": 5,
      "kv": "kv_zwillingsturme_im_herbst",
      "title": "title_zwillingsturme_im_herbst",
      "bgid": "storybg_zwillingsturme_im_herbst",
      "main": false,
      "group": "act29side",
      "desc": "Twenty-three years ago, the Golden Moon witnessed the collapse of that towering spire.\nHas Leithanien embraced a new chapter as it wished?\nHave the tyrant's ambitions and sins been buried along with all the pain and doubt he brought?\nWhen the poet returns to her homeland where the marigolds bloom, and the traveler plucks the strings of her cello,\ndo the people beneath the Twin Spires still harbor hopes and dreams? Do they still wander freely?\nMay all doubts be finally dispelled, may all questions be answered.\n'I am this eternal nation. I am my own eternal king.'",
      "tags": [
        "Special Devices",
        "Special Environment",
        "Special Tools"
      ],
      "rewardOp": "Bassline",
      "episodes": [
        {
          "code": "ZT-ST-1",
          "name": "Prelude 'Surprise Return'",
          "tag": "Interlude",
          "desc": "The poet returns from a long journey, only to find a homeland changed."
        },
        {
          "code": "ZT-1",
          "name": "Chorale 'Lied des klaren Himmels'",
          "tag": "Before Operation",
          "desc": "The hymn 'Lied des klaren Himmels,' became popular after the fall of the Witch King's spire. Since then, the sky above Leithanien has remained clear, the haze forever dispelled."
        },
        {
          "code": "ZT-2",
          "name": "Overture 'Sentinel' ",
          "tag": "Before Operation",
          "desc": "A piece inspired by the call signals of the imperial Gendarmerie during their night patrols. The drumbeat is steady and resolute, just like the sentries' unshakable march.\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-3",
          "name": "Etude 'Encounter'",
          "tag": "Before Operation",
          "desc": "The most famous black key étude; however, performing it is extremely difficult, the melody often seeming like it's tripping over itself.\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-4",
          "name": "Rhapsody 'Longing' ",
          "tag": "Before Operation",
          "desc": "A young man from Urtica climbed to the tallest spire of Ludwigs-Universität, and when he looked down across the land, this was the resulting opus.\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-5",
          "name": "Sonata 'Autumn' ",
          "tag": "Before Operation",
          "desc": "A meeting, then desolation. Betrayal, then regret. Autumn's monologue.\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-ST-2",
          "name": "Intermezzo 'Unfinished Fugue'",
          "tag": "Interlude",
          "desc": "This unfinished fugue has no ending, just as the dark conspiracies have not reached their conclusion."
        },
        {
          "code": "ZT-6",
          "name": "Valse 'Mask'",
          "tag": "Before Operation",
          "desc": "The ball is finally over, and the dancers remove their masks. But why can I still not see your face?\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-7",
          "name": "Concerto 'Resurrection' ",
          "tag": "Before Operation",
          "desc": "Sin long renounced has caught up to me. Enemies long vanquished have risen again.\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-8",
          "name": "Nocturne 'Unseen Spire'",
          "tag": "Before Operation",
          "desc": "There are too many futures unseeable, too many spires unreachable. And so, the ferryman sings this nocturne.\n Absorbs all incoming damage and transfers it to the Aspect of Creation\n Converts all damage absorbed by the Aspect of Annihilation and releases it frontally as Physical damage"
        },
        {
          "code": "ZT-9",
          "name": "Fantasy 'Gift' ",
          "tag": "Before Operation",
          "desc": "Written by Ludwig, Kurfürst of Einwald. 'May all questions be answered in the end.'\n Heals when attacked; when activated during a song variation, changes the variation and briefly applies a buff to friendly units"
        },
        {
          "code": "ZT-10",
          "name": "Messe 'König'",
          "tag": "Before Operation",
          "desc": "May this radiance shine forever.\n Absorbs all incoming damage and transfers it to the Aspect of Creation\n Converts all damage absorbed by the Aspect of Annihilation and releases it frontally as Physical damage"
        },
        {
          "code": "ZT-ST-3",
          "name": "Coda 'Evening Glow' ",
          "tag": "Interlude",
          "desc": "The curtains fall on the grandest ceremony, in that moment cementing more than just the sunlight."
        }
      ]
    },
    "setId_ssLine_act22side": {
      "name": "What the Firelight Casts",
      "year": 4,
      "kv": "kv_what_the_firelight_casts",
      "title": "title_what_the_firelight_casts",
      "bgid": "storybg_what_the_firelight_casts",
      "main": false,
      "group": "act22side",
      "desc": "Tara, a vaguely-defined region, a muddy morass... \nA homeland that can be found only in old songs.\nShe once escaped from there, only to bury everything about herself and return again.\n'Lost souls' emerge from the shadows, and Dublinn's march leaves scorch marks across the land.\nThe red dragon, endowed by her bloodline with the flame of life, must bear the weight of life itself.\nWhat, then, does the firelight cast? Whose shadow am I now?",
      "tags": [
        "Special Terrain",
        "Elemental Injury"
      ],
      "rewardOp": "Puzzle",
      "episodes": [
        {
          "code": "FC-ST-1",
          "name": "Wilderness Bells",
          "tag": "Interlude",
          "desc": "She casts a flame into the long night."
        },
        {
          "code": "FC-1",
          "name": "Flight and Pursuit",
          "tag": "Before Operation",
          "desc": "Some seek the truth, some seek prey. Others seek a way out alive.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-2",
          "name": "Unlucky Reunion",
          "tag": "Before Operation",
          "desc": "Beset by the same tragedy, people can no longer tell where the barriers separating them arose.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-3",
          "name": "Burn the Haystacks",
          "tag": "Before Operation",
          "desc": "She dares not look upon her own shadow, but everyone has noticed the firelight by her side.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-4",
          "name": "Scorching Dream",
          "tag": "Before Operation",
          "desc": "The licking flames distort the air, and people's dreams.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-5",
          "name": "Hymn of Blessing",
          "tag": "Before Operation",
          "desc": "The reeds by the lakeshore sing a forlorn tune.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-6",
          "name": "Known by None",
          "tag": "After Operation",
          "desc": "Where can you go to escape from fate?\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage.\n4 Reed Beds are ignited at the start of battle."
        },
        {
          "code": "FC-7",
          "name": "Soul Spark",
          "tag": "Before Operation",
          "desc": "The sparks leave no trace on the cold steel.\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-ST-2",
          "name": "From the Ashes",
          "tag": "Interlude",
          "desc": "The survivors of the conflagration go their separate ways."
        },
        {
          "code": "FC-8",
          "name": "Her Shadow",
          "tag": "Before Operation",
          "desc": "Is it my defeat that you want, Loughshinny?\n Gradually reduces the ASPD of Operators within, and the ASPD and Movement Speed of enemies within.\n Operators within gain Camouflage."
        },
        {
          "code": "FC-ST-3",
          "name": "A Sob",
          "tag": "Interlude",
          "desc": "The wheels of war leave tracks in the mud, drowning out all sounds."
        }
      ]
    },
    "setId_ssLine_act41side": {
      "name": "When Elegies Are Ashes",
      "year": 6,
      "kv": "kv_when_elegies_are_ashes",
      "title": "title_when_elegies_are_ashes",
      "bgid": "storybg_when_elegies_are_ashes",
      "main": false,
      "group": "act41side",
      "desc": "Na Saoirsí: a devastated city, an exhausted heart...\nA secret guarded by woods and fog.\nLoughshinny comes with a vision of peace, holding true to her promise.\nMeanwhile, that manipulator of death has prepared a long enough story to tell.\nAs Red Dragon slays Red Dragon, blessings return to their gifter, and the departed return to fire.\nThen what? What sort of future will the flames bring to Tara now?",
      "tags": [
        "Special Terrain",
        "Special Devices",
        "Elemental Injury"
      ],
      "rewardOp": "Brigid",
      "episodes": [
        {
          "code": "EA-ST-1",
          "name": "Walk Through the Cold Night",
          "tag": "Interlude",
          "desc": "Stories, ballads, bonfires... those gathered here have nothing, yet also everything."
        },
        {
          "code": "EA-1",
          "name": "Title Page",
          "tag": "Before Operation",
          "desc": "'Why have you come, self-exiled?'"
        },
        {
          "code": "EA-2",
          "name": "But Only Farewell",
          "tag": "Before Operation",
          "desc": "'You brim with sincerity, yet ask for nothing more?'\n Cannot be attacked, and blocks the vision of your units."
        },
        {
          "code": "EA-3",
          "name": "Suspicion and Impulse",
          "tag": "Before Operation",
          "desc": "'I want to make up for the past, and to return home. Other than that, I ask for nothing more.'\n Cannot be attacked, and blocks the vision of your units"
        },
        {
          "code": "EA-4",
          "name": "That Old Dance",
          "tag": "Before Operation",
          "desc": "'You satisfy yourself with remorse and yearning, yet ask for nothing more?'\n Can grow into , and units deployed on them take continuous Arts damage.\n When an Operator is deployed on an , another  on the field will copy that Operator but faced in the opposite direction and deal Burn damage."
        },
        {
          "code": "EA-5",
          "name": "Drowned in Fire",
          "tag": "Before Operation",
          "desc": "'Please bring me to the other Red Dragon. Other than that, I ask for nothing more.'\n Cannot be attacked, and blocks the vision of your units.\n Blocks the vision of your units."
        },
        {
          "code": "EA-6",
          "name": "The Lost",
          "tag": "Before Operation",
          "desc": "'...Will this path truly lead me to him?'\n Cannot be attacked, and blocks the vision of your units"
        },
        {
          "code": "EA-ST-2",
          "name": "Death of a Romance",
          "tag": "Interlude",
          "desc": "This is just a story, not a map of our future. There's no need to cry, Loughshinny."
        },
        {
          "code": "EA-7",
          "name": "One Who Burns the Lamp",
          "tag": "Before Operation",
          "desc": "...As you wish, Eblana.\n Can grow into , and units deployed on them take continuous Arts damage.\n Cannot be attacked, and blocks the vision of your units."
        },
        {
          "code": "EA-8",
          "name": "At the End of the Night",
          "tag": "Before Operation",
          "desc": "Await the deluge, and when the sun rises, we shall have surpassed both life and death.\n Cannot be attacked, and blocks the vision of your units.\n When an Operator is deployed on an , another  on the field will copy that Operator but faced in the opposite direction and deal Burn damage."
        },
        {
          "code": "EA-ST-3",
          "name": "Back Cover",
          "tag": "Interlude",
          "desc": "A story repeated countless time is what becomes history."
        }
      ]
    },
    "setId_ssLine_act3d0": {
      "name": "Heart of Surging Flame",
      "year": 1,
      "kv": "kv_heart_of_surging_flame",
      "title": "title_heart_of_surging_flame",
      "bgid": "storybg_heart_of_surging_flame",
      "main": false,
      "group": "act3d0",
      "desc": "The Obsidian Festival is in full swing in the town of Siesta!\nThe Operators of Rhodes Island have come for a vacation as well.\nNot before long, they learned that the eruption of a nearby volcano is imminent!\nBut it seems the town's government is trying to cover it up?!\nIn the midst of the summer heat, music and battle, \nRhodes Island will set out with the mayor's daughter, Ceylon.\nWill they manage to save the day?",
      "tags": [
        "Beginner",
        "Special Terrain"
      ],
      "rewardOp": "Ceylon",
      "episodes": [
        {
          "code": "ENTRY",
          "name": "It's Showtime",
          "tag": "Interlude",
          "desc": "The annual Obsidian Festival has just begun! Enjoy the festivities, and support your favorite artist!"
        },
        {
          "code": "OF-ST1",
          "name": "Rock On",
          "tag": "Interlude",
          "desc": "It took one whole week on the road to get here. \nFor some, of course, the journey itself is part of the vacation."
        },
        {
          "code": "OF-1",
          "name": "Made of Lava",
          "tag": "Before Operation",
          "desc": "A sizzling summer with thrilling music - could this festival get any better? \nHowever, perfection tends to be short-lived, as a massive crisis approaches without warning.\nUnable to deploy some Operators on the field"
        },
        {
          "code": "OF-ST2",
          "name": "Break Free",
          "tag": "Interlude",
          "desc": "When paralyzed by a lack of information and preparation, it is recklessness, rather than caution, that has the ability to break the impasse."
        },
        {
          "code": "OF-2",
          "name": "To be Continued",
          "tag": "Before Operation",
          "desc": "The show must stop, but there are those who disagree."
        },
        {
          "code": "OF-3",
          "name": "Race Walking",
          "tag": "Before Operation",
          "desc": "With just a single phone call, you can get all the help you need - even when you are on the run. How reassuring."
        },
        {
          "code": "OF-4",
          "name": "The General",
          "tag": "Before Operation",
          "desc": "It is rare to find someone in an ordinary city who can match the power of General Hellagur. An unexpected development."
        },
        {
          "code": "OF-ST3",
          "name": "Under the Gun",
          "tag": "Interlude",
          "desc": "When the one you trust most has betrayed you, are you willing to believe that she has her own reasons? \nOr are there no justifications for betrayal?"
        },
        {
          "code": "OF-5",
          "name": "Don't Stop Me Now",
          "tag": "Before Operation",
          "desc": "True courage comes from facing and accepting the truth."
        },
        {
          "code": "OF-6",
          "name": "Killer Queen",
          "tag": "Before Operation",
          "desc": "The true villains always appear at the worse possible moment.\nNaturally, that's the best possible time for moment for them. \nUnable to deploy some Operators on the field"
        },
        {
          "code": "OF-ST4",
          "name": "In the Name of Love",
          "tag": "Interlude",
          "desc": "Whether true love means watching silently or speaking frankly, there is no clear answer."
        },
        {
          "code": "OF-7",
          "name": "Final Stroke",
          "tag": "Before Operation",
          "desc": "A brightest firework in the grandest ceremony is a thrilling idea, if only the villains don't think so."
        },
        {
          "code": "OF-8",
          "name": "Siesta Rhapsody",
          "tag": "Before Operation",
          "desc": "A giant creature assumes the role of the last boss, by no fault of its own. Sometimes, that's a more satisfying conclusion than some desperate villain. \n spray out lava periodically, dealing massive damage to friendly units on the surrounding 8 tiles and melting down Roadblocks."
        },
        {
          "code": "OF-ST5",
          "name": "Love of this Life",
          "tag": "Interlude",
          "desc": "The many stories passed down over time may seem simplistic, but they may well be equal parts heartwarming and heartwrenching."
        },
        {
          "code": "OF-ST6",
          "name": "Seaside Serendipity",
          "tag": "Interlude",
          "desc": "Look closely. What is it that stands in front of you?"
        },
        {
          "code": "OF-EX1",
          "name": "Warming-up",
          "tag": "After Operation",
          "desc": "This may well be your last chance to put on a song and relax. Seize the opportunity before it slips away from you."
        },
        {
          "code": "OF-EX3",
          "name": "Interview Time",
          "tag": "After Operation",
          "desc": "Imagine you've got a superstar right behind you, and your job is to keep him from the fervent mob of fans."
        },
        {
          "code": "OF-EX6",
          "name": "Perfect Ending",
          "tag": "After Operation",
          "desc": "Try chucking a rock into the lava and see what happen. The results might not please you. \n Deploy it to block the enemy's route\n spray out lava periodically, dealing massive damage to friendly units on the surrounding 8 tiles and melting down Roadblocks"
        }
      ]
    },
    "setId_ssLine_act12d0": {
      "name": "The Great Chief Returns",
      "year": 2,
      "kv": "kv_the_great_chief_returns",
      "title": "title_the_great_chief_returns",
      "bgid": "storybg_the_great_chief_returns",
      "main": false,
      "group": "act12d0",
      "desc": "The doctor, Gavial, and co. travel to Gavial's hometown on a low-altitude aircraft.\nAcahualla, a place of lush forests within Sargon.\nClose to their destination, the aircraft is struck down!\nThe doctor and Gavial have no choice but to travel on foot to the settlements to seek help.\nWhat plots and threats do the vast rainforests hide?\nWill the Rhodes Island operators be able to repair their aircraft and return?\nGavial, this is your home turf. It's all on you now!",
      "tags": [
        "Special Devices",
        "Special Tools"
      ],
      "rewardOp": "Tomimi",
      "episodes": [
        {
          "code": "RI-1",
          "name": "Falling Objects",
          "tag": "Before Operation",
          "desc": "Sometimes, a journey's surprises begin well before you arrive."
        },
        {
          "code": "RI-2",
          "name": "Thick Versus Thin",
          "tag": "Before Operation",
          "desc": "Competition is one of the timeless inevitabilities of gathering sentient creatures in one place.\nIncreases the DEF of neighboring allied units"
        },
        {
          "code": "RI-3",
          "name": "Old Times",
          "tag": "Before Operation",
          "desc": "Obviously, Gavial was still Gavial when she was young.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-4",
          "name": "Robotic Roar",
          "tag": "Before Operation",
          "desc": "It is so incompatible with the jungle, yet the two complement each other so well.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-ST-1",
          "name": "Titan's Heart",
          "tag": "Interlude",
          "desc": "Being straightforward has never meant being reckless."
        },
        {
          "code": "RI-5",
          "name": "Individual Strengths",
          "tag": "Before Operation",
          "desc": "Knowing a skill is very important.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-6",
          "name": "Encounter",
          "tag": "Before Operation",
          "desc": "Encounters always come unexpectedly.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-ST-2",
          "name": "Momentary Rest",
          "tag": "Interlude",
          "desc": "A waterfall has water, and an ocean has water. What difference does it make where you decide to fool around?"
        },
        {
          "code": "RI-7",
          "name": "First Come First Served",
          "tag": "Before Operation",
          "desc": "There's nothing quite like taking an unexpected detour to reach the same destination.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-8",
          "name": "Gavial's Fist",
          "tag": "Before Operation",
          "desc": "The mightiest clash.\nIncreases the DEF of neighboring allied units\nTidies up a Giant Mushroom to create a Ranged tile"
        },
        {
          "code": "RI-9",
          "name": "Out of the Jungle",
          "tag": "Before Operation",
          "desc": "A new life awaits them."
        },
        {
          "code": "RI-EX-1",
          "name": "Feint",
          "tag": "After Operation",
          "desc": "Beware, for that's just the bait."
        }
      ]
    },
    "setId_ssLine_act12side": {
      "name": "Dossoles Holiday",
      "year": 3,
      "kv": "kv_dossoles_holiday",
      "title": "title_dossoles_holiday",
      "bgid": "storybg_dossoles_holiday",
      "main": false,
      "group": "act12side",
      "desc": "Ch'en was invited to spend the summer at Dossoles, Bolívar.\nLittle did she know that she would run into Lin Yühsia there.\nMeanwhile, the most unique city in Bolívar is about to hold its most significant annual event: the \nDossoles Warrior Championship.\nWhere there is light, however, there is always shadow,\nand this shadow threatens to consume the entire city.\nWhat is the danger that Ch'en and Lin Yühsia are sensing?",
      "tags": [
        "Special Environment",
        "Elemental Injury",
        "Special Tools"
      ],
      "rewardOp": "Tequila",
      "episodes": [
        {
          "code": "DH-ST-1",
          "name": "A Chance Encounter",
          "tag": "Interlude",
          "desc": "A sudden change of itinerary, an unexpected reunion, a noisy city, a strange commission. Ch'en's holiday is just beginning."
        },
        {
          "code": "DH-1",
          "name": "Accidental Participation",
          "tag": "Before Operation",
          "desc": "Ch'en had a hunch she'd encounter Lin Yühsia in this city for some reason or other. She just didn't expect it to be this early, and in such a way. \nUnable to deploy on flooded tiles. Allied units and enemies in the water will suffer from 'Erosion': Allied units have reduced ASPD, continually receive Corrosion Damage and receive additional Corrosion Damage when attacked; Enemies have reduced ASPD and Movement Speed, and continually lose HP"
        },
        {
          "code": "DH-2",
          "name": "First Round",
          "tag": "Before Operation",
          "desc": "Ch'en's opposition here is not those surrounding her, but the unfamiliar weapon in her hand, and her uncooperative teammates. \nUnable to deploy on flooded tiles. Allied units and enemies in the water will suffer from 'Erosion': Allied units have reduced ASPD, continually receive Corrosion Damage and receive additional Corrosion Damage when attacked; Enemies have reduced ASPD and Movement Speed, and continually lose HP"
        },
        {
          "code": "DH-3",
          "name": "Timely Assistance",
          "tag": "Before Operation",
          "desc": "To Ch'en, there's never anything more important than helping others. \nUnable to deploy on flooded tiles. Allied units and enemies in the water will suffer from 'Erosion': Allied units have reduced ASPD, continually receive Corrosion Damage and receive additional Corrosion Damage when attacked; Enemies have reduced ASPD and Movement Speed, and continually lose HP"
        },
        {
          "code": "DH-ST-2",
          "name": "Intermission",
          "tag": "Interlude",
          "desc": "To take a short break is to prepare oneself for the next high tide."
        },
        {
          "code": "DH-4",
          "name": "Triathlon",
          "tag": "Before Operation",
          "desc": "A game requires rules, yet what the audience most wishes for tends to be that which breaks the rules. \nUnable to deploy on flooded tiles. Allied units and enemies in the water will suffer from 'Erosion': Allied units have reduced ASPD, continually receive Corrosion Damage and receive additional Corrosion Damage when attacked; Enemies have reduced ASPD and Movement Speed, and continually lose HP"
        },
        {
          "code": "DH-5",
          "name": "Winding Path to Victory",
          "tag": "Before Operation",
          "desc": "Some take shortcuts for the sake of victory, while others have no choice but to do so. \nUnable to deploy on flooded tiles. Allied units and enemies in the water will suffer from 'Erosion': Allied units have reduced ASPD, continually receive Corrosion Damage and receive additional Corrosion Damage when attacked; Enemies have reduced ASPD and Movement Speed, and continually lose HP"
        },
        {
          "code": "DH-6",
          "name": "Hot Pursuit",
          "tag": "Before Operation",
          "desc": "It's true that Ch'en dislikes this city and such competitions, but it's also undeniable that she dislikes losing. \nUnable to deploy on these tiles. Enemies on these tiles have reduced ASPD and Movement Speed, and continually lose HP\nCan be deployed on Deep Water Zones, thereafter any unit can be deployed on that tile. The platform is destroyed when the deployed unit retreats"
        },
        {
          "code": "DH-ST-3",
          "name": "Turnabout is Fair Play",
          "tag": "Interlude",
          "desc": "Ch'en knows very well that Ernesto harbors ill intentions, but she is not alone."
        },
        {
          "code": "DH-7",
          "name": "Beach Blockade",
          "tag": "Before Operation",
          "desc": "Hoshiguma may be experienced and knowledgeable, but even she admits that she's rarely met one who revels as much in chaos and danger as Candela. \nUnable to deploy on these tiles. Enemies on these tiles have reduced ASPD and Movement Speed, and continually lose HP\nCan be deployed on Deep Water Zones, thereafter any unit can be deployed on that tile. The platform is destroyed when the deployed unit retreats"
        },
        {
          "code": "DH-8",
          "name": "Beach Landing",
          "tag": "After Operation",
          "desc": "Swire worries for the safety of Ch'en and Lin Yühsia, but she fears the trouble they are causing even more. \nUnable to deploy on these tiles. In this stage, enemies on these tiles lose HP at a greatly increased rate\nCan be deployed on Deep Water Zones, thereafter any unit can be deployed on that tile. The platform is destroyed when the deployed unit retreats"
        },
        {
          "code": "DH-9",
          "name": "Mouse's Courage, Dragon's Might",
          "tag": "Before Operation",
          "desc": "Drones continue fluttering about the sky and the show's broadcast doesn't stop. The danger is very real, yet it seems as insignificant as dust. Ladies and gentlemen, this is Dossoles. \nUnable to deploy on these tiles. In this stage, enemies on these tiles lose HP at a greatly increased rate\nCan be deployed on Deep Water Zones, thereafter any unit can be deployed on that tile. The platform is destroyed when the deployed unit retreats"
        },
        {
          "code": "DH-ST-4",
          "name": "The Usual Lapping Waves",
          "tag": "Interlude",
          "desc": "A bout of danger dismissed as a farce has passed, yet nothing has changed."
        }
      ]
    },
    "setId_ssLine_act20side": {
      "name": "Ideal City: Endless Carnival",
      "year": 4,
      "kv": "kv_ideal_city_carnival_in_the_endless_summer",
      "title": "title_ideal_city_carnival_in_the_endless_summer",
      "bgid": "storybg_ideal_city_carnival_in_the_endless_summer",
      "main": false,
      "group": "act20side",
      "desc": "Gavial and Eunectes head home in response to a call for help.\nElysium and the Acahualla go underground to solve a problem.\nWhen they arrive at the underground city, they find a situation they never imagined.\nThe Durin enjoy a cool summer splash beneath a broken dome.\nCompetition, conflict, crisis; all must take a back seat.\nCool off and drink to your heart's content. After the party is another party!",
      "tags": [
        "Neutral Units",
        "Special Tools",
        "Special Devices"
      ],
      "rewardOp": "Minimalist",
      "episodes": [
        {
          "code": "IC-ST-1",
          "name": "Eve of Journey",
          "tag": "Interlude",
          "desc": "The visitors are eager, while the tour guide has ulterior motives... Well, it's not that bad. Relax."
        },
        {
          "code": "IC-1",
          "name": "Alternate Reality Tourism",
          "tag": "Before Operation",
          "desc": "First time in Zeruertza? Better try the local specialty... but drink in moderation. Even an Originium Slug could walk straighter than those drunkards."
        },
        {
          "code": "IC-2",
          "name": "Freefall",
          "tag": "Before Operation",
          "desc": "Leap from the cave above to reach Zeruertza. Fall into a cave in Zeruertza, and you'll have to climb back up yourself."
        },
        {
          "code": "IC-3",
          "name": "Stranger Things",
          "tag": "Before Operation",
          "desc": "The dome, robots, cultural divide, The Great Aquapit... and self-driving carts. Where else would you find a group of people so thoroughly engrossed in their own circle?\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-4",
          "name": "The Great Aquapit",
          "tag": "Before Operation",
          "desc": "Just as it is above ground, disappearance often means a permanent parting in Zeruertza. The difference is that the Durin believe that something better awaits in the future.\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-5",
          "name": "Finish Line",
          "tag": "Before Operation",
          "desc": "'Learn to slow down before the finish line. It's for your own good.'\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-6",
          "name": "Fight Or Flight",
          "tag": "Before Operation",
          "desc": "Do not set foot on a battlefield you should not set foot on. Do not run from responsibilities you cannot run from.\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it\nTiles do not have melee/ranged restrictions"
        },
        {
          "code": "IC-7",
          "name": "Way of Living",
          "tag": "Before Operation",
          "desc": "Different paths mold different people. Few can leave the path that molded them.\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-8",
          "name": "Metallic Scent",
          "tag": "Before Operation",
          "desc": "A metallic story plucks the strings of the heart. A metallic axe knocks at the door to the heart.\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-9",
          "name": "Above the Dome",
          "tag": "After Operation",
          "desc": "At the end of the final battle, pan the camera towards the sky—just right for Zeruertza.\n Spend DP to activate and launch a Self-Driving Cart\n Causes Self-Driving Carts to turn when they pass over it"
        },
        {
          "code": "IC-ST-2",
          "name": "Paradise Lost",
          "tag": "Interlude",
          "desc": "A late letter, a designer learning to open his heart, and a bunch of guys who are not sad at all, but rather looking to have some fun."
        }
      ]
    },
    "setId_ssLine_act27side": {
      "name": "So Long, Adele: Home Away From Home",
      "year": 5,
      "kv": "kv_so_long_adele",
      "title": "title_so_long_adele",
      "bgid": "storybg_so_long_adele",
      "main": false,
      "group": "act27side",
      "desc": "Siesta is moved onto a nomadic city, and leaves the shadow of the volcano.\nTheir new homes may be built, but the people do not wish to give up their memories.\nA volcanologist reaches out to touch the past, when clouds suddenly float down as balls of fluff.\nThe night breeze melts away the dreams of summer, while guitars strum out gentle notes.\nThe pulse of the land blazes white hot, and the volcano known as 'Love' will erupt someday...\nIt is parting, and reunion, and the song ever-present in the heart.",
      "tags": [
        "Elemental Injury",
        "Special Tools",
        "Special Devices",
        "Neutral Units"
      ],
      "rewardOp": "Bryophyta",
      "episodes": [
        {
          "code": "SL-ST-1",
          "name": "Down By the Station",
          "tag": "Interlude",
          "desc": "New Siesta, New Vacation"
        },
        {
          "code": "SL-1",
          "name": "Do Your Ears Hang Low?",
          "tag": "Before Operation",
          "desc": "Prick up your ears – do you hear his question? One, two, three... This summer, he will be waiting for your answer.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-2",
          "name": "Little Boy Blue",
          "tag": "Before Operation",
          "desc": "Can't see it in the pool, can't see it in the sky. Dip it into strawberry ice cream, and the soft and fluffy has no where to hide.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-3",
          "name": "Finger Family",
          "tag": "Before Operation",
          "desc": "Hold the thumbtack with one finger, thread the needle with index and middle... Use all five, and pluck the strings of the northern wind.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-4",
          "name": "A Sailor Went to Sea",
          "tag": "Before Operation",
          "desc": "What has been swallowed can be spat back out. What has left can return. Everything changes, nothing changes.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-5",
          "name": "I Can Sing a Rainbow",
          "tag": "Before Operation",
          "desc": "The volcano sees me, the lyrics write me. The coffee tastes me, the 'seeds' bury me.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-ST-2",
          "name": "Rain, Rain, Go Away",
          "tag": "Interlude",
          "desc": "It'd be great if this weren't a dream... And if it is, then it's just a great dream."
        },
        {
          "code": "SL-6",
          "name": "Little Cabin in the Wood",
          "tag": "Before Operation",
          "desc": "The climbing picks jingle, the tiny rocks shine black and bright. Be careful when heading up and down the mountain, lest the rocks be your plight.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area."
        },
        {
          "code": "SL-7",
          "name": "Cry On My Shoulder",
          "tag": "Before Operation",
          "desc": "Into the heartbeats our footsteps melt, a place nowhere to find the tear-soaked 'pelt.'\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area.\nA large number of 'Fluffy Buddies' will appear on the field.\nRanged Operators can be deployed on Melee tiles in this stage."
        },
        {
          "code": "SL-8",
          "name": "Skidamarink",
          "tag": "Before Operation",
          "desc": "The love of your life, love akin to a volcano.\n Units standing around it are unaffected by vapor, and will produce Pure White Steam when attacking.\n When defeated, creates Pure White Steam in the surrounding area.\nA large number of 'Fluffy Buddies' will appear on the field."
        },
        {
          "code": "SL-ST-3",
          "name": "Sunny Day",
          "tag": "Interlude",
          "desc": "Another sunny day in Siesta."
        }
      ]
    },
    "setId_ssLine_act35side": {
      "name": "Adventure That Cannot Wait for the Sun",
      "year": 6,
      "kv": "kv_adventure_that_cannot_waits_for_the_sun",
      "title": "title_adventure_that_cannot_waits_for_the_sun",
      "bgid": "storybg_adventure_that_cannot_waits_for_the_sun",
      "main": false,
      "group": "act35side",
      "desc": "In Sargon, Menat-Ha'mait's Flood Festival approaches,\nand the museum antiques have come to life?!\nTo become a real historian,\nPadishah's daughter, Pepe, decides to gather gemstones and unlock the secrets of the Shah's treasury!\nThe river always flows, and the sun rises and sets eternal.\nThose willing to slumber find their own feelings once more, and choose a farewell to eternity.\nAnd those who shake off the sun will never stop in their tracks again.",
      "tags": [
        "Special Tools",
        "Special Terrain"
      ],
      "rewardOp": "Papyrus",
      "episodes": [
        {
          "code": "AS-ST-1",
          "name": "City of Radiance",
          "tag": "Interlude",
          "desc": "It's another fine day in the glorious Menat-Ha'mait."
        },
        {
          "code": "AS-1",
          "name": "Warm-Up",
          "tag": "Before Operation",
          "desc": "A big incident has occurred at the museum on the eve of the festival. Just another Tuesday for the citizens of the city, who are used to such things."
        },
        {
          "code": "AS-2",
          "name": "Special Museum Operation",
          "tag": "Before Operation",
          "desc": "People come and go, some in the same direction, some in the opposite.\n Connects surrounding Crystal areas."
        },
        {
          "code": "AS-3",
          "name": "Take Me Out to the Grand Bazaar",
          "tag": "Before Operation",
          "desc": "Our new friends have made some strange requests.\n Connects surrounding Crystal areas."
        },
        {
          "code": "AS-4",
          "name": "Family Golden Slipper",
          "tag": "Before Operation",
          "desc": "Show things off just right, and get exactly what you need."
        },
        {
          "code": "AS-5",
          "name": "A Job for a Museum Collection",
          "tag": "Before Operation",
          "desc": "Even the museum's collection has to go to work. Do they get days off too?\n Removes all Crystal in a line."
        },
        {
          "code": "AS-ST-2",
          "name": "Stirring City",
          "tag": "Interlude",
          "desc": "City life was supposed to be lively, but it wasn't supposed to come to life."
        },
        {
          "code": "AS-6",
          "name": "Whispers of the Past",
          "tag": "Before Operation",
          "desc": "Some are willing to live with fleeting regret forever.\n Removes all Crystal in a line."
        },
        {
          "code": "AS-7",
          "name": "Who You Callin' Pet?",
          "tag": "After Operation",
          "desc": "Do you think you're a pet?"
        },
        {
          "code": "AS-8",
          "name": "Ends of the Sands",
          "tag": "Before Operation",
          "desc": "Bloodline and spirit do not erode, even after millennia. The heir must face them."
        },
        {
          "code": "AS-9",
          "name": "Farewell to the Past",
          "tag": "Before Operation",
          "desc": "The goal they had dreamed of lies before them, but they chose to cross over it.\n Connects surrounding Crystal areas.\n Removes all Crystal in a line."
        },
        {
          "code": "AS-ST-3",
          "name": "Crossroads, New Journey",
          "tag": "Interlude",
          "desc": "Each go their separate paths in a city that is no less radiant after the turmoil."
        }
      ]
    },
    "setId_ssLine_act44side": {
      "name": "Ato",
      "year": 7,
      "kv": "kv_ato",
      "title": "title_ato",
      "bgid": "storybg_ato",
      "main": false,
      "group": "act44side",
      "desc": "Hoshiguma has only just returned to Mitsukue in Higashi and she is already being chased by the police. In order to avoid them, she barges into Momoka Hanyuu's performance, but thanks to a series of mishaps, she finds herself having become a 'vicious Oni' or 'ghost' right out of a kaidan tale.\nDetective Koretou of the Mitsukue police targets Hoshiguma as his prime suspect in a twenty-year-old murder case, but the statute of limitations has already expired. Hoshiguma's return to Mitsukue has nothing to do with the case—it's because of a letter from Tessai, the head of the Kinsekikai yakuza clan, a man like a second father to her. The police are left scratching their heads, while Kouhei Mifune, another Kinsekikai yakuza, shows up at the police station and pulls Hoshiguma out.\nRight before Hoshiguma's eyes, Mifune takes a life as if it's nothing. He even forges a letter in Tessai's name. Meanwhile, Momoka is forced to investigate a 'haunted house' kaidan in Kajimachi as part of a new TV show, unaware that it is the very place Hoshiguma once called home.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "AT-ST-1",
          "name": "The Oni's Shadow",
          "tag": "Interlude",
          "desc": "'You're not Madame Oni anymore... you're just an Oni, a Vicious Oni.'"
        },
        {
          "code": "AT-1",
          "name": "The Yakuza Way",
          "tag": "Before Operation",
          "desc": "The cleanup is done. Load the remains into the trunk, get in the driver's seat, and leave. Nothing in the rearview mirror. You are not being followed. Why, then, do you hear the sound of breathing from behind you?"
        },
        {
          "code": "AT-2",
          "name": "Tales of the Supernatural",
          "tag": "Before Operation",
          "desc": "It is an ordinary evening. The video editor is doing overtime as usual. He spots a black shadow in the footage. As he plays it frame by frame, the black shadow slowly approaches with a smile on its face."
        },
        {
          "code": "AT-3",
          "name": "Notice: Nighttime Runaway",
          "tag": "Before Operation",
          "desc": "Rubble starts to move itself in a noisy street, revealing a black hole on the sidewalk, waiting for the fugitive to leap in."
        },
        {
          "code": "AT-4",
          "name": "Hyakumonogatari",
          "tag": "Before Operation",
          "desc": "Every page of the old diary records the name of a participant. When the last story is told, the last page is turned, and the last candle is blown out—"
        },
        {
          "code": "AT-5",
          "name": "Legacy of Ruin",
          "tag": "Before Operation",
          "desc": "The seed has been planted. All that follows is in the name of a greater, more beautiful sacrifice."
        },
        {
          "code": "AT-ST-2",
          "name": "Symmetry",
          "tag": "Interlude",
          "desc": "The audience bleeds on stage. The actor weeps in the audience box."
        },
        {
          "code": "AT-6",
          "name": "Maelstrom",
          "tag": "Before Operation",
          "desc": "Dragged in, swallowed, no way out, no escape, nowhere to run... why run?"
        },
        {
          "code": "AT-7",
          "name": "Cold Moonlight",
          "tag": "Before Operation",
          "desc": "Perhaps it is best to be cold and heartless through and through. Perhaps that 'home' should never have existed in the first place."
        },
        {
          "code": "AT-8",
          "name": "Flowing River",
          "tag": "Before Operation",
          "desc": "The water will wash everything away, but the ways things were before will live on in memory."
        },
        {
          "code": "AT-ST-3",
          "name": "Wayfarer",
          "tag": "Interlude",
          "desc": "She is a wayfarer at home. She has found her home as a wayfarer."
        }
      ]
    },
    "setId_ssLine_act53side": {
      "name": "Till the Lands Become an Orange",
      "year": 8,
      "kv": "kv_till_the_lands_become_an_orange",
      "title": "title_till_the_lands_become_an_orange",
      "bgid": "storybg_till_the_lands_become_an_orange",
      "main": false,
      "group": "act53side",
      "desc": "",
      "tags": [],
      "rewardOp": null,
      "episodes": []
    },
    "setId_ssLine_act4d0": {
      "name": "Operational Intelligence",
      "year": 1,
      "kv": "kv_operational_intelligence",
      "title": "title_operational_intelligence",
      "bgid": "storybg_operational_intelligence",
      "main": false,
      "group": "act4d0",
      "desc": "A Rhodes Island operator is rescued by Scout. When he comes to, he happens to Hellagur speaking with Patriot.\nCarrying the words Scout left him, the guard also makes up his mind.\nW leads a team to intercept a group of defecting mercenaries. Flamebringer breaks through the conflict and leaves Reunion behind him.\nAt Rhodes Island, Flamebringer will meet another old friend...\nJessica completes her training under the guidance of Liskarm and Franka.\nHer skills have always been excellent, but what she lacks is confidence.",
      "tags": [],
      "rewardOp": "Flamebringer",
      "episodes": [
        {
          "code": "ST-1",
          "name": "The Anonymous Ones' War",
          "tag": "Interlude",
          "desc": "A Rhodes Island operator is rescued by Scout. When he comes to, he happens to Hellagur speaking with Patriot.\nCarrying the words Scout left him, the guard also makes up his mind."
        },
        {
          "code": "ST-2",
          "name": "Destroyer",
          "tag": "Interlude",
          "desc": "W leads a team to intercept a group of defecting mercenaries. Flamebringer breaks through the conflict and leaves Reunion behind him.\nAt Rhodes Island, Flamebringer will meet another old friend..."
        },
        {
          "code": "ST-3",
          "name": "Sniper Training",
          "tag": "Interlude",
          "desc": "Jessica completes her training under the guidance of Liskarm and Franka.\nHer skills have always been excellent, but what she lacks is confidence."
        },
        {
          "code": "ST-4",
          "name": "Survival Notorization",
          "tag": "Interlude",
          "desc": "The Laterano Notarial Hall deploys Executor, an undertaker, to carry out a commission in Siracusa.\nExecutor finds an uncooperative Vermeil there, and in accordance with the terms of the commission, takes her with him to Rhodes Island for treatment."
        },
        {
          "code": "ST-5",
          "name": "After-class Homework",
          "tag": "Interlude",
          "desc": "Ifrit and Projekt Red have another dispute over homework, resulting in Ifrit losing control of her emotions - and nearly her powers as well.\nBut with the help of those around her, she finally manages to regain control over herself."
        },
        {
          "code": "ST-6",
          "name": "Polaris",
          "tag": "Interlude",
          "desc": "An observatory in the North Pole is having some equipment abnormalities. To secure the way for future explorers, Magallan undertakes a risky maintenance mission.\nHowever, Santalla, the operator who came to pick her up, is blocking her way."
        },
        {
          "code": "ST-7",
          "name": "Among the Light and the Dust",
          "tag": "Interlude",
          "desc": "A corridor in Rhodes Island experiences a power outage, and Closure invites Kal'tsit to check the circuitry with her.\nUnder Closure's guidance, even Kal'tsit would confide some of her inner thoughts."
        }
      ]
    },
    "setId_ssLine_act7d5": {
      "name": "Stories of Afternoon",
      "year": 1,
      "kv": "kv_stories_of_afternoon",
      "title": "title_stories_of_afternoon",
      "bgid": "storybg_stories_of_afternoon",
      "main": false,
      "group": "act7d5",
      "desc": "Vanilla drags Melantha and Steward with her to take care of her pet, and along the way, they see Blaze with a young Infected girl.\nBetween them, the Operators decide that after their mission, they would visit to the child who is now receiving treatment and throw a party.\nPtilopsis is writing in her diary. She always uses the diary as a way to record things she doesn't want to forget.\nExcept now, she would prefer to directly chat with those who she cares about.\nMatterhorn obeys SilverAsh's instructions, staying home alone to prepare Cliffheart's lunch.\nMatterhorn also prepares a portion for Ethan, who often comes by to scavenge, but does not expect Ethan to come bearing a surprise for him as well.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Let's Throw A Party!",
          "tag": "Interlude",
          "desc": "Vanilla drags Melantha and Steward with her to take care of her pet, and along the way, they see Blaze with a young Infected girl.\nBetween them, the Operators decide that after their mission, they would visit to the child who is now receiving treatment and throw a party."
        },
        {
          "code": "ST-2",
          "name": "Diary",
          "tag": "Interlude",
          "desc": "Ptilopsis is writing in her diary. She always uses the diary as a way to record things she doesn't want to forget.\nExcept now, she would prefer to directly chat with those who she cares about."
        },
        {
          "code": "ST-3",
          "name": "Today's Kitchen",
          "tag": "Interlude",
          "desc": "Matterhorn obeys SilverAsh's instructions, staying home alone to prepare Cliffheart's lunch.\nMatterhorn also prepares a portion for Ethan, who often comes by to scavenge, but does not expect Ethan to come bearing a surprise for him as well."
        },
        {
          "code": "ST-4",
          "name": "The Wanderer's Home",
          "tag": "Interlude",
          "desc": "Hibiscus and Lava return home with a wanderer and temporarily entrust her with Vulcan. Vulcan decides to name her Ceobe.\nNow, it is up to Ceobe to judge for herself whether she wishes to join Rhodes Island."
        },
        {
          "code": "ST-5",
          "name": "Asking For Trouble",
          "tag": "Interlude",
          "desc": "Orchid struggles with her decision to transfer to the Logistics Department. Midnight shares a story about his past.\nNo matter your past, what matters it the present, and the life you now want."
        },
        {
          "code": "ST-6",
          "name": "Moving Forward",
          "tag": "Interlude",
          "desc": "Fang goes to Dobermann's room with Beagle and Kroos and accidentally discovers some faded tags.\nDobermann rarely talks about the past, but she seems interested today."
        }
      ]
    },
    "setId_ssLine_act13d0": {
      "name": "Rewinding Breeze",
      "year": 2,
      "kv": "kv_rewinding_breeze",
      "title": "title_rewinding_breeze",
      "bgid": "storybg_rewinding_breeze",
      "main": false,
      "group": "act13d0",
      "desc": "Surtr and Meteorite arrive at the site of their mission, a remote mining community called Bellony Village.\nIn addition to their mission for Rhodes Island, Surtr is also searching for leads on her past.\nArene needs a certificate from the workshop, but the only one there is the apprentice Adnachiel. Not wanting to waste the trip, Arene asks his fellow Sankta to inspect his weapon, and the two get into a discussion about their race.\nElysium discusses a traditional Yan festival with Purestream, and the two bump into Absinthe seeking weapon maintenance advice from Thorns. During the conversation, Elysium recalls his homeland.",
      "tags": [],
      "rewardOp": "Mint",
      "episodes": [
        {
          "code": "ST-1",
          "name": "Homecoming",
          "tag": "Interlude",
          "desc": "Surtr and Meteorite arrive at the site of their mission, a remote mining community called Bellony Village.\nIn addition to their mission for Rhodes Island, Surtr is also searching for leads on her past."
        },
        {
          "code": "ST-2",
          "name": "Expatriates",
          "tag": "Interlude",
          "desc": "Arene needs a certificate from the workshop, but the only one there is the apprentice Adnachiel. Not wanting to waste the trip, Arene asks his fellow Sankta to inspect his weapon, and the two get into a discussion about their race."
        },
        {
          "code": "ST-3",
          "name": "Astray",
          "tag": "Interlude",
          "desc": "Elysium discusses a traditional Yan festival with Purestream, and the two bump into Absinthe seeking weapon maintenance advice from Thorns. During the conversation, Elysium recalls his homeland."
        },
        {
          "code": "ST-4",
          "name": "Recollection",
          "tag": "Interlude",
          "desc": "Mudrock brings the team to Kazdel only to find the whole team under attack by mysterious casters. To press onward, or look back into the abyss? They must make a choice."
        },
        {
          "code": "ST-5",
          "name": "A Song Called April",
          "tag": "Interlude",
          "desc": "April bumps into a Messenger talking with Ansel on her way back from a mission. She curiously strikes up a conversation with Ansel. The discussion leads her to some realizations she had never thought about before."
        },
        {
          "code": "ST-6",
          "name": "Crisscrossing Shadows",
          "tag": "Interlude",
          "desc": "With Miss.Christine's guidance, a Human Resources Operator locates Phantom and asks him some questions about his file. While Phantom's answers aren't exactly lies, they do raise more questions."
        },
        {
          "code": "ST-7",
          "name": "Stories from the Sky",
          "tag": "Interlude",
          "desc": "Stories breed stories, which bring out even more stories. In the shadow of a festival banquet, young operators share tales passed down from ancient times."
        }
      ]
    },
    "setId_ssLine_act15d5": {
      "name": "Beyond Here",
      "year": 2,
      "kv": "kv_beyond_here",
      "title": "title_beyond_here",
      "bgid": "storybg_beyond_here",
      "main": false,
      "group": "act15d5",
      "desc": "Hoshiguma hops onto her beloved motorcycle for the first time in a while, spending one of her precious vacation days enjoying the wind, until she comes to a surprising encounter at the end of the road.\nIn the wilderness of the Siracusan midwest, three young men, freshly escaped from the city and driving a stolen car, embark on a new journey.\nFulfilling a twenty-year-old promise, Iris sets out to find a particular individual. Along the way, she comes across a tiny, little Oripathy patient.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "No Sequel",
          "tag": "Interlude",
          "desc": "Hoshiguma hops onto her beloved motorcycle for the first time in a while, spending one of her precious vacation days enjoying the wind, until she comes to a surprising encounter at the end of the road."
        },
        {
          "code": "ST-2",
          "name": "Boundless Wilds",
          "tag": "Interlude",
          "desc": "In the wilderness of the Siracusan midwest, three young men, freshly escaped from the city and driving a stolen car, embark on a new journey."
        },
        {
          "code": "ST-3",
          "name": "Fairytale Everlasting",
          "tag": "Interlude",
          "desc": "Fulfilling a twenty-year-old promise, Iris sets out to find a particular individual. Along the way, she comes across a tiny, little Oripathy patient."
        },
        {
          "code": "ST-4",
          "name": "A Streetcar Named Faith",
          "tag": "Interlude",
          "desc": "Hildegard, having traveled to Lungmen looking for a solution to her monastery's financial woes, finds success. But in her spare time, finds herself musing on her connection to the world."
        },
        {
          "code": "ST-5",
          "name": "Blind Journey",
          "tag": "Interlude",
          "desc": "Operator Greyy sets out on his first field operation, alongside two of his colleagues, only to find he needs some time to adjust to the unfamiliar world outside the landship."
        },
        {
          "code": "ST-6",
          "name": "Sword and Scale",
          "tag": "Interlude",
          "desc": "After leaving Lungmen, Ch'en finds herself thinking about how she should conduct herself. And after witnessing the travails of a 'criminal' in Columbia, she becomes that much more determined and sure of herself."
        },
        {
          "code": "ST-7",
          "name": "For a Better Self",
          "tag": "Interlude",
          "desc": "Utage, Myrrh, and Beanstalk chat about the strange rumors and stories surrounding Iberia while out on their operation. But the real Iberia may be quite different from the urban legends."
        }
      ]
    },
    "setId_ssLine_act5d0": {
      "name": "Code of Brawl",
      "year": 1,
      "kv": "kv_code_of_brawl",
      "title": "title_code_of_brawl",
      "bgid": "storybg_code_of_brawl",
      "main": false,
      "group": "act5d0",
      "desc": "Bison of MountainDash Logistics was ambushed and is hanging on for dear life?\nHis saviors are not his father's men, but Penguin Logistics?\nIt's Sauin, yet the darker undercurrents of Lungmen are out in force?\nWho is the actual underground mastermind of Lungmen?\nMountainDash Logistics? Penguin Logistics? The Siracusan Mafia? Or someone else?\nIn the dark of the night, an unmissable feast is about to begin!",
      "tags": [
        "Beginner",
        "Special Devices"
      ],
      "rewardOp": "Bison",
      "episodes": [
        {
          "code": "ENTRY",
          "name": "Prologue",
          "tag": "Interlude",
          "desc": "Over a game of cards at a bar, two aggressive Sicilians, Capone and Gambino, provoke the ire of Lungmen's most notorious hotel owner."
        },
        {
          "code": "CB-1",
          "name": "6:44P.M.",
          "tag": "Before Operation",
          "desc": "One 'hot' opening captures people's interest. Two will get them screaming."
        },
        {
          "code": "CB-2",
          "name": "7:15P.M.",
          "tag": "Before Operation",
          "desc": "New to the road? Keep a safe distance. \n Life Points will be deducted by 1 when destroyed."
        },
        {
          "code": "CB-3",
          "name": "7:22P.M.",
          "tag": "Before Operation",
          "desc": "Candy, hide-and-seek, and bungee jumping - these are some of kids' favorite things. \n Life Points will be deducted by 1 when destroyed.\nSome Operators cannot be deployed."
        },
        {
          "code": "CB-4",
          "name": "7:59P.M.",
          "tag": "Before Operation",
          "desc": "Humanity has always struggled to reach the stars, but if you weather the tribulations of flames and explosions, there will always be a way."
        },
        {
          "code": "CB-5",
          "name": "8:31P.M.",
          "tag": "Before Operation",
          "desc": "Diplomacy through violence - this has always been ironclad law used to communicate among those who have come to believe it."
        },
        {
          "code": "CB-ST1",
          "name": "Evening Breeze's Kiss",
          "tag": "Interlude",
          "desc": "There are always people who think, 'Ah, everything is going according to plan.' Coincidentally, everyone seems to think that tonight."
        },
        {
          "code": "CB-6",
          "name": "10:26P.M.",
          "tag": "Before Operation",
          "desc": "Things that are truly excellent will always shine forth, even if stripped of the other trappings normally around it - for example, the discerning gentleman's armament of choice - an empty wine bottle. \nGrants additional skill points to a character or to the Command Terminal."
        },
        {
          "code": "CB-7",
          "name": "11:08P.M.",
          "tag": "Before Operation",
          "desc": "Brothers turn against one another, old friends reunite, nobody can tell friend from foe, and everyone's happy that way. \n Life Points will be deducted by 1 when destroyed."
        },
        {
          "code": "CB-8",
          "name": "11:41P.M.",
          "tag": "Before Operation",
          "desc": "Some people's bad habits stink up the entire office. Others stink up the entire city. \nGrants additional skill points to a character or to the Command Terminal."
        },
        {
          "code": "CB-ST2",
          "name": "Midnight Lungmen",
          "tag": "Interlude",
          "desc": "Rumor has it that at midnight, you can encounter ghosts on the streets of Lungmen who will usher you to a glorious, bygone era. However, you have to take some time to discern whether these 'ghosts' are actually living or dead."
        },
        {
          "code": "CB-9",
          "name": "0:01A.M.",
          "tag": "Before Operation",
          "desc": "The great thing about outdoor parties is that there's plenty of room to crack some skulls. The bad thing is, you'll probably end up disturbing the peace. Most of the time, the pros and cons cancel reinforce each other. \n Life Points will be deducted by 1 when destroyed.\n Grants additional Skill Points to a character or to the Command Terminal."
        },
        {
          "code": "CB-10",
          "name": "1:11A.M.",
          "tag": "Before Operation",
          "desc": "When a farce is mixed with alcohol and brought to a boil, perhaps the only ones who will remember what happened are those who watched from the outside."
        },
        {
          "code": "CB-ST3",
          "name": "Crack of Dawn",
          "tag": "Interlude",
          "desc": "Those lurking behind the curtains always have much to gossip about, perhaps to make the next show a bit more exciting, or perhaps just to cross each others' palms."
        },
        {
          "code": "CB-EX1",
          "name": "Gang Fight Tactics",
          "tag": "After Operation",
          "desc": "It's best not to piss off too many people at the same time. If you end up in an all-out brawl, it's better to keep things as a series of one-on-ones."
        },
        {
          "code": "CB-EX2",
          "name": "Unintended Consequences",
          "tag": "After Operation",
          "desc": "Go right? Go left! \nDeploy to block the enemy's route."
        },
        {
          "code": "CB-EX3",
          "name": "Cabin in the Woods",
          "tag": "After Operation",
          "desc": "Every so often, one encounters a piece of postmodern architectural art while wandering through the slums or some other random place, perhaps a symbol of rapture in the concrete jungle.\nGrants additional skill points to a character or to the Command Terminal."
        }
      ]
    },
    "setId_ssLine_act7mini": {
      "name": "Preluding Lights",
      "year": 2,
      "kv": "kv_preludinglights",
      "title": "title_preludinglights",
      "bgid": "storybg_preludinglights",
      "main": false,
      "group": "act7mini",
      "desc": "Two Chernobog survivors leave Ursus for the wastelands, seeking out the legendary 'Rusthammers.' However, in the wastelands, things are rarely that simple.\nHeavyrain, in a rush, collapses on the border of Minos. Upon awakening, she meets a Minoan priestess, 'Pallas'.\nBena finds Annie watching Kirara play games, and out of curiosity, Bena joins in too. Upon learning that the game is based on ghost stories, Bena tells a Victorian 'ghost story' of her own to give Kirara a scare.",
      "tags": [],
      "rewardOp": "Bena",
      "episodes": [
        {
          "code": "ST-1",
          "name": "Crushed Earth",
          "tag": "Interlude",
          "desc": "Two Chernobog survivors leave Ursus for the wastelands, seeking out the legendary 'Rusthammers.' However, in the wastelands, things are rarely that simple."
        },
        {
          "code": "ST-2",
          "name": "Flickering Sparks",
          "tag": "Interlude",
          "desc": "Heavyrain, in a rush, collapses on the border of Minos. Upon awakening, she meets a Minoan priestess, 'Pallas'."
        },
        {
          "code": "ST-3",
          "name": "Urban Legends",
          "tag": "Interlude",
          "desc": "Bena finds Annie watching Kirara play games, and out of curiosity, Bena joins in too. Upon learning that the game is based on ghost stories, Bena tells a Victorian 'ghost story' of her own to give Kirara a scare."
        },
        {
          "code": "ST-4",
          "name": "Forgotten Lighthouse",
          "tag": "Interlude",
          "desc": "Blue Poison and Glaucus investigate an abandoned building to the north of Iberia and meet Indigo, who found her way to the building while she was lost. She tells them what this building once was—a lighthouse."
        },
        {
          "code": "ST-5",
          "name": "Different",
          "tag": "Interlude",
          "desc": "By chance, Carnelian witnesses an Infected girl being hunted as she leaves a noble's manor. When she learns of the runaway's predicament, she decides to give the girl a helping hand."
        },
        {
          "code": "ST-6",
          "name": "Letter",
          "tag": "Interlude",
          "desc": "Worried about Pramanix's situation and the siblings' relationships, Cliffheart convinces Courier to deliver a letter to Mount Karlan in her stead. Later, Courier returns from Kjerag with an unexpected invitation."
        }
      ]
    },
    "setId_ssLine_act10mini": {
      "name": "A Light Spark in Darkness",
      "year": 3,
      "kv": "kv_a_light_spark_in_darkness",
      "title": "title_a_light_spark_in_darkness",
      "bgid": "storybg_a_light_spark_in_darkness",
      "main": false,
      "group": "act10mini",
      "desc": "Susie, an Infected, works at the shop 'Green Spark' in the Victorian town of Caladon. Just as her dreams are about to come true, an accident extinguishes all her hope.\nThe vigilante Haze overhears some information not meant for her, and inadvertently gets a store burned down during her escape. She talks Susie out of suicide, but then passes out as her Oripathy flares up.\nSkyfire attends an event in place of a councilor, but gets caught in a kidnapping. Realizing there's a plot driving the enemy, she casts to put a stop to it.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Maybe",
          "tag": "Interlude",
          "desc": "Susie, an Infected, works at the shop 'Green Spark' in the Victorian town of Caladon. Just as her dreams are about to come true, an accident extinguishes all her hope."
        },
        {
          "code": "ST-2",
          "name": "Anywhere I Wander",
          "tag": "Interlude",
          "desc": "The vigilante Haze overhears some information not meant for her, and inadvertently gets a store burned down during her escape. She talks Susie out of suicide, but then passes out as her Oripathy flares up."
        },
        {
          "code": "ST-3",
          "name": "We will all Go Together",
          "tag": "Interlude",
          "desc": "Skyfire attends an event in place of a councilor, but gets caught in a kidnapping. Realizing there's a plot driving the enemy, she casts to put a stop to it."
        },
        {
          "code": "ST-4",
          "name": "Lone Ranger",
          "tag": "Interlude",
          "desc": "Despite her colleagues' opposition, Mounted Officer Grani investigates the arson at the pub. As the suspects flee, they inadvertently set off an explosion."
        },
        {
          "code": "ST-5",
          "name": "Something's Gotta Give",
          "tag": "Interlude",
          "desc": "Quercus returns to Caladon. Susie tips off the Guards, but finds herself kidnapped before escaping during an accidental explosion. Councilor Bishmer's conspiracy at last comes to light."
        },
        {
          "code": "ST-6",
          "name": "Ring-a-Ding-Ding!",
          "tag": "Interlude",
          "desc": "Reunion hires a trader to acquire a set of control systems. The two sides almost come to blows on finding the trader ambushing a Columbian convoy to obtain the goods, but the conflict is averted when two old friends meet again."
        }
      ]
    },
    "setId_ssLine_act11mini": {
      "name": "To Be Continued",
      "year": 4,
      "kv": "kv_to_be_continued",
      "title": "title_to_be_continued",
      "bgid": "storybg_to_be_continued",
      "main": false,
      "group": "act11mini",
      "desc": "Following the Snowcap Incident, Sciurus and Yucatan go to Victoria to represent the Browntails, and attempt to make a deal with a local magnate to rejuvenate their clan.\nThe day before leaving Shu for the capital, Liang Xun finally has a chance at a date with Ning Ciqiu for tea and a play in the mountains. Meanwhile, Du Yaoye, Zuo Le and others are about to set off on their own respective journeys.\nLungmen has welcomed a great number of outsiders. A wolf pack, a pack leader, a lone wolf... Slowly and quietly, they all find themselves shaped by the concrete jungle... until it is time for them to heed the call of the wild.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Browntail",
          "tag": "Interlude",
          "desc": "Following the Snowcap Incident, Sciurus and Yucatan go to Victoria to represent the Browntails, and attempt to make a deal with a local magnate to rejuvenate their clan."
        },
        {
          "code": "ST-2",
          "name": "Until Next Time",
          "tag": "Interlude",
          "desc": "The day before leaving Shu for the capital, Liang Xun finally has a chance at a date with Ning Ciqiu for tea and a play in the mountains. Meanwhile, Du Yaoye, Zuo Le and others are about to set off on their own respective journeys."
        },
        {
          "code": "ST-3",
          "name": "Wolf and Wolfpack",
          "tag": "Interlude",
          "desc": "Lungmen has welcomed a great number of outsiders. A wolf pack, a pack leader, a lone wolf... Slowly and quietly, they all find themselves shaped by the concrete jungle... until it is time for them to heed the call of the wild."
        },
        {
          "code": "ST-4",
          "name": "Farewell Roy",
          "tag": "Interlude",
          "desc": "As planned, 'Roy the Lazurite' is about to get a face transplant and say goodbye to his old self. In the final moments of his old identity, Roy meets two young men also struggling to survive in Kazimierz's biggest city."
        },
        {
          "code": "ST-5",
          "name": "Harmony in Difference",
          "tag": "Interlude",
          "desc": "Guests arrive at Siesta on the eve of its imminent relocation, and Mayor Herman personally goes to greet them. A short meeting ensues between the two, both as leaders, and as fathers."
        },
        {
          "code": "ST-6",
          "name": "True Story",
          "tag": "Interlude",
          "desc": "Jesselton was arrested after his cover as a prison guard was blown, and he became a typical inmate at the Mansfield State Prison. Despite the ridicule and harsh treatment he receives, he nonetheless finds his hope reignited by a letter."
        }
      ]
    },
    "setId_ssLine_act16mini": {
      "name": "To the Grinning Valley",
      "year": 5,
      "kv": "kv_to_the_grinning_valley",
      "title": "title_to_the_grinning_valley",
      "bgid": "storybg_to_the_grinning_valley",
      "main": false,
      "group": "act16mini",
      "desc": "The transport truck will soon make its last trip. Warmy works with Alanna to prepare their truck to be returned. However, still attached to the truck, she is hoping to delay its return. Almost as if in answer to her prayers, a strange passenger hijacks the truck and demands to be taken to the Grinning Valley.\nAlanna contends with the truckjacker and cajoles her into bringing the truck to a checkpoint to call for help, but security officers want to board the truck to check for Infected. She pleads in vain in to protect Warmy, and ends up charging through the checkpoint gates with the truckjacker's help.\nThe ragtag band of accomplices stops at a nomadic platform for supplies en route to the Grinning Valley. The skittish and terrified Jerry is worried that a certain someone might catch up to him after he skipped out on his engagement, and is equally scared that the security officers from the checkpoint are out to get him. During the wild chase, he happens to find himself hiding with a woman, and the two develop feelings for each other.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Boiling Point",
          "tag": "Interlude",
          "desc": "The transport truck will soon make its last trip. Warmy works with Alanna to prepare their truck to be returned. However, still attached to the truck, she is hoping to delay its return. Almost as if in answer to her prayers, a strange passenger hijacks the truck and demands to be taken to the Grinning Valley."
        },
        {
          "code": "ST-2",
          "name": "One-way Tracks",
          "tag": "Interlude",
          "desc": "Alanna contends with the truckjacker and cajoles her into bringing the truck to a checkpoint to call for help, but security officers want to board the truck to check for Infected. She pleads in vain in to protect Warmy, and ends up charging through the checkpoint gates with the truckjacker's help."
        },
        {
          "code": "ST-3",
          "name": "Running Bottletree",
          "tag": "Interlude",
          "desc": "The ragtag band of accomplices stops at a nomadic platform for supplies en route to the Grinning Valley. The skittish and terrified Jerry is worried that a certain someone might catch up to him after he skipped out on his engagement, and is equally scared that the security officers from the checkpoint are out to get him. During the wild chase, he happens to find himself hiding with a woman, and the two develop feelings for each other."
        },
        {
          "code": "ST-4",
          "name": "Hammer Down",
          "tag": "Interlude",
          "desc": "Warmy's Originium Arts suddenly go out of control in the middle of nowhere. Fortunately, they happen to run into Amiya, the Doctor, and Savage after their trip down memory lane. When the incident subsides, the Rhodes Island group decides to tag along on the journey to the Grinning Valley in search of a 'Feranmut.' Ray, afraid of Warmy losing control again, finally opens her heart."
        },
        {
          "code": "ST-5",
          "name": "Grinning Mineshaft",
          "tag": "Interlude",
          "desc": "As a pitsinker, Ray works year-round in extremely oppressive environments. When her working sandbeast passes away, she sets off in a daze, seeking out the Feranmut. Once she breaks free of her dark memories, she spots a habitat with a population of lively wild sandbeasts, who bring her to a deep, secluded cave."
        },
        {
          "code": "ST-6",
          "name": "Stepped-on Shadow",
          "tag": "Interlude",
          "desc": "The road to the Grinning Valley is blocked by Originium formations, and the gang has no choice but to return empty-handed. Ray voluntarily joins Rhodes Island and tells the story of her encounter with the Feranmut when she was a child. However, Amiya glimpses the memory of somebody else from that story."
        }
      ]
    },
    "setId_ssLine_act17mini": {
      "name": "A Kazdelian Rescue",
      "year": 6,
      "kv": "kv_a_kazdelian_rescue",
      "title": "title_a_kazdelian_rescue",
      "bgid": "storybg_a_kazdelian_rescue",
      "main": false,
      "group": "act17mini",
      "desc": "Within the Soul Furnace of Kazdel, a ceremony meant to placate the revenants instead incites their anger. The airship fires its cannons at the Furnace, and fireworks light up the night sky. Nymph, doing her best to look after a furnace node, picks up a talking firework fragment, and in doing so takes on a special task.\nNymph visits 'the Consultant' Pohl's district in search of the revenant pieces. The gangs are fighting over a meteor and are on the verge of pulling blades. With Pohl's help, Nymph recovers the revenant fragment inside the meteor, and Pohl takes the opportunity to resolve a crisis.\nA monster has been attacking passersby near some abandoned shacks. Nymph and Pohl investigate the hauntings and discover that it is a colossus made by Mudrock. Mudrock removes the Arts binding the colossus, and Nymph retrieves the revenant fragment that caused it to go berserk.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "Falling Like Fireworks",
          "tag": "Interlude",
          "desc": "Within the Soul Furnace of Kazdel, a ceremony meant to placate the revenants instead incites their anger. The airship fires its cannons at the Furnace, and fireworks light up the night sky. Nymph, doing her best to look after a furnace node, picks up a talking firework fragment, and in doing so takes on a special task."
        },
        {
          "code": "ST-2",
          "name": "The Streets on the Way Back",
          "tag": "Interlude",
          "desc": "Nymph visits 'the Consultant' Pohl's district in search of the revenant pieces. The gangs are fighting over a meteor and are on the verge of pulling blades. With Pohl's help, Nymph recovers the revenant fragment inside the meteor, and Pohl takes the opportunity to resolve a crisis."
        },
        {
          "code": "ST-3",
          "name": "The Linen-Draped Monster",
          "tag": "Interlude",
          "desc": "A monster has been attacking passersby near some abandoned shacks. Nymph and Pohl investigate the hauntings and discover that it is a colossus made by Mudrock. Mudrock removes the Arts binding the colossus, and Nymph retrieves the revenant fragment that caused it to go berserk."
        },
        {
          "code": "ST-4",
          "name": "Unfinished Attitude",
          "tag": "Interlude",
          "desc": "In a Sarkaz marketplace, the unconventional Crownie catches Nymph's eye. She has fashioned a revenant fragment into a gemstone brooch to go with her suit. Nymph follows her out of the city, and runs into Mostima on a delivery. After improving the design of another suit, Crownie finds she no longer needs the brooch, and gives it to Nymph."
        },
        {
          "code": "ST-5",
          "name": "The Witch and Her Afternoon Tea",
          "tag": "Interlude",
          "desc": "Nymph and Pohl split up to investigate the last residential district. Along the way, Nymph visits Qalaiša, the Northwind Witch, who has recently moved in. While Qalaiša is away, Nymph becomes trapped in a strange dream of the witch's past. In her efforts to retrieve the revenant fragment, she accidentally destroys Qalaiša's hut."
        },
        {
          "code": "ST-6",
          "name": "What's in the Can?",
          "tag": "Interlude",
          "desc": "Having returned to Kazdel, the Tin Man finds himself mistaken by Nymph and Pohl for being in possession of a revenant fragment. With Ermengarde's help, the gang enters the deepest depths of the Soul Furnace and returns all the fragments, then attempts a different kind of ceremony of appeasement. However, the Tin Man and the other revenants have other plans."
        }
      ]
    },
    "setId_ssLine_act28side": {
      "name": "Come Catastrophes or Wakes of Vultures",
      "year": 5,
      "kv": "kv_come_catastrophes_or_wakes_of_vultures",
      "title": "title_come_catastrophes_or_wakes_of_vultures",
      "bgid": "storybg_come_catastrophes_or_wakes_of_vultures",
      "main": false,
      "group": "act28side",
      "desc": "The residual heat from the energy tower once warmed Davistown.\nYet, the future they once hoped for has drifted away like white smoke from a chimney.\nIntractable problems, things that can no longer be protected...\nThe bitterly cold winds blow, promising a long and relentless winter.\nJessica stands in the snow, gun aimed skyward—\nFor an elusive promise, for a helpless sigh.\nFor the ruins of dreams and homes.",
      "tags": [
        "Special Devices"
      ],
      "rewardOp": "Coldshot",
      "episodes": [
        {
          "code": "CV-ST-1",
          "name": "In the Line of Fire",
          "tag": "Interlude",
          "desc": "Everyone feels down on their luck, no matter where they come from."
        },
        {
          "code": "CV-1",
          "name": "In a Lonely Place",
          "tag": "Before Operation",
          "desc": "Preserving one's dignity is rarely an easy feat."
        },
        {
          "code": "CV-2",
          "name": "Double Indemnity",
          "tag": "Before Operation",
          "desc": "Repairing something old means willfully choosing to bear the burden of time. Proceed with caution.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-3",
          "name": "Tricks",
          "tag": "Before Operation",
          "desc": "Sometimes, issues are raised simply to prevent them from being resolved.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-4",
          "name": "The Man Who Wasn't There",
          "tag": "Before Operation",
          "desc": "You should always try to raise your spirits when eating, even if it's a little difficult.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-ST-2",
          "name": "Sudden Impact",
          "tag": "Interlude",
          "desc": "Go on, make your day even more exciting."
        },
        {
          "code": "CV-5",
          "name": "Shadow of a Doubt",
          "tag": "Before Operation",
          "desc": "Communication will always involve misunderstandings, and life will always move in unwanted directions.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-6",
          "name": "The Night of the Hunter",
          "tag": "Before Operation",
          "desc": "Everyone has things they can't do. But this is not a universally understood principle."
        },
        {
          "code": "CV-7",
          "name": "White Heat",
          "tag": "Before Operation",
          "desc": "Whenever one acts, another will respond. The more fierce the action, the more extreme the reaction.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-8",
          "name": "So Long, Stooge",
          "tag": "Before Operation",
          "desc": "Everyone will eventually figure out what they're capable of. They just need a little time.\n Deals Arts damage to both enemies and allies and reduces enemies' Movement Speed, but will charge their energy."
        },
        {
          "code": "CV-ST-3",
          "name": "Band of Outsiders",
          "tag": "Interlude",
          "desc": "Choosing to die hardly counts as living."
        }
      ]
    },
    "setId_ssLine_act43side": {
      "name": "Act or Die",
      "year": 6,
      "kv": "kv_act_or_die",
      "title": "title_act_or_die",
      "bgid": "storybg_act_or_die",
      "main": false,
      "group": "act43side",
      "desc": "A film crew trapped on a Wrankwood studio plate in the barrens.\nA death from years ago rears its head again.\nJoy, confusion, fear, anger, and hatred take the stage in turn...\nUntil blood paints the final scene of the drama.\nWho wrote this absurd tragedy, with emotion as their pen?\nLucian lifts the curtains to take the stage as the star.",
      "tags": [
        "Special Devices",
        "Elemental Injury"
      ],
      "rewardOp": "Miss.Christine",
      "episodes": [
        {
          "code": "AD-ST-1",
          "name": "To Incite a Death",
          "tag": "Interlude",
          "desc": "Bow, and pay your respects to the eagerly awaiting audience. A fine show has already begun."
        },
        {
          "code": "AD-1",
          "name": "Rehearsal Day",
          "tag": "Before Operation",
          "desc": "A dagger as heavy as your heart, memories that shall never fade, a fallen corpse... These are all silent invitations.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing."
        },
        {
          "code": "AD-2",
          "name": "Rehearsing a Tragedy",
          "tag": "Before Operation",
          "desc": "Look. Stepping to the beat of death, they begin walking towards their predestined endings.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing.\n Blocks Filming Area and requires 10 instances of damage to tear down."
        },
        {
          "code": "AD-3",
          "name": "Dramatique",
          "tag": "Before Operation",
          "desc": "Select a suitable crisis and admire the characters as they wallow within. Their restlessness, their desperate struggles... How could you not be fascinated by it?\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing."
        },
        {
          "code": "AD-4",
          "name": "An Absurd Morning",
          "tag": "Before Operation",
          "desc": "'Absurd'? No, do not give your evaluation so hastily. This play is yet incomplete. Death shall grant the characters new life.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing."
        },
        {
          "code": "AD-ST-2",
          "name": "Focus",
          "tag": "Interlude",
          "desc": "The role I penned shall be engraved in memory."
        },
        {
          "code": "AD-5",
          "name": "Promises of Reunion",
          "tag": "Before Operation",
          "desc": "My favorite lead... You once left, but we shall be reunited once more.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing.\n Blocks Filming Area and requires 10 instances of damage to tear down."
        },
        {
          "code": "AD-6",
          "name": "Rewind the Monologue",
          "tag": "Before Operation",
          "desc": "She dances. Regardless of her ultimate fate, her soul has experienced a hundred thousand lives.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing.\n Blocks Filming Area and requires 10 instances of damage to tear down."
        },
        {
          "code": "AD-7",
          "name": "Blood Diamond's Song",
          "tag": "Before Operation",
          "desc": "I cannot hold back any longer.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing.\n Blocks Filming Area and requires 10 instances of damage to tear down."
        },
        {
          "code": "AD-8",
          "name": "Take a Bow",
          "tag": "Before Operation",
          "desc": "Lucian, my Blood Diamond, my child... Take the stage with me, bow for the curtain call, and let us live a new life, together.\n Operators deployed on a Camera's four adjacent tiles and facing it will create a Filming Area in the direction the Operator is facing.\n Blocks Filming Area and requires 10 instances of damage to tear down."
        },
        {
          "code": "AD-ST-3",
          "name": "A Word to the Audience",
          "tag": "Interlude",
          "desc": "The curtain shall never fall."
        }
      ]
    },
    "setId_ssLine_act15mini": {
      "name": "The Black Forest Wills A Dream",
      "year": 5,
      "kv": "kv_the_black_forest_wills_a_dream",
      "title": "title_the_black_forest_wills_a_dream",
      "bgid": "storybg_the_black_forest_wills_a_dream",
      "main": false,
      "group": "act15mini",
      "desc": "Magallan applies for a permit to enter the icefield as per usual, but finds that Ursus has abruptly blocked the route. She makes her way through Sami instead, meets her old friend Santalla by an old tree, and hears from different sides about the grudges between Ursus and Sami.\nMagallan encounters a supernatural phenomenon in the Fjal Vetrtonn and finds herself rescued by an unfamiliar Sarkaz. The Mountains' Sami are extremely wary of the group and chase them away from their defensive line.\nThe gang stops at the settlement of a friendly forest tribe and stays overnight. That night, Magallan dreams of herself becoming the prey of a shadow. Santalla helps the tribe conduct a ritual that rouses their clan tree, which rises to begin its journey with its subjects, casting a shadow that Magallan finds somewhat familiar.",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ST-1",
          "name": "In the Biting Cold",
          "tag": "Interlude",
          "desc": "Magallan applies for a permit to enter the icefield as per usual, but finds that Ursus has abruptly blocked the route. She makes her way through Sami instead, meets her old friend Santalla by an old tree, and hears from different sides about the grudges between Ursus and Sami."
        },
        {
          "code": "ST-2",
          "name": "Daughter of the Icefield",
          "tag": "Interlude",
          "desc": "Magallan encounters a supernatural phenomenon in the Fjal Vetrtonn and finds herself rescued by an unfamiliar Sarkaz. The Mountains' Sami are extremely wary of the group and chase them away from their defensive line."
        },
        {
          "code": "ST-3",
          "name": "Shadows of Trees",
          "tag": "Interlude",
          "desc": "The gang stops at the settlement of a friendly forest tribe and stays overnight. That night, Magallan dreams of herself becoming the prey of a shadow. Santalla helps the tribe conduct a ritual that rouses their clan tree, which rises to begin its journey with its subjects, casting a shadow that Magallan finds somewhat familiar."
        },
        {
          "code": "ST-4",
          "name": "Revelation of Nature",
          "tag": "Interlude",
          "desc": "Typhon teaches Magallan the wisdom of the hunter, and the laws of Sami's Eternal Hunt. They encounter a rockhorn that has been gravely wounded by a demon, and the accompanying shaman apprentice ends its suffering, but it can no longer nourish nature."
        },
        {
          "code": "ST-5",
          "name": "Homecoming",
          "tag": "Interlude",
          "desc": "Gitano returns to her tribe after foreseeing her brother's death. Santalla tracks the trail of the Ursus infiltrators, warning Magallan and Typhon to be careful before leaving."
        },
        {
          "code": "ST-6",
          "name": "One Day",
          "tag": "Interlude",
          "desc": "The funeral was held as planned, but Typhon gradually notices signs of demonic contamination during the procession of ships. Santalla arrives as promised, and halts the funeral along with Typhon. At the most critical moment, the party encounters a northern Snowpriest and his warriors."
        },
        {
          "code": "ST-7",
          "name": "Vision Unseen",
          "tag": "Interlude",
          "desc": "Upon request, Typhon delivers a special flower to Magallan and the others at Rhine Lab, causing the researchers to grasp the immense scientific value of the endless icefield. Elsewhere, Santalla learns that an Ursus Royal Guard has gone rogue. To resolve this crisis, everyone's paths will converge once more."
        }
      ]
    },
    "setId_ssLine_act48side": {
      "name": "Medjehtiqedti Bound",
      "year": 7,
      "kv": "kv_medjehtiqedti_bound",
      "title": "title_medjehtiqedti_bound",
      "bgid": "storybg_medjehtiqedti_bound",
      "main": false,
      "group": "act48side",
      "desc": "Five years after the signing of the 'Non-Aggression Pact' between Sargon and Minos, Titi leads a diplomatic mission to Athenius, bearing a Minoan relic.\nThe time and place for the exchange ceremony have not yet been confirmed. The Astynomos called Lydia arranges for Titi to visit the site of the rebuilding of the First Temple.\nTiti successfully resolves the dispute at the construction site. But where is Pallas, who should have been the one to do it?",
      "tags": [],
      "rewardOp": null,
      "episodes": [
        {
          "code": "ME-ST-1",
          "name": "Cross the Flowing River",
          "tag": "Interlude",
          "desc": "The river brings back memories from home, and surprise visitors."
        },
        {
          "code": "ME-1",
          "name": "Work and Hours",
          "tag": "Before Operation",
          "desc": "The temple is nearing completion. The priests are always busy, while the mourning linger in old dreams."
        },
        {
          "code": "ME-2",
          "name": "Destined End",
          "tag": "Before Operation",
          "desc": "One has to stop at some point, even on a path without end. But sometimes, we do not even realize that we have reached the end."
        },
        {
          "code": "ME-3",
          "name": "Riddle Without Answer",
          "tag": "Before Operation",
          "desc": "It lies on the road, in dreams, everywhere. It questions you, wakes you, makes you know who you are, and teaches you that beautiful dreams are no more than dreams."
        },
        {
          "code": "ME-4",
          "name": "Misstep",
          "tag": "Before Operation",
          "desc": "Burdens too heavy to bear have a tendency to drop when you can least afford to bear them."
        },
        {
          "code": "ME-5",
          "name": "Convergence",
          "tag": "Before Operation",
          "desc": "As people come and go, the situation inevitably spins out of control."
        },
        {
          "code": "ME-6",
          "name": "Poem of Remembrance",
          "tag": "Before Operation",
          "desc": "Legends covered in dust, the past unforgotten, poems that linger in your ears."
        },
        {
          "code": "ME-ST-2",
          "name": "Voiceless Night",
          "tag": "Interlude",
          "desc": "Miracles do not happen on their own. Even when you leave things in the hands of fate, your heart is yours alone to discover."
        },
        {
          "code": "ME-7",
          "name": "Stampede",
          "tag": "Before Operation",
          "desc": "You never know what will come stampeding in from a distance, sending carefully laid plans flying, and scattering handshakes and goodbyes."
        },
        {
          "code": "ME-8",
          "name": "Divine Revelation",
          "tag": "Before Operation",
          "desc": "His raging fury seeks an outlet. This is a battle that Sargon owes the Minoan."
        },
        {
          "code": "ME-ST-3",
          "name": "The River of No Return",
          "tag": "Interlude",
          "desc": "In the dream, the blood-drenched river looks how it used to, but those who are lost never return. Some things can never be forgiven."
        }
      ]
    },
    "setId_ssLine_act21mini": {
      "name": "Bolivar Diagnosed",
      "year": 8,
      "kv": "kv_bolivar_diagnosed",
      "title": "title_bolivar_diagnosed",
      "bgid": "storybg_bolivar_diagnosed",
      "main": false,
      "group": "act21mini",
      "desc": "",
      "tags": [],
      "rewardOp": null,
      "episodes": []
    }
  }
};
