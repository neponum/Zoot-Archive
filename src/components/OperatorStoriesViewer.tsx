import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StoryEpisode, Language, StoryChapter } from '../types';
import { 
  Search, 
  User, 
  Check, 
  ArrowLeft, 
  ArrowUpDown, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  FileText,
  X,
  Languages
} from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getOperatorsList, EnrichedOperator } from '../services/operatorService';
import { extractOperatorKey } from '../utils/operatorUtils';
import { OperatorDossierModal } from './OperatorDossierModal';
import { setLanguage } from '../services/storyService';

interface OperatorStoriesViewerProps {
  filteredEpisodes: StoryEpisode[];
  episodeImages: Record<string, string>;
  failedImages: Record<string, boolean>;
  setSelectedEpisode: (ep: StoryEpisode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOrder: string;
  setSortOrder: (order: 'asc' | 'desc' | 'textLength') => void;
  readChapters?: Set<string>;
  uiLang: Language;
  t: Record<string, string>;
  handleImageError?: (id: string) => void;
  onBack?: () => void;
  onSelectChapter?: (chapter: StoryChapter, episode: StoryEpisode) => void;
  onOpenTranslation?: (chapter?: StoryChapter, episode?: StoryEpisode, operator?: EnrichedOperator) => void;
}

const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: 'zh_CN', label: '简体中文', isOfficial: true },
  { id: 'en_US', label: 'English', isOfficial: true },
  { id: 'ja_JP', label: '日本語', isOfficial: true },
  { id: 'ru_RU', label: 'Русский', isOfficial: false },
];

export const OperatorStoriesViewer: React.FC<OperatorStoriesViewerProps> = ({
  setSelectedEpisode,
  searchQuery,
  setSearchQuery,
  readChapters,
  uiLang,
  onBack,
  onSelectChapter,
  onOpenTranslation
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { operatorId, eventId } = useParams<{ operatorId?: string; eventId?: string }>();

  const [activeLang, setActiveLang] = useState<Language>(uiLang || 'ru_RU');
  const isRussian = activeLang === 'ru_RU' || activeLang === 'ru_RU_CN';

  const [operators, setOperators] = useState<EnrichedOperator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOperator, setSelectedOperator] = useState<EnrichedOperator | null>(null);

  // Filters State
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<number | 'ALL'>('ALL');
  const [onlyWithStories, setOnlyWithStories] = useState<boolean>(false);
  const [currentSort, setCurrentSort] = useState<'rarity' | 'nameAsc' | 'nameDesc' | 'stories'>('rarity');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isSortMenuOpen || isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen, isLangMenuOpen]);

  // Sync activeLang if parent uiLang changes
  useEffect(() => {
    if (uiLang) {
      setActiveLang(uiLang);
    }
  }, [uiLang]);

  // Load complete operator list with dossiers & stories for activeLang
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getOperatorsList(activeLang).then((list) => {
      if (isMounted) {
        setOperators(list);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to load operators:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeLang]);

  // Sync selectedOperator with URL params (e.g. /operators/:operatorId or /operator/:operatorId)
  useEffect(() => {
    if (operators.length === 0) return;

    const pathname = location.pathname;
    let opParam = operatorId || eventId;
    if (!opParam) {
      const match = pathname.match(/^\/operators?\/(.+)$/);
      if (match && match[1] && match[1].trim() !== '') {
        opParam = match[1];
      }
    }

    if (opParam) {
      const cleanParam = decodeURIComponent(opParam).toLowerCase().trim().replace(/^operator_/, '');
      const extractedKey = extractOperatorKey(cleanParam);

      const found = operators.find(op => {
        const idMatch = op.id.toLowerCase() === cleanParam || 
                        op.id.toLowerCase() === `char_${cleanParam}` ||
                        op.id.toLowerCase().replace(/^char_\d+_/, '') === cleanParam;
        const nameEnMatch = op.nameEn.toLowerCase() === cleanParam ||
                            op.nameEn.toLowerCase().replace(/\s+/g, '_') === cleanParam ||
                            op.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanParam.replace(/[^a-z0-9]/g, '');
        const dispMatch = op.displayName.toLowerCase() === cleanParam;
        const numMatch = op.displayNumber && op.displayNumber.toLowerCase() === cleanParam;

        const keyMatch = extractedKey && (
          op.id.toLowerCase() === extractedKey ||
          op.id.toLowerCase() === `char_${extractedKey}` ||
          op.id.toLowerCase().replace(/^char_\d+_/, '') === extractedKey ||
          op.nameEn.toLowerCase() === extractedKey
        );

        return idMatch || nameEnMatch || dispMatch || numMatch || keyMatch;
      });

      if (found) {
        setSelectedOperator(found);
      }
    } else {
      if (location.pathname === '/operators' || location.pathname === '/operator' || location.pathname === '/operators/') {
        setSelectedOperator(null);
      }
    }
  }, [location.pathname, operatorId, eventId, operators]);

  const handleSelectOperator = (op: EnrichedOperator) => {
    setSelectedOperator(op);
    navigate(`/operators/${op.id}`);
  };

  const handleCloseModal = () => {
    setSelectedOperator(null);
    navigate('/operators');
  };

  const handleBack = () => {
    if (selectedOperator) {
      handleCloseModal();
      return;
    }
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleLangChange = (newLang: Language) => {
    setActiveLang(newLang);
    setLanguage(newLang);
  };

  // Filtered and Sorted list of operators
  const filteredOperators = useMemo(() => {
    let result = [...operators];

    // Filter by Class
    if (selectedClass !== 'ALL') {
      result = result.filter((op) => op.profession === selectedClass);
    }

    // Filter by Rarity
    if (selectedRarity !== 'ALL') {
      if (selectedRarity === 1) {
        result = result.filter((op) => op.rarity <= 2);
      } else {
        result = result.filter((op) => op.rarity === selectedRarity);
      }
    }

    // Filter by Stories
    if (onlyWithStories) {
      result = result.filter((op) => op.hasStories);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((op) => 
        op.displayName.toLowerCase().includes(q) ||
        op.nameEn.toLowerCase().includes(q) ||
        (op.nameRu && op.nameRu.toLowerCase().includes(q)) ||
        (op.nameZh && op.nameZh.includes(q)) ||
        (op.factionName && op.factionName.toLowerCase().includes(q)) ||
        (op.displayNumber && op.displayNumber.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (currentSort === 'rarity') {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return a.displayName.localeCompare(b.displayName);
      } else if (currentSort === 'nameAsc') {
        return a.displayName.localeCompare(b.displayName);
      } else if (currentSort === 'nameDesc') {
        return b.displayName.localeCompare(a.displayName);
      } else if (currentSort === 'stories') {
        const storiesA = a.chapters?.length || 0;
        const storiesB = b.chapters?.length || 0;
        if (storiesB !== storiesA) return storiesB - storiesA;
        return b.rarity - a.rarity;
      }
      return 0;
    });

    return result;
  }, [operators, selectedClass, selectedRarity, onlyWithStories, searchQuery, currentSort]);

  // Classes List (Black, White, Blue style)
  const classesList = useMemo(() => {
    return [
      { id: 'ALL', name: isRussian ? 'ВСЕ КЛАССЫ' : 'ALL CLASSES' },
      { id: 'PIONEER', name: isRussian ? 'АВАНГАРД' : 'VANGUARD' },
      { id: 'WARRIOR', name: isRussian ? 'ГВАРДЕЕЦ' : 'GUARD' },
      { id: 'SNIPER', name: isRussian ? 'СНАЙПЕР' : 'SNIPER' },
      { id: 'TANK', name: isRussian ? 'ЗАЩИТНИК' : 'DEFENDER' },
      { id: 'MEDIC', name: isRussian ? 'МЕДИК' : 'MEDIC' },
      { id: 'SUPPORT', name: isRussian ? 'ПОДДЕРЖКА' : 'SUPPORTER' },
      { id: 'CASTER', name: isRussian ? 'ЗАКЛИНАТЕЛЬ' : 'CASTER' },
      { id: 'SPECIAL', name: isRussian ? 'СПЕЦИАЛИСТ' : 'SPECIALIST' },
    ];
  }, [isRussian]);

  if (selectedOperator) {
    return (
      <div className="w-full h-full min-h-screen bg-[#0a0a0a]">
        <OperatorDossierModal
          operator={selectedOperator}
          isFullPage={true}
          onClose={handleCloseModal}
          onPlayChapter={(chapter, episode) => {
            setSelectedOperator(null);
            if (onSelectChapter) {
              onSelectChapter(chapter, episode);
            } else {
              setSelectedEpisode(episode);
            }
          }}
          onOpenTranslation={(chapter, episode, op) => {
            setSelectedOperator(null);
            onOpenTranslation?.(chapter, episode, op || selectedOperator);
          }}
          uiLang={activeLang}
          onLanguageChange={handleLangChange}
          readChapters={readChapters}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white relative select-none font-sans overflow-hidden">
      
      {/* Background Graphic Grid with Subtle Blue Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header Bar with High Stacking Context (z-30) */}
      <div className="relative z-30 shrink-0 border-b border-white/10 bg-zinc-950/95 backdrop-blur-md px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Clean Back Button & Operator Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-blue-400/50 rounded-sm text-xs font-mono font-bold text-white/80 hover:text-white transition-all shadow-sm group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="uppercase tracking-wider">{isRussian ? 'НАЗАД' : 'BACK'}</span>
          </button>

          {/* Operator Counter Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 border border-white/10 rounded-sm text-xs font-mono">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white/60 text-[11px] uppercase font-bold tracking-wider hidden sm:inline">
              {isRussian ? 'ОПЕРАТИВНИКИ:' : 'OPERATORS:'}
            </span>
            <span className="text-white font-bold font-mono">
              {filteredOperators.length}
              {filteredOperators.length !== operators.length && (
                <span className="text-white/40 font-normal"> / {operators.length}</span>
              )}
            </span>
          </div>
        </div>

        {/* Right Side: Search, Language Switcher, Story Toggle & Sort Menu */}
        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
          
          {/* Language Selector (identical to ChapterSelector design & functionality) */}
          <div className="relative shrink-0" ref={langRef}>
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`h-9 px-3 flex items-center gap-2 border transition-all rounded-sm bg-black/60 backdrop-blur-md ${isLangMenuOpen ? 'bg-white border-white text-black' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
              title="Language"
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="text-[8px] font-black tracking-widest uppercase">
                {activeLang === 'zh_CN' ? 'ZH' :
                 activeLang === 'en_US' ? 'EN' :
                 activeLang === 'ja_JP' ? 'JA' : 'RU'}
              </span>
            </button>
            
            {isLangMenuOpen && (
              <div className="absolute top-11 right-0 w-48 bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-[60] max-h-[60vh] overflow-y-auto custom-scrollbar rounded-sm">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      handleLangChange(l.id);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${activeLang === l.id ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                  >
                    {l.label}
                    {activeLang === l.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input Box */}
          <div className="relative flex-1 sm:w-48 md:w-64 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRussian ? 'Поиск оперативника...' : 'Search operator...'}
              className="w-full bg-zinc-900/90 border border-white/10 focus:border-blue-400/80 focus:ring-1 focus:ring-blue-400/40 rounded-sm pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/30 font-mono transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stories Only Toggle */}
          <button
            onClick={() => setOnlyWithStories(!onlyWithStories)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-all border shrink-0 ${
              onlyWithStories
                ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-md shadow-blue-600/20'
                : 'bg-zinc-900 text-white/70 border-white/10 hover:text-white hover:border-white/20'
            }`}
            title={isRussian ? 'Показать только оперативников с историями' : 'Show only operators with stories'}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">
              {isRussian ? 'С ИСТОРИЯМИ' : 'WITH STORIES'}
            </span>
          </button>

          {/* Sort Selector Dropdown (Fixed stacking context & popover) */}
          <div className="relative shrink-0" ref={sortRef}>
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-blue-400/50 rounded-sm text-xs font-mono text-white/80 hover:text-white transition-all"
              title={isRussian ? 'Сортировка' : 'Sort'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">
                {currentSort === 'rarity' 
                  ? (isRussian ? 'ПО РЕДКОСТИ' : 'RARITY') 
                  : currentSort === 'nameAsc' ? 'A-Z' 
                  : currentSort === 'nameDesc' ? 'Z-A' 
                  : (isRussian ? 'ПО ИСТОРИЯМ' : 'STORIES')}
              </span>
            </button>

            {isSortMenuOpen && (
              <div className="absolute top-full mt-1.5 right-0 w-52 bg-zinc-950 border border-white/20 shadow-2xl p-1.5 z-50 rounded-sm divide-y divide-white/10">
                <button
                  onClick={() => {
                    setCurrentSort('rarity');
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between ${currentSort === 'rarity' ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  {isRussian ? 'По редкости (6★-1★)' : 'By Rarity (6★-1★)'}
                  {currentSort === 'rarity' && <Check className="w-3 h-3 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('nameAsc');
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between ${currentSort === 'nameAsc' ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  A-Z ({isRussian ? 'По алфавиту' : 'Alphabetical'})
                  {currentSort === 'nameAsc' && <Check className="w-3 h-3 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('nameDesc');
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between ${currentSort === 'nameDesc' ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  Z-A ({isRussian ? 'В обратном порядке' : 'Reverse'})
                  {currentSort === 'nameDesc' && <Check className="w-3 h-3 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('stories');
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-between ${currentSort === 'stories' ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  {isRussian ? 'По числу глав' : 'By Story Count'}
                  {currentSort === 'stories' && <Check className="w-3 h-3 text-blue-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class & Rarity Filter Bar (z-10) */}
      <div className="relative z-10 shrink-0 border-b border-white/10 bg-zinc-900/60 px-4 md:px-8 py-2 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
        {/* Class Tabs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {classesList.map((cls) => {
            const isSelected = selectedClass === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-sm transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:border-white/20'
                }`}
              >
                {cls.name}
              </button>
            );
          })}
        </div>

        {/* Rarity Buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-auto pl-2">
          {([ 'ALL', 6, 5, 4, 3, 1 ] as const).map((r) => {
            const isSelected = selectedRarity === r;
            const label = r === 'ALL' ? (isRussian ? 'ВСЕ★' : 'ALL★') : r === 1 ? '1-2★' : `${r}★`;
            return (
              <button
                key={r}
                onClick={() => setSelectedRarity(r)}
                className={`px-2 py-1 text-[10px] font-mono font-bold tracking-wider rounded-sm transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-white text-black border-white font-black shadow-sm'
                    : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:border-white/20'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operator Cards Grid (Black, White, and Blue Theme) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative z-10">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/40 font-mono">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs uppercase tracking-widest">
              {isRussian ? 'ЗАГРУЗКА СПИСКА ОПЕРАТИВНИКОВ...' : 'LOADING OPERATORS...'}
            </p>
          </div>
        ) : filteredOperators.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
            {filteredOperators.map((op) => {
              const totalChapters = op.chapters?.length || 0;

              return (
                <div
                  key={op.id}
                  onClick={() => handleSelectOperator(op)}
                  className="group relative flex flex-col bg-zinc-900/80 border border-white/10 hover:border-blue-400/80 rounded-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] cursor-pointer select-none aspect-[3/4.2]"
                >
                  {/* Portrait Cover Image */}
                  <div className="absolute inset-0 bg-zinc-950 overflow-hidden flex items-center justify-center">
                    <img
                      src={op.portraitUrl}
                      alt={op.displayName}
                      onError={(e) => {
                        if (e.currentTarget.src !== op.avatarUrl) {
                          e.currentTarget.src = op.avatarUrl;
                        }
                      }}
                      className="w-full h-full object-cover object-center filter brightness-90 group-hover:brightness-100 group-hover:scale-105 transition-all duration-500 pointer-events-none"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Gradient Backing */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="relative z-10 p-2.5 flex items-center justify-between w-full pointer-events-none">
                    {/* Stars Badge (White & Blue) */}
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-[2px] bg-black/80 border border-white/10 backdrop-blur-sm">
                      <Sparkles className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                      <span className="text-[9px] font-mono font-black text-white">
                        {op.rarity}★
                      </span>
                    </div>

                    {/* Stories Badge */}
                    {op.hasStories && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-blue-500/20 text-blue-300 border border-blue-400/40 font-mono backdrop-blur-sm flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        {totalChapters} {isRussian ? (totalChapters === 1 ? 'ГЛАВА' : 'ГЛАВЫ') : 'CH'}
                      </span>
                    )}
                  </div>

                  {/* Bottom Info Section */}
                  <div className="mt-auto relative z-10 p-3 flex flex-col gap-1">
                    {/* Class and Faction */}
                    <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-wider text-white/50">
                      <span className="font-bold text-blue-300 truncate max-w-[65%]">
                        {op.professionName}
                      </span>
                      <span className="truncate text-white/40">
                        {op.factionName}
                      </span>
                    </div>

                    {/* Operator Name */}
                    <h3 className="text-xs md:text-sm font-black text-white group-hover:text-blue-300 transition-colors leading-tight truncate uppercase tracking-tight font-mono">
                      {op.displayName}
                    </h3>

                    {/* Dossier Badge Indicator */}
                    <div className="flex items-center gap-1 text-[8px] font-mono text-white/40 pt-0.5">
                      <FileText className="w-2.5 h-2.5 text-blue-400/70" />
                      <span>{isRussian ? 'ДОСЬЕ И АРХИВЫ' : 'DOSSIER ARCHIVE'}</span>
                    </div>
                  </div>

                  {/* Hover Accent Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center my-auto">
            <AlertCircle className="w-12 h-12 text-white/20 mb-4 animate-pulse" />
            <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-1 font-mono">
              {isRussian ? 'ОПЕРАТИВНИКИ НЕ НАЙДЕНЫ' : 'NO OPERATORS FOUND'}
            </h3>
            <p className="text-xs text-white/30 max-w-sm font-mono">
              {isRussian ? 'Попробуйте изменить параметры поиска или фильтры' : 'Try adjusting your search query or filters'}
            </p>
            {(searchQuery || selectedClass !== 'ALL' || selectedRarity !== 'ALL' || onlyWithStories) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClass('ALL');
                  setSelectedRarity('ALL');
                  setOnlyWithStories(false);
                }}
                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-xs font-mono uppercase tracking-widest text-blue-400 transition-colors"
              >
                {isRussian ? 'СБРОСИТЬ ВСЕ ФИЛЬТРЫ' : 'RESET ALL FILTERS'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Operator Dossier & Paradox Stories Modal */}
      {selectedOperator && (
        <OperatorDossierModal
          operator={selectedOperator}
          onClose={handleCloseModal}
          onPlayChapter={(chapter, episode) => {
            setSelectedOperator(null);
            if (onSelectChapter) {
              onSelectChapter(chapter, episode);
            } else {
              setSelectedEpisode(episode);
            }
          }}
          onOpenTranslation={(chapter, episode) => {
            setSelectedOperator(null);
            onOpenTranslation?.(chapter, episode);
          }}
          uiLang={activeLang}
          onLanguageChange={handleLangChange}
          readChapters={readChapters}
        />
      )}
    </div>
  );
};
