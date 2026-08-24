import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Language, StoryChapter, StoryEpisode, OperatorHandbookSection } from '../types';
import { EnrichedOperator, ParsedDossierSection, parseOperatorHandbook, fetchOperatorHandbookAsync } from '../services/operatorService';
import { setLanguage, checkScriptExists } from '../services/storyService';
import { OperatorVoicePlayer } from './OperatorVoicePlayer';
import { 
  X, 
  ArrowLeft,
  BookOpen, 
  FileText, 
  Sparkles, 
  User, 
  HeartPulse, 
  Activity, 
  Play, 
  Award, 
  CheckCircle2,
  Lock,
  ChevronRight,
  Languages,
  Loader2,
  Copy,
  Check,
  Edit3,
  Link2,
  Mic,
  Volume2
} from 'lucide-react';

interface OperatorDossierModalProps {
  operator: EnrichedOperator | null;
  onClose: () => void;
  onPlayChapter?: (chapter: StoryChapter, episode: StoryEpisode) => void;
  onOpenTranslation?: (chapter?: StoryChapter, episode?: StoryEpisode, operator?: EnrichedOperator) => void;
  uiLang: Language;
  onLanguageChange?: (lang: Language) => void;
  readChapters?: Set<string>;
  isFullPage?: boolean;
}

const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: 'zh_CN', label: '简体中文', isOfficial: true },
  { id: 'en_US', label: 'English', isOfficial: true },
  { id: 'ja_JP', label: '日本語', isOfficial: true },
  { id: 'ru_RU', label: 'Русский', isOfficial: false },
];

export const OperatorDossierModal: React.FC<OperatorDossierModalProps> = ({
  operator,
  onClose,
  onPlayChapter,
  onOpenTranslation,
  uiLang,
  onLanguageChange,
  readChapters,
  isFullPage = false
}) => {
  const [activeTab, setActiveTab] = useState<'DOSSIER' | 'VOICES' | 'STORIES'>('DOSSIER');
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);
  const [imgFailed, setImgFailed] = useState(false);
  const [modalLang, setModalLang] = useState<Language>(uiLang || 'ru_RU');
  
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Translation status state for operator stories/chapters
  const [storyTranslationStatus, setStoryTranslationStatus] = useState<Record<string, boolean>>({});
  const [checkingStories, setCheckingStories] = useState<Record<string, boolean>>({});

  // Language Menu dropdown state
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  // Sync modalLang if parent uiLang changes
  useEffect(() => {
    if (uiLang) {
      setModalLang(uiLang);
    }
  }, [uiLang]);

  const [fetchedHandbook, setFetchedHandbook] = useState<OperatorHandbookSection[] | null>(null);
  const [isLoadingHandbook, setIsLoadingHandbook] = useState<boolean>(false);

  // Fetch handbook asynchronously from GitHub if missing
  useEffect(() => {
    if (!operator) return;
    
    // Reset selected index when operator changes
    setSelectedSectionIdx(0);

    if (operator.handbook && operator.handbook.length > 0) {
      setFetchedHandbook(operator.handbook);
      setIsLoadingHandbook(false);
      return;
    }

    let isMounted = true;
    setIsLoadingHandbook(true);

    fetchOperatorHandbookAsync(operator.id, modalLang).then((sections) => {
      if (isMounted) {
        setFetchedHandbook(sections);
        setIsLoadingHandbook(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [operator?.id]);

  // Check Russian translation availability for operator stories/chapters
  useEffect(() => {
    if (!operator?.chapters || operator.chapters.length === 0) return;

    let isMounted = true;

    const checkAll = async () => {
      const statusMap: Record<string, boolean> = {};
      const checkingMap: Record<string, boolean> = {};

      for (const ch of operator.chapters) {
        checkingMap[ch.id] = true;
      }
      if (isMounted) setCheckingStories({ ...checkingMap });

      for (const ch of operator.chapters) {
        const storyPath = ch.storyTxt || ch.id;
        let exists = false;
        if (storyPath) {
          try {
            exists = await checkScriptExists(storyPath, 'ru_RU');
          } catch {
            exists = false;
          }
        }
        statusMap[ch.id] = exists;
      }

      if (isMounted) {
        setStoryTranslationStatus(statusMap);
        setCheckingStories({});
      }
    };

    checkAll();

    return () => {
      isMounted = false;
    };
  }, [operator?.id, operator?.chapters]);

  // Dynamically parsed handbook sections for current modalLang
  const activeHandbookSections: ParsedDossierSection[] = useMemo(() => {
    if (!operator) return [];
    const rawHb = (operator.handbook && operator.handbook.length > 0) ? operator.handbook : (fetchedHandbook || []);
    return parseOperatorHandbook(rawHb, modalLang);
  }, [operator, fetchedHandbook, modalLang]);

  const currentSection = hasHandbook(activeHandbookSections) 
    ? activeHandbookSections[selectedSectionIdx] || activeHandbookSections[0] 
    : null;

  function hasHandbook(sections: ParsedDossierSection[]): boolean {
    return sections.length > 0;
  }

  if (!operator) return null;

  const isRussian = modalLang === 'ru_RU' || modalLang === 'ru_RU_CN';
  const hasSections = activeHandbookSections.length > 0;

  // Star display
  const stars = Array.from({ length: operator.rarity }, (_, i) => i + 1);

  // Original text only for dossier
  const displayNarrativeText = currentSection?.rawText;
  const displayItems = currentSection?.items;

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleStartStory = (chapter: StoryChapter) => {
    if (!operator.storyEpisode) return;
    setLanguage(modalLang);
    onPlayChapter?.(chapter, operator.storyEpisode);
  };

  const dossierContent = (
    <div className={`relative w-full ${isFullPage ? 'h-full flex-1' : 'max-w-5xl h-[92vh] max-h-[860px] border border-white/15 rounded-sm'} bg-zinc-950 shadow-2xl flex flex-col md:flex-row overflow-hidden`}>
      {/* Background Ambient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Right Action Buttons: Direct Link, Language Selector & Close */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={() => {
            const url = `${window.location.origin}/operators/${operator.id}`;
            navigator.clipboard.writeText(url).then(() => {
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }).catch(() => {});
          }}
          className="h-8 px-2.5 bg-zinc-900/90 hover:bg-white/15 border border-white/10 rounded-sm text-white/70 hover:text-white transition-all shadow-lg flex items-center gap-1.5 group text-[10px] font-mono"
          title={isRussian ? 'Скопировать прямую ссылку на оперативника' : 'Copy direct link to operator'}
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold hidden sm:inline">{isRussian ? 'СКОПИРОВАНО' : 'COPIED'}</span>
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-white/60 group-hover:text-white hidden sm:inline">{"/"}{operator.id}</span>
            </>
          )}
        </button>

        {/* Language Selector (identical to ChapterSelector design & functionality) */}
        <div className="relative shrink-0" ref={langRef}>
          <button 
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className={`h-8 px-2.5 flex items-center gap-1.5 border transition-all rounded-sm bg-zinc-900/90 backdrop-blur-md ${isLangMenuOpen ? 'bg-white border-white text-black' : 'border-white/10 text-white/70 hover:text-white hover:bg-white/15'}`}
            title="Language"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              {modalLang === 'zh_CN' ? 'ZH' :
               modalLang === 'en_US' ? 'EN' :
               modalLang === 'ja_JP' ? 'JA' : 'RU'}
            </span>
          </button>
          
          {isLangMenuOpen && (
            <div className="absolute top-10 right-0 w-48 bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-[60] max-h-[60vh] overflow-y-auto custom-scrollbar rounded-sm">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setModalLang(l.id);
                    onLanguageChange?.(l.id);
                    setLanguage(l.id);
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${modalLang === l.id ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                >
                  {l.label}
                  {modalLang === l.id && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center bg-zinc-900/90 hover:bg-white/15 border border-white/10 rounded-sm text-white/70 hover:text-white transition-all shadow-lg group"
          title={isRussian ? 'Закрыть' : 'Close'}
        >
          <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

        {/* LEFT COLUMN: Operator Portrait & Quick Profile (Black, White, Blue) */}
        <div className="w-full md:w-80 lg:w-96 bg-zinc-900/90 border-b md:border-b-0 md:border-r border-white/10 flex flex-col relative shrink-0 overflow-hidden">
          
          {/* Portrait Container */}
          <div className="relative w-full h-56 sm:h-64 md:h-[48%] bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-white/10 group">
            {!imgFailed ? (
              <img
                src={operator.portraitUrl}
                alt={operator.displayName}
                onError={() => {
                  if (operator.portraitUrl !== operator.avatarUrl) {
                    setImgFailed(true);
                  }
                }}
                className="w-full h-full object-cover object-center filter contrast-105 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center">
                <img
                  src={operator.avatarUrl}
                  alt={operator.displayName}
                  className="w-32 h-32 object-cover rounded-sm border border-white/15 shadow-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40 pointer-events-none" />

            {/* Operator Display Number */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {operator.displayNumber && (
                <span className="px-2 py-0.5 text-[9px] font-mono font-black tracking-widest uppercase bg-black/80 text-blue-400 border border-blue-500/40 rounded-sm backdrop-blur-sm shadow-md">
                  {operator.displayNumber}
                </span>
              )}
            </div>

            {/* Star Rating Badge (White & Blue) */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 z-10 bg-black/80 px-2 py-1 rounded-sm border border-white/10 backdrop-blur-sm shadow-md">
              {stars.map((s) => (
                <Sparkles key={s} className="w-3 h-3 text-blue-400 fill-blue-400" />
              ))}
              <span className="text-[10px] font-mono font-bold text-white ml-1">
                {operator.rarity}★
              </span>
            </div>
          </div>

          {/* Quick Info & Combat Identity */}
          <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div>
              {/* Operator Name */}
              <div className="mb-3">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-mono">
                  {operator.displayName}
                </h2>
                <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
                  <span>{operator.nameEn}</span>
                  {operator.nameZh && <span>• {operator.nameZh}</span>}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4">
                <div className="p-2 bg-zinc-950 border border-white/10 rounded-sm">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">
                    {isRussian ? 'КЛАСС' : 'CLASS'}
                  </span>
                  <span className="font-bold text-blue-400">
                    {operator.professionName}
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 border border-white/10 rounded-sm">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">
                    {isRussian ? 'ПОЗИЦИЯ' : 'POSITION'}
                  </span>
                  <span className="font-bold text-white/90">
                    {operator.positionName}
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 border border-white/10 rounded-sm col-span-2">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">
                    {isRussian ? 'ФРАКЦИЯ / РЕГИОН' : 'FACTION / REGION'}
                  </span>
                  <span className="font-bold text-white/90 truncate block">
                    {operator.factionName}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => setActiveTab('VOICES')}
                className={`w-full py-2 px-3 border rounded-sm font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'VOICES'
                    ? 'bg-blue-600/30 border-blue-500/60 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 hover:border-blue-500/40 text-white/90 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>{isRussian ? 'ГОЛОСОВЫЕ РЕПЛИКИ' : 'VOICE LINES'}</span>
              </button>

              {/* Play Paradox Stories Button */}
              {operator.hasStories && operator.storyEpisode && (
                <button
                  onClick={() => setActiveTab('STORIES')}
                  className={`w-full py-2 px-3 border rounded-sm font-mono font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] ${
                    activeTab === 'STORIES'
                      ? 'bg-blue-500 text-white border-blue-400'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>
                    {isRussian 
                      ? `ИСТОРИИ ОПЕРАТИВНИКА (${operator.chapters?.length || 0})` 
                      : `OPERATOR STORIES (${operator.chapters?.length || 0})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabs, Language Selector, Dossier Body, Voices & Stories */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
          
          {/* Top Control Bar: Tabs */}
          <div className="shrink-0 border-b border-white/10 bg-zinc-900/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            
            {/* View Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('DOSSIER')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'DOSSIER'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isRussian ? 'ЛИЧНОЕ ДЕЛО И ДОСЬЕ' : 'HANDBOOK & DOSSIER'}</span>
              </button>

              <button
                onClick={() => setActiveTab('VOICES')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'VOICES'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRussian ? 'ГОЛОСОВЫЕ РЕПЛИКИ' : 'VOICE LINES'}</span>
              </button>

              {operator.hasStories && (
                <button
                  onClick={() => setActiveTab('STORIES')}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === 'STORIES'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {isRussian ? 'ИСТОРИИ' : 'STORIES'} ({operator.chapters?.length || 0})
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: DOSSIER & ARCHIVES */}
          {activeTab === 'DOSSIER' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Dossier Section Navigator (Sidebar) */}
              <div className="w-full md:w-56 bg-zinc-900/40 border-b md:border-b-0 md:border-r border-white/10 p-2 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1.5 shrink-0 custom-scrollbar">
                
                {isLoadingHandbook ? (
                  <div className="p-4 text-center flex flex-col items-center justify-center gap-2 my-auto">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <span className="text-[10px] font-mono text-white/50">
                      {isRussian ? 'Загрузка досье с GitHub...' : 'Loading dossier...'}
                    </span>
                  </div>
                ) : hasSections ? (
                  activeHandbookSections.map((sec, idx) => {
                    const isSelected = idx === selectedSectionIdx;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSectionIdx(idx)}
                        className={`text-left px-3 py-2.5 rounded-sm text-xs font-mono uppercase tracking-wide transition-all shrink-0 md:shrink flex items-center justify-between gap-2 border ${
                          isSelected
                            ? 'bg-white/10 text-blue-400 border-blue-500/60 font-bold shadow-md'
                            : 'text-white/60 hover:bg-white/5 hover:text-white border-transparent'
                        }`}
                      >
                        <span className="truncate">{sec.title}</span>
                        <ChevronRight className={`w-3 h-3 hidden md:block shrink-0 transition-transform ${isSelected ? 'text-blue-400 translate-x-0.5' : 'text-white/20'}`} />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-xs font-mono text-white/40 text-center">
                    {isRussian ? 'Досье отсутствует' : 'No handbook sections'}
                  </div>
                )}
              </div>

              {/* Dossier Section Content Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {currentSection ? (
                  <div className="space-y-4 max-w-2xl">
                    
                    {/* Section Header */}
                    <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                          {currentSection.type === 'basic' && <User className="w-4 h-4 text-blue-400" />}
                          {currentSection.type === 'exam' && <Activity className="w-4 h-4 text-emerald-400" />}
                          {currentSection.type === 'clinical' && <HeartPulse className="w-4 h-4 text-rose-400" />}
                          {currentSection.type === 'archive' && <FileText className="w-4 h-4 text-blue-400" />}
                          {currentSection.type === 'record' && <Award className="w-4 h-4 text-blue-400" />}
                          <span>{currentSection.title}</span>
                        </h3>
                        {currentSection.originalTitle && currentSection.originalTitle !== currentSection.title && (
                          <span className="text-[10px] text-white/40 font-mono">
                            {"// "}{currentSection.originalTitle}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: Copy Section Text */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {displayNarrativeText && (
                          <button
                            onClick={() => handleCopyText(displayNarrativeText, selectedSectionIdx)}
                            className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                            title={isRussian ? 'Скопировать текст' : 'Copy text'}
                          >
                            {copiedSection === selectedSectionIdx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Structured Items Display */}
                    {displayItems && displayItems.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {displayItems.map((item, i) => (
                          <div
                            key={i}
                            className="p-3 bg-zinc-900/60 border border-white/10 rounded-sm flex flex-col justify-between"
                          >
                            <span className="text-[9px] font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                              {item.label}
                            </span>
                            <span className="text-xs font-mono font-medium text-white/90 leading-relaxed">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                        {/* Clinical Alert Warning (if Clinical section) */}
                        {currentSection.type === 'clinical' && (
                          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-sm flex items-start gap-3">
                            <HeartPulse className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] font-mono text-rose-200/90 leading-relaxed">
                              <strong className="block text-rose-400 uppercase tracking-wider text-[9px] mb-0.5">
                                {isRussian ? 'МЕДИЦИНСКОЕ ЗАКЛЮЧЕНИЕ RHODES ISLAND' : 'RHODES ISLAND MEDICAL ASSESSMENT'}
                              </strong>
                              {isRussian
                                ? 'Данные классифицированы согласно протоколу контроля Орипатии. Запрещено разглашение третьим лицам без разрешения Доктора или Кальцит.'
                                : 'Classified under Originium Infection Control Protocol. Unauthorized disclosure is strictly prohibited.'}
                            </div>
                          </div>
                        )}

                        {/* Raw / Lore Narrative Text */}
                        {displayNarrativeText && (
                          <div className="p-4 bg-zinc-900/40 border border-white/10 rounded-sm relative">
                            <div className="text-xs font-sans text-white/90 leading-relaxed whitespace-pre-line space-y-2">
                              {displayNarrativeText}
                            </div>
                          </div>
                        )}

                        {/* Official Database Footer */}
                        <div className="mt-6 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isRussian ? 'Официальная база данных Rhodes Island' : 'Rhodes Island Official Database'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/30 font-mono">
                    <FileText className="w-12 h-12 mb-3 text-white/10" />
                    <p className="text-xs uppercase tracking-widest">
                      {isRussian ? 'Архивные данные не найдены' : 'No handbook archives available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VOICE LINES */}
          {activeTab === 'VOICES' && (
            <OperatorVoicePlayer
              operatorId={operator.id}
              operatorName={operator.displayName}
              avatarUrl={operator.avatarUrl}
              uiLang={modalLang}
              onLanguageChange={setModalLang}
            />
          )}

          {/* TAB 3: OPERATOR STORIES / PARADOX SIMULATIONS */}
          {activeTab === 'STORIES' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="max-w-2xl space-y-4">
                
                {/* Stories Header */}
                <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>{isRussian ? 'ИСТОРИИ И ПАРАДОКС-СИМУЛЯЦИИ' : 'OPERATOR STORIES & PARADOX SIMULATIONS'}</span>
                    </h3>
                    <p className="text-xs text-white/50 font-mono mt-1">
                      {isRussian 
                        ? 'Личные записи, симуляции и воспоминания оперативника' 
                        : 'Personal recollections, combat simulations, and character records'}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-blue-400">
                    {isRussian ? `Язык: ${modalLang.split('_')[0].toUpperCase()}` : `Language: ${modalLang.split('_')[0].toUpperCase()}`}
                  </div>
                </div>

                {operator.chapters && operator.chapters.length > 0 && operator.storyEpisode ? (
                  <div className="space-y-2.5">
                    {operator.chapters.map((ch, idx) => {
                      const isRead = readChapters?.has(ch.id);
                      const isChecking = checkingStories[ch.id];
                      const isTranslated = storyTranslationStatus[ch.id] === true;

                      return (
                        <div
                          key={ch.id}
                          className="p-3.5 bg-zinc-900/70 border border-white/10 hover:border-blue-400/60 rounded-sm transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-zinc-950 border border-white/10 flex items-center justify-center font-mono font-black text-xs text-blue-400 group-hover:border-blue-400/40 shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs md:text-sm font-bold text-white group-hover:text-blue-300 transition-colors font-mono">
                                  {ch.name || `${isRussian ? 'Запись' : 'Record'} ${idx + 1}`}
                                </h4>
                                {isRead && (
                                  <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {isRussian ? 'ПРОЧИТАНО' : 'READ'}
                                  </span>
                                )}
                              </div>
                              {ch.code && (
                                <span className="text-[10px] text-white/40 font-mono">
                                  {ch.code}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {isChecking ? (
                              <div className="px-3 py-1.5 text-xs font-mono text-white/40 flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                <span>{isRussian ? 'Проверка...' : 'Checking...'}</span>
                              </div>
                            ) : isTranslated ? (
                              /* Read Chapter Button (Active) */
                              <button
                                onClick={() => handleStartStory(ch)}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shadow-sm group-hover:scale-105"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>{isRussian ? 'ЧИТАТЬ' : 'READ'}</span>
                              </button>
                            ) : (
                              /* Not Translated: Read Button Blocked + Translate Button Shown */
                              <>
                                <button
                                  disabled
                                  className="px-3.5 py-1.5 bg-zinc-800/80 border border-white/10 text-white/30 font-mono text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                  title={isRussian ? 'Перевод на русский язык отсутствует' : 'No Russian translation available'}
                                >
                                  <Lock className="w-3 h-3 text-white/40" />
                                  <span>{isRussian ? 'ЧИТАТЬ' : 'READ'}</span>
                                </button>

                                {onOpenTranslation && (
                                  <button
                                    onClick={() => onOpenTranslation(ch, operator.storyEpisode, operator)}
                                    className="px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 hover:border-amber-500/80 text-amber-300 hover:text-amber-200 font-mono font-black text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
                                    title={isRussian ? 'Открыть главу в студии перевода' : 'Open chapter in Translation Studio'}
                                  >
                                    <Edit3 className="w-3 h-3 text-amber-400" />
                                    <span>{isRussian ? 'ПЕРЕВЕСТИ' : 'TRANSLATE'}</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-zinc-900/20 border border-white/5 rounded-sm text-white/40 font-mono">
                    <Lock className="w-8 h-8 mx-auto mb-2 text-white/20" />
                    <p className="text-xs uppercase tracking-widest">
                      {isRussian 
                        ? 'Для данного оперативника парадокс-симуляции еще не добавлены в архив' 
                        : 'No paradox simulations recorded yet for this operator'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );

  if (isFullPage) {
    return (
      <div className="w-full h-full min-h-screen bg-[#0a0a0a] flex flex-col font-sans select-none relative overflow-hidden">
        {/* Full Page Header Navigation Bar */}
        <div className="h-14 bg-zinc-950/90 border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-xs font-mono font-bold text-white/80 hover:text-white transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>{isRussian ? 'НАЗАД К ОПЕРАТИВНИКАМ' : 'BACK TO OPERATORS'}</span>
            </button>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-white/40 uppercase">
              <span>АРХИВ</span>
              <span>{"/"}</span>
              <span>ОПЕРАТИВНИКИ</span>
              <span>{"/"}</span>
              <span className="text-white font-bold">{operator.displayName || operator.nameEn}</span>
            </div>
          </div>
        </div>

        {/* Dossier Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {dossierContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans select-none">
      {dossierContent}
    </div>
  );
};
