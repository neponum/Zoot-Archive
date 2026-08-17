import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Mail, Calendar, Edit2, Plus, X, Search, ChevronLeft, 
  Trash2, Play, BookOpen, AlertTriangle, User, Award, Layers, 
  Database, RefreshCw, Check, ArrowRight, Heart, Star, Compass,
  Languages, Github, AlertCircle, Volume2, Type, RotateCcw, History,
  Newspaper, Send, ExternalLink, MessageSquare
} from 'lucide-react';
import { getLanguage, fetchChapterList, wrapUrlWithProxy } from '../services/storyService';
import { Language, StoryEpisode } from '../types';
import { DiscordIcon, SkportIcon } from './ui/Icons';
import { TRANSLATION_REGISTRY } from '../config/translationsRegistry';
import { UI_STRINGS } from '../translations';
import { audioManager } from '../services/audioManager';
import { QRCodeSVG } from 'qrcode.react';
import { CacheService } from '../services/cacheService';
import { CUSTOM_QUOTES } from '../config/customQuotes';
import { authService } from '../services/authService';

export interface NewsItem {
  id: string;
  image: string;
  link: string;
  title?: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'skport-2044113133985771518',
    image: 'https://static.skport.com/image/item/20260418/9963327784768/69e38cb0db8406ebf82f61b6_b8458033.webp',
    link: 'https://www.skport.com/article?id=2044113133985771518',
    title: 'SKPORT Post #1'
  },
  {
    id: 'skport-2060309488366579949',
    
    image: 'https://static.skport.com/image/item/20260529/9963327784768/6a196b3b9650be73424f40d8_3e93bcde.webp',
    link: 'https://www.skport.com/article?id=2060309488366579949',
    title: 'SKPORT Post #2'
  }
];

export const NEWS_BANNERS = NEWS_ITEMS.map(item => item.image);

// Operator definitions
const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: "zh_CN", label: "简体中文", isOfficial: true },
  { id: "en_US", label: "English", isOfficial: true },
  { id: "ja_JP", label: "日本語", isOfficial: true },
  { id: "ko_KR", label: "한국어", isOfficial: true },
  { id: "ru_RU", label: "Русский", isOfficial: false }
];

interface Operator {
  id: string;
  name: string;
  chineseName: string;
  rarity: number; // 3-6
  profession: 'Vanguard' | 'Guard' | 'Defender' | 'Sniper' | 'Caster' | 'Medic' | 'Supporter' | 'Specialist';
  avatar: string; // URL / Crop
  splash: string; // URL
  description: string;
  stats: { hp: number; atk: number; def: number; res: number };
  quote: string;
}

const OPERATORS_LIST: Operator[] = [
  {
    id: 'char_002_amiya',
    name: 'Amiya',
    chineseName: '阿米娅',
    rarity: 5,
    profession: 'Caster',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/RI_arc.webp',
    splash: 'https://torappu.prts.wiki/assets/char_arts/char_002_amiya_1.png',
    description: 'The public leader of Rhodes Island. A young Caster who stands on the frontlines of the struggle for Infected rights.',
    stats: { hp: 1520, atk: 642, def: 120, res: 20 },
    quote: "Doctor, even if the road ahead is dark, as long as we walk together, there will be hope."
  },
  {
    id: 'char_1019_vyseof',
    name: 'Virtuosa',
    chineseName: '塑心',
    rarity: 6,
    profession: 'Supporter',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/LE_arc.webp',
    splash: 'https://torappu.prts.wiki/assets/char_arts/char_002_amiya_1.png',
    description: 'A Sarkaz musician from Laterano. Plays the cello to play a melody of souls, forcing listeners to face their inner emotions.',
    stats: { hp: 1650, atk: 680, def: 220, res: 20 },
    quote: "Listen to the vibration of the strings, Doctor. It represents the raw, unfiltered truth of the soul."
  },
  {
    id: 'char_1033_w_2',
    name: 'Wis\'adel',
    chineseName: '维什戴尔',
    rarity: 6,
    profession: 'Sniper',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/LA_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/main_15.png',
    description: 'A legendary Sarkaz mercenary formerly known as W. Equipped with custom explosive launchers, ready to cause absolute havoc.',
    stats: { hp: 1950, atk: 1010, def: 185, res: 10 },
    quote: "Yo, Doctor! Missed the smell of gunpowder? Keep your head down, the fireworks are about to start!"
  },
  {
    id: 'char_10011_theres',
    name: 'Theresa',
    chineseName: '特蕾西娅',
    rarity: 6,
    profession: 'Supporter',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/TS_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/main_12.png',
    description: 'The former Queen of Sarkaz and co-founder of Rhodes Island. Her gentle light guide the lost spirits of Terra.',
    stats: { hp: 1580, atk: 625, def: 150, res: 25 },
    quote: "My dear friend, your determination is a fire that warms this cold world. I will always believe in you."
  },
  {
    id: 'char_172_silver',
    name: 'SilverAsh',
    chineseName: '银灰',
    rarity: 6,
    profession: 'Guard',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/KJ_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_雪山怀景.png',
    description: 'The warlord of Kjerag and Karlan Trade leader. Master of the greatsword, capable of revealing hidden threats.',
    stats: { hp: 2560, atk: 795, def: 410, res: 15 },
    quote: "The snows of Kjerag are cold, but my blade is colder. What is your command, Doctor?"
  },
  {
    id: 'char_293_texas',
    name: 'Texas the Omertosa',
    chineseName: '缄默德克萨斯',
    rarity: 6,
    profession: 'Specialist',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/SI_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_叙拉古人.png',
    description: 'A Siracusan mobster returning to her origins. Strikes silently with dual energy blades, resetting enemies with fatal speed.',
    stats: { hp: 1610, atk: 660, def: 315, res: 0 },
    quote: "No more talk. Tell me where the targets are."
  },
  {
    id: 'char_103_exusa',
    name: 'Exusiai',
    chineseName: '能天使',
    rarity: 6,
    profession: 'Sniper',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/LA_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_十字路口.png',
    description: 'A cheerful angel from Laterano working for Penguin Logistics. Armed with a vector submachine gun, dispensing apple pie.',
    stats: { hp: 1670, atk: 540, def: 160, res: 0 },
    quote: "Apple pie! Lord, lead us to victory!"
  },
  {
    id: 'char_003_kalts',
    name: 'Kal\'tsit',
    chineseName: '凯尔希',
    rarity: 6,
    profession: 'Medic',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/RI_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_孤星.png',
    description: 'Head of the Rhodes Island medical department. Summons Mon3tr on the battlefield to tear down armored defenses.',
    stats: { hp: 2010, atk: 490, def: 250, res: 10 },
    quote: "Mon3tr is ready. Don't waste my time with simple calculations, Doctor."
  },
  {
    id: 'char_180_saria',
    name: 'Saria',
    chineseName: '塞雷娅',
    rarity: 6,
    profession: 'Defender',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/RH_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_不义之财.png',
    description: 'Former chief researcher of Rhine Lab. Shields allies and heals their wounds with calcareous control.',
    stats: { hp: 3150, atk: 585, def: 645, res: 10 },
    quote: "Defense is not just about holding ground; it's about setting the boundary."
  },
  {
    id: 'char_350_surtr',
    name: 'Surtr',
    chineseName: '史尔特尔',
    rarity: 6,
    profession: 'Guard',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/ST_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/main_07.png',
    description: 'A mysterious girl with severe amnesia. Wields a colossal blazing sword of giants, leaving ashes in her wake.',
    stats: { hp: 2430, atk: 810, def: 355, res: 15 },
    quote: "Out of my way. Only the ashes of my enemies will remain."
  },
  {
    id: 'char_112_eyjaf',
    name: 'Eyjafjalla',
    chineseName: '艾雅法拉',
    rarity: 6,
    profession: 'Caster',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/ST_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_火山旅梦.png',
    description: 'A Leithanian volcanologist. Inflicts immense fire damage on multiple enemies with molten surges.',
    stats: { hp: 1740, atk: 765, def: 125, res: 20 },
    quote: "Doctor, the volcano is whispers... Oh, it's just my research. Please stay safe!"
  },
  {
    id: 'char_115_texas_1',
    name: 'Texas',
    chineseName: '德克萨斯',
    rarity: 5,
    profession: 'Vanguard',
    avatar: 'https://raw.githubusercontent.com/neponum/zoot-data/main/icons/SI_arc.webp',
    splash: 'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/情报处理室_叙拉古人.png',
    description: 'A quiet driver for Penguin Logistics. Deals area tactical stuns while recovering sanity and DP for the team.',
    stats: { hp: 1980, atk: 540, def: 290, res: 0 },
    quote: "Taking breaks is important, Doctor. Care for a pocky?"
  }
];

interface MainMenuProps {
  onOpenTerminal: () => void;
  onOpenArchive?: () => void;
  onOpenVote?: () => void;
  onOpenOperators?: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  readChaptersCount: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onOpenTerminal, onOpenArchive, onOpenVote, onOpenOperators, lang, setLang, readChaptersCount }) => {
  const t = UI_STRINGS[lang];
  const isRussian = lang === 'ru_RU' || lang === 'ru_RU_CN';

  // Local settings synchronizing with player settings
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      fontSize: 100,
      bgmVolume: 1.0,
      sfxVolume: 1.0,
      voiceVolume: 1.0,
      textSpeed: 30,
      autoDelay: 2000,
      fontFamily: 'sans-serif',
      nickname: '{@nickname}',
      shakeIntensity: 1.0,
      skipSpeed: 4,
    };
    try {
      const saved = localStorage.getItem('ak-story-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const handleUpdateSettings = (updated: Partial<typeof settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updated };
      localStorage.setItem('ak-story-settings', JSON.stringify(next));
      return next;
    });
  };

  const handleVolumeChange = (type: 'bgm' | 'sfx' | 'voice', value: number) => {
    const nextSettings = { ...settings };
    if (type === 'bgm') nextSettings.bgmVolume = value;
    if (type === 'sfx') nextSettings.sfxVolume = value;
    if (type === 'voice') nextSettings.voiceVolume = value;
    
    setSettings(nextSettings);
    localStorage.setItem('ak-story-settings', JSON.stringify(nextSettings));
    audioManager.setVolumes(nextSettings.bgmVolume, nextSettings.sfxVolume, nextSettings.voiceVolume);
  };

  const resetSettings = () => {
    const defaultSettings = {
      fontSize: 100,
      bgmVolume: 1.0,
      sfxVolume: 1.0,
      voiceVolume: 1.0,
      textSpeed: 30,
      autoDelay: 2000,
      fontFamily: 'sans-serif',
      nickname: '{@nickname}',
      shakeIntensity: 1.0,
      skipSpeed: 4
    };
    setSettings(defaultSettings);
    localStorage.setItem('ak-story-settings', JSON.stringify(defaultSettings));
    audioManager.setVolumes(1.0, 1.0, 1.0);
  };

  // Doctor profile states
  const [docName, setDocName] = useState(() => localStorage.getItem('ak-doc-name') || 'NUM');
  const [isEditingName, setIsEditingName] = useState(false);
  const [docLevel, setDocLevel] = useState(() => parseInt(localStorage.getItem('ak-doc-level') || '83'));
  
  // Sanity state
  const [sanity, setSanity] = useState(() => parseInt(localStorage.getItem('ak-res-sanity') || '124'));
  const [maxSanity, setMaxSanity] = useState(135);
  const [sanityCountdown, setSanityCountdown] = useState(359); // countdown from 5:59 (seconds)

  // Doctor resources states
  const [orundum, setOrundum] = useState(() => parseInt(localStorage.getItem('ak-res-orundum') || '17535'));
  const [prime, setPrime] = useState(() => parseInt(localStorage.getItem('ak-res-prime') || '10'));
  const [lmd, setLmd] = useState(() => parseInt(localStorage.getItem('ak-res-lmd') || '641121'));
  const [permits, setPermits] = useState(() => parseInt(localStorage.getItem('ak-res-permits') || '12'));

  // Assistant states
  const [assistantId, setAssistantId] = useState(() => {
    const saved = localStorage.getItem('ak-assistant-id');
    if (!saved || saved === 'char_1019_vyseof') {
      return 'char_002_amiya';
    }
    return saved;
  });
  const [dialogueText, setDialogueText] = useState('');
  const [isChangingAssistant, setIsChangingAssistant] = useState(false);
  const dialogueIntervalRef = useRef<any>(null);
  
  // UI Modals state
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [isMailRead, setIsMailRead] = useState(() => localStorage.getItem('ak-mail-read') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Discord bug report states
  const [reportType, setReportType] = useState<'player' | 'translation'>('player');
  const [reportDescription, setReportDescription] = useState('');
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Active Screen Panel
  // 'main' | 'squad' | 'gacha' | 'mission' | 'depot'
  const [activePanel, setActivePanel] = useState<'main' | 'squad' | 'gacha' | 'mission' | 'depot'>('main');

  // Gacha states
  const [isZipping, setIsZipping] = useState(false);
  const [zipperOpen, setZipperOpen] = useState(false);
  const [gachaPullResults, setGachaPullResults] = useState<Operator[]>([]);
  const [currentGachaIndex, setCurrentGachaIndex] = useState(-1);
  const [gachaMaxRarity, setGachaMaxRarity] = useState(3);

  // Squad state (Array of 12 slot ids, blank is '')
  const [squad, setSquad] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ak-current-squad');
      return saved ? JSON.parse(saved) : ['char_002_amiya', 'char_1019_vyseof', 'char_1033_w_2', '', '', '', '', '', '', '', '', ''];
    } catch {
      return ['char_002_amiya', 'char_1019_vyseof', '', '', '', '', '', '', '', '', '', ''];
    }
  });
  const [activeSquadSlot, setActiveSquadSlot] = useState<number | null>(null);

  // Operator list filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [selectedOpDetail, setSelectedOpDetail] = useState<Operator | null>(null);

  // Time & Date state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Missions
  const [missions, setMissions] = useState(() => {
    const saved = localStorage.getItem('ak-missions-claimed');
    const claimed = saved ? JSON.parse(saved) : {};
    return [
      { id: 'm1', text: 'Войти в архив Родоса (Claim daily bonus)', reward: { orundum: 600 }, claimed: claimed['m1'] || false },
      { id: 'm2', text: 'Изменить имя Доктора (Edit name once)', reward: { prime: 1, lmd: 5000 }, claimed: claimed['m2'] || false },
      { id: 'm3', text: 'Сделать 10 призывов в Вербовке (Perform a 10x Headhunt)', reward: { permits: 2, orundum: 1200 }, claimed: claimed['m3'] || false },
      { id: 'm4', text: 'Собрать полный отряд из 12 оперативников', reward: { lmd: 15000, orundum: 1000 }, claimed: claimed['m4'] || false }
    ];
  });

  // Discord Auth state
  const [discordUser, setDiscordUser] = useState<{ username: string; avatar?: string; id: string } | null>(() => {
    return authService.getState().user;
  });
  const [isDiscordMember, setIsDiscordMember] = useState(() => {
    return authService.getState().isMember;
  });
  const [isCheckingDiscord, setIsCheckingDiscord] = useState(false);

  const fetchDiscordUser = async () => {
    setIsCheckingDiscord(true);
    try {
      const state = await authService.fetchUser();
      setDiscordUser(state.user);
      setIsDiscordMember(state.isMember);
    } catch (error) {
      console.error('Failed to fetch Discord user:', error);
      setDiscordUser(null);
      setIsDiscordMember(false);
    } finally {
      setIsCheckingDiscord(false);
    }
  };

  const handleDiscordLogin = () => {
    authService.login();
  };

  const handleDiscordLogout = async () => {
    try {
      await authService.logout();
      setDiscordUser(null);
      setIsDiscordMember(false);
    } catch (error) {
      console.error('Discord logout error:', error);
    }
  };

  useEffect(() => {
    fetchDiscordUser();

    const unsubscribe = authService.subscribe((state) => {
      setDiscordUser(state.user);
      setIsDiscordMember(state.isMember);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Current assistant object
  const assistant = OPERATORS_LIST.find(op => op.id === assistantId) || OPERATORS_LIST[0];

  // Persist doctor details
  useEffect(() => {
    localStorage.setItem('ak-doc-name', docName);
  }, [docName]);
  
  useEffect(() => {
    localStorage.setItem('ak-doc-level', docLevel.toString());
  }, [docLevel]);

  // Persist resources
  useEffect(() => {
    localStorage.setItem('ak-res-orundum', orundum.toString());
    localStorage.setItem('ak-res-prime', prime.toString());
    localStorage.setItem('ak-res-lmd', lmd.toString());
    localStorage.setItem('ak-res-permits', permits.toString());
  }, [orundum, prime, lmd, permits]);

  // Persist Sanity and Tick Recovery
  useEffect(() => {
    localStorage.setItem('ak-res-sanity', sanity.toString());
  }, [sanity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSanityCountdown(prev => {
        if (prev <= 1) {
          setSanity(s => Math.min(s + 1, maxSanity));
          return 359; // reset to 5:59 minutes (359 seconds)
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [maxSanity]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Persist assistant
  useEffect(() => {
    localStorage.setItem('ak-assistant-id', assistantId);
  }, [assistantId]);

  // Persist squad
  useEffect(() => {
    localStorage.setItem('ak-current-squad', JSON.stringify(squad));
    // Check squad mission
    const fullSquad = squad.filter(id => id !== '').length === 12;
    if (fullSquad && !missions[3].claimed) {
      // Trigger mission check
    }
  }, [squad]);

  // Load last played episode
  const [lastEpisode, setLastEpisode] = useState<StoryEpisode | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ak-translation-episode');
      if (saved) {
        setLastEpisode(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setCurrentTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
      setCurrentDate(`${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Set assistant quote on load or assistant change
  useEffect(() => {
    const operatorQuotes = CUSTOM_QUOTES.filter(q => q.operatorId === assistant.id);
    const generalQuotes = CUSTOM_QUOTES.filter(q => !q.operatorId);
    const available = operatorQuotes.length > 0 ? operatorQuotes : generalQuotes;

    if (available.length > 0) {
      const firstQuote = available[Math.floor(Math.random() * available.length)];
      const text = (lang === 'ru_RU' || lang === 'ru_RU_CN') ? firstQuote.ru : (firstQuote.en || firstQuote.ru);
      triggerDialogue(text);
    } else {
      setDialogueText('');
    }

    return () => {
      if (dialogueIntervalRef.current) {
        clearInterval(dialogueIntervalRef.current);
      }
    };
  }, [assistant.id]);

  // Auto-rotate news banners every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % NEWS_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Discord authentication & report handling for Main Menu's report modal
  useEffect(() => {
    if (isReportOpen) {
      fetchDiscordUser();
      setReportError(null);
      setReportSuccess(false);
      setReportDescription('');
    }
  }, [isReportOpen]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    setIsReportSubmitting(true);
    setReportError(null);
    try {
      const headers = authService.getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ 
          type: reportType, 
          description: reportDescription, 
          context: {
            chapter: 'Главное меню / Main Menu',
            line: 0,
            history: [],
            translator: 'Система'
          }
        })
      });
      if (res.ok) {
        setReportSuccess(true);
      } else {
        const data = await res.json();
        setReportError(data.error || (isRussian ? 'Произошла ошибка при отправке репорта' : 'An error occurred while submitting the report'));
      }
    } catch (e: any) {
      setReportError(e.message);
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const triggerDialogue = (text: string) => {
    if (dialogueIntervalRef.current) {
      clearInterval(dialogueIntervalRef.current);
    }
    setDialogueText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDialogueText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        dialogueIntervalRef.current = null;
      }
    }, 20);
    dialogueIntervalRef.current = interval;
  };

  const handleAssistantClick = () => {
    const operatorQuotes = CUSTOM_QUOTES.filter(q => q.operatorId === assistant.id);
    const generalQuotes = CUSTOM_QUOTES.filter(q => !q.operatorId);
    const available = [...operatorQuotes, ...generalQuotes];

    if (available.length > 0) {
      const rand = available[Math.floor(Math.random() * available.length)];
      const text = (lang === 'ru_RU' || lang === 'ru_RU_CN') ? rand.ru : (rand.en || rand.ru);
      triggerDialogue(text);
    } else {
      setDialogueText('');
    }
  };

  const claimMission = (id: string, reward: any) => {
    setMissions(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, claimed: true } : m);
      // Save
      const claimedMap: Record<string, boolean> = {};
      updated.forEach(m => {
        if (m.claimed) claimedMap[m.id] = true;
      });
      localStorage.setItem('ak-missions-claimed', JSON.stringify(claimedMap));
      return updated;
    });

    // Award rewards
    if (reward.orundum) setOrundum(prev => prev + reward.orundum);
    if (reward.prime) setPrime(prev => prev + reward.prime);
    if (reward.lmd) setLmd(prev => prev + reward.lmd);
    if (reward.permits) setPermits(prev => prev + reward.permits);
  };

  // Resources conversion helper
  const convertPrimeToOrundum = () => {
    if (prime > 0) {
      setPrime(prev => prev - 1);
      setOrundum(prev => prev + 180);
    }
  };

  // Gacha Mechanics
  const performHeadhunt = (count: number) => {
    const cost = count === 10 ? 6000 : 600;
    if (permits >= count) {
      setPermits(prev => prev - count);
    } else if (orundum >= cost) {
      setOrundum(prev => prev - cost);
    } else {
      alert("Недостаточно ресурсов (Орундама или Разрешений)!");
      return;
    }

    // Pull results
    const results: Operator[] = [];
    let maxRar = 3;
    for (let i = 0; i < count; i++) {
      const rand = Math.random() * 100;
      let selectedOp: Operator;
      
      if (rand < 2) { // 2% chance for 6 star
        const pool = OPERATORS_LIST.filter(op => op.rarity === 6);
        selectedOp = pool[Math.floor(Math.random() * pool.length)];
        maxRar = Math.max(maxRar, 6);
      } else if (rand < 10) { // 8% chance for 5 star
        const pool = OPERATORS_LIST.filter(op => op.rarity === 5);
        selectedOp = pool[Math.floor(Math.random() * pool.length)];
        maxRar = Math.max(maxRar, 5);
      } else if (rand < 40) { // 30% chance for 4 star (which are our 5 star or 6 star as well, but let's map)
        const pool = OPERATORS_LIST.filter(op => op.rarity === 5);
        selectedOp = pool[Math.floor(Math.random() * pool.length)];
        maxRar = Math.max(maxRar, 5);
      } else { // 60% chance for 3 star / 5 star (let's use our base pool)
        const pool = OPERATORS_LIST.filter(op => op.rarity === 5 || op.id === 'char_115_texas_1');
        selectedOp = pool[Math.floor(Math.random() * pool.length)];
        maxRar = Math.max(maxRar, 5);
      }
      results.push(selectedOp);
    }

    setGachaPullResults(results);
    setGachaMaxRarity(maxRar);
    setCurrentGachaIndex(-1);
    setIsZipping(true);
    setZipperOpen(false);

    // Auto update missions for pulls
    if (count === 10) {
      // Check m3
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0c0c0e] text-white flex flex-col font-sans select-none">
      {/* Arknights Background Image */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src={wrapUrlWithProxy('https://arknights.wiki.gg/images/Home_Screen_background-Vision.png?c1feee')} 
          alt="Arknights Background" 
          className="w-full h-full object-cover opacity-100 scale-100 select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Background Grids & Artwork */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />
      
      {/* Ambient gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e]/90 via-[#0c0c0e]/30 to-[#0c0c0e]/95 z-0 pointer-events-none" />

      {/* --- MAIN INTERACTIVE WRAPPER --- */}
      <div className="flex-1 relative z-20 overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* ================= MAIN DASHBOARD VIEW ================= */}
          {activePanel === 'main' && (
            <motion.div 
              key="main-dash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-3 sm:p-4 md:p-10 max-lg:landscape:p-3 flex flex-col md:flex-row max-lg:landscape:flex-row justify-between items-stretch gap-4 md:gap-6 max-lg:landscape:gap-3 relative overflow-y-auto md:overflow-hidden max-lg:landscape:overflow-hidden md:h-full max-lg:landscape:h-full"
            >
              {/* Assistant Illustration - Center-bottom on mobile, left-aligned on desktop & mobile landscape */}
              <div className="absolute inset-y-0 left-0 right-0 md:right-auto md:left-[0%] md:w-[60%] max-lg:landscape:right-auto max-lg:landscape:left-0 max-lg:landscape:w-[60%] flex items-end justify-center pointer-events-none z-10 overflow-hidden opacity-80 md:opacity-100 max-lg:landscape:opacity-100">
                <img 
                  src={wrapUrlWithProxy(`https://torappu.prts.wiki/assets/char_arts/${assistant.id}_1.png`)} 
                  alt={assistant.name}
                  className="h-[105%] md:h-[112%] max-lg:landscape:h-[112%] translate-x-0 md:translate-x-[8%] max-lg:landscape:translate-x-[8%] translate-y-[8%] md:translate-y-[14%] max-lg:landscape:translate-y-[14%] max-w-none object-contain object-bottom select-none transition-all duration-500 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallback = assistant.splash && !assistant.splash.includes('banners/') 
                      ? assistant.splash 
                      : 'https://torappu.prts.wiki/assets/char_arts/char_002_amiya_1.png';
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>

              {/* LEFT SIDE: Doctor Profile, Dialogue, Assistant, Circular Quick Buttons */}
              <div className="flex flex-col w-full md:w-[35%] lg:w-[25%] max-lg:landscape:w-[35%] shrink-0 gap-3 md:gap-4 relative z-20 justify-start">
                
                {/* Utilities / Settings / Mail (Top Left) */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-10 w-10 bg-zinc-950/90 hover:bg-zinc-900 border border-white/5 hover:border-white/30 rounded-sm flex items-center justify-center transition-all group cursor-pointer"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 text-white/50 group-hover:text-white" />
                  </button>

                  <button 
                    onClick={() => {
                      setIsMailOpen(true);
                      setIsMailRead(true);
                      localStorage.setItem('ak-mail-read', 'true');
                    }}
                    className="h-10 w-10 bg-zinc-950/90 hover:bg-zinc-900 border border-white/5 hover:border-blue-500/50 rounded-sm flex items-center justify-center transition-all group relative shrink-0 cursor-pointer"
                    title="Mail"
                  >
                    <Mail className="w-4 h-4 text-white/50 group-hover:text-white" />
                    {!isMailRead && (
                      <>
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      </>
                    )}
                  </button>

                  {/* News Button for vertical mobile / portrait view */}
                  <button 
                    onClick={() => setIsNewsOpen(true)}
                    className="flex md:hidden portrait:flex h-10 px-3 bg-zinc-950/90 hover:bg-zinc-900 border border-white/5 hover:border-blue-500/50 rounded-sm items-center gap-1.5 transition-all group relative shrink-0 cursor-pointer"
                    title="News"
                  >
                    <Newspaper className="w-4 h-4 text-white/50 group-hover:text-white" />
                    <span className="text-[10px] font-black tracking-widest text-white/50 group-hover:text-white uppercase font-mono">
                      {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'НОВОСТИ' : 'NEWS'}
                    </span>
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  </button>
                </div>

                {/* Spacer to push dialogue & news down */}
                <div className="hidden md:block max-lg:landscape:block flex-1" />

                {/* Dialogue Bubble Area */}
                {dialogueText && (
                  <div className="hidden md:flex max-lg:landscape:flex flex-col gap-2">
                    <div 
                      onClick={handleAssistantClick}
                      className="bg-zinc-950/85 backdrop-blur-xl border border-white/10 p-3.5 md:p-4 max-lg:landscape:p-3 rounded-sm shadow-2xl relative group cursor-pointer transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-20">
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full" />
                      </div>

                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2">
                        <span className="text-[9px] font-black tracking-widest text-white/50 uppercase font-mono">
                          {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ГОЛОС // VOICE' : 'VOICE'}
                        </span>
                      </div>

                      <p className="text-[11px] md:text-xs max-lg:landscape:text-[11px] text-white/90 leading-relaxed font-medium uppercase tracking-wide min-h-[30px] text-justify font-mono">
                        {dialogueText}
                        <span className="inline-block w-1.5 h-3 bg-white ml-1 animate-pulse" />
                      </p>
                    </div>
                  </div>
                )}

                {/* News Block */}
                <div 
                  className="hidden md:flex max-lg:landscape:flex portrait:hidden bg-zinc-950/80 border border-white/10 hover:border-blue-500/50 rounded-sm shadow-2xl w-full aspect-[2/1] relative overflow-hidden group cursor-pointer transition-all duration-300"
                  onClick={() => window.open(NEWS_ITEMS[currentNewsIndex]?.link || 'https://www.skport.com', '_blank', 'noopener,noreferrer')}
                >
                  <div className="absolute inset-0">
                    <img 
                      src={wrapUrlWithProxy(NEWS_BANNERS[currentNewsIndex])} 
                      alt="Breaking News" 
                      className="w-full h-full object-cover transition-all duration-500 ease-in-out group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Subtle dark gradient overlay at top and bottom */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

                  {/* Red BREAKING NEWS Badge */}
                  <div className="absolute top-0 left-0 bg-[#b80000] text-white px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider font-mono z-20 shadow-[0_2px_4px_rgba(0,0,0,0.4)] border-r border-b border-red-800/20">
                    BREAKING NEWS
                  </div>

                  {/* Image Switcher / Minimalist indicator dots */}
                  <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-30 select-none">
                    {NEWS_BANNERS.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentNewsIndex(idx);
                        }}
                        className={`h-1 transition-all duration-300 cursor-pointer ${
                          idx === currentNewsIndex 
                            ? 'w-6 md:w-8 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                            : 'w-2 md:w-3 bg-white/30 hover:bg-white/60'
                        }`}
                        title={`News ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT SIDE: Action grid of cards */}
              <div className="w-full md:flex-1 max-lg:landscape:flex-1 flex flex-col justify-start md:pt-[10%] max-lg:landscape:pt-[2%] gap-2.5 md:gap-3 max-w-[550px] md:ml-auto max-lg:landscape:ml-auto items-center md:items-end max-lg:landscape:items-end pr-0 lg:pr-4 relative z-10 mt-auto md:mt-0 max-lg:landscape:mt-0">
                
                {/* 1. TERMINAL */}
                <button
                  onClick={onOpenTerminal}
                  className="group w-full max-w-[440px] h-20 md:h-36 max-lg:landscape:h-28 bg-zinc-950/90 hover:bg-zinc-900 border border-white/10 hover:border-blue-500/50 rounded-sm relative shadow-2xl transition-all duration-300 overflow-hidden text-left flex cursor-pointer"
                >
                  <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  <div className="flex-1 p-3 md:p-4 flex flex-col justify-between relative h-full">
                    <div className="flex items-center md:items-start justify-between relative z-10 h-full">
                      <div className="flex flex-col justify-center h-full">
                        <h3 className="text-2xl md:text-3.5xl max-lg:landscape:text-2.5xl font-black text-white uppercase tracking-wider font-mono shrink-0">
                          {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ТЕРМИНАЛ' : 'TERMINAL'}
                        </h3>
                      </div>
                      
                      {lastEpisode && lastEpisode.storyEntryPicId && (
                        <div className="h-full max-h-[50px] md:max-h-none max-lg:landscape:max-h-none aspect-video relative rounded-sm overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-colors shrink-0 shadow-lg ml-3 md:ml-4">
                          <img 
                            src={`https://raw.githubusercontent.com/neponum/zoot-data/main/story_pic/${lastEpisode.storyEntryPicId}.png`} 
                            alt={lastEpisode.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-1 left-1.5 right-1.5 md:bottom-1.5 md:left-2 md:right-2 flex flex-col">
                            <span className="text-[4px] md:text-[5px] font-black tracking-widest text-blue-400 uppercase">
                              {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ПОСЛЕДНИЙ АРХИВ' : 'LAST ARCHIVE'}
                            </span>
                            <span className="text-[7px] md:text-[9px] font-bold text-white truncate">
                              {lastEpisode.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* 2. MUSIC */}
                <button
                  onClick={onOpenVote}
                  className="group w-full max-w-[440px] h-12 md:h-16 max-lg:landscape:h-12 bg-zinc-950/90 hover:bg-zinc-900 border border-white/10 hover:border-blue-500/50 rounded-sm relative shadow-xl transition-all duration-300 overflow-hidden text-left flex cursor-pointer"
                >
                  <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex-1 px-4 flex flex-col justify-center relative z-10 h-full">
                    <span className="text-[11px] md:text-[13px] font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-wider font-mono">
                      {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'МУЗЫКА' : 'MUSIC'}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-widest font-mono mt-0.5">
                      {lang === 'ru_RU' || lang === 'ru_RU_CN' ? '// МУЗЫКАЛЬНЫЙ ПЛЕЕР' : '// SOUNDTRACK PLAYER'}
                    </span>
                  </div>
                </button>

                {/* 3. OPERATIVES & ARCHIVE */}
                <div className="w-full max-w-[440px] flex gap-3 md:gap-4">
                  {/* OPERATIVES (ACTIVE: OPERATOR RECORD STORIES) */}
                  <button
                    onClick={onOpenOperators}
                    className="flex-1 h-12 md:h-16 max-lg:landscape:h-12 bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/60 rounded-sm relative shadow-xl overflow-hidden text-left flex select-none cursor-pointer group transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <div className="flex-1 px-2.5 md:px-3 flex flex-col justify-center relative z-10 h-full">
                      <span className="text-[11px] md:text-[13px] font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-wider font-mono">
                        {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ОПЕРАТИВНИКИ' : 'OPERATIVES'}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-black text-amber-400/80 group-hover:text-amber-400 uppercase tracking-widest font-mono mt-0.5 transition-colors">
                        {lang === 'ru_RU' || lang === 'ru_RU_CN' ? '// ИСТОРИИ ОПЕРАТИВНИКОВ' : '// OPERATOR STORIES'}
                      </span>
                    </div>
                  </button>

                  {/* ARCHIVES (OBSIDIAN / RECORDS) */}
                  <button
                    disabled={true}
                    className="flex-1 h-12 md:h-16 max-lg:landscape:h-12 bg-zinc-950/40 border border-white/5 rounded-sm relative shadow-xl overflow-hidden text-left flex select-none cursor-not-allowed opacity-50 group transition-all duration-300"
                  >
                    <div className="flex-1 px-2.5 md:px-3 flex flex-col justify-center relative z-10 h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] md:text-[13px] font-black text-white/50 uppercase tracking-wider font-mono">
                          {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'АРХИВ' : 'ARCHIVES'}
                        </span>
                        <span className="text-[8px] md:text-[9px] font-mono px-1.5 py-0.5 bg-amber-950/40 border border-amber-500/20 text-amber-400 font-bold tracking-widest uppercase rounded-sm">
                          {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'СКОРО' : 'SOON'}
                        </span>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-widest font-mono mt-0.5">
                        {lang === 'ru_RU' || lang === 'ru_RU_CN' ? '// БАЗА ДАННЫХ' : '// STORY ARCHIVE'}
                      </span>
                    </div>
                  </button>
                </div>

              </div>
              
              {/* Social Links & Disclaimer (Bottom Right) */}
              <div className="relative md:absolute max-lg:landscape:absolute mt-4 md:mt-0 max-lg:landscape:mt-0 md:bottom-8 max-lg:landscape:bottom-3 md:right-8 max-lg:landscape:right-3 flex flex-col items-center md:items-end max-lg:landscape:items-end gap-2.5 md:gap-3 w-full md:max-w-[420px] max-lg:landscape:max-w-[360px] z-50 pb-6 md:pb-0 max-lg:landscape:pb-0">
                {/* Disclaimer Block */}
                <div id="disclaimer-block" className="bg-zinc-950/80 border border-white/10 backdrop-blur-md p-2.5 md:p-3 rounded-sm text-[8px] leading-[1.3] text-white/40 tracking-wider text-center md:text-right max-lg:landscape:text-right uppercase select-none w-full max-w-[330px]">
                  {lang === 'ru_RU'
                    ? "Данный проект является некоммерческим фан-архивом. Все права на персонажей, оригинальный сюжет, графику и звуковые материалы принадлежат Hypergryph и Yostar."
                    : "This project is a non-commercial fan-made archive. All rights to characters, story, graphics, and audio assets belong to Hypergryph Co., Ltd., Yostar, and their respective owners."}
                </div>

                {/* Social Buttons & Report Issue Button Row */}
                <div className="flex items-center gap-2">
                  <a 
                    href="https://discord.gg/jYvWPeCjC3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-zinc-950/90 hover:bg-[#5865F2]/5 border border-white/5 hover:border-[#5865F2]/30 transition-all rounded-sm group flex items-center justify-center cursor-pointer"
                    title="Discord"
                  >
                    <DiscordIcon size={18} className="text-white/40 group-hover:text-[#5865F2] transition-colors" />
                  </a>

                  <a 
                    href="https://github.com/neponum/zoot-archive"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-zinc-950/90 hover:bg-white/5 border border-white/5 hover:border-white/30 transition-all rounded-sm group flex items-center justify-center cursor-pointer"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </a>

                  <a 
                    href="https://www.skport.com/profile?id=9963327784768"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-zinc-950/90 border border-white/5 hover:bg-[#BFFF00]/5 hover:border-[#BFFF00]/20 transition-all rounded-sm group flex items-center justify-center cursor-pointer"
                    title="SKPORT"
                  >
                    <SkportIcon size={18} className="opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300" />
                  </a>

                  {/* Report Issue Button (On the level of social buttons) */}
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="h-10 px-4 bg-zinc-950/90 hover:bg-zinc-900 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all rounded-sm text-[9px] font-black tracking-widest uppercase flex items-center gap-2 cursor-pointer group"
                    title={t.report_issue || 'REPORT ISSUE'}
                  >
                    <AlertCircle className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                    <span className="text-white/40 group-hover:text-white transition-colors">
                      {lang === 'ru_RU' ? 'Сообщить об ошибке' : (t.report_issue || 'REPORT ISSUE')}
                    </span>
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* ================= SQUADS BUILDER VIEW ================= */}
          {activePanel === 'squad' && (
            <motion.div 
              key="squad-panel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full p-4 md:p-8 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setActivePanel('main'); setActiveSquadSlot(null); }}
                    className="w-9 h-9 border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center rounded-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND SQUAD VANGUARD</span>
                    <h2 className="text-xl font-black uppercase tracking-tight">КОНФИГУРАЦИЯ ОТРЯДА / SQUAD BUILDER</h2>
                  </div>
                </div>

                <button
                  onClick={() => setSquad(['', '', '', '', '', '', '', '', '', '', '', ''])}
                  className="flex items-center gap-1 text-[9px] font-black text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:border-blue-500/30 px-3 py-1.5 rounded-sm transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  DISBAND SQUAD
                </button>
              </div>

              {/* Main 12-Slot grid */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 py-4 overflow-y-auto pr-2 custom-scrollbar">
                {squad.map((opId, idx) => {
                  const opObj = OPERATORS_LIST.find(o => o.id === opId);
                  const isSlotActive = activeSquadSlot === idx;

                  return (
                    <div 
                      key={idx}
                      className={`h-40 rounded-sm border relative overflow-hidden transition-all duration-300 ${
                        isSlotActive ? 'border-blue-500 bg-blue-950/10 ring-1 ring-blue-500' :
                        opObj ? 'border-white/10 bg-zinc-950/80 hover:border-white/30' : 'border-dashed border-white/10 bg-black/40 hover:bg-white/[0.02]'
                      }`}
                    >
                      {opObj ? (
                        <div className="w-full h-full p-3 flex flex-col justify-between relative group">
                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = [...squad];
                              updated[idx] = '';
                              setSquad(updated);
                            }}
                            className="absolute right-2 top-2 w-5 h-5 bg-black/60 border border-white/10 text-white/40 hover:text-blue-400 hover:border-blue-500/20 rounded-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-20"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          {/* Class icon */}
                          <div className="flex items-center justify-between">
                            <span className="text-[7.5px] font-black text-white/30 uppercase tracking-widest font-mono">
                              SLOT {idx + 1}
                            </span>
                            <span className="text-[8px] font-black bg-white/10 px-1.5 py-0.5 rounded-sm text-white/60">
                              {opObj.profession}
                            </span>
                          </div>

                          {/* Avatar Crop inside slot */}
                          <div className="w-14 h-14 mx-auto rounded-sm overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 my-1.5 shrink-0">
                            <img 
                              src={opObj.avatar} 
                              alt=""
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-[11px] font-black text-white truncate w-full text-center uppercase tracking-wide">
                              {opObj.name}
                            </span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {Array.from({ length: opObj.rarity - 2 }).map((_, rIdx) => (
                                <Star key={rIdx} className="w-2 h-2 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveSquadSlot(isSlotActive ? null : idx)}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                            SLOT {idx + 1} EMPTY
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom: Operator Picker popup if slot is active */}
              {activeSquadSlot !== null && (
                <div className="mt-4 border border-white/10 bg-zinc-950 p-4 rounded-sm shadow-2xl relative shrink-0 animate-in slide-in-from-bottom-5 duration-300">
                  <button 
                    onClick={() => setActiveSquadSlot(null)}
                    className="absolute right-3 top-3 text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase mb-3.5 block">
                    ВЫБЕРИТЕ ОПЕРАТИВНИКА ДЛЯ СЛОТА {activeSquadSlot + 1} // SELECT OPERATOR
                  </span>

                  <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar max-w-full">
                    {OPERATORS_LIST.filter(op => !squad.includes(op.id)).map(op => (
                      <button
                        key={op.id}
                        onClick={() => {
                          const updated = [...squad];
                          updated[activeSquadSlot] = op.id;
                          setSquad(updated);
                          setActiveSquadSlot(null);

                          // Check full squad mission claimable
                          const fullSquad = updated.filter(id => id !== '').length === 12;
                          if (fullSquad && !missions[3].claimed) {
                            claimMission('m4', missions[3].reward);
                          }
                        }}
                        className="flex items-center gap-2 border border-white/5 hover:border-amber-500/40 bg-white/5 hover:bg-white/10 py-1.5 px-3.5 rounded-sm shrink-0 transition-all cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-sm bg-white/5 flex items-center justify-center">
                          <img 
                            src={op.avatar} 
                            alt=""
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-black text-white">{op.name}</span>
                          <span className="text-[7.5px] font-bold text-white/40 uppercase">{op.profession}</span>
                        </div>
                      </button>
                    ))}

                    {OPERATORS_LIST.filter(op => !squad.includes(op.id)).length === 0 && (
                      <span className="text-xs text-white/40 font-bold uppercase py-2">No other operators available. Remove some first!</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ================= GACHA HEADHUNTING SIMULATOR ================= */}
          {activePanel === 'gacha' && (
            <motion.div 
              key="gacha-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative p-4 md:p-8 flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setActivePanel('main');
                      setIsZipping(false);
                      setZipperOpen(false);
                      setGachaPullResults([]);
                    }}
                    className="w-9 h-9 border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center rounded-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND RECRUITMENT AGENCY</span>
                    <h2 className="text-xl font-black uppercase tracking-tight">СИМУЛЯТОР СИГНАЛОВ ПРИЗЫВА / HEADHUNT SIM</h2>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-3 py-1.5 rounded-sm">
                  <span className="text-[8px] font-bold text-white/40 tracking-wider uppercase">AVAILABLE PERMITS:</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">{permits}</span>
                  <span className="text-[8px] font-bold text-white/40 tracking-wider uppercase ml-2">ORUNDUM:</span>
                  <span className="text-sm font-black text-blue-500 font-mono">{orundum}</span>
                </div>
              </div>

              {/* Recruitment Screen Body */}
              <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                <AnimatePresence mode="wait">
                  
                  {/* Pull Animation Overlay (The Arknights Zipper Glow) */}
                  {isZipping && (
                    <motion.div 
                      key="gacha-zipper"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-8"
                    >
                      {!zipperOpen ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mb-8">
                            TAP ZIPPER TO SEAL PATHWAYS
                          </span>

                          {/* Zipper mechanism glow container */}
                          <button
                            onClick={() => {
                              setZipperOpen(true);
                              setCurrentGachaIndex(0);
                            }}
                            className={`w-16 h-80 border rounded-full relative flex items-center justify-center cursor-pointer transition-all duration-700 shadow-2xl ${
                              gachaMaxRarity === 6 ? 'border-orange-500 shadow-orange-500/20 bg-orange-950/5 text-orange-500' :
                              gachaMaxRarity === 5 ? 'border-purple-500 shadow-purple-500/20 bg-purple-950/5 text-purple-500' : 'border-blue-400 shadow-blue-400/20 bg-blue-950/5 text-blue-400'
                            }`}
                          >
                            <motion.div 
                              animate={{ y: [0, 40, 0] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute top-10 flex flex-col items-center"
                            >
                              <div className="w-1.5 h-16 bg-white rounded-full animate-pulse shadow-[0_0_10px_currentColor]" />
                              <span className="text-[9px] font-black tracking-widest uppercase mt-4">ZIP</span>
                            </motion.div>
                          </button>
                        </div>
                      ) : (
                        /* Individual card reveal panel */
                        currentGachaIndex >= 0 && currentGachaIndex < gachaPullResults.length && (
                          <motion.div 
                            key={currentGachaIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center justify-center max-w-sm w-full"
                          >
                            {/* Glowing Operator bag card */}
                            <div className={`w-full bg-[#121215] border p-6 rounded-sm shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center transition-all ${
                              gachaPullResults[currentGachaIndex].rarity === 6 ? 'border-orange-500 shadow-orange-500/20' :
                              gachaPullResults[currentGachaIndex].rarity === 5 ? 'border-purple-500 shadow-purple-500/20' : 'border-white/5'
                            }`}>
                              <span className="text-[9px] font-black tracking-widest text-white/30 uppercase mb-4">
                                RECRUIT_ID: {currentGachaIndex + 1} / {gachaPullResults.length}
                              </span>

                              <div className="w-48 h-48 bg-white/5 border border-white/5 rounded-sm overflow-hidden flex items-center justify-center my-4 relative">
                                <img 
                                  src={gachaPullResults[currentGachaIndex].splash} 
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                              </div>

                              <h3 className="text-2xl font-black text-white tracking-wide uppercase mt-2">
                                {gachaPullResults[currentGachaIndex].name}
                              </h3>
                              <span className="text-[9px] font-bold text-white/50 uppercase mt-0.5">
                                {gachaPullResults[currentGachaIndex].chineseName} // {gachaPullResults[currentGachaIndex].profession}
                              </span>

                              {/* Stars */}
                              <div className="flex items-center gap-1.5 mt-3">
                                {Array.from({ length: gachaPullResults[currentGachaIndex].rarity - 2 }).map((_, rIdx) => (
                                  <Star key={rIdx} className="w-4.5 h-4.5 fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-bounce" style={{ animationDelay: `${rIdx * 100}ms` }} />
                                ))}
                              </div>

                              <p className="text-[9.5px] text-white/50 mt-4 leading-relaxed uppercase text-center font-bold tracking-tight px-4 max-h-[48px] overflow-hidden">
                                "{gachaPullResults[currentGachaIndex].quote}"
                              </p>

                              {/* Next card navigation */}
                              <button
                                onClick={() => {
                                  if (currentGachaIndex < gachaPullResults.length - 1) {
                                    setCurrentGachaIndex(prev => prev + 1);
                                  } else {
                                    // Finished
                                    setIsZipping(false);
                                    setZipperOpen(false);
                                    // Add to squad picker if we like or complete pull mission
                                    const updatedMissions = [...missions];
                                    if (gachaPullResults.length === 10 && !updatedMissions[2].claimed) {
                                      claimMission('m3', updatedMissions[2].reward);
                                    }
                                  }
                                }}
                                className="w-full mt-6 bg-white text-black py-3 text-[10px] font-black tracking-widest uppercase rounded-sm text-center cursor-pointer transition-all"
                              >
                                {currentGachaIndex < gachaPullResults.length - 1 ? 'NEXT OPERATOR / ДАЛЕЕ' : 'COMPLETE RECRUITMENT / ЗАВЕРШИТЬ'}
                              </button>
                            </div>
                          </motion.div>
                        )
                      )}
                    </motion.div>
                  )}

                  {/* Standard recruitment portal graphics */}
                  {!isZipping && (
                    <motion.div 
                      key="gacha-home"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center flex flex-col items-center max-w-lg"
                    >
                      <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-sm flex items-center justify-center mb-6">
                        <Award className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-widest text-white">
                        КАБИНЕТ СЕКРЕТАРЯ ВЕРБОВКИ
                      </h3>
                      <p className="text-[10px] text-white/50 uppercase leading-relaxed tracking-widest mt-2 max-w-sm">
                        Use your Permits or Orundum credits to headhunt elites for Rhodes Island combat squads. Rate-up event is active!
                      </p>

                      {/* Pull Controls */}
                      <div className="flex gap-4 mt-8 w-full">
                        <button
                          onClick={() => performHeadhunt(1)}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-white/10 hover:border-white/30 p-4 rounded-sm flex flex-col items-center justify-between transition-all cursor-pointer"
                        >
                          <span className="text-[9px] font-black text-white/40 tracking-wider uppercase">SINGLE HEADHUNT</span>
                          <span className="text-sm font-black text-white mt-1.5">PULL x1</span>
                          <div className="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-white/60">
                            <span>Cost: 1 Permit OR 600 O</span>
                          </div>
                        </button>

                        <button
                          onClick={() => performHeadhunt(10)}
                          className="flex-1 bg-gradient-to-br from-amber-950/20 to-zinc-900 hover:from-amber-900/20 border border-amber-500/20 hover:border-amber-500/50 p-4 rounded-sm flex flex-col items-center justify-between transition-all cursor-pointer shadow-lg"
                        >
                          <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase">MULTIPULL SPECIAL</span>
                          <span className="text-sm font-black text-amber-500 mt-1.5">PULL x10</span>
                          <div className="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-amber-500/80">
                            <span>Cost: 10 Permits OR 6000 O</span>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ================= MISSIONS PANEL ================= */}
          {activePanel === 'mission' && (
            <motion.div 
              key="mission-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-4 md:p-8 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActivePanel('main')}
                    className="w-9 h-9 border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center rounded-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND OPERATION REGISTRY</span>
                    <h2 className="text-xl font-black uppercase tracking-tight">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ // DAILY OPERATIONS</h2>
                  </div>
                </div>
              </div>

              {/* Missions list */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 py-2">
                {missions.map(m => {
                  return (
                    <div 
                      key={m.id}
                      className={`p-4 rounded-sm border flex items-center justify-between transition-all duration-300 ${
                        m.claimed ? 'border-white/5 bg-zinc-950/40 opacity-40' : 'border-white/10 bg-zinc-950/80 hover:border-white/25 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-wide">
                          {m.text}
                        </span>
                        
                        {/* Rewards display */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[7.5px] font-bold text-white/30 tracking-wider uppercase">REWARDS:</span>
                          {Object.entries(m.reward).map(([key, val]) => (
                            <span key={key} className="text-[9px] font-black uppercase tracking-wider text-amber-500 font-mono">
                              +{val} {key}
                            </span>
                          ))}
                        </div>
                      </div>

                      {m.claimed ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 text-[9px] font-black text-white/30 tracking-widest uppercase rounded-[2px]">
                          <Check className="w-3.5 h-3.5 text-white/30" />
                          CLAIMED
                        </div>
                      ) : (
                        <button
                          onClick={() => claimMission(m.id, m.reward)}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-500/20 text-black text-[9.5px] font-black tracking-widest uppercase rounded-[2px] cursor-pointer transition-colors"
                        >
                          CLAIM CREDITS
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ================= DEPOT INVENTORY VIEW ================= */}
          {activePanel === 'depot' && (
            <motion.div 
              key="depot-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full p-4 md:p-8 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActivePanel('main')}
                    className="w-9 h-9 border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center rounded-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND COMBAT LOGISTICS</span>
                    <h2 className="text-xl font-black uppercase tracking-tight">СКЛАД СНАРЯЖЕНИЯ // DEPOT INVENTORY</h2>
                  </div>
                </div>
              </div>

              {/* Depot Materials list */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
                {[
                  { name: 'Orundum Crystals', code: 'ORUNDUM', amount: orundum, color: 'text-blue-500 bg-blue-500/5 border-blue-500/20', desc: 'Sarkaz volcanic crystals used for recruiting elite operators.' },
                  { name: 'Originite Prime', code: 'ORIGINITE', amount: prime, color: 'text-amber-500 bg-amber-500/5 border-amber-500/20', desc: 'Rare crystalline mineral used to purchase elite skins or restore energy.' },
                  { name: 'Lungmen Credits', code: 'LMD_CRED', amount: lmd, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20', desc: 'Official currency of Lungmen, utilized for training and operator upgrades.' },
                  { name: 'Headhunt Permits', code: 'PERMITS', amount: permits, color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20', desc: 'Rhodes Island official permits that clear deployment of elite operators.' },
                  { name: 'Volcanic Ore', code: 'VOLC_ORE', amount: 84, color: 'text-white/40 bg-white/5 border-white/10', desc: 'Industrial ore harvested from Leithanien volcanoes. Used in high-tech material processing.' },
                  { name: 'Lop-ear Token', code: 'LOP_TOKN', amount: 12, color: 'text-white/40 bg-white/5 border-white/10', desc: 'Special security token representing Amiya\'s clearance inside Rhodes Island core system.' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-sm border flex flex-col justify-between ${item.color} shadow-sm h-36`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black tracking-widest uppercase opacity-40">ITEM_{idx + 1}</span>
                        <span className="text-[12px] font-black font-mono">{item.amount.toLocaleString()}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-white mt-2 truncate">{item.name}</h4>
                      <p className="text-[7.5px] uppercase tracking-tight text-white/40 leading-relaxed mt-1 line-clamp-3">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-[7px] font-mono tracking-widest uppercase mt-auto block opacity-50">
                      IDCODE: {item.code}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* --- ASSISTANT SELECTOR POPUP MODAL --- */}
      {isChangingAssistant && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-xl bg-zinc-950 border border-white/10 p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsChangingAssistant(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="border-b border-white/5 pb-3 mb-4">
              <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND ASSISTANT ROSTER</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">ВЫБОР ПОМОЩНИКА // CHOOSE ASSISTANT</h3>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-2 custom-scrollbar">
              {OPERATORS_LIST.map(op => {
                const isActive = assistantId === op.id;
                
                return (
                  <button
                    key={op.id}
                    onClick={() => {
                      setAssistantId(op.id);
                      setIsChangingAssistant(false);
                      // Check mission 1
                      const updatedMissions = [...missions];
                      if (!updatedMissions[0].claimed) {
                        claimMission('m1', updatedMissions[0].reward);
                      }
                    }}
                    className={`w-full p-3 border rounded-sm text-left flex items-center gap-4 transition-all duration-300 ${
                      isActive ? 'border-blue-600 bg-blue-950/10' : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Portrait Crop */}
                    <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 rounded-sm">
                      <img 
                        src={op.avatar} 
                        alt=""
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black uppercase tracking-wide text-white">{op.name}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: op.rarity - 2 }).map((_, rIdx) => (
                            <Star key={rIdx} className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-white/40 uppercase mt-0.5">{op.chineseName} // {op.profession}</span>
                      <p className="text-[9px] uppercase font-bold text-white/30 truncate mt-1">"{op.quote}"</p>
                    </div>

                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- MAIL MODAL --- */}
      {isMailOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-xl bg-zinc-950 border border-white/10 p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsMailOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="border-b border-white/5 pb-3 mb-4">
              <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">RHODES ISLAND INBOX</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">ВХОДЯЩИЕ // MAIL</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="p-4 border border-blue-500/30 bg-blue-950/10 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-blue-400">SYS_NOTICE</span>
                  <span className="text-[9px] text-white/40 font-mono">JUST NOW</span>
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide mb-1">Установка веб-приложения</h4>
                <p className="text-[10px] text-white/70 uppercase tracking-wide">
                  Доктор, система ПРТС сообщает, что вы можете установить веб-приложение нашего сайта для более удобного доступа к архивам. Пожалуйста, воспользуйтесь функцией браузера "Добавить на главный экран" (Install App).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NEWS MODAL --- */}
      {isNewsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-xl bg-zinc-950 border border-white/10 p-6 shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 rounded-sm">
            <button 
              onClick={() => setIsNewsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="border-b border-white/5 pb-3 mb-4">
              <span className="text-[9px] text-blue-500 font-black tracking-[0.2em] uppercase font-mono">BREAKING NEWS</span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ОБЪЯВЛЕНИЯ // NEWS' : 'ANNOUNCEMENTS // NEWS'}
              </h3>
            </div>
            
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
              {NEWS_ITEMS.map((item, idx) => (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full aspect-[2/1] bg-zinc-950/80 border rounded-sm shadow-2xl relative overflow-hidden group transition-all duration-300 block cursor-pointer ${
                    idx === currentNewsIndex ? 'border-blue-500/80 shadow-blue-500/10' : 'border-white/10 hover:border-blue-500/40'
                  }`}
                  onClick={() => setCurrentNewsIndex(idx)}
                >
                  <div className="absolute inset-0">
                    <img 
                      src={wrapUrlWithProxy(item.image)} 
                      alt={item.title || 'Breaking News'} 
                      className="w-full h-full object-cover transition-all duration-500 ease-in-out group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

                  {/* Red BREAKING NEWS Badge */}
                  <div className="absolute top-0 left-0 bg-[#b80000] text-white px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider font-mono z-20 shadow-[0_2px_4px_rgba(0,0,0,0.4)] border-r border-b border-red-800/20">
                    BREAKING NEWS
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS PANEL --- */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-[#0c0c0e] flex flex-col animate-in fade-in duration-300">
          {/* Header */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-zinc-950/50">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-blue-500 animate-[spin_8s_linear_infinite]" />
              <div className="flex flex-col">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {t.system_configuration || 'SYSTEM CONFIGURATION'}
                </h3>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/60 rounded-sm text-blue-500 text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.close || 'CLOSE'}</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full">
            
            {/* 1. Language Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-3 font-mono">
                <Languages className="w-4 h-4 text-blue-500" />
                {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ЯЗЫК ИНТЕРФЕЙСА // LANGUAGE' : 'INTERFACE LANGUAGE'}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`p-3.5 rounded-sm border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      lang === l.id 
                        ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-zinc-950/60 border-white/10 text-white/60 hover:bg-zinc-900 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider">{l.label}</span>
                      <span className="text-[8px] text-white/30 tracking-widest uppercase font-mono mt-0.5">
                        {l.isOfficial ? 'OFFICIAL' : 'COMMUNITY'}
                      </span>
                    </div>
                    {lang === l.id && <Check className="w-3.5 h-3.5 text-blue-500 font-bold" />}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Sound Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-3 font-mono">
                <Volume2 className="w-4 h-4 text-blue-500" />
                {t.sound_settings || 'SOUND SETTINGS'}
              </h3>
              
              <div className="space-y-4 bg-zinc-950/40 p-4 border border-white/5 rounded-sm">
                {/* BGM Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.bgm_volume || 'BGM VOLUME'}</span>
                    <span className="font-mono text-blue-500">{Math.round(settings.bgmVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.bgmVolume} 
                    onChange={(e) => handleVolumeChange('bgm', parseFloat(e.target.value))}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* SFX Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.sfx_volume || 'SFX VOLUME'}</span>
                    <span className="font-mono text-blue-500">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.sfxVolume} 
                    onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Voice Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.voice_volume || 'VOICE VOLUME'}</span>
                    <span className="font-mono text-blue-500">{Math.round(settings.voiceVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.voiceVolume} 
                    onChange={(e) => handleVolumeChange('voice', parseFloat(e.target.value))}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* 3. Text Speed & Auto Delay Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-3 font-mono">
                <Play className="w-4 h-4 text-blue-500" />
                {t.auto_play_settings || 'AUTO-MODE SETTINGS'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Text Speed */}
                <div className="space-y-2 bg-zinc-950/40 p-4 border border-white/5 rounded-sm">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.text_speed || 'TEXT SPEED'}</span>
                    <span className="font-mono text-blue-500">{settings.textSpeed}ms</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={settings.textSpeed} 
                    onChange={(e) => handleUpdateSettings({ textSpeed: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/30 font-mono">
                    <span>{t.fast || 'INSTANT'} (10ms)</span>
                    <span>{t.slow || 'SLOW'} (100ms)</span>
                  </div>
                </div>

                {/* Auto Delay */}
                <div className="space-y-2 bg-zinc-950/40 p-4 border border-white/5 rounded-sm">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.auto_delay || 'AUTO DELAY'}</span>
                    <span className="font-mono text-blue-500">{(settings.autoDelay / 1000).toFixed(1)}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="5000" 
                    step="250"
                    value={settings.autoDelay} 
                    onChange={(e) => handleUpdateSettings({ autoDelay: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/30 font-mono">
                    <span>{t.short || 'SHORT'} (0.5s)</span>
                    <span>{t.long || 'LONG'} (5.0s)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Display Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-3 font-mono">
                <Type className="w-4 h-4 text-blue-500" />
                {t.display_settings || 'DISPLAY SETTINGS'}
              </h3>

              <div className="space-y-4 bg-zinc-950/40 p-4 border border-white/5 rounded-sm">
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-white/60">
                    <span className="uppercase">{t.font_size || 'FONT SIZE'}</span>
                    <span className="font-mono text-blue-500">{settings.fontSize}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="75" 
                    max="150" 
                    step="5"
                    value={settings.fontSize} 
                    onChange={(e) => handleUpdateSettings({ fontSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Font Preview Block */}
                <div className="p-4 bg-black/60 border border-white/10 rounded-sm text-center">
                  <p 
                    className="text-white/80 transition-all duration-200"
                    style={{ fontSize: `${settings.fontSize}%`, fontFamily: settings.fontFamily }}
                  >
                    {t.font_preview || 'Съешь ещё этих мягких французских булок, да выпей чаю.'}
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Account Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-3 font-mono">
                <User className="w-4 h-4 text-blue-500" />
                {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ПРОФИЛЬ И СВЯЗЬ // ACCOUNT' : 'ACCOUNT & CONNECTIONS'}
              </h3>

              <div className="space-y-4 bg-zinc-950/40 p-4 border border-white/5 rounded-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider font-mono">
                      {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'АВТОРИЗАЦИЯ DISCORD' : 'DISCORD AUTHORIZATION'}
                    </h4>
                    <p className="text-[9px] text-white/40 uppercase tracking-wide mt-1 font-mono">
                      {lang === 'ru_RU' || lang === 'ru_RU_CN' 
                        ? 'Свяжите профиль с Discord для участия в жизни проекта.' 
                        : 'Link your profile with Discord to participate in the project.'}
                    </p>
                  </div>

                  <div>
                    {isCheckingDiscord ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase font-mono px-4 py-2 border border-white/5 bg-white/5 rounded-sm">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Checking...</span>
                      </div>
                    ) : discordUser ? (
                      <div className="flex items-center gap-3 bg-zinc-900/80 border border-white/10 p-2.5 rounded-sm">
                        {discordUser.avatar ? (
                          <img 
                            src={discordUser.avatar} 
                            alt={discordUser.username} 
                            className="w-8 h-8 rounded-full border border-white/10" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center border border-[#5865F2]/40 text-xs font-bold font-mono">
                            D
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white font-mono uppercase tracking-wider">
                            {discordUser.username}
                          </span>
                          <span className="text-[7px] font-black text-white/40 font-mono uppercase tracking-wider">
                            {isDiscordMember 
                              ? (lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'УЧАСТНИК СЕРВЕРА' : 'SERVER MEMBER')
                              : (lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'НЕ НА СЕРВЕРЕ' : 'NOT ON SERVER')}
                          </span>
                        </div>
                        <button 
                          onClick={handleDiscordLogout} 
                          className="ml-4 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[8px] font-black uppercase tracking-widest font-mono rounded-sm cursor-pointer transition-all duration-200"
                        >
                          {lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ВЫЙТИ' : 'LOGOUT'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleDiscordLogin}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/40 hover:border-[#5865F2] text-white hover:shadow-[0_0_15px_rgba(88,101,242,0.2)] rounded-sm text-[10px] font-black uppercase tracking-widest font-mono transition-all duration-200 cursor-pointer"
                      >
                        <DiscordIcon size={14} className="text-white" />
                        <span>{lang === 'ru_RU' || lang === 'ru_RU_CN' ? 'ВОЙТИ ЧЕРЕЗ DISCORD' : 'LOGIN WITH DISCORD'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Reset button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={resetSettings}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-sm text-white/60 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.reset_settings || 'RESET TO DEFAULT'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- REPORT MODAL --- */}
      {isReportOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setIsReportOpen(false)}>
          <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-300 relative my-auto max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setIsReportOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <span className="text-xs font-black tracking-widest text-white uppercase">{t.report_issue || 'REPORT ISSUE'}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Discord Bug Report */}
              <div className="flex flex-col border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
                <span className="text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase font-mono mb-4 block">
                  DISCORD REPORT SERVICE
                </span>

                {isCheckingDiscord ? (
                  <div className="flex flex-col items-center justify-center py-12 flex-1">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin mb-3" />
                    <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Checking Auth...</span>
                  </div>
                ) : !discordUser ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                    <MessageSquare className="w-8 h-8 text-white/20 mb-4" />
                    <p className="text-[11px] text-white/70 uppercase tracking-wider mb-6 leading-relaxed">
                      {isRussian 
                        ? 'Авторизуйтесь через Discord для отправки репорта напрямую разработчикам.' 
                        : 'Log in via Discord to submit a report directly to the developers.'}
                    </p>
                    <button
                      onClick={handleDiscordLogin}
                      className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-3 rounded-sm w-full transition-colors text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      <DiscordIcon className="w-4 h-4 fill-white" />
                      {isRussian ? 'Войти через Discord' : 'Log in via Discord'}
                    </button>
                  </div>
                ) : !isDiscordMember ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                    <MessageSquare className="w-8 h-8 text-red-500/50 mb-4 animate-pulse" />
                    <p className="text-[11px] text-white/70 uppercase tracking-wider mb-6 leading-relaxed">
                      {isRussian ? (
                        <>
                          Вы вошли как <strong className="text-blue-400">{discordUser.username}</strong>.<br />
                          Но вы должны быть участником нашего сервера для отправки репортов.
                        </>
                      ) : (
                        <>
                          You are logged in as <strong className="text-blue-400">{discordUser.username}</strong>.<br />
                          However, you must be a member of our Discord server to submit reports.
                        </>
                      )}
                    </p>
                    <a
                      href="https://discord.gg/jYvWPeCjC3"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-3 rounded-sm w-full transition-colors text-[10px] font-black uppercase tracking-wider mb-3 cursor-pointer"
                    >
                      {isRussian ? 'Присоединиться к Discord' : 'Join Discord'} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={fetchDiscordUser}
                      className="flex items-center justify-center border border-white/10 hover:border-white/20 hover:bg-white/5 text-white px-5 py-3 rounded-sm w-full transition-colors text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      {isRussian ? 'Проверить снова' : 'Check again'}
                    </button>
                  </div>
                ) : reportSuccess ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                      <Send className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-wider mb-1">
                      {isRussian ? 'Успешно отправлено!' : 'Successfully submitted!'}
                    </span>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-6">
                      {isRussian ? 'Спасибо! Ваш репорт доставлен разработчикам.' : 'Thank you! Your report has been delivered to the developers.'}
                    </p>
                    <button
                      onClick={() => setReportSuccess(false)}
                      className="border border-white/10 hover:border-white/20 hover:bg-white/5 text-white px-6 py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest cursor-pointer"
                    >
                      {isRussian ? 'Отправить еще один' : 'Send another'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-4 flex flex-col flex-1">
                    {/* Logged in as banner */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-sm text-[10px] font-mono">
                      <span className="text-white/40">{isRussian ? 'ОТПРАВИТЕЛЬ:' : 'SENDER:'}</span>
                      <span className="text-blue-400 font-bold">{discordUser.username}</span>
                    </div>

                    {/* Type selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
                        {isRussian ? 'Тип проблемы:' : 'Issue type:'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReportType('translation')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer ${
                            reportType === 'translation' 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                              : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isRussian ? 'Текст / Перевод' : 'Text / Translation'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setReportType('player')}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-sm border transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer ${
                            reportType === 'player' 
                              ? 'border-red-500 bg-red-500/10 text-red-400' 
                              : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {isRussian ? 'Плеер / Баг' : 'Player / Bug'}
                        </button>
                      </div>
                    </div>

                    {/* Description textarea */}
                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <label className="text-[10px] font-black tracking-wider text-white/50 uppercase">
                        {isRussian ? 'Описание проблемы:' : 'Issue description:'}
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder={isRussian ? "Опишите баг или неточность в переводе..." : "Describe a bug or translation error..."}
                        required
                        className="w-full h-28 bg-white/5 border border-white/10 rounded-sm p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-[11px] font-medium resize-none"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>

                    {reportError && (
                      <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-sm text-[9px] font-mono text-red-400">
                        {reportError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isReportSubmitting || !reportDescription.trim()}
                      className="w-full bg-white text-black py-3 rounded-sm font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isReportSubmitting ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          {isRussian ? 'Отправить репорт в Discord' : 'Submit Report to Discord'}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: SKPORT Profile */}
              <div className="flex flex-col justify-between h-full">
                <div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#BFFF00] uppercase font-mono mb-4 block">
                    SKPORT PROFILE
                  </span>
                  
                  <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider mb-3">
                    {t.found_error || 'FOUND AN ERROR OR TYPO?'}
                  </p>
                  <p className="text-[10px] text-white/70 font-bold leading-relaxed uppercase tracking-tight mb-4">
                    {t.report_description || 'YOU CAN DIRECTLY REPORT THE WRITING ISSUES OR SUBMIT SOURCE TRANSLATIONS THROUGH SKPORT MESSAGES.'}
                  </p>
                  
                  <div className="flex flex-col items-center py-4 bg-white/5 border border-white/10 rounded-sm mb-4">
                    <div className="p-3 bg-white rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      <QRCodeSVG 
                        value="https://www.skport.com/profile?id=9963327784768"
                        size={120}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "https://www.google.com/s2/favicons?domain=skport.com&sz=128",
                          height: 24,
                          width: 24,
                          excavate: true,
                        }}
                      />
                    </div>
                  </div>
                  
                  <a 
                    href="https://www.skport.com/profile?id=9963327784768" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-3 px-4 bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase tracking-[0.2em] text-center justify-center rounded-sm"
                  >
                    SKPORT PROFILE
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
