import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack, 
  Search, 
  Copy, 
  Check, 
  Sparkles, 
  Mic, 
  Languages, 
  MessageSquare, 
  ShieldAlert, 
  Building2, 
  Layers, 
  Loader2, 
  Radio
} from 'lucide-react';
import { Language, OperatorVoiceLine, OperatorCvInfo, OperatorVoiceData } from '../types';
import { 
  getOperatorVoiceData, 
  getLineAudioUrl, 
  CV_LANG_LABELS, 
  VOICE_TITLE_RU_MAP 
} from '../services/operatorVoiceService';
import { cn } from '../lib/utils';

interface OperatorVoicePlayerProps {
  operatorId: string;
  operatorName: string;
  avatarUrl?: string;
  uiLang: Language;
  onLanguageChange?: (lang: Language) => void;
}

type FilterCategory = 'all' | 'talk' | 'combat' | 'management';

export const OperatorVoicePlayer: React.FC<OperatorVoicePlayerProps> = ({
  operatorId,
  operatorName,
  avatarUrl,
  uiLang,
}) => {
  const isRussian = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  const isChinese = uiLang === 'zh_CN';

  const [voiceData, setVoiceData] = useState<OperatorVoiceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWordKey, setSelectedWordKey] = useState<string>('');

  // Voice Language Dubbing Selection (JP, CN_MANDARIN, EN, KR, RUS, ITA, GER, etc.)
  const [selectedVoiceLang, setSelectedVoiceLang] = useState<string>(() => {
    return localStorage.getItem('ak-voice-lang-preference') || 'JP';
  });

  // Player state
  const [currentLineId, setCurrentLineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoNext, setAutoNext] = useState<boolean>(true);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDualText, setShowDualText] = useState<boolean>(true);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Voice Lines
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setCurrentLineId(null);
    setIsPlaying(false);

    getOperatorVoiceData(operatorId, uiLang)
      .then((data) => {
        if (!isMounted) return;
        setVoiceData(data);
        if (data && data.wordKeys.length > 0) {
          setSelectedWordKey(data.wordKeys[0]);
        }

        // Check if saved voice lang is available for this operator, else pick first available
        if (data && data.availableLangs && data.availableLangs.length > 0) {
          const saved = localStorage.getItem('ak-voice-lang-preference');
          if (saved && data.availableLangs.includes(saved)) {
            setSelectedVoiceLang(saved);
          } else if (data.availableLangs.includes('JP')) {
            setSelectedVoiceLang('JP');
          } else {
            setSelectedVoiceLang(data.availableLangs[0]);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load voice lines:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [operatorId, uiLang]);

  // Filter lines by selected wordKey (e.g. form/class), category, and search query
  const filteredLines = useMemo(() => {
    if (!voiceData || !voiceData.lines) return [];

    let list = voiceData.lines;

    // Filter by wordKey if there are multiple forms (e.g. Amiya Guard/Caster)
    if (selectedWordKey && voiceData.wordKeys.length > 1) {
      list = list.filter((l) => l.wordKey === selectedWordKey);
    }

    // Filter by Category
    if (activeCategory !== 'all') {
      list = list.filter((l) => l.category === activeCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => 
        l.voiceTitle.toLowerCase().includes(q) ||
        l.voiceTitleEn.toLowerCase().includes(q) ||
        l.voiceTitleZh.toLowerCase().includes(q) ||
        l.voiceTitleRu.toLowerCase().includes(q) ||
        l.voiceText.toLowerCase().includes(q) ||
        (l.voiceTextJa && l.voiceTextJa.toLowerCase().includes(q)) ||
        l.voiceTextEn.toLowerCase().includes(q) ||
        l.voiceTextZh.toLowerCase().includes(q) ||
        l.voiceId.toLowerCase().includes(q)
      );
    }

    return list;
  }, [voiceData, selectedWordKey, activeCategory, searchQuery]);

  const currentLine = useMemo(() => {
    if (!voiceData || !currentLineId) return null;
    return voiceData.lines.find((l) => l.charWordId === currentLineId) || null;
  }, [voiceData, currentLineId]);

  // Audio Playback Controller
  const playLine = (line: OperatorVoiceLine, targetLang: string = selectedVoiceLang) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    const targetAudioUrl = getLineAudioUrl(line, targetLang);

    // If same line is currently playing with the same language, toggle pause
    if (currentLineId === line.charWordId && isPlaying && audio.src.includes(encodeURIComponent(targetAudioUrl))) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    // If same line is paused, resume
    if (currentLineId === line.charWordId && !isPlaying && audio.src) {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
      return;
    }

    // Load new audio with selected language
    setCurrentLineId(line.charWordId);
    audio.src = targetAudioUrl;
    audio.volume = isMuted ? 0 : volume;
    setCurrentTime(0);
    setDuration(0);

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      // Handle Auto Next
      if (autoNext) {
        const currentIndex = filteredLines.findIndex((l) => l.charWordId === line.charWordId);
        if (currentIndex !== -1 && currentIndex < filteredLines.length - 1) {
          playLine(filteredLines[currentIndex + 1], targetLang);
        }
      }
    };

    audio.onerror = () => {
      console.warn('Failed to load voice audio for:', line.charWordId, targetAudioUrl);
      setIsPlaying(false);
    };

    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((e) => {
        console.warn('Voice play blocked or aborted:', e);
        setIsPlaying(false);
      });
  };

  const handleSelectLanguage = (langKey: string) => {
    setSelectedVoiceLang(langKey);
    localStorage.setItem('ak-voice-lang-preference', langKey);

    // If currently playing, smoothly transition to the new language audio track
    if (currentLine) {
      playLine(currentLine, langKey);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleNext = () => {
    if (!currentLineId || filteredLines.length === 0) {
      if (filteredLines.length > 0) playLine(filteredLines[0]);
      return;
    }
    const idx = filteredLines.findIndex((l) => l.charWordId === currentLineId);
    if (idx !== -1 && idx < filteredLines.length - 1) {
      playLine(filteredLines[idx + 1]);
    } else if (filteredLines.length > 0) {
      playLine(filteredLines[0]);
    }
  };

  const handlePrev = () => {
    if (!currentLineId || filteredLines.length === 0) return;
    const idx = filteredLines.findIndex((l) => l.charWordId === currentLineId);
    if (idx > 0) {
      playLine(filteredLines[idx - 1]);
    } else if (filteredLines.length > 0) {
      playLine(filteredLines[filteredLines.length - 1]);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVol;
    }
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <span className="text-xs font-mono text-white/60 tracking-wider uppercase">
          {isRussian ? 'Загрузка голосовых файлов и озвучки...' : 'Loading voice records & audio...'}
        </span>
      </div>
    );
  }

  if (!voiceData || voiceData.lines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/50 font-mono">
        <Mic className="w-10 h-10 text-white/20 mb-3" />
        <span className="text-sm">
          {isRussian ? 'Голосовые реплики для данного оперативника не найдены.' : 'No voice lines available for this operator.'}
        </span>
      </div>
    );
  }

  const activeCv = voiceData.cvList.find((c) => c.langType === selectedVoiceLang);
  const activeLangConfig = CV_LANG_LABELS[selectedVoiceLang] || { ru: selectedVoiceLang, en: selectedVoiceLang, flag: '🎙️' };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      
      {/* 1. TOP ACTORS & DUB LANGUAGE SELECTOR */}
      <div className="shrink-0 border-b border-white/10 bg-zinc-900/60 p-4">
        <div className="flex flex-col gap-3">
          
          {/* Header Row: Voice Languages Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/80 border border-blue-500/30 rounded-sm text-blue-400 font-mono text-xs font-bold tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isRussian ? 'ЯЗЫК ОЗВУЧКИ' : 'VOICE DUB'}</span>
              </div>

              {/* Language Selection Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {voiceData.availableLangs && voiceData.availableLangs.map((langKey) => {
                  const cfg = CV_LANG_LABELS[langKey] || { ru: langKey, en: langKey, flag: '🎙️' };
                  const cvInfo = voiceData.cvList.find(c => c.langType === langKey);
                  const isSelected = selectedVoiceLang === langKey;

                  return (
                    <button
                      key={langKey}
                      onClick={() => handleSelectLanguage(langKey)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono transition-all",
                        isSelected 
                          ? "bg-blue-600 border-blue-400 text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-105"
                          : "bg-black/60 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20"
                      )}
                      title={cvInfo && cvInfo.cvNames.length > 0 ? `CV: ${cvInfo.cvNames.join(', ')}` : undefined}
                    >
                      <span className="text-sm">{cfg.flag}</span>
                      <span>{isRussian ? cfg.ru : cfg.en}</span>
                      {cvInfo && cvInfo.cvNames.length > 0 && (
                        <span className={cn(
                          "text-[10px] hidden sm:inline ml-1 font-normal opacity-80",
                          isSelected ? "text-white" : "text-white/50"
                        )}>
                          ({cvInfo.cvNames[0]})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Switcher (if operator has multiple forms like Amiya) */}
            {voiceData.wordKeys.length > 1 && (
              <div className="flex items-center gap-1.5 bg-black/60 p-1 border border-white/10 rounded-sm self-start lg:self-auto">
                <span className="text-[10px] font-mono text-white/40 uppercase px-1">
                  {isRussian ? 'ФОРМА:' : 'FORM:'}
                </span>
                {voiceData.wordKeys.map((wk) => (
                  <button
                    key={wk}
                    onClick={() => setSelectedWordKey(wk)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-sm transition-colors ${
                      selectedWordKey === wk
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {wk.includes('amiya2') 
                      ? (isRussian ? 'Гвардеец' : 'Guard')
                      : wk.includes('amiya3') 
                      ? (isRussian ? 'Медик' : 'Medic')
                      : (isRussian ? 'Заклинатель' : 'Caster')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Voice Actor Bar */}
          {activeCv && activeCv.cvNames.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-white/60 pt-1 border-t border-white/5">
              <span className="text-white/40 uppercase tracking-wider">{isRussian ? 'Сэйю (CV):' : 'Voice Actor:'}</span>
              <span className="text-blue-300 font-bold">{activeCv.cvNames.join(', ')}</span>
              <span className="text-white/30">•</span>
              <span className="text-white/50">
                {activeLangConfig.flag} {isRussian ? activeLangConfig.ru : activeLangConfig.en}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. PERSISTENT AUDIO PLAYBACK BAR */}
      <div className="shrink-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-white/15 p-3.5 shadow-xl relative z-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Currently Playing Line Info */}
          <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border transition-all ${
              isPlaying 
                ? 'bg-blue-600/30 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
                : 'bg-black/60 border-white/15'
            }`}>
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-blue-400 animate-[bounce_0.8s_infinite] h-2" />
                  <span className="w-1 bg-blue-400 animate-[bounce_1.1s_infinite] h-4" />
                  <span className="w-1 bg-blue-400 animate-[bounce_0.6s_infinite] h-3" />
                  <span className="w-1 bg-blue-400 animate-[bounce_0.9s_infinite] h-1" />
                </div>
              ) : (
                <Volume2 className="w-5 h-5 text-white/40" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                  {currentLine ? currentLine.voiceId : 'AUDIO PLAYER'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-950/80 border border-blue-500/20 text-blue-300 rounded-sm uppercase">
                  {activeLangConfig.flag} {selectedVoiceLang}
                </span>
                {currentLine && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white/10 text-white/70 rounded-sm uppercase">
                    {currentLine.category}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white truncate font-mono">
                {currentLine ? currentLine.voiceTitle : (isRussian ? 'Выберите реплику для прослушивания' : 'Select a line to play')}
              </p>
            </div>
          </div>

          {/* Player Transport Controls & Timeline */}
          <div className="flex flex-col items-center gap-2 w-full md:w-1/3 max-w-md">
            
            {/* Control Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={filteredLines.length === 0}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-sm transition-colors disabled:opacity-30"
                title={isRussian ? 'Предыдущая' : 'Previous'}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (currentLine) {
                    playLine(currentLine);
                  } else if (filteredLines.length > 0) {
                    playLine(filteredLines[0]);
                  }
                }}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95"
                title={isPlaying ? (isRussian ? 'Пауза' : 'Pause') : (isRussian ? 'Воспроизведение' : 'Play')}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
              </button>

              <button
                onClick={handleStop}
                disabled={!currentLineId}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-sm transition-colors disabled:opacity-30"
                title={isRussian ? 'Остановить' : 'Stop'}
              >
                <Square className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                disabled={filteredLines.length === 0}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-sm transition-colors disabled:opacity-30"
                title={isRussian ? 'Следующая' : 'Next'}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline Progress Bar */}
            <div className="w-full flex items-center gap-2 text-[10px] font-mono text-white/50">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                disabled={!currentLineId}
                className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-30"
              />
              <span className="w-8">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume & Playback Settings */}
          <div className="flex items-center justify-end gap-3 w-full md:w-1/3">
            
            {/* Auto Next Toggle */}
            <button
              onClick={() => setAutoNext(!autoNext)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-mono border transition-all ${
                autoNext 
                  ? 'bg-blue-950/80 border-blue-500/50 text-blue-300' 
                  : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70'
              }`}
              title={isRussian ? 'Автоматическое воспроизведение следующей реплики' : 'Auto play next voice line'}
            >
              <Sparkles className="w-3 h-3" />
              <span>{isRussian ? 'АВТО-СЛЕД' : 'AUTO'}</span>
            </button>

            {/* Dual Subtitles Toggle */}
            <button
              onClick={() => setShowDualText(!showDualText)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-mono border transition-all ${
                showDualText 
                  ? 'bg-zinc-800 border-white/20 text-white font-medium' 
                  : 'bg-black/40 border-white/10 text-white/40'
              }`}
              title={isRussian ? 'Двойные субтитры (Оригинал + Перевод)' : 'Dual Subtitles (Original + Translation)'}
            >
              <Languages className="w-3 h-3" />
              <span>{isRussian ? 'ДВОЙНОЙ ТЕКСТ' : 'DUAL'}</span>
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white/60 hover:text-white transition-colors"
                title={isMuted ? (isRussian ? 'Включить звук' : 'Unmute') : (isRussian ? 'Отключить звук' : 'Mute')}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white/70" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. FILTER TABS & SEARCH BAR */}
      <div className="shrink-0 border-b border-white/10 bg-zinc-950 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', labelRu: 'Все', labelEn: 'All', icon: Layers },
            { id: 'talk', labelRu: 'Диалоги', labelEn: 'Dialogue', icon: MessageSquare },
            { id: 'combat', labelRu: 'Бой', labelEn: 'Combat', icon: ShieldAlert },
            { id: 'management', labelRu: 'База & Отряд', labelEn: 'Base', icon: Building2 },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as FilterCategory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/15 text-white font-bold border border-white/20 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isRussian ? cat.labelRu : cat.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRussian ? 'Поиск реплики или текста...' : 'Search voice title or text...'}
            className="w-full pl-8 pr-3 py-1.5 bg-black/60 border border-white/10 rounded-sm text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>

      </div>

      {/* 4. VOICE LINES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-transparent">
        {filteredLines.length === 0 ? (
          <div className="text-center py-16 text-white/40 font-mono text-xs">
            {isRussian ? 'Реплик по данному фильтру не найдено.' : 'No voice lines match the filter criteria.'}
          </div>
        ) : (
          filteredLines.map((line) => {
            const isThisLinePlaying = currentLineId === line.charWordId && isPlaying;
            const isThisLineSelected = currentLineId === line.charWordId;

            // Determine authentic voice text according to active voice language
            let originalDubText = line.voiceTextZh;
            if (selectedVoiceLang === 'JP') {
              originalDubText = line.voiceTextJa || line.voiceTextZh;
            } else if (selectedVoiceLang === 'EN') {
              originalDubText = line.voiceTextEn;
            } else if (selectedVoiceLang === 'CN_MANDARIN' || selectedVoiceLang === 'CN_TOPOLECT') {
              originalDubText = line.voiceTextZh;
            } else {
              originalDubText = line.voiceTextEn || line.voiceTextZh;
            }

            const translationText = line.voiceTextEn || line.voiceTextZh;

            return (
              <div
                key={line.charWordId}
                className={cn(
                  "p-3.5 rounded-sm border transition-all relative group",
                  isThisLinePlaying
                    ? "bg-blue-950/40 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                    : isThisLineSelected
                    ? "bg-white/5 border-white/20"
                    : "bg-zinc-900/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Play Button & Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    
                    <button
                      onClick={() => playLine(line)}
                      className={cn(
                        "mt-0.5 w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border transition-all",
                        isThisLinePlaying
                          ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                          : "bg-black/60 border-white/10 text-white/70 hover:text-white hover:bg-blue-600/30 hover:border-blue-500/40"
                      )}
                      title={isThisLinePlaying ? (isRussian ? 'Пауза' : 'Pause') : (isRussian ? 'Слушать' : 'Play')}
                    >
                      {isThisLinePlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      
                      {/* Badge / Title / Category */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-950/60 px-1.5 py-0.5 rounded-sm border border-blue-500/20">
                          {line.voiceId}
                        </span>

                        <h4 className="text-sm font-bold text-white font-mono">
                          {line.voiceTitle}
                        </h4>

                        {line.voiceTitleRu && isRussian && line.voiceTitleRu !== line.voiceTitle && (
                          <span className="text-xs text-white/50 font-mono">
                            ({line.voiceTitleRu})
                          </span>
                        )}

                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/5 text-white/50 rounded-sm uppercase ml-auto">
                          {line.category}
                        </span>
                      </div>

                      {/* Dialogue Subtitle Body */}
                      <div className="space-y-1.5 mt-2">
                        {/* Primary Dub Text */}
                        <p className={cn(
                          "text-sm leading-relaxed",
                          selectedVoiceLang === 'JP' ? "font-sans text-white/95 text-base" : "font-mono text-white/90"
                        )}>
                          {originalDubText}
                        </p>

                        {/* Dual Translation Subtitles (if enabled & differing) */}
                        {showDualText && translationText && translationText !== originalDubText && (
                          <p className="text-xs text-white/50 font-mono italic leading-relaxed border-t border-white/5 pt-1">
                            {translationText}
                          </p>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Actions: Copy */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(originalDubText, line.charWordId)}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                      title={isRussian ? 'Копировать текст' : 'Copy quote'}
                    >
                      {copiedId === line.charWordId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. FOOTER STATUS BAR */}
      <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-white/40">
        <div className="flex items-center gap-2">
          <span>{isRussian ? 'Всего реплик:' : 'Total lines:'} {filteredLines.length}</span>
          <span>•</span>
          <span>{isRussian ? 'Текущая озвучка:' : 'Active Dub:'} {activeLangConfig.flag} {isRussian ? activeLangConfig.ru : activeLangConfig.en}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>PRTS TORAPPU AUDIO ENGINE</span>
        </div>
      </div>

    </div>
  );
};
