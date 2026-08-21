import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchChapterList, fetchCharacterMapping, getImageUrl, setLanguage, getLanguage, checkImageExists, checkScriptExists, fetchStoryScript } from '../services/storyService';
import { CacheService } from '../services/cacheService';
import { StoryChapter, StoryEpisode, Language } from '../types';
import { getChapterDisplayCode, cn } from '../lib/utils';
import { ChevronRight, Loader2, AlertCircle, BookOpen, BookOpenText, ArrowLeft, Star, Zap, User, Users, LayoutGrid, Globe, History, Clock, Home, Settings, Music, Info, Search, Play, Flag, X, Check, ChevronDown, Languages, Bookmark, Archive, Github, SlidersHorizontal, Award, Compass, Sparkles, Layers } from 'lucide-react';
import { DiscordIcon, SkportIcon } from './ui/Icons';
import { UI_STRINGS } from '../translations';
import { VotingInterface } from './VotingInterface';
import { OperatorStoriesViewer } from './OperatorStoriesViewer';
import { STORY_LINES_DATA, STORY_LINE_FILTERS } from '../config/storylines';
import { TRANSLATION_REGISTRY, isAITranslator, getTranslatorLabel, sortTranslators, getDefaultTranslator } from '../config/translationsRegistry';
import { QRCodeSVG } from 'qrcode.react';
import { MainMenu } from './MainMenu';
import { ErrorBoundary } from './ErrorBoundary';

import { extractOperatorKey, getOperatorDetails, getCleanOperatorName, isOperatorEpisode } from '../utils/operatorUtils';

interface ChapterSelectorProps {
  onSelect: (chapter: StoryChapter) => void;
  onOpenTranslation?: (chapter?: StoryChapter, episode?: StoryEpisode) => void;
  onTranslatorChange?: (translator: string | undefined) => void;
  readChapters?: Set<string>;
  onToggleRead?: (chapterId: string) => void;
}

const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: 'zh_CN', label: '简体中文', isOfficial: true },
  { id: 'en_US', label: 'English', isOfficial: true },
  { id: 'ja_JP', label: '日本語', isOfficial: true },
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
  'main_15': 500, 'main_16': 501, 'main_17': 502,
};

const BANNERS_BASE_URL = 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/banners';

const EpisodeGrid = React.memo(({ 
  filteredEpisodes, 
  episodeImages, 
  failedImages, 
  translatorDiscovery, 
  setSelectedEpisode, 
  setHoveredEpisodeId, 
  setFailedImages,
  readChapters
}: any) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6 pb-32">
      {filteredEpisodes.map((episode: any, index: number) => {
        const isMainline = episode.id.toLowerCase().startsWith('main_') || episode.entryType === 'MAINLINE';
        const isBanner1560x500 = episode.id.toLowerCase().startsWith('is_') || episode.id.toLowerCase().startsWith('ra_');
        const chs = episode.chapters || [];
        const readChs = chs.filter((c: any) => readChapters?.has(c.id)).length;
        const isFullyRead = chs.length > 0 && readChs === chs.length;
        return (
          <button
            key={episode.id}
            onClick={() => setSelectedEpisode(episode)}
            onMouseEnter={() => setHoveredEpisodeId(episode.id)}
            onMouseLeave={() => setHoveredEpisodeId(null)}
            className={`relative group transition-all duration-500 w-full text-left ${isBanner1560x500 ? 'col-span-1 sm:col-span-2' : ''}`}
          >
            <div className={`w-full ${isMainline ? 'aspect-square bg-black shadow-2xl rounded-sm overflow-hidden' : isBanner1560x500 ? 'aspect-[1560/500] bg-zinc-950/80 shadow-2xl rounded-sm overflow-hidden border border-white/10 group-hover:border-amber-500/50 transition-colors' : 'aspect-[4/5]'} transition-all duration-500 relative z-10`}>
              {/* Background Image */}
              {episodeImages[episode.id] && !failedImages[episode.id] ? (
                <img 
                  src={episodeImages[episode.id]!} 
                  alt={episode.name} 
                  loading={index < 10 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index < 10 ? "high" : "auto"}
                  className={`w-full h-full ${isMainline || isBanner1560x500 ? 'object-cover' : 'object-contain drop-shadow-2xl'} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const currentSrc = img.src;
                    const decodedSrc = decodeURIComponent(currentSrc);
                    const chineseName = episode.chineseName || episode.name;
                    const imageId = episode.storyEntryPicId || episode.id;
                    
                    const safeImageId = imageId.replace(/[:：\s<>"/\\|?*]/g, '').trim();
                    const safeChineseName = chineseName.replace(/[:：\s<>"/\\|?*]/g, '').trim();
                    
                    // Fallback chain logic
                    let nextSrc = '';
                    if (episode.id.startsWith('is_')) {
                      const num = episode.id.replace('is_', '');
                      if (!decodedSrc.includes(`IS_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/IS_${num}.png`;
                      } else if (!decodedSrc.includes(`${safeImageId}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (episode.id.startsWith('ra_')) {
                      const num = episode.id.replace('ra_', '');
                      if (!decodedSrc.includes(`RA_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/RA_${num}.png`;
                      } else if (!decodedSrc.includes(`${safeImageId}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (decodedSrc.includes(`${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`)) {
                      // If 情报处理室_ failed, try just the ID
                      nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                    } else if (decodedSrc.includes(`${BANNERS_BASE_URL}/main_`) && episode.id.startsWith('main_')) {
                      // If main_XX failed, try just main_X
                      const num = episode.id.replace('main_', '');
                      if (!decodedSrc.endsWith(`main_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/main_${num}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (!decodedSrc.includes('情报处理室_') && !decodedSrc.includes('main_')) {
                      // Last ditch effort: try adding the prefix if we haven't yet
                      nextSrc = `${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`;
                    } else {
                      setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                      return;
                    }

                    if (nextSrc) {
                      CacheService.getCachedBlobUrl(nextSrc).then((cached: any) => {
                        img.src = cached || nextSrc;
                      });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 border border-white/10">
                  <AlertCircle className="w-8 h-8 text-white/5 mb-2" />
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No Visual Data</span>
                </div>
              )}
              
              {/* Gradient Overlay - Only visible on hover */}
              {(isMainline || failedImages[episode.id] || !episodeImages[episode.id]) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              
              {/* Technical ID Badge - Always visible */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-sm text-[8px] font-mono text-white/60 uppercase z-20 pointer-events-none shadow-lg">
                <span>{episode.id}</span>
              </div>

              {/* Read Status Badge */}
              {isFullyRead ? (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 rounded-sm text-[8px] font-mono text-emerald-300 uppercase z-20 pointer-events-none shadow-lg flex items-center gap-1 font-bold">
                  <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                  <span>READ</span>
                </div>
              ) : readChs > 0 ? (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-cyan-950/90 backdrop-blur-md border border-cyan-500/40 rounded-sm text-[8px] font-mono text-cyan-300 uppercase z-20 pointer-events-none shadow-lg font-bold">
                  <span>{readChs}/{chs.length}</span>
                </div>
              ) : null}
              
              {/* Content Overlay - Only visible on hover */}
              {(isMainline || failedImages[episode.id] || !episodeImages[episode.id]) && (
                <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-8 bg-white h-0.5" />
                      <span className="text-[9px] font-mono text-white/40">{(index + 1).toString().padStart(3, '0')}</span>
                    </div>
                    <h4 className="text-xs md:text-sm font-black leading-tight tracking-tight text-white transition-colors line-clamp-2 uppercase">
                      {episode.name}
                    </h4>
                    <div className="flex flex-col gap-0.5 mt-1 border-t border-white/10 pt-1">
                      <span className="text-[8px] font-black text-white/40 tracking-widest uppercase truncate">{episode.id}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-white/60 tracking-widest uppercase italic">YEAR.{episode.year}</span>
                        {translatorDiscovery[episode.id] && (
                          <span className="text-[7px] font-black text-blue-400 tracking-tighter uppercase px-1 bg-blue-500/10 rounded-sm flex items-center gap-1">
                            <span>{translatorDiscovery[episode.id]}</span>
                            {isAITranslator(translatorDiscovery[episode.id]) && (
                              <span className="text-[6.5px] font-bold tracking-normal text-purple-300 bg-purple-500/20 px-1 rounded border border-purple-500/30">
                                Нейроперевод
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Hover Play Indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0">
                <div className="p-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full">
                  <Play className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Vinyl Effect Icon */}
            <div className="absolute bottom-8 -left-2 md:-left-4 w-12 h-12 md:w-16 md:h-16 z-0 opacity-0 group-hover:opacity-100 group-hover:-left-6 md:group-hover:-left-8 transition-all duration-500 ease-out pointer-events-none">
              <img 
                src={`${BANNERS_BASE_URL}/49px-图标_剧情.png`} 
                alt="" 
                className="w-full h-full object-contain animate-[spin_8s_linear_infinite]"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
});

const EpisodeHorizontalList = React.memo(({
  filteredEpisodes,
  episodeImages,
  failedImages,
  setSelectedEpisode,
  setHoveredEpisodeId,
  setFailedImages,
  horizontalScrollRef,
  selectedStoryLine,
  translatorDiscovery,
  readChapters
}: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);

  // Sync ref with parent if needed
  useEffect(() => {
    if (horizontalScrollRef) {
      if (typeof horizontalScrollRef === 'function') {
        horizontalScrollRef(containerRef.current);
      } else {
        horizontalScrollRef.current = containerRef.current;
      }
    }
  });

  // Attach non-passive wheel listener on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 && e.deltaX === 0) return;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 2,
          behavior: 'auto'
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasMoved.current = true;
    }
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      className="flex-1 flex flex-row items-end gap-6 md:gap-8 overflow-x-auto no-scrollbar pt-6 pb-12 px-6 md:px-16 h-full relative cursor-grab active:cursor-grabbing select-none"
    >
      {filteredEpisodes.map((episode: any, index: number) => {
        const isMainline = episode.id.toLowerCase().startsWith('main_') || episode.entryType === 'MAINLINE';
        const isBanner1560x500 = episode.id.toLowerCase().startsWith('is_') || episode.id.toLowerCase().startsWith('ra_');
        const chs = episode.chapters || [];
        const readChs = chs.filter((c: any) => readChapters?.has(c.id)).length;
        const isFullyRead = chs.length > 0 && readChs === chs.length;
        
        return (
          <button
            key={episode.id}
            onClick={() => {
              if (hasMoved.current) return;
              setSelectedEpisode(episode);
            }}
            onMouseEnter={() => setHoveredEpisodeId(episode.id)}
            onMouseLeave={() => setHoveredEpisodeId(null)}
            className={`relative group transition-all duration-500 ${isBanner1560x500 ? 'w-[320px] sm:w-[420px] md:w-[500px]' : 'w-[180px] md:w-[240px]'} text-left shrink-0 select-none cursor-pointer`}
          >
            <div className={`w-full ${isMainline ? 'aspect-square bg-black shadow-2xl rounded-sm overflow-hidden' : isBanner1560x500 ? 'aspect-[1560/500] bg-zinc-950/80 shadow-2xl rounded-sm overflow-hidden border border-white/10 group-hover:border-amber-500/50 transition-colors' : 'aspect-[4/5]'} transition-all duration-500 relative z-10`}>
              {/* Background Image */}
              {episodeImages[episode.id] && !failedImages[episode.id] ? (
                <img 
                  src={episodeImages[episode.id]!} 
                  alt={episode.name} 
                  loading={index < 10 ? "eager" : "lazy"}
                  decoding="async"
                  className={`w-full h-full ${isMainline || isBanner1560x500 ? 'object-cover' : 'object-contain drop-shadow-2xl'} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const currentSrc = img.src;
                    const decodedSrc = decodeURIComponent(currentSrc);
                    const chineseName = episode.chineseName || episode.name;
                    const imageId = episode.storyEntryPicId || episode.id;
                    
                    const safeImageId = imageId.replace(/[:：\s<>"/\\|?*]/g, '').trim();
                    const safeChineseName = chineseName.replace(/[:：\s<>"/\\|?*]/g, '').trim();
                    
                    // Fallback chain logic
                    let nextSrc = '';
                    if (episode.id.startsWith('is_')) {
                      const num = episode.id.replace('is_', '');
                      if (!decodedSrc.includes(`IS_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/IS_${num}.png`;
                      } else if (!decodedSrc.includes(`${safeImageId}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (episode.id.startsWith('ra_')) {
                      const num = episode.id.replace('ra_', '');
                      if (!decodedSrc.includes(`RA_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/RA_${num}.png`;
                      } else if (!decodedSrc.includes(`${safeImageId}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (decodedSrc.includes(`${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`)) {
                      nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
                    } else if (decodedSrc.includes(`${BANNERS_BASE_URL}/main_`) && episode.id.startsWith('main_')) {
                      const num = episode.id.replace('main_', '');
                      if (!decodedSrc.endsWith(`main_${num}.png`)) {
                        nextSrc = `${BANNERS_BASE_URL}/main_${num}.png`;
                      } else {
                        setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                        return;
                      }
                    } else if (!decodedSrc.includes('情报处理室_') && !decodedSrc.includes('main_')) {
                      nextSrc = `${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`;
                    } else {
                      setFailedImages((prev: any) => ({ ...prev, [episode.id]: true }));
                      return;
                    }

                    if (nextSrc) {
                      CacheService.getCachedBlobUrl(nextSrc).then((cached: any) => {
                        img.src = cached || nextSrc;
                      });
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 border border-white/10">
                  <AlertCircle className="w-8 h-8 text-white/5 mb-2" />
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">No Visual Data</span>
                </div>
              )}
              
              {/* Gradient Overlay - Only visible on hover */}
              {(isMainline || failedImages[episode.id] || !episodeImages[episode.id]) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              
              {/* Technical ID Badge - Always visible */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-sm text-[8px] font-mono text-white/60 uppercase z-20 pointer-events-none shadow-lg">
                <span>{episode.id}</span>
              </div>

              {/* Read Status Badge */}
              {isFullyRead ? (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 rounded-sm text-[8px] font-mono text-emerald-300 uppercase z-20 pointer-events-none shadow-lg flex items-center gap-1 font-bold">
                  <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                  <span>READ</span>
                </div>
              ) : readChs > 0 ? (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-cyan-950/90 backdrop-blur-md border border-cyan-500/40 rounded-sm text-[8px] font-mono text-cyan-300 uppercase z-20 pointer-events-none shadow-lg font-bold">
                  <span>{readChs}/{chs.length}</span>
                </div>
              ) : null}
              
              {/* Content Overlay - Only visible on hover */}
              {(isMainline || failedImages[episode.id] || !episodeImages[episode.id]) && (
                <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-8 bg-white h-0.5" />
                      <span className="text-[9px] font-mono text-white/40">{(index + 1).toString().padStart(3, '0')}</span>
                    </div>
                    <h4 className="text-xs md:text-sm font-black leading-tight tracking-tight text-white transition-colors line-clamp-2 uppercase">
                      {episode.name}
                    </h4>
                    <div className="flex flex-col gap-0.5 mt-1 border-t border-white/10 pt-1">
                      <span className="text-[8px] font-black text-white/40 tracking-widest uppercase truncate">{episode.id}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-white/60 tracking-widest uppercase italic">YEAR.{episode.year}</span>
                        {translatorDiscovery[episode.id] && (
                          <span className="text-[7px] font-black text-blue-400 tracking-tighter uppercase px-1 bg-blue-500/10 rounded-sm flex items-center gap-1">
                            <span>{translatorDiscovery[episode.id]}</span>
                            {isAITranslator(translatorDiscovery[episode.id]) && (
                              <span className="text-[6.5px] font-bold tracking-normal text-purple-300 bg-purple-500/20 px-1 rounded border border-purple-500/30">
                                Нейроперевод
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Hover Play Indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0">
                <div className="p-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full">
                  <Play className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Vinyl Effect Icon */}
            <div className="absolute bottom-8 -left-2 md:-left-4 w-12 h-12 md:w-16 md:h-16 z-0 opacity-0 group-hover:opacity-100 group-hover:-left-6 md:group-hover:-left-8 transition-all duration-500 ease-out pointer-events-none">
              <img 
                src={`${BANNERS_BASE_URL}/49px-图标_剧情.png`} 
                alt="" 
                className="w-full h-full object-contain animate-[spin_8s_linear_infinite]"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
});

const getStoryLineBg = (lineId: string): string | null => {
  if (lineId === 'main') {
    return 'https://torappu.prts.wiki/assets/mixstory/background/bg_mainline_3.png';
  }
  const sideLines = [
    'rhodes', 'ursus', 'laterano', 'kjerag', 'siracusa', 'kazimierz',
    'sui', 'rhine', 'abyssal', 'leithanien', 'tara', 'siesta', 'ts'
  ];
  const idx = sideLines.indexOf(lineId);
  if (idx !== -1) {
    let num = idx + 1;
    if (idx === 0) {
      num = 1;
    } else if (idx === 1) {
      num = 13;
    } else {
      num = idx;
    }
    return `https://torappu.prts.wiki/assets/mixstory/background/bg_ssline_${num}.png`;
  }
  return null;
};

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ 
  onSelect, 
  onOpenTranslation, 
  onTranslatorChange, 
  readChapters, 
  onToggleRead
}) => {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uiLang, setUiLang] = useState<Language>(() => {
    return (localStorage.getItem('arknights_ui_lang') as Language) || getLanguage();
  });
  const [storyLang, setStoryLang] = useState<Language>(() => {
    return (localStorage.getItem('arknights_story_lang') as Language) || getLanguage();
  });
  const lang = storyLang;
  const setLang = setStoryLang;

  const selectedEpisode = React.useMemo(() => {
    if (!eventId) return null;
    let found = episodes.find(ep => ep.id === eventId);
    if (!found && (eventId.startsWith('operator_') || eventId.startsWith('or_') || eventId.startsWith('set_') || eventId.startsWith('story_') || location.pathname.startsWith('/operators'))) {
      const opKey = extractOperatorKey(eventId);
      const operatorEpisodes = episodes.filter(ep => ep.entryType === 'NONE' || ep.id.startsWith('operator_') || ep.id.startsWith('or_') || ep.id.startsWith('set_') || ep.id.startsWith('story_') || ep.id.includes('_set_') || ep.id.includes('_record_'));
      
      const chapters: StoryChapter[] = [];
      let picId = '';

      for (const ep of operatorEpisodes) {
        if (extractOperatorKey(ep.id) === opKey) {
          if (!picId) picId = ep.storyEntryPicId || ep.id;

          for (const ch of ep.chapters) {
            if (!chapters.some(c => c.id === ch.id)) {
              chapters.push(ch);
            }
          }
        }
      }

      if (chapters.length > 0) {
        const opDetails = getOperatorDetails(opKey, uiLang);
        found = {
          id: `operator_${opKey}`,
          name: opDetails.displayName,
          chineseName: opDetails.chineseName,
          englishName: opDetails.englishName,
          entryType: 'NONE',
          storyEntryPicId: picId || `operator_${opKey}`,
          chapters
        };
      }
    }
    return found || null;
  }, [eventId, episodes, location.pathname, uiLang]);

  const setSelectedEpisode = (ep: StoryEpisode | null) => {
    if (ep) {
      if (isOperatorEpisode(ep) || activeTab === 'OPERATORS' || location.pathname.startsWith('/operators')) {
        const opKey = extractOperatorKey(ep.id);
        navigate(`/operators/${opKey || ep.id}`);
      } else {
        navigate(`/event/${ep.id}`);
      }
    } else {
      if (activeTab === 'OPERATORS' || location.pathname.startsWith('/operators')) {
        navigate('/operators');
      } else {
        navigate('/story');
      }
    }
  };

  const [activeTab, setActiveTab] = useState<string>('HOME');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'textLength'>(() => {
    const saved = localStorage.getItem('ak-sort-order');
    return (saved === 'chrono' ? 'asc' : saved as any) || 'asc';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterImages, setChapterImages] = useState<Record<string, string | null>>({});
  const [episodeImages, setEpisodeImages] = useState<Record<string, string | null>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [hoveredEpisodeId, setHoveredEpisodeId] = useState<string | null>(null);
  const [selectedAct, setSelectedAct] = useState<string>('Act II');
  const [viewMode, setViewMode] = useState<'STORYLINE' | 'YEAR' | 'ALL'>(() => {
    return (localStorage.getItem('ak-view-mode') as any) || 'STORYLINE';
  });
  const [selectedStoryLine, setSelectedStoryLine] = useState<string>(() => {
    return localStorage.getItem('ak-selected-storyline') || 'main';
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return parseInt(localStorage.getItem('ak-selected-year') || '1');
  });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ak-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      setActiveTab('HOME');
    } else if (location.pathname.startsWith('/music') || location.pathname.startsWith('/vote')) {
      setActiveTab('VOTE');
    } else if (location.pathname.startsWith('/operators') || location.pathname.startsWith('/operator')) {
      setActiveTab('OPERATORS');
    } else {
      setActiveTab('STORY');
    }
  }, [location.pathname]);

  // Operator Story/Event Page Auto-Redirect
  useEffect(() => {
    if (location.pathname.startsWith('/event/') && eventId) {
      if (isOperatorEpisode(eventId) || (selectedEpisode && isOperatorEpisode(selectedEpisode))) {
        const opKey = extractOperatorKey(eventId) || (selectedEpisode ? extractOperatorKey(selectedEpisode.id) : '');
        if (opKey) {
          navigate(`/operators/${opKey}`, { replace: true });
        } else {
          navigate('/operators', { replace: true });
        }
      }
    }
  }, [location.pathname, eventId, selectedEpisode, navigate]);

  const prevViewModeRef = useRef(viewMode);

  useEffect(() => {
    if (prevViewModeRef.current === 'ALL' && viewMode !== 'ALL') {
      setSortOrder('asc');
      localStorage.setItem('ak-sort-order', 'asc');
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('ak-sort-order', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('ak-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('ak-selected-storyline', selectedStoryLine);
  }, [selectedStoryLine]);

  useEffect(() => {
    localStorage.setItem('ak-selected-year', selectedYear.toString());
  }, [selectedYear]);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEpisodesOnMobile, setShowEpisodesOnMobile] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedTranslator, setSelectedTranslator] = useState<string | undefined>(() => {
    return localStorage.getItem('ak-selected-translator') || undefined;
  });
  const [isTranslatorMenuOpen, setIsTranslatorMenuOpen] = useState(false);
  const [translatorDiscovery, setTranslatorDiscovery] = useState<Record<string, string | null>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic discovery of who translated what has been removed from initial load.
  // It now only happens when an episode is selected.
  
  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  const t = UI_STRINGS[uiLang];

  const tabs = [
    { id: 'HOME', label: uiLang === 'ru_RU' ? 'ГЛАВНАЯ' : (uiLang === 'zh_CN' ? '首页' : (uiLang === 'ja_JP' ? 'ホーム' : 'HOME')), subLabel: 'HOME', icon: Home, disabled: false },
    { id: 'STORY', label: t.story, subLabel: 'STORY', icon: BookOpen, disabled: false },
    { id: 'OPERATORS', label: uiLang === 'ru_RU' ? 'ОПЕРАТИВНИКИ' : (uiLang === 'zh_CN' ? '干员密录' : (uiLang === 'ja_JP' ? '回想秘録' : 'OPERATOR STORIES')), subLabel: 'OPERATOR STORIES', icon: Users, disabled: false },
    { id: 'VOTE', label: uiLang === 'ru_RU' ? 'МУЗЫКА' : (uiLang === 'zh_CN' ? '音乐' : (uiLang === 'ja_JP' ? '音楽' : 'MUSIC')), subLabel: 'MUSIC', icon: Music, disabled: false },
  ];

  const filteredEpisodes = React.useMemo(() => {
    if (activeTab === 'OPERATORS') {
      const operatorEpisodes = episodes.filter(ep => {
        if (ep.entryType === 'MAINLINE' || ep.entryType === 'ACTIVITY' || ep.entryType === 'MINI') return false;
        return ep.entryType === 'NONE' || ep.id.startsWith('operator_') || ep.id.startsWith('or_') || ep.id.startsWith('set_') || ep.id.startsWith('story_') || ep.id.includes('_set_') || ep.id.includes('_record_');
      });

      const groupedMap = new Map<string, StoryEpisode>();

      for (const ep of operatorEpisodes) {
        const opKey = extractOperatorKey(ep.id);
        if (!opKey) continue;

        const opDetails = getOperatorDetails(opKey, uiLang);

        if (!groupedMap.has(opKey)) {
          groupedMap.set(opKey, {
            id: `operator_${opKey}`,
            name: opDetails.displayName,
            chineseName: opDetails.chineseName,
            englishName: opDetails.englishName,
            entryType: 'NONE',
            storyEntryPicId: ep.storyEntryPicId || ep.id,
            startTime: ep.startTime,
            year: ep.year,
            chapters: [...ep.chapters]
          });
        } else {
          const existing = groupedMap.get(opKey)!;
          for (const ch of ep.chapters) {
            if (!existing.chapters.some(c => c.id === ch.id)) {
              existing.chapters.push(ch);
            }
          }
        }
      }

      let resultList = Array.from(groupedMap.values());

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        resultList = resultList.filter(ep => 
          (ep.name || '').toLowerCase().includes(query) || 
          (ep.chineseName || '').toLowerCase().includes(query) || 
          (ep.englishName || '').toLowerCase().includes(query) || 
          ep.id.toLowerCase().includes(query)
        );
      }

      resultList.sort((a, b) => {
        if (sortOrder === 'textLength') {
          return (b.chapters?.length || 0) - (a.chapters?.length || 0);
        }
        const nameA = (a.name || a.id).toLowerCase();
        const nameB = (b.name || b.id).toLowerCase();
        return sortOrder === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      });

      return resultList;
    }

    const getSortWeight = (ep: StoryEpisode) => {
      if (viewMode === 'YEAR' || selectedStoryLine === 'main') return null;
      
      const prefixes = STORY_LINE_FILTERS[selectedStoryLine] || [];
      const lowerId = ep.id.toLowerCase();

      for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        if (!prefix) continue;
        const lowerPrefix = prefix.toLowerCase();
        
        if (lowerId === lowerPrefix) return i;
        if (lowerPrefix.endsWith('_') && lowerId.startsWith(lowerPrefix)) return i;
      }
      return 999;
    };

    return episodes
      .filter(ep => {
        const isOperatorStory = ep.entryType === 'NONE' || ep.id.startsWith('or_') || ep.id.startsWith('set_') || ep.id.startsWith('story_') || ep.id.includes('_set_') || ep.id.includes('_record_');

        if (activeTab !== 'STORY' && activeTab !== 'HOME') return false;
        
        // Exclude Operator Records from Story tab
        if (isOperatorStory) return false;
        
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
          
          // 1. Exact ID match
          if (lowerId === lowerPrefix) return true;
          
          // 2. Prefix match for wildcard prefixes ending with '_' (e.g. 'main_')
          if (lowerPrefix.endsWith('_') && lowerId.startsWith(lowerPrefix)) return true;
          
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
        if (activeTab === 'OPERATORS') {
          if (sortOrder === 'textLength') {
            return (b.chapters?.length || 0) - (a.chapters?.length || 0);
          }
          const nameA = (a.name || a.id).toLowerCase();
          const nameB = (b.name || b.id).toLowerCase();
          return sortOrder === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
        }

        // Custom sort by STORY_LINE_FILTERS order (only in STORYLINE mode)
        if (viewMode === 'STORYLINE') {
          const weightA = getSortWeight(a);
          const weightB = getSortWeight(b);

          if (weightA !== null && weightB !== null && weightA !== weightB) {
            return weightA - weightB;
          }
        }

        if (sortOrder === 'textLength') {
          const lenA = a.chapters?.length || 0;
          const lenB = b.chapters?.length || 0;
          if (lenA !== lenB) {
            return lenB - lenA;
          }
          const orderA = CHRONO_ORDER[a.id.toLowerCase()] || 9999;
          const orderB = CHRONO_ORDER[b.id.toLowerCase()] || 9999;
          return orderA - orderB;
        }

        const timeA = a.startTime || 0;
        const timeB = b.startTime || 0;
        if (timeA !== timeB) {
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const orderA = CHRONO_ORDER[a.id.toLowerCase()] ?? 9999;
        const orderB = CHRONO_ORDER[b.id.toLowerCase()] ?? 9999;
        if (orderA !== orderB) {
          return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
        }

        return a.id.localeCompare(b.id);
      });
  }, [episodes, activeTab, selectedYear, searchQuery, sortOrder, selectedStoryLine, viewMode]);

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
      // In landscape orientation (width > height), mobile devices should be treated as PC desktop view
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsMobile(window.innerWidth < 768 && !isLandscape);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      setLanguage(storyLang);
      const list = await fetchChapterList();
      
      setEpisodes(list);
      setLoading(false);
      
      // Load images in background with fast initial display
      const loadBatch = async (items: StoryEpisode[]) => {
        const initialImages: Record<string, string> = {};
        const mapping = await fetchCharacterMapping();

        for (const ep of items) {
          const isOperatorStory = ep.entryType === 'NONE' || ep.id.startsWith('operator_') || ep.id.startsWith('or_') || ep.id.startsWith('set_') || ep.id.startsWith('story_') || ep.id.includes('_set_') || ep.id.includes('_record_');

          if (isOperatorStory) {
            let charName = '';
            const match = ep.id.match(/story_([a-zA-Z0-9]+)_set/) || ep.id.match(/or_([a-zA-Z0-9]+)/) || ep.id.match(/set_([a-zA-Z0-9]+)/) || ep.id.match(/operator_([a-zA-Z0-9]+)/);
            if (match) {
              charName = match[1];
            } else {
              charName = ep.id.replace(/^(operator_|or_|story_|set_)/, '').split('_')[0];
            }
            const charId = mapping[charName.toLowerCase()] || `char_${charName}`;
            const avatarUrl = `https://raw.githubusercontent.com/fexli/ArknightsResource/main/avatar/ASSISTANT/${charId}_2.png`;
            initialImages[ep.id] = avatarUrl;
            initialImages[`operator_${charName.toLowerCase()}`] = avatarUrl;
          } else {
            const imageId = ep.storyEntryPicId || ep.id;
            const chineseName = ep.chineseName || ep.name;
            
            // Sanitize names for file paths (remove invalid characters like colon)
            const safeImageId = imageId.replace(/[:：\s<>"/\\|?*]/g, '').trim();
            const safeChineseName = chineseName.replace(/[:：\s<>"/\\|?*]/g, '').trim();
            
            let url = '';
            // Try to guess the most likely filename based on what the user added
            if (ep.id.startsWith('main_')) {
              const num = ep.id.replace('main_', '');
              const paddedNum = num.length === 1 ? `0${num}` : num;
              url = `${BANNERS_BASE_URL}/main_${paddedNum}.png`;
            } else if (ep.id.startsWith('is_')) {
              const num = ep.id.replace('is_', '');
              url = `${BANNERS_BASE_URL}/IS_${num}.png`;
            } else if (ep.id.startsWith('ra_')) {
              const num = ep.id.replace('ra_', '');
              url = `${BANNERS_BASE_URL}/RA_${num}.png`;
            } else if (safeChineseName && !/[\u4e00-\u9fa5]/.test(safeImageId)) {
              // If we have a Chinese name and the ID is just a code, try the Chinese name format first
              url = `${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`;
            } else {
              url = `${BANNERS_BASE_URL}/${safeImageId}.png`;
            }
            initialImages[ep.id] = url;
          }
        }
        
        // Render network URLs immediately to fix LCP delay
        setEpisodeImages(initialImages);
      };

      loadBatch(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load episodes');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEpisodes();
  }, [storyLang]);

  const handleImageError = (id: string) => {
    setEpisodeImages(prev => {
      const currentUrl = prev[id];
      if (!currentUrl) return prev;
      
      if (currentUrl.includes('/avatar/ASSISTANT/')) {
        if (currentUrl.endsWith('_2.png')) {
          return { ...prev, [id]: currentUrl.replace('_2.png', '.png') };
        } else if (currentUrl.endsWith('.png') && !currentUrl.endsWith('_1.png')) {
          return { ...prev, [id]: currentUrl.replace('.png', '_1.png') };
        }
      }
      
      setFailedImages(f => ({ ...f, [id]: true }));
      return prev;
    });
  };

  const handleUiLanguageChange = (newLang: Language) => {
    setUiLang(newLang);
    localStorage.setItem('arknights_ui_lang', newLang);
    setStoryLang(newLang);
    localStorage.setItem('arknights_story_lang', newLang);
    setLanguage(newLang);
  };

  const handleStoryLanguageChange = (newLang: Language) => {
    setStoryLang(newLang);
    localStorage.setItem('arknights_story_lang', newLang);
    setLanguage(newLang);
  };

  useEffect(() => {
    if (episodes.length > 0 && activeTab === 'ALL') {
      setActiveTab('MAINLINE');
    }
  }, [episodes]);

  const [chapterScriptsExist, setChapterScriptsExist] = useState<Record<string, boolean>>({});
  const [availableTranslators, setAvailableTranslators] = useState<string[]>([]);

  useEffect(() => {
    if (selectedEpisode) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      const loadChapterData = async () => {
        const images: Record<string, string | null> = {};
        const existence: Record<string, boolean> = {};
        
        // 1. Compute available translators first for this selected episode
        const registry = TRANSLATION_REGISTRY[lang];
        const avail: string[] = [];
        if (registry && registry.translators.length > 0) {
          await Promise.all(registry.translators.map(async (translator) => {
            if (selectedEpisode.chapters.length > 0) {
              const firstExists = await checkScriptExists(selectedEpisode.chapters[0].storyTxt, lang, translator);
              if (firstExists) {
                avail.push(translator);
              }
            }
          }));
        }
        
        const sortedAvail = sortTranslators(registry?.translators.filter(t => avail.includes(t)) || []);
        setAvailableTranslators(sortedAvail);

        // 2. Adjust selectedTranslator if currently selected one is not available or if human translation is available
        let finalTranslator = selectedTranslator;
        if (sortedAvail.length > 0) {
          const defaultTranslator = getDefaultTranslator(sortedAvail);
          const hasHumanAvailable = sortedAvail.some(t => !isAITranslator(t));
          const isCurrentAI = selectedTranslator ? isAITranslator(selectedTranslator) : true;

          if (!selectedTranslator || !sortedAvail.includes(selectedTranslator) || (isCurrentAI && hasHumanAvailable)) {
            finalTranslator = defaultTranslator;
            setSelectedTranslator(finalTranslator);
            onTranslatorChange?.(finalTranslator);
            if (finalTranslator) {
              localStorage.setItem('ak-selected-translator', finalTranslator);
            }
          }
        }

        // 3. Load chapters data with final effective translator
        await Promise.all(selectedEpisode.chapters.map(async (chapter) => {
          const defaultTranslator = (registry && registry.translators.length > 0) ? getDefaultTranslator(registry.translators) : undefined;
          const effectiveTranslator = finalTranslator || defaultTranslator;
          const exists = await checkScriptExists(chapter.storyTxt, lang, effectiveTranslator);
          existence[chapter.id] = exists;
        }));
        
        setChapterImages({});
        setChapterScriptsExist(existence);
      };
      loadChapterData();
    }
  }, [selectedEpisode, lang, selectedTranslator]);

  // Auto-select translator based on discovery
  useEffect(() => {
    if (selectedEpisode && !LANGUAGES.find(l => l.id === lang)?.isOfficial) {
      const preferredTranslator = translatorDiscovery[selectedEpisode.id];
      if (preferredTranslator && preferredTranslator !== selectedTranslator) {
        setSelectedTranslator(preferredTranslator);
        onTranslatorChange?.(preferredTranslator);
        localStorage.setItem('ak-selected-translator', preferredTranslator);
      }
    }
  }, [selectedEpisode, lang, translatorDiscovery]);

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
        {selectedEpisode && episodeImages[selectedEpisode.id] ? (
          <div className="absolute inset-0">
            <img 
              src={episodeImages[selectedEpisode.id]!} 
              alt="" 
              className="w-full h-full object-cover blur-xl scale-110 opacity-55 transition-opacity duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/70" />
          </div>
        ) : selectedStoryLine && getStoryLineBg(selectedStoryLine) ? (
          <div className="absolute inset-0">
            <img 
              src={getStoryLineBg(selectedStoryLine)!} 
              alt="" 
              className="w-full h-full object-cover opacity-75 transition-opacity duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/75" />
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
          <div className="flex-1 flex flex-col overflow-hidden h-full relative">
            {/* Top Floating Header & Controls */}
            {activeTab !== 'HOME' && activeTab !== 'NONE' && activeTab !== 'VOTE' && activeTab !== 'OPERATORS' && (
              <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 z-50 flex flex-row items-center justify-between gap-2 sm:gap-3 pointer-events-none">
                {/* Top Left: Back & Home Group + Episode Voting Button */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-sm overflow-hidden divide-x divide-white/10 h-10 px-1 backdrop-blur-md shadow-lg">
                    <button
                      onClick={() => {
                        if (isMobile && showEpisodesOnMobile && viewMode !== 'ALL') {
                          setShowEpisodesOnMobile(false);
                        } else {
                          setActiveTab('HOME');
                          navigate('/');
                        }
                      }}
                      className="flex items-center justify-center w-10 h-8 hover:bg-white/10 transition-all text-white/60 hover:text-white cursor-pointer"
                      title={uiLang === 'ru_RU' ? 'Назад' : 'Back'}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('HOME');
                        navigate('/');
                      }}
                      className="flex items-center justify-center w-10 h-8 hover:bg-white/10 transition-all text-white/60 hover:text-white cursor-pointer"
                      title={uiLang === 'ru_RU' ? 'Главная' : 'Home'}
                    >
                      <Home className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Top Right: Search, Sort, Lang & Mode Group */}
                <div className="flex items-center gap-3 pointer-events-auto">
                  {viewMode === 'ALL' && !isMobile && (
                    <>
                      {/* Search Bar */}
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-white/60 transition-colors" />
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="SEARCH..."
                          className="w-36 bg-black/60 border border-white/10 rounded-sm h-9 pl-8 pr-3 text-[9px] font-black tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:w-48 transition-all uppercase backdrop-blur-md"
                        />
                      </div>

                      {/* Sort Selector */}
                      <div className="relative shrink-0">
                        <button 
                          onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                          className={`h-9 px-3 border transition-all rounded-sm bg-black/60 backdrop-blur-md flex items-center gap-2 text-white/60 hover:text-white hover:bg-white/5 ${isSortMenuOpen ? 'border-white text-white bg-white/10' : 'border-white/10'}`}
                          title="Sort Order"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-[8px] font-black tracking-widest uppercase">
                            {sortOrder === 'textLength' ? (uiLang === 'ru_RU' ? 'По тексту' : 'Text Vol') :
                             sortOrder === 'desc' ? (uiLang === 'ru_RU' ? 'Новые' : 'Newest') :
                             (uiLang === 'ru_RU' ? 'Старые' : 'Oldest')}
                          </span>
                        </button>
                        
                        {isSortMenuOpen && (
                          <div className="absolute top-11 right-0 w-48 bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-[60] rounded-sm">
                            <button
                              onClick={() => {
                                setSortOrder('textLength');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'textLength' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'По количеству текста' : 'By text quantity'}
                              {sortOrder === 'textLength' && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortOrder('desc');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'desc' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'Сначала новые' : 'Newest First'}
                              {sortOrder === 'desc' && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortOrder('asc');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'asc' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'Сначала старые' : 'Oldest First'}
                              {sortOrder === 'asc' && <Check className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Language Selector */}
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                      className={`h-9 px-3 flex items-center gap-2 border transition-all rounded-sm bg-black/60 backdrop-blur-md ${isLangMenuOpen ? 'bg-white border-white text-black' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
                      title="Language"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-black tracking-widest uppercase">
                        {storyLang === 'zh_CN' ? 'ZH' :
                         storyLang === 'en_US' ? 'EN' :
                         storyLang === 'ja_JP' ? 'JA' : 'RU'}
                      </span>
                    </button>
                    
                    {isLangMenuOpen && (
                      <div className="absolute top-11 right-0 w-48 bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-[60] max-h-[60vh] overflow-y-auto custom-scrollbar rounded-sm">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => {
                              handleStoryLanguageChange(l.id);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${storyLang === l.id ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                          >
                            {l.label}
                            {storyLang === l.id && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ALL Toggle */}
                  <button 
                    onClick={() => setViewMode(viewMode === 'ALL' ? 'STORYLINE' : 'ALL')}
                    className={`h-9 px-4 border transition-all flex items-center gap-2 group rounded-sm bg-black/60 backdrop-blur-md ${viewMode === 'ALL' ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-white/25 text-white hover:bg-white/10 hover:border-white/40'}`}
                    title="All stories"
                  >
                    <LayoutGrid className={`w-3.5 h-3.5 ${viewMode === 'ALL' ? 'text-black' : 'text-white/40 group-hover:text-white'}`} />
                    <span className="text-[8px] font-black tracking-widest uppercase hidden sm:inline">{t.all}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Grid & Carousel Container */}
            <div className="flex-1 flex overflow-hidden h-full relative">
              {activeTab === 'HOME' ? (
                <div className="flex-1 overflow-hidden h-full">
                  <ErrorBoundary
                    sectionName="Главное Меню"
                    fallbackTitle="Ошибка меню PRTS"
                    fallbackMessage="Не удалось отобразить главное меню."
                    showHomeButton={false}
                  >
                    <MainMenu 
                      onOpenTerminal={() => {
                        setActiveTab('STORY');
                        navigate('/story');
                      }}
                      onOpenArchive={() => {
                        setActiveTab('NONE');
                        navigate('/records');
                      }}
                      onOpenVote={() => {
                        setActiveTab('VOTE');
                        navigate('/music');
                      }}
                      onOpenOperators={() => {
                        setActiveTab('OPERATORS');
                        navigate('/operators');
                      }}
                      lang={uiLang}
                      setLang={handleUiLanguageChange}
                      readChaptersCount={readChapters ? readChapters.size : 0}
                      readChapters={readChapters}
                      episodes={episodes}
                    />
                  </ErrorBoundary>
                </div>
              ) : activeTab === 'OPERATORS' ? (
                <div className="flex-1 overflow-hidden h-full">
                  <ErrorBoundary
                    sectionName="Истории Оперативников"
                    fallbackTitle="Сбой модуля операторов"
                    fallbackMessage="Не удалось отобразить список историй оперативников."
                    onReset={() => {
                      setActiveTab('HOME');
                      navigate('/');
                    }}
                  >
                    <OperatorStoriesViewer 
                      filteredEpisodes={filteredEpisodes}
                      episodeImages={episodeImages}
                      failedImages={failedImages}
                      setSelectedEpisode={setSelectedEpisode}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      sortOrder={sortOrder}
                      setSortOrder={setSortOrder}
                      readChapters={readChapters}
                      uiLang={uiLang}
                      t={t}
                      handleImageError={handleImageError}
                      onSelectChapter={(chapter, episode) => {
                        setSelectedEpisode(episode);
                        onSelect(chapter);
                      }}
                      onOpenTranslation={onOpenTranslation}
                      onBack={() => {
                        setActiveTab('HOME');
                        navigate('/');
                      }}
                    />
                  </ErrorBoundary>
                </div>
              ) : activeTab === 'VOTE' ? (
                <div className="flex-1 overflow-hidden h-full">
                  <ErrorBoundary
                    sectionName="Интерфейс голосования"
                    fallbackTitle="Ошибка модуля голосования"
                    fallbackMessage="Не удалось загрузить данные голосования или треки."
                    onReset={() => {
                      setActiveTab('HOME');
                      navigate('/');
                    }}
                  >
                    <VotingInterface episodes={episodes} uiLang={uiLang} initialMode="MUSIC_ONLY" />
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden h-full">
                  {/* LEFT TIMELINE MENU */}
                  {viewMode !== 'ALL' && (
                    <div className={`${isMobile && showEpisodesOnMobile ? 'hidden' : 'flex'} w-full md:w-80 shrink-0 flex-col overflow-hidden relative z-20 bg-zinc-950 backdrop-blur-md border-r border-white/10 h-full`}>
                      {/* Connecting Line */}
                      <div className="absolute left-[39px] top-0 bottom-0 w-[1px] bg-white/10 pointer-events-none" />

                      {/* Invisible top spacer to push storyline selection down */}
                      <div className="h-16 shrink-0 w-full pointer-events-none" />

                      {/* Timeline list */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar relative py-4">
                        {/* Timeline Node items will align with the parent's connecting line */}

                        {viewMode === 'STORYLINE' ? (
                          STORY_LINES_DATA.map((line) => {
                            const isSelected = selectedStoryLine === line.id;
                            return (
                              <button
                                key={line.id}
                                onClick={() => {
                                  setSelectedStoryLine(line.id);
                                  if (isMobile) setShowEpisodesOnMobile(true);
                                }}
                                className={`group relative w-full flex items-center gap-4 py-4 pl-10 pr-6 transition-all duration-300 text-left outline-none ${isSelected ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
                              >
                                {/* Timeline Node dot */}
                                <div className="absolute left-[39px] w-9 h-9 flex items-center justify-center -translate-x-1/2 z-10 pointer-events-none">
                                  {isSelected ? (
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute w-6 h-6 bg-white/20 rounded-full animate-ping" />
                                      <div className="w-3.5 h-3.5 bg-white rounded-full border border-black shadow-[0_0_12px_rgba(255,255,255,1)]" />
                                    </div>
                                  ) : (
                                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full group-hover:bg-white/60 transition-colors" />
                                  )}
                                </div>

                                {/* Storyline Logo */}
                                <div className={`w-8 h-8 ml-6 shrink-0 flex items-center justify-center p-0.5 rounded-sm bg-black/40 border border-white/5 transition-all duration-300 ${isSelected ? 'scale-110 opacity-100 border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'opacity-25 group-hover:opacity-65'}`}>
                                  <img 
                                    src={`https://raw.githubusercontent.com/neponum/zoot-data/main/icons/${line.logo}.webp`} 
                                    alt=""
                                    className="max-w-full max-h-full object-contain filter drop-shadow-md"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                </div>

                                {/* Labels */}
                                <div className="flex flex-col overflow-hidden">
                                  <span className={`text-[10px] font-black tracking-wider font-mono uppercase transition-colors ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                                    {line.topText}
                                  </span>
                                  <span className={`text-[10px] font-bold truncate mt-0.5 transition-colors ${isSelected ? 'text-white/80' : 'text-white/20 group-hover:text-white/40'}`}>
                                    {t.story_lines[line.id] || line.bottomText}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          arkYears.map((year) => {
                            const isSelected = selectedYear === year.value;
                            return (
                              <button
                                key={year.value}
                                onClick={() => {
                                  setSelectedYear(year.value);
                                  if (isMobile) setShowEpisodesOnMobile(true);
                                }}
                                className={`group relative w-full flex items-center gap-4 py-5 pl-10 pr-6 transition-all duration-300 text-left outline-none ${isSelected ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
                              >
                                {/* Timeline Node dot */}
                                <div className="absolute left-[39px] w-9 h-9 flex items-center justify-center -translate-x-1/2 z-10 pointer-events-none">
                                  {isSelected ? (
                                    <div className="relative flex items-center justify-center">
                                      <div className="absolute w-6 h-6 bg-white/20 rounded-full animate-ping" />
                                      <div className="w-3.5 h-3.5 bg-white rounded-full border border-black shadow-[0_0_12px_rgba(255,255,255,1)]" />
                                    </div>
                                  ) : (
                                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full group-hover:bg-white/60 transition-colors" />
                                  )}
                                </div>

                                {/* Labels */}
                                <div className="flex flex-col ml-14 overflow-hidden">
                                  <span className={`text-[9px] font-black tracking-widest font-mono uppercase transition-colors ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                                    ERA DIVISION
                                  </span>
                                  <span className={`text-xs font-black truncate mt-0.5 transition-colors ${isSelected ? 'text-white/90' : 'text-white/20 group-hover:text-white/40'}`}>
                                    {year.label}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Sleek bottom mode toggle */}
                      <div className="p-2 border-t border-white/10 bg-zinc-950 shrink-0 flex gap-1.5 relative z-10">
                        <button
                          onClick={() => setViewMode('STORYLINE')}
                          className={`flex-1 py-2 text-[8px] md:text-[9px] font-black tracking-wider uppercase transition-all rounded-sm border ${
                            viewMode === 'STORYLINE' ? 'bg-white border-white text-black shadow-md' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {t.storyline}
                        </button>
                        <button
                          onClick={() => setViewMode('YEAR')}
                          className={`flex-1 py-2 text-[8px] md:text-[9px] font-black tracking-wider uppercase transition-all rounded-sm border ${
                            viewMode === 'YEAR' ? 'bg-white border-white text-black shadow-md' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {t.year}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Horizontal List Area */}
                  <div className={`${isMobile && !showEpisodesOnMobile && viewMode !== 'ALL' ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden h-full relative pt-20 bg-black/40`}>
                    {/* Mobile Back to Storylines button */}
                    {isMobile && showEpisodesOnMobile && viewMode !== 'ALL' && (
                      <button 
                        onClick={() => setShowEpisodesOnMobile(false)}
                        className="absolute top-4 left-6 z-30 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">{t.back_to_storylines}</span>
                      </button>
                    )}

                    {filteredEpisodes.length > 0 ? (
                      viewMode === 'ALL' ? (
                        /* In 'ALL' mode, we keep a nice scrollable grid for all stories */
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-12 py-8 pb-24 md:pb-8 custom-scrollbar h-full bg-transparent">
                          <EpisodeGrid
                            filteredEpisodes={filteredEpisodes}
                            episodeImages={episodeImages}
                            failedImages={failedImages}
                            translatorDiscovery={translatorDiscovery}
                            setSelectedEpisode={setSelectedEpisode}
                            setHoveredEpisodeId={setHoveredEpisodeId}
                            setFailedImages={setFailedImages}
                            readChapters={readChapters}
                          />
                        </div>
                      ) : (
                        /* In 'STORYLINE' or 'YEAR' mode, we use the beautiful Horizontal Episode Carousel */
                        <div className="flex-1 flex overflow-hidden h-full relative bg-transparent">
                          <EpisodeHorizontalList
                            filteredEpisodes={filteredEpisodes}
                            episodeImages={episodeImages}
                            failedImages={failedImages}
                            setSelectedEpisode={setSelectedEpisode}
                            setHoveredEpisodeId={setHoveredEpisodeId}
                            setFailedImages={setFailedImages}
                            horizontalScrollRef={horizontalScrollRef}
                            selectedStoryLine={selectedStoryLine}
                            translatorDiscovery={translatorDiscovery}
                            readChapters={readChapters}
                          />
                        </div>
                      )
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
                        <AlertCircle className="w-12 h-12 text-white/10 mb-4" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                          No records found in this category
                        </span>
                      </div>
                    )}

                    {/* Dedicated Bottom-Right Category Shortcuts (Integrated Strategies, Reclamation, Side Content) */}
                    <div className="absolute bottom-3 right-3 md:bottom-4 md:right-8 z-30 flex items-center gap-1.5 md:gap-2 pointer-events-auto bg-black/85 backdrop-blur-xl border border-white/15 p-1 md:p-1.5 rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.8)] max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
                      {/* Integrated Strategies */}
                      <button
                        onClick={() => {
                          setViewMode('STORYLINE');
                          setSelectedStoryLine('is');
                          setSelectedEpisode(null);
                          if (isMobile) setShowEpisodesOnMobile(true);
                        }}
                        className={`group flex items-center gap-1.5 md:gap-2.5 px-2 md:px-3 py-1 md:py-1.5 rounded-sm border transition-all cursor-pointer select-none shrink-0 ${
                          selectedStoryLine === 'is' && viewMode === 'STORYLINE'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25'
                        }`}
                        title={uiLang === 'ru_RU' ? 'Интегрированные стратегии (Рогалик)' : 'Integrated Strategies (Roguelike)'}
                      >
                        <Compass className={`w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 transition-colors ${selectedStoryLine === 'is' && viewMode === 'STORYLINE' ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-300'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] md:text-[9px] font-black tracking-wider uppercase font-mono leading-none">
                            <span className="hidden sm:inline">{uiLang === 'ru_RU' ? 'ИНТЕГРИРОВАННЫЕ СТРАТЕГИИ' : 'INTEGRATED STRATEGIES'}</span>
                            <span className="sm:hidden">IS</span>
                          </span>
                          <span className="text-[6px] md:text-[7px] font-bold text-white/40 group-hover:text-white/70 uppercase tracking-widest leading-none mt-0.5 hidden xs:inline">
                            {uiLang === 'ru_RU' ? 'IS • Рогалик' : 'IS • Roguelike'}
                          </span>
                        </div>
                      </button>

                      {/* Reclamation Algorithm */}
                      <button
                        onClick={() => {
                          setViewMode('STORYLINE');
                          setSelectedStoryLine('ra');
                          setSelectedEpisode(null);
                          if (isMobile) setShowEpisodesOnMobile(true);
                        }}
                        className={`group flex items-center gap-1.5 md:gap-2.5 px-2 md:px-3 py-1 md:py-1.5 rounded-sm border transition-all cursor-pointer select-none shrink-0 ${
                          selectedStoryLine === 'ra' && viewMode === 'STORYLINE'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25'
                        }`}
                        title={uiLang === 'ru_RU' ? 'Рекультивация (Сказки песков)' : 'Reclamation Algorithm (Tales of the Sand)'}
                      >
                        <Layers className={`w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 transition-colors ${selectedStoryLine === 'ra' && viewMode === 'STORYLINE' ? 'text-emerald-400' : 'text-white/40 group-hover:text-emerald-300'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] md:text-[9px] font-black tracking-wider uppercase font-mono leading-none">
                            <span className="hidden sm:inline">{uiLang === 'ru_RU' ? 'РЕКУЛЬТИВАЦИЯ' : 'RECLAMATION'}</span>
                            <span className="sm:hidden">RA</span>
                          </span>
                          <span className="text-[6px] md:text-[7px] font-bold text-white/40 group-hover:text-white/70 uppercase tracking-widest leading-none mt-0.5 hidden xs:inline">
                            {uiLang === 'ru_RU' ? 'RA • Сказки' : 'RA • Sand'}
                          </span>
                        </div>
                      </button>

                      {/* Side Content / April Fool's */}
                      <button
                        onClick={() => {
                          setViewMode('STORYLINE');
                          setSelectedStoryLine('side_content');
                          setSelectedEpisode(null);
                          if (isMobile) setShowEpisodesOnMobile(true);
                        }}
                        className={`group flex items-center gap-1.5 md:gap-2.5 px-2 md:px-3 py-1 md:py-1.5 rounded-sm border transition-all cursor-pointer select-none shrink-0 ${
                          selectedStoryLine === 'side_content' && viewMode === 'STORYLINE'
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/25'
                        }`}
                        title={uiLang === 'ru_RU' ? 'Дополнительный контент и 1 Апреля' : "Side Content & April Fool's Day"}
                      >
                        <Sparkles className={`w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 transition-colors ${selectedStoryLine === 'side_content' && viewMode === 'STORYLINE' ? 'text-purple-400' : 'text-white/40 group-hover:text-purple-300'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] md:text-[9px] font-black tracking-wider uppercase font-mono leading-none">
                            <span className="hidden sm:inline">{uiLang === 'ru_RU' ? 'ДОП. КОНТЕНТ' : 'SIDE CONTENT'}</span>
                            <span className="sm:hidden">EXTRA</span>
                          </span>
                          <span className="text-[6px] md:text-[7px] font-bold text-white/40 group-hover:text-white/70 uppercase tracking-widest leading-none mt-0.5 hidden xs:inline">
                            {uiLang === 'ru_RU' ? '1 Апреля' : "April Fool"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Floating Mobile Search & Sort Bar for ALL mode on vertical mobile */}
                  {isMobile && viewMode === 'ALL' && (
                    <div className="absolute bottom-4 left-3 right-3 z-50 pointer-events-auto flex items-center gap-2 bg-black/90 border border-white/20 p-2 rounded-sm backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                      {/* Search Input */}
                      <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-white/70 transition-colors" />
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={uiLang === 'ru_RU' ? 'ПОИСК...' : 'SEARCH...'}
                          className="w-full bg-zinc-900/90 border border-white/10 rounded-sm h-9 pl-8 pr-8 text-[10px] font-black tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all uppercase"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Sort Selector */}
                      <div className="relative shrink-0">
                        <button 
                          onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                          className={`h-9 px-3 border transition-all rounded-sm bg-zinc-900/90 backdrop-blur-md flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/5 ${isSortMenuOpen ? 'border-white text-white bg-white/10' : 'border-white/10'}`}
                          title="Sort Order"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-white/50" />
                          <span className="text-[8px] font-black tracking-widest uppercase">
                            {sortOrder === 'textLength' ? (uiLang === 'ru_RU' ? 'По тексту' : 'Text Vol') :
                             sortOrder === 'desc' ? (uiLang === 'ru_RU' ? 'Новые' : 'Newest') :
                             (uiLang === 'ru_RU' ? 'Старые' : 'Oldest')}
                          </span>
                        </button>
                        
                        {isSortMenuOpen && (
                          <div className="absolute bottom-11 right-0 w-48 bg-[#0a0a0a] border border-white/15 shadow-2xl p-2 z-[60] rounded-sm">
                            <button
                              onClick={() => {
                                setSortOrder('textLength');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'textLength' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'По количеству текста' : 'By text quantity'}
                              {sortOrder === 'textLength' && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortOrder('desc');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'desc' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'Сначала новые' : 'Newest First'}
                              {sortOrder === 'desc' && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortOrder('asc');
                                setIsSortMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortOrder === 'asc' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              {uiLang === 'ru_RU' ? 'Сначала старые' : 'Oldest First'}
                              {sortOrder === 'asc' && <Check className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Chapter Selection View (when an episode is clicked)
          <div className="flex-1 flex flex-col p-4 md:p-16 pt-24 md:pt-16 animate-in fade-in zoom-in-95 duration-500 overflow-hidden h-full bg-black/80">
            <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-12">
              <button 
                onClick={() => setSelectedEpisode(null)}
                className="w-10 h-10 md:w-12 md:h-12 shrink-0 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-xl sm:text-2xl md:text-5xl font-black tracking-tighter uppercase line-clamp-2">{selectedEpisode.name}</h2>
                {(() => {
                  const currentLangObj = LANGUAGES.find(l => l.id === lang);
                  if (currentLangObj && !currentLangObj.isOfficial) {
                    const registry = TRANSLATION_REGISTRY[lang];
                    const hasAnyTranslation = Object.values(chapterScriptsExist).some(exists => exists);
                    const translators = (availableTranslators.length > 0)
                      ? availableTranslators
                      : ((registry && registry.translators.length > 0) 
                        ? registry.translators 
                        : [t.community_translators]);
                    
                    if (hasAnyTranslation || translators.length > 1) {
                      return (
                        <div className="mt-2 flex items-center gap-4">
                          <div className="text-sm text-white/50 flex items-center gap-2">
                            <span className="font-bold uppercase tracking-widest text-[10px] bg-white/10 px-2 py-0.5 rounded-sm">{t.translation}</span>
                            <span className="font-medium flex items-center gap-1.5">
                              {selectedTranslator || translators[0]}
                              {isAITranslator(selectedTranslator || translators[0]) && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded-sm">
                                  Нейроперевод
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {translators.length > 1 && (
                            <div className="relative">
                              <button 
                                onClick={() => setIsTranslatorMenuOpen(!isTranslatorMenuOpen)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                              >
                                {t.change} <ChevronDown className="w-3 h-3" />
                              </button>
                              
                              {isTranslatorMenuOpen && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-white/10 shadow-2xl z-50 py-1 rounded-sm">
                                  {translators.map(translatorName => {
                                    const registry = TRANSLATION_REGISTRY[lang];
                                    const isPreferred = registry?.episodeTranslatorMapping?.[selectedEpisode.id] === translatorName;
                                    const isActive = selectedTranslator === translatorName || (!selectedTranslator && translatorName === translators[0]);
                                    
                                    return (
                                      <button
                                        key={translatorName}
                                        onClick={() => {
                                          setSelectedTranslator(translatorName);
                                          onTranslatorChange?.(translatorName);
                                          setIsTranslatorMenuOpen(false);
                                          localStorage.setItem('ak-selected-translator', translatorName);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center justify-between ${
                                          isActive ? 'text-blue-400' : 'text-white/60'
                                        }`}
                                      >
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-1.5">
                                            <span>{translatorName}</span>
                                            {isAITranslator(translatorName) && (
                                              <span className="text-[7px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-1 py-0.2 rounded border border-purple-500/30">
                                                Нейроперевод
                                              </span>
                                            )}
                                          </div>
                                          {translatorDiscovery[selectedEpisode.id] === translatorName && (
                                            <span className="text-[7px] text-blue-500/60 lowercase italic tracking-normal">{t.translation} found</span>
                                          )}
                                        </div>
                                        {isActive && <Check className="w-3 h-3" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-0 sm:pl-8 pr-0 sm:pr-4">
                {selectedEpisode.chapters.map((chapter, idx) => {
                  const isOfficial = LANGUAGES.find(l => l.id === lang)?.isOfficial ?? true;
                  const scriptExists = chapterScriptsExist[chapter.id] ?? isOfficial; 
                  
                  const isBeg = chapter.id.toLowerCase().includes('_beg');
                  const isMid = chapter.id.toLowerCase().includes('_mid');
                  const isEnd = chapter.id.toLowerCase().includes('_end');
                  const isSt = chapter.id.toLowerCase().includes('_st_') || chapter.id.toLowerCase().startsWith('level_st');
                  const typeLabel = isBeg ? 'BEG' : isMid ? 'MID' : isEnd ? 'END' : isSt ? 'STORY' : 'RECORD';
                  const typeColor = isBeg ? 'text-blue-400' : isMid ? 'text-yellow-400' : isEnd ? 'text-red-400' : isSt ? 'text-green-400' : 'text-white/40';
                  
                  let displayCode = getChapterDisplayCode(chapter);

                  return (
                    <div
                      key={chapter.id}
                      className="group relative flex items-center transition-all duration-300 w-full"
                    >
                      {/* Vinyl Effect Icon for Chapters */}
                      <div className="absolute left-0 bottom-1/2 translate-y-1/2 -ml-6 w-14 h-14 z-30 pointer-events-none transition-all duration-500 ease-out group-hover:scale-110 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                        <img 
                          src={`${BANNERS_BASE_URL}/49px-图标_剧情.png`} 
                          alt="" 
                          className="w-full h-full object-contain animate-[spin_4s_linear_infinite]"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Chapter Container */}
                      <div className="ml-0 sm:ml-4 w-full flex h-[80px] rounded-sm overflow-hidden border border-white/10 bg-zinc-900 group-hover:border-white/30 transition-all duration-300 group-hover:-translate-y-0.5 shadow-lg relative z-10">
                        
                        {/* Main Interaction Area */}
                        <div
                          onClick={() => onSelect(chapter)}
                          className="flex-1 h-full flex flex-col justify-between pl-4 sm:pl-[18px] pr-[9px] pt-[10px] pb-[10px] relative group/info min-w-0 text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
                          title={`Review ${chapter.name}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onSelect(chapter);
                            }
                          }}
                        >
                          {/* Background Image Effect */}
                          {chapterImages[chapter.id] && (
                            <>
                              <div className="absolute inset-0 opacity-10 group-hover/info:opacity-20 transition-opacity duration-500 mix-blend-screen pointer-events-none">
                                <img 
                                  src={chapterImages[chapter.id]!} 
                                  alt="" 
                                  className="w-full h-full object-cover blur-[2px]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
                            </>
                          )}

                          {/* Top Info Row */}
                          <div className="flex items-center justify-between w-full relative z-10 mb-1">
                             <div className="flex items-center gap-2 min-w-0">
                               <div className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${scriptExists ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-500/40'}`} />
                               <span className={`text-[8px] font-black tracking-[0.2em] uppercase truncate ${scriptExists ? 'text-white/80' : 'text-red-400'}`}>
                                 {scriptExists ? (isOfficial ? 'RECORD' : (
                                   <span className="flex items-center gap-1">
                                      {t.translated} 
                                      {selectedTranslator && (
                                        <span className="opacity-75 font-medium tracking-normal text-[7px] bg-white/10 px-1 py-0.5 rounded-sm flex items-center gap-1">
                                          <span>({selectedTranslator})</span>
                                          {isAITranslator(selectedTranslator) && (
                                            <span className="text-[6.5px] font-extrabold text-purple-300 bg-purple-500/20 px-1 rounded border border-purple-500/30">
                                              Нейроперевод
                                            </span>
                                          )}
                                        </span>
                                      )}
                                   </span>
                                 )) : t.missing}
                               </span>
                             </div>
                             
                             <div className="flex items-center gap-1 shrink-0 ml-2">
                               <span className={`text-[8px] font-black tracking-[0.2em] uppercase ${typeColor} opacity-80 bg-black/60 px-1.5 py-0.5 rounded-[2px] border border-current/20`}>
                                 {typeLabel}
                               </span>
                             </div>
                          </div>

                          {/* Center Content: Title & Subtitle */}
                          <div className="relative z-10 flex flex-col w-full my-auto">
                            <div className="flex items-end gap-2 w-full">
                               <span className="text-[17px] leading-tight font-black text-white truncate drop-shadow-md flex items-center gap-1.5">
                                 {displayCode}
                                 {readChapters?.has(chapter.id) && (
                                   <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0" title={t.read || 'Прочитано'}>
                                     <Check className="w-2.5 h-2.5 stroke-[3]" />
                                   </span>
                                 )}
                               </span>
                               <span className="text-[10px] pb-[1px] font-bold text-white/50 truncate flex-1 leading-none uppercase tracking-wide">
                                 {chapter.name}
                               </span>
                            </div>
                          </div>

                          {/* Bottom Row: Story Label & Read Status */}
                          <div className="relative z-10 flex items-center justify-between mt-auto w-full">
                             <span className="text-[7.5px] font-bold text-white/40 tracking-[0.25em] uppercase pb-0.5">
                               {t.story}
                             </span>

                             <div className="flex items-center gap-1.5 shrink-0 justify-end">
                               {readChapters?.has(chapter.id) ? (
                                 <button
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     onToggleRead?.(chapter.id);
                                   }}
                                   className="group/read flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 rounded-[2px] transition-all hover:bg-emerald-900/80 hover:border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.15)] cursor-pointer"
                                   title="Прочитано (нажмите, чтобы изменить статус)"
                                 >
                                   <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                                   <span className="text-[7.5px] font-black tracking-[0.15em] text-emerald-300 uppercase leading-none mt-[0.5px]">
                                     {t.read || 'READ'}
                                   </span>
                                 </button>
                               ) : (
                                 onToggleRead && (
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       onToggleRead(chapter.id);
                                     }}
                                     className="opacity-0 group-hover/info:opacity-100 flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-[2px] transition-all cursor-pointer"
                                     title="Отметить как прочитанное"
                                   >
                                     <Check className="w-3 h-3 text-white/50 group-hover:text-emerald-400" />
                                     <span className="text-[7px] font-bold tracking-[0.1em] uppercase">
                                       {t.read || 'READ'}
                                     </span>
                                   </button>
                                 )
                               )}
                             </div>
                          </div>

                          {/* Left Accent line */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${typeColor.replace('text-', 'bg-')} opacity-60 shadow-[0_0_10px_currentColor]`} />
                        </div>

                        {/* Actions Block */}
                        <div className="flex flex-col w-[68px] shrink-0 bg-black/80 border-l border-white/10 divide-y divide-white/10">
                          {/* Play Button */}
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               onSelect(chapter);
                            }}
                            className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 hover:bg-white/[0.08] transition-colors text-white group/play relative overflow-hidden"
                          >
                            <Play className="w-3.5 h-3.5 fill-white group-hover/play:scale-110 group-hover/play:fill-red-500 group-hover/play:text-red-500 transition-all drop-shadow-md z-10" />
                            <span className="text-[6.5px] font-black uppercase tracking-[0.2em] text-white/80 group-hover/play:text-red-400 z-10">
                               {t.play}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover/play:opacity-100 transition-opacity" />
                          </button>
                          
                          {/* Translate / Interactive Toggle Button */}
                          {!LANGUAGES.find(l => l.id === lang)?.isOfficial && (
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 onOpenTranslation?.(chapter, selectedEpisode);
                              }}
                              className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 hover:bg-blue-500/15 transition-colors text-white group/trans bg-white/[0.02] relative overflow-hidden"
                              title="Открыть инструмент перевода"
                            >
                              <Languages className="w-3.5 h-3.5 text-white/80 group-hover/trans:scale-110 group-hover/trans:text-blue-400 transition-all z-10" />
                              <span className="text-[6.5px] font-black uppercase tracking-[0.2em] text-white/50 group-hover/trans:text-blue-400 z-10">
                                {t.translate || 'TRANS'}
                              </span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {activeTab !== 'HOME' && activeTab !== 'STORY' && activeTab !== 'NONE' && activeTab !== 'VOTE' && activeTab !== 'OPERATORS' && (
      <div className="h-20 md:h-24 border-t border-white/5 z-20 relative bg-black/80 backdrop-blur-xl flex items-center px-6 md:px-16 justify-between shrink-0">
        <div className="flex items-center gap-4 md:gap-8 lg:gap-12 overflow-x-auto no-scrollbar flex-1 md:flex-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setShowEpisodesOnMobile(false);
                if (tab.id === 'HOME') {
                  navigate('/');
                } else if (tab.id === 'STORY') {
                  navigate('/story');
                } else if (tab.id === 'VOTE') {
                  navigate('/music');
                } else if (tab.id === 'NONE') {
                  navigate('/records');
                }
              }}
              className={`group flex flex-col items-center min-w-[70px] md:min-w-[80px] transition-all relative ${
                tab.disabled ? 'opacity-40 cursor-not-allowed' : 
                activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'text-white' : ''}`}>
                  {tab.disabled ? (
                    <>
                      <span className="group-hover:hidden">{tab.label}</span>
                      <span className="hidden group-hover:inline text-white/90">{t.coming_soon}</span>
                    </>
                  ) : tab.label}
                </span>
                <span className={`text-[7px] md:text-[8px] font-bold opacity-40 transition-all ${activeTab === tab.id ? 'opacity-100 text-white/60' : ''}`}>
                  {tab.disabled ? (
                    <>
                      <span className="group-hover:hidden">{tab.subLabel}</span>
                      <span className="hidden group-hover:inline text-white/40 italic">SOON</span>
                    </>
                  ) : tab.subLabel}
                </span>
              </div>
              
              {/* Active Indicator */}
              {activeTab === tab.id && !tab.disabled && (
                <div className="absolute -bottom-6 md:-bottom-8 left-0 right-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
              )}
            </button>
          ))}
        </div>
      </div>
      )}

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
                {t.found_error}
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

              <div className="h-px bg-white/5 my-2" />
              
              {!showClearConfirm ? (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 py-4 px-4 bg-red-500/10 border border-red-500/20 text-[11px] font-black text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all uppercase tracking-[0.2em] text-center justify-center"
                >
                  <History className="w-4 h-4" />
                  CLEAR CACHE & FIX ISSUES
                </button>
              ) : (
                <div className="flex flex-col gap-2 p-4 bg-red-500/20 border border-red-500/40 rounded-sm">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest text-center">Are you sure?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        await CacheService.clear();
                        window.location.reload();
                      }}
                      className="flex-1 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      YES, CLEAR
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
