import React, { useState, useEffect, useRef } from 'react';
import { fetchChapterList, getImageUrl, setLanguage, getLanguage, checkImageExists, getPrtsWikiImageUrl, checkScriptExists } from '../services/storyService';
import { StoryChapter, StoryEpisode, Language } from '../types';
import { ChevronRight, Loader2, AlertCircle, BookOpen, BookOpenText, ArrowLeft, Star, Zap, User, LayoutGrid, Globe, History, Clock, Home, Settings, Music, Info, Search, Play, Flag, X, Check, ChevronDown, Languages } from 'lucide-react';
import { UI_STRINGS } from '../translations';
import { OperationRecordsGraph } from './OperationRecordsGraph';
import { STORY_LINES_DATA, STORY_LINE_FILTERS } from '../config/storylines';
import { TRANSLATION_REGISTRY } from '../config/translationsRegistry';
import { QRCodeSVG } from 'qrcode.react';

interface ChapterSelectorProps {
  onSelect: (chapter: StoryChapter) => void;
  onOpenTranslation?: (chapter?: StoryChapter, episode?: StoryEpisode) => void;
}

const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: 'zh_CN', label: '简体中文', isOfficial: true },
  { id: 'zh_TW', label: '繁體中文', isOfficial: true },
  { id: 'de_DE', label: 'Deutsch', isOfficial: false },
  { id: 'en_US', label: 'English', isOfficial: true },
  { id: 'es_ES', label: 'Español', isOfficial: false },
  { id: 'fr_FR', label: 'Français', isOfficial: false },
  { id: 'id_ID', label: 'Indonesia', isOfficial: false },
  { id: 'it_IT', label: 'Italiano', isOfficial: false },
  { id: 'ja_JP', label: '日本語', isOfficial: true },
  { id: 'ko_KR', label: '한국어', isOfficial: true },
  { id: 'pt_PT', label: 'Português', isOfficial: false },
  { id: 'ru_RU', label: 'Русский', isOfficial: false },
];

const CHRONO_ORDER: Record<string, number> = {
  // --- 1094-1095 ---
  'wd': 10, 'intermezzo_wd': 10, // Walk in the Dust (Kal'tsit's past)
  
  // --- 1096 (Act 0) ---
  'main_0': 100, 'main_1': 101, 'main_2': 102, 'main_3': 103,
  
  // --- 1097 (Act I & Early Side Stories) ---
  'main_4': 200, 'main_5': 201, 'main_6': 202, 'main_7': 203, 'main_8': 204,
  'vigilo': 205, 'vignette_vigilo': 205,
  'gt': 210, 'sidestory_gt': 210, // Grani and the Knights' Treasure
  'of': 220, 'sidestory_of': 220, // Heart of Surging Flame
  'cb': 230, 'sidestory_cb': 230, // Code of Brawls
  'tw': 240, 'sidestory_tw': 240, // Twilight of Wolumonde
  'ri': 250, 'sidestory_ri': 250, // Gavial Return
  'mn': 260, 'sidestory_mn': 260, // Maria Nearl
  'mb': 270, 'sidestory_mb': 270, // Mansfield Break
  'od': 280, 'sidestory_od': 280, // Operation Originium Dust
  
  // --- 1098 (Intermezzos & Late Side Stories) ---
  'sv': 300, 'intermezzo_sv': 300, // Under Tides
  'dh': 310, 'sidestory_dh': 310, // Dossoles Holiday
  'nl': 320, 'sidestory_nl': 320, // Near Light
  'bi': 330, 'sidestory_bi': 330, // Break the Ice
  'ga': 340, 'sidestory_ga': 340, // Guiding Ahead
  'sn': 350, 'intermezzo_sn': 350, // Stultifera Navis
  'ic': 360, 'sidestory_ic': 360, // Ideal City
  'dv': 370, 'sidestory_dv': 370, // Dorothy's Vision
  
  // --- 1098-1099 (Act II) ---
  'main_9': 400, 'main_10': 401, 'main_11': 402, 'main_12': 403, 'main_13': 404, 'main_14': 405,
  
  // --- 1100+ ---
  'main_15': 500, 'main_16': 501,
};

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ onSelect, onOpenTranslation }) => {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<StoryEpisode | null>(null);
  const [activeTab, setActiveTab] = useState<string>('STORY');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'chrono'>('chrono');
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterImages, setChapterImages] = useState<Record<string, string | null>>({});
  const [episodeImages, setEpisodeImages] = useState<Record<string, string | null>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<Language>(getLanguage());
  const [hoveredEpisodeId, setHoveredEpisodeId] = useState<string | null>(null);
  const [selectedAct, setSelectedAct] = useState<string>('Act II');
  const [viewMode, setViewMode] = useState<'STORYLINE' | 'YEAR' | 'ALL'>('STORYLINE');
  const [selectedStoryLine, setSelectedStoryLine] = useState<string>('main');
  const [selectedYear, setSelectedYear] = useState<number>(1); // Default to Year 1
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEpisodesOnMobile, setShowEpisodesOnMobile] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  const t = UI_STRINGS[lang];

  const tabs = [
    { id: 'STORY', label: 'Story', subLabel: '剧情', icon: BookOpen },
    { id: 'NONE', label: 'Records', subLabel: '干员密录', icon: User },
  ];

  const filteredEpisodes = React.useMemo(() => {
    const getSortWeight = (ep: StoryEpisode) => {
      if (viewMode === 'YEAR' || selectedStoryLine === 'main') return null;
      
      const prefixes = STORY_LINE_FILTERS[selectedStoryLine] || [];
      const lowerId = ep.id.toLowerCase();
      const lowerName = (ep.name || '').toLowerCase();
      const lowerChineseName = (ep.chineseName || '').toLowerCase();

      for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        if (!prefix) continue;
        const lowerPrefix = prefix.toLowerCase();
        
        if (lowerId === lowerPrefix) return i;
        if (lowerPrefix.length <= 5 && lowerId.startsWith(lowerPrefix)) return i;
        if (lowerId.includes(lowerPrefix)) return i;
        if (lowerName.includes(lowerPrefix)) return i;
        if (lowerChineseName.includes(lowerPrefix)) return i;
      }
      return 999;
    };

    return episodes
      .filter(ep => {
        if (activeTab !== 'STORY') return ep.entryType === 'NONE';
        
        // Exclude Operator Records from Story tab
        if (ep.entryType === 'NONE') return false;
        
        if (viewMode === 'ALL') return true;
        
        if (viewMode === 'YEAR') {
          return ep.year === selectedYear;
        }

        // STORYLINE mode
        // Special handling for Main Story
        if (selectedStoryLine === 'main') {
          return ep.entryType === 'MAINLINE' || ep.id.toLowerCase().startsWith('main_');
        }

        const prefixes = STORY_LINE_FILTERS[selectedStoryLine] || [];
        if (prefixes.length === 0) return false;

        return prefixes.some(prefix => {
          if (!prefix) return false;
          const lowerPrefix = prefix.toLowerCase();
          const lowerId = ep.id.toLowerCase();
          const lowerName = (ep.name || '').toLowerCase();
          const lowerChineseName = (ep.chineseName || '').toLowerCase();
          
          // 1. Exact ID match
          if (lowerId === lowerPrefix) return true;
          
          // 2. Prefix match for short codes (e.g., 'main_')
          if (lowerPrefix.length <= 5 && lowerId.startsWith(lowerPrefix)) return true;
          
          // 3. Partial matches for ID, Name, or Chinese Name
          if (lowerId.includes(lowerPrefix)) return true;
          if (lowerName.includes(lowerPrefix)) return true;
          if (lowerChineseName.includes(lowerPrefix)) return true;
          
          return false;
        });
      })
      .filter(ep => {
        const query = searchQuery.toLowerCase();
        if (!query) return true;
        return (ep.name || '').toLowerCase().includes(query) || 
               (ep.chineseName || '').toLowerCase().includes(query) || 
               (ep.englishName || '').toLowerCase().includes(query) || 
               ep.id.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        // Custom sort by STORY_LINE_FILTERS order (only in STORYLINE mode)
        if (viewMode === 'STORYLINE') {
          const weightA = getSortWeight(a);
          const weightB = getSortWeight(b);

          if (weightA !== null && weightB !== null && weightA !== weightB) {
            return weightA - weightB;
          }
        }

        if (sortOrder === 'chrono') {
          const orderA = CHRONO_ORDER[a.id.toLowerCase()] || 9999;
          const orderB = CHRONO_ORDER[b.id.toLowerCase()] || 9999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.startTime || 0) - (b.startTime || 0);
        }
        const timeA = a.startTime || 0;
        const timeB = b.startTime || 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [episodes, activeTab, selectedYear, searchQuery, sortOrder, selectedStoryLine, viewMode]);

  useEffect(() => {
    const el = horizontalScrollRef.current;
    if (el) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 2,
          behavior: 'auto'
        });
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }
  }, [filteredEpisodes, activeTab]);

  const currentActInfo = React.useMemo(() => {
    return null;
  }, []);

  useEffect(() => {
    // Removed selectedAct logic
  }, [activeTab]);

  const arkYears = React.useMemo(() => {
    const years = new Set(episodes.map(ep => ep.year || 1));
    return Array.from(years)
      .sort((a, b) => (a as number) - (b as number))
      .map(year => ({
        value: year as number,
        label: t.year_n(year as number)
      }));
  }, [episodes, t]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      const list = await fetchChapterList();
      
      setEpisodes(list);
      setLoading(false);
      
      // Load images in background
      const loadBatch = async (items: StoryEpisode[]) => {
        const images: Record<string, string> = {};
        const nonMainline: StoryEpisode[] = [];

        items.forEach(ep => {
          const isMainline = ep.id.toLowerCase().startsWith('main_') || ep.entryType === 'MAINLINE';
          const imageId = ep.storyEntryPicId || ep.id;
          if (isMainline) {
            images[ep.id] = `https://r2.m31ns.top/img/icons/${imageId}.png`;
          } else {
            nonMainline.push(ep);
            // Fallback while loading
            images[ep.id] = `https://r2.m31ns.top/img/banners/${imageId}.png`;
          }
        });
        setEpisodeImages(prev => ({ ...prev, ...images }));
      };

      loadBatch(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEpisodes();
  }, [lang]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setLang(newLang);
    setSelectedEpisode(null);
  };

  useEffect(() => {
    if (episodes.length > 0 && activeTab === 'ALL') {
      setActiveTab('MAINLINE');
    }
  }, [episodes]);

  const [chapterScriptsExist, setChapterScriptsExist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedEpisode) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      const loadChapterData = async () => {
        const images: Record<string, string | null> = {};
        const existence: Record<string, boolean> = {};
        
        await Promise.all(selectedEpisode.chapters.map(async (chapter) => {
          const imageId = chapter.storyPic || chapter.iconId;
          if (imageId) {
            const url = await getImageUrl('image', imageId);
            images[chapter.id] = url;
          }
          
          // Check if script exists for current language
          const exists = await checkScriptExists(chapter.storyTxt, lang);
          existence[chapter.id] = exists;
        }));
        
        setChapterImages(images);
        setChapterScriptsExist(existence);
      };
      loadChapterData();
    }
  }, [selectedEpisode, lang]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl font-medium">{t.fetching}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1a1a1a] text-white p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-2xl font-bold mb-2">Error</p>
        <p className="text-gray-400 mb-6 text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white relative overflow-hidden font-sans">
      {/* Background Layer - Blurred Episode Art */}
      <div className="absolute inset-0 z-0 transition-all duration-1000">
        {hoveredEpisodeId && episodeImages[hoveredEpisodeId] ? (
          <div className="absolute inset-0">
            <img 
              src={episodeImages[hoveredEpisodeId]!} 
              alt="" 
              className="w-full h-full object-cover blur-xl scale-110 opacity-40 transition-opacity duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          </div>
        ) : selectedEpisode && episodeImages[selectedEpisode.id] ? (
          <div className="absolute inset-0">
            <img 
              src={episodeImages[selectedEpisode.id]!} 
              alt="" 
              className="w-full h-full object-cover blur-xl scale-110 opacity-40 transition-opacity duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0a]" />
        )}
      </div>

      {/* Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden z-10 relative h-full">
        {!selectedEpisode ? (
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Top Header */}
            {activeTab !== 'NONE' && (
              <div className="px-6 md:px-12 pt-8 md:pt-10 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between z-20 relative shrink-0 gap-6 md:gap-0">
                <div className="flex items-center gap-6 md:gap-12 w-full md:w-auto overflow-x-auto no-scrollbar">
                  <div className="flex flex-col min-w-max">
                    <span className="text-[8px] md:text-[10px] font-bold text-white/30 tracking-widest uppercase">{t.stories_found_label}</span>
                    <span className="text-lg md:text-2xl font-black text-white tracking-widest uppercase leading-none">{filteredEpisodes.length.toString().padStart(3, '0')}</span>
                  </div>
                  <div className="w-px h-8 md:h-10 bg-white/10 shrink-0" />
                  <div className="flex flex-col min-w-max">
                    <span className="text-[8px] md:text-[10px] font-bold text-white/30 tracking-widest uppercase">Current Sector</span>
                    <span className="text-lg md:text-2xl font-black text-white tracking-widest uppercase">
                      {viewMode === 'ALL' ? 'ALL ARCHIVES' : (viewMode === 'STORYLINE' 
                        ? STORY_LINES_DATA.find(l => l.id === selectedStoryLine)?.topText 
                        : t.year_n(selectedYear))}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => setViewMode(viewMode === 'ALL' ? 'STORYLINE' : 'ALL')}
                    className={`px-4 md:px-8 py-2 md:py-3 border transition-all flex items-center gap-3 group rounded-sm ${viewMode === 'ALL' ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-white/20 text-white hover:bg-white/10 hover:border-white/40'}`}
                  >
                    <LayoutGrid className={`w-3.5 h-3.5 md:w-4 md:h-4 ${viewMode === 'ALL' ? 'text-black' : 'text-white/40 group-hover:text-white'}`} />
                    <span className="text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase">All</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden h-full">
              {activeTab === 'NONE' ? (
                <OperationRecordsGraph 
                  episodes={filteredEpisodes} 
                  episodeImages={episodeImages} 
                  onSelectEpisode={setSelectedEpisode} 
                />
              ) : (
                <div className="flex-1 flex overflow-hidden h-full">
                  {/* LEFT MENU */}
                  {viewMode !== 'ALL' && (
                    <div className={`${isMobile && showEpisodesOnMobile ? 'hidden' : 'flex'} w-full md:w-72 shrink-0 flex-col overflow-y-auto custom-scrollbar relative z-20 bg-black/60 backdrop-blur-md border-r border-white/5 h-full`}>
                       {/* View Mode Toggle */}
                       <div className="flex border-b border-white/5 shrink-0">
                         <button 
                           onClick={() => setViewMode('STORYLINE')}
                           className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${viewMode === 'STORYLINE' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                         >
                           Story Line
                         </button>
                         <button 
                           onClick={() => setViewMode('YEAR')}
                           className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${viewMode === 'YEAR' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                         >
                           Year
                         </button>
                       </div>

                       <div className="py-4 px-6 mb-2 shrink-0 flex flex-col gap-1">
                         <span className="text-[10px] font-bold text-white/20 tracking-[0.2em] uppercase">
                           {viewMode === 'STORYLINE' ? 'Storyline Selection' : 'Year Selection'}
                         </span>
                         <span className="text-[8px] font-medium text-white/40 tracking-wider uppercase md:hidden">
                           {t.select_hint}
                         </span>
                       </div>

                       <div className="flex-1 overflow-y-auto custom-scrollbar">
                         {viewMode === 'STORYLINE' ? (
                           STORY_LINES_DATA.map(line => (
                             <button 
                               key={line.id} 
                               onClick={() => {
                                 setSelectedStoryLine(line.id);
                                 if (isMobile) setShowEpisodesOnMobile(true);
                               }} 
                               className={`group relative w-full flex items-center gap-4 py-6 px-8 transition-all border-r-4 ${selectedStoryLine === line.id ? 'border-white bg-white/10' : 'border-transparent hover:bg-white/5'}`}
                             >
                               {selectedStoryLine === line.id && (
                                 <>
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                   <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                 </>
                               )}
                               <div className={`w-10 h-10 shrink-0 flex items-center justify-center transition-transform duration-300 ${selectedStoryLine === line.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                                 <img 
                                   src={`https://raw.githubusercontent.com/fexli/ArknightsResource/main/camplogo/logo_${line.logo}.png`} 
                                   alt={line.topText}
                                   className={`max-w-full max-h-full object-contain brightness-0 invert transition-opacity duration-300 ${selectedStoryLine === line.id ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`} 
                                   onError={(e) => {
                                     (e.target as HTMLImageElement).style.display = 'none';
                                   }}
                                 />
                               </div>
                               <div className="flex flex-col items-start overflow-hidden">
                                 <span className={`text-[11px] font-black tracking-[0.15em] text-left uppercase transition-colors duration-300 ${selectedStoryLine === line.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>{line.topText}</span>
                                 <span className={`text-[9px] font-bold text-left mt-0.5 transition-colors duration-300 ${selectedStoryLine === line.id ? 'text-white/60' : 'text-white/20 group-hover:text-white/40'}`}>{line.bottomText}</span>
                               </div>
                               
                               {selectedStoryLine === line.id && (
                                 <div className="ml-auto">
                                   <div className="w-1.5 h-1.5 bg-white rotate-45" />
                                 </div>
                               )}
                             </button>
                           ))
                         ) : (
                           arkYears.map(year => (
                             <button 
                               key={year.value} 
                               onClick={() => {
                                 setSelectedYear(year.value);
                                 if (isMobile) setShowEpisodesOnMobile(true);
                               }} 
                               className={`group relative w-full flex items-center gap-4 py-6 px-8 transition-all border-r-4 ${selectedYear === year.value ? 'border-white bg-white/10' : 'border-transparent hover:bg-white/5'}`}
                             >
                               {selectedYear === year.value && (
                                 <>
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                   <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                 </>
                               )}
                               <div className="flex flex-col items-start overflow-hidden">
                                 <span className={`text-2xl font-black tracking-[0.2em] text-left uppercase transition-colors duration-300 ${selectedYear === year.value ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                                   {year.label}
                                 </span>
                                 <span className={`text-[9px] font-bold text-left mt-0.5 transition-colors duration-300 ${selectedYear === year.value ? 'text-white/60' : 'text-white/20 group-hover:text-white/40'}`}>
                                   Arknights Era
                                 </span>
                               </div>
                               
                               {selectedYear === year.value && (
                                 <div className="ml-auto">
                                   <div className="w-1.5 h-1.5 bg-white rotate-45" />
                                 </div>
                               )}
                             </button>
                           ))
                         )}
                       </div>
                       <div className="mt-auto p-6 shrink-0 border-t border-white/5 bg-white/[0.02]">
                          <p className="text-[7px] font-medium text-white/20 leading-relaxed uppercase tracking-wider text-justify">
                            {t.disclaimer}
                          </p>
                       </div>
                    </div>
                  )}

                  {/* Vertical Grid Area */}
                  <div className={`${isMobile && !showEpisodesOnMobile && viewMode !== 'ALL' ? 'hidden' : 'flex'} flex-1 flex-col overflow-y-auto px-6 md:px-12 py-8 custom-scrollbar h-full bg-[#050505]/50`}>
                    {isMobile && showEpisodesOnMobile && viewMode !== 'ALL' && (
                      <button 
                        onClick={() => setShowEpisodesOnMobile(false)}
                        className="flex items-center gap-2 mb-6 text-white/40 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">Back to Storylines</span>
                      </button>
                    )}
                    {filteredEpisodes.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 md:gap-6 pb-32">
                        {filteredEpisodes.map((episode, index) => {
                          const isMainline = episode.id.toLowerCase().startsWith('main_') || episode.entryType === 'MAINLINE';
                          return (
                            <button
                              key={episode.id}
                              onClick={() => setSelectedEpisode(episode)}
                              onMouseEnter={() => setHoveredEpisodeId(episode.id)}
                              onMouseLeave={() => setHoveredEpisodeId(null)}
                              className="relative group transition-all duration-500 w-full text-left"
                            >
                              <div className={`w-full ${isMainline ? 'aspect-square' : 'aspect-[4/5]'} border border-white/10 group-hover:border-white/40 transition-all duration-500 overflow-hidden relative bg-black/80 shadow-2xl rounded-sm`}>
                                {/* Background Image */}
                                {episodeImages[episode.id] && !failedImages[episode.id] ? (
                                  <img 
                                    src={episodeImages[episode.id]!} 
                                    alt={episode.name} 
                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                                    referrerPolicy="no-referrer"
                                    onError={() => {
                                      setFailedImages(prev => ({ ...prev, [episode.id]: true }));
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a]">
                                    <AlertCircle className="w-8 h-8 text-white/5 mb-2" />
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No Visual Data</span>
                                  </div>
                                )}
                                
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-100 group-hover:opacity-60 transition-opacity duration-500" />
                                
                                {/* Content Overlay */}
                                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                  <div className="flex flex-col gap-1 translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="w-4 h-0.5 bg-white/30 group-hover:w-8 group-hover:bg-white transition-all duration-500" />
                                      <span className="text-[9px] font-mono text-white/20">{(index + 1).toString().padStart(3, '0')}</span>
                                    </div>
                                    <h4 className="text-xs md:text-sm font-black leading-tight tracking-tight text-white/90 group-hover:text-white transition-colors line-clamp-2 uppercase">
                                      {episode.name}
                                    </h4>
                                    <div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
                                      <span className="text-[8px] font-black text-white/30 tracking-widest uppercase truncate">{episode.id}</span>
                                      <span className="text-[8px] font-black text-white/20 tracking-widest uppercase italic">YEAR.{episode.year}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Hover Play Indicator */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
                                  <div className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                                    <Play className="w-3 h-3 text-white fill-white" />
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <div className="w-16 h-16 border border-white/20 flex items-center justify-center mb-4">
                          <div className="w-8 h-8 border-2 border-white/40 rotate-45 animate-pulse" />
                        </div>
                        <span className="text-xs font-black tracking-[0.3em] uppercase">No Records Found</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Chapter Selection View (when an episode is clicked)
          <div className="flex-1 flex flex-col p-8 md:p-16 animate-in fade-in zoom-in-95 duration-500 overflow-hidden h-full">
            <div className="flex items-center gap-8 mb-12">
              <button 
                onClick={() => setSelectedEpisode(null)}
                className="w-12 h-12 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">{selectedEpisode.name}</h2>
                {(() => {
                  const currentLangObj = LANGUAGES.find(l => l.id === lang);
                  if (currentLangObj && !currentLangObj.isOfficial) {
                    const registry = TRANSLATION_REGISTRY[lang];
                    if (registry && registry.translators.length > 0) {
                      return (
                        <div className="mt-2 text-sm text-white/50 flex items-center gap-2">
                          <span className="font-bold uppercase tracking-widest text-[10px] bg-white/10 px-2 py-0.5 rounded-sm">Translation</span>
                          <span className="font-medium">{registry.translators.join(', ')}</span>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto pr-4 custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedEpisode.chapters.map((chapter, idx) => {
                  const isOfficial = LANGUAGES.find(l => l.id === lang)?.isOfficial ?? true;
                  const scriptExists = chapterScriptsExist[chapter.id] ?? isOfficial; 
                  return (
                    <div
                      key={chapter.id}
                      className="group relative flex flex-col bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all duration-300 text-left overflow-hidden rounded-sm"
                    >
                      <div className="flex items-center gap-6 p-1">
                        {/* Chapter Index */}
                        <div className="w-16 h-16 bg-black flex flex-col items-center justify-center shrink-0 border-r border-white/10 relative overflow-hidden">
                          <span className="text-[10px] font-mono text-white/20 absolute top-1 left-2">NO.</span>
                          <span className="text-2xl font-black text-white/40 group-hover:text-white transition-colors">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          {/* Decorative line */}
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/0 group-hover:bg-white transition-all" />
                        </div>

                        <div className="flex-1 flex flex-col py-2 pr-4 relative">
                          <span className="text-white/60 text-[9px] font-mono font-bold tracking-widest mb-1">
                            {chapter.code || chapter.id.toUpperCase()}
                          </span>
                          <h3 className="text-white text-base font-black leading-tight uppercase tracking-tight group-hover:text-white transition-colors line-clamp-1 flex items-center">
                            {chapter.name}
                            {chapter.id.toLowerCase().includes('_beg') && (
                              <span className="ml-2 text-[8px] text-blue-400 font-bold border border-blue-400/30 px-1 rounded-sm shrink-0">BEG</span>
                            )}
                            {chapter.id.toLowerCase().includes('_mid') && (
                              <span className="ml-2 text-[8px] text-yellow-400 font-bold border border-yellow-400/30 px-1 rounded-sm shrink-0">MID</span>
                            )}
                            {chapter.id.toLowerCase().includes('_end') && (
                              <span className="ml-2 text-[8px] text-red-400 font-bold border border-red-400/30 px-1 rounded-sm shrink-0">END</span>
                            )}
                          </h3>
                        </div>
                      </div>

                      {/* Review/Translate Button Area (Footer) */}
                      <div className="h-0 group-hover:h-10 transition-all duration-300 overflow-hidden flex items-center justify-end px-4 bg-white/5 border-t border-white/0 group-hover:border-white/10">
                        <div className="flex gap-2 animate-in slide-in-from-bottom-2 duration-300">
                          <button 
                            onClick={() => onSelect(chapter)}
                            disabled={!scriptExists}
                            className="bg-white/10 border border-white/20 px-3 py-1 rounded-sm flex items-center gap-1.5 hover:bg-white hover:border-white hover:text-black transition-all group/btn disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white disabled:cursor-not-allowed"
                            title={scriptExists ? "Review Story" : "Script not available for this language"}
                          >
                            <Play className="w-2.5 h-2.5 fill-current group-hover/btn:text-black" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Review</span>
                          </button>
                          {!LANGUAGES.find(l => l.id === lang)?.isOfficial && (
                            <button 
                              onClick={() => onOpenTranslation?.(chapter, selectedEpisode)}
                              className="bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-sm flex items-center gap-1.5 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all group/btn"
                              title="Open Translation Tool"
                            >
                              <Languages className="w-2.5 h-2.5 group-hover/btn:text-white" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Translate</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hover Decoration */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/0 group-hover:bg-white transition-all" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="h-20 md:h-24 border-t border-white/5 z-20 relative bg-black/80 backdrop-blur-xl flex items-center px-6 md:px-16 justify-between shrink-0">
        <div className="flex items-center gap-4 md:gap-8 lg:gap-12 overflow-x-auto no-scrollbar flex-1 md:flex-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedEpisode(null);
                if (isMobile) setShowEpisodesOnMobile(false);
              }}
              className={`group flex flex-col items-center min-w-[70px] md:min-w-[80px] transition-all relative ${
                activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'text-white' : ''}`}>
                  {tab.label}
                </span>
                <span className={`text-[7px] md:text-[8px] font-bold opacity-40 transition-all ${activeTab === tab.id ? 'opacity-100 text-white/60' : ''}`}>
                  {tab.subLabel}
                </span>
              </div>
              
              {/* Active Indicator */}
              {activeTab === tab.id && (
                <div className="absolute -bottom-6 md:-bottom-8 left-0 right-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {/* Search Bar - Hidden on small mobile, shown on tablet+ */}
          <div className="hidden sm:relative group sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-white/60 transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH..."
              className="w-32 md:w-48 lg:w-64 bg-white/5 border border-white/10 rounded-sm py-2 pl-9 pr-4 text-[9px] md:text-[10px] font-black tracking-[0.2em] text-white placeholder:text-white/10 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all uppercase"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle - Mobile Friendly */}
            <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border transition-all rounded-sm ${isLangMenuOpen ? 'bg-white border-white text-black' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Globe className="w-4 h-4" />
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute bottom-12 md:bottom-14 right-0 w-48 bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        handleLanguageChange(l.id);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${lang === l.id ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                    >
                      {l.label}
                      {lang === l.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Report Button */}
            <div className="relative">
              <button 
                onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
                className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border transition-all rounded-sm ${isReportMenuOpen ? 'bg-red-500 border-red-500 text-white' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Menu Overlay */}
      {isReportMenuOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 shadow-2xl p-6 animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setIsReportMenuOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <span className="text-xs font-black tracking-widest text-white uppercase">{t.report_issue}</span>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider">
                Found an error in the archives?
              </p>
              <div className="h-px bg-white/5" />
              <p className="text-[10px] text-white/70 font-bold leading-relaxed uppercase tracking-tight">
                {t.report_description}
              </p>
              <div className="flex flex-col items-center py-6 bg-white/5 border border-white/10 rounded-sm">
                <div className="p-3 bg-white rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  <QRCodeSVG 
                    value="https://www.skport.com/profile?id=9963327784768"
                    size={140}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "https://www.google.com/s2/favicons?domain=skport.com&sz=128",
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
              <a 
                href="https://www.skport.com/profile?id=9963327784768" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-4 px-4 bg-white/5 border border-white/10 text-[11px] font-black text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase tracking-[0.2em] text-center justify-center"
              >
                SKPORT PROFILE
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
