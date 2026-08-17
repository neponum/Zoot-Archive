import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Upload, Copy, Check, Globe, FileText, ChevronDown, AlertCircle, Play, Search, Sparkles, Loader2, User, UserPlus, Trash2, Plus, Key, MessageSquare, ExternalLink, X, List, Type as TypeIcon, Database, BookOpen, Eye, Edit3, Save, RotateCcw } from 'lucide-react';
import { StoryEpisode, Language, StoryChapter } from '../types';
import { fetchChapterList, fetchStoryScript, checkScriptExists } from '../services/storyService';
import { CacheService } from '../services/cacheService';
import { DbService } from '../services/dbService';
import { authService } from '../services/authService';
import { TRANSLATION_REGISTRY, isAITranslator, getTranslatorLabel, sortTranslators } from '../config/translationsRegistry';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
import { LogModal } from './story/LogModal';
import { OperatorDossierModal } from './OperatorDossierModal';

import { TranslationRow, EditorDialogueItem } from '../services/storyService';
import { ARKNIGHTS_CANONICAL_GLOSSARY } from '../config/arknightsGlossary';
import { getOperatorsList, EnrichedOperator, ParsedDossierSection, parseOperatorHandbook } from '../services/operatorService';
import { 
  loadDossierTranslationAsync, 
  saveManualDossierTranslation, 
  translateDossierSection, 
  deleteDossierTranslation, 
  DossierTranslationResult 
} from '../services/dossierTranslationService';

interface TranslationInterfaceProps {
  onClose: () => void;
  onTestTranslation?: (chapter: StoryChapter, script: string) => void;
  initialChapter?: StoryChapter | null;
  initialEpisode?: StoryEpisode | null;
  initialOperator?: EnrichedOperator | null;
}

// Constants
// Discord Webhook URL for submissions (configured via environment variables)
const SUBMISSION_WEBHOOK_URL = import.meta.env.VITE_SUBMISSION_WEBHOOK_URL || '';

const LANGUAGES: { id: Language; label: string; isOfficial: boolean }[] = [
  { id: 'zh_CN', label: '简体中文', isOfficial: true },
  { id: 'en_US', label: 'English', isOfficial: true },
  { id: 'ja_JP', label: '日本語', isOfficial: true },
  { id: 'ru_RU', label: 'Русский', isOfficial: false },
];

type BlockType = 'command' | 'dialogue' | 'comment' | 'empty';

interface TranslationBlock {
  id: string;
  type: BlockType;
  originalText: string;
  prefix: string;
  // Map of lang -> { text: string, name?: string, edited?: boolean }
  content: Record<string, { text: string, name?: string, edited?: boolean }>;
}

export type EditorIssueType = 'name_consistency' | 'terminology' | 'grammar_style' | 'incomplete_translation' | 'generic';
export type EditorIssueSeverity = 'error' | 'warning' | 'suggestion';

export interface EditorIssue {
  id: string;
  type: EditorIssueType;
  severity: EditorIssueSeverity;
  title: string;
  description: string;
  originalValue?: string;
  suggestedValue?: string;
  targetField?: 'name' | 'text';
  blockIds: string[];
  fixed?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are a professional Arknights localization expert and senior translator into Russian ({toLabel}).
Translate the dialogue lines in 'toTranslate' accurately, faithfully, and naturally into Russian.

CRITICAL TRANSLATION & TERMINOLOGY RULES:
1. CANONICAL ARKNIGHTS TERMINOLOGY & NAMES (NO APOSTROPHES IN RUSSIAN):
   - STRICTLY consult and adhere to the provided 'glossary' for all Character Names, Factions, Cities, Races, and Lore Terms.
   - Do NOT use apostrophes (') in Russian transliterations/names! (e.g. use "Кальцит", NOT "Кель'тсит" or "Каль'цит"; use "Чэнь", NOT "Ч'ен" or "Ч'ень").
   - Character names MUST remain 100% consistent across every line (e.g. Amiya -> Амия, Kal'tsit -> Кальцит, Ch'en -> Чэнь, Texas -> Техас, Lappland -> Лаппланд, SilverAsh -> Сильвераш, Nearl -> Нирл, W -> W, Ines -> Инес, Hoederer -> Хёдерер).
   - Organizations & Locations MUST be uniform: Rhodes Island -> Родос Айленд, Reunion -> Воссоединение, Lungmen -> Лунмэнь, Lungmen Guard Department (L.G.D.) -> Департамент Гвардии Лунмэня (ДГЛ), Rhine Lab -> Рейн Лаб, Ursus -> Урсус, Victoria -> Виктория, Kazimierz -> Казимеж, Laterano -> Латерано, Siracusa -> Сиракузы, Originium -> Ориджиниум, Catastrophe -> Катастрофа, Oripathy -> Орипатия, Infected -> Заражённые.

2. IDIOMS, METAPHORS & CHINESE CHENGYU (成语):
   - AUTOMATICALLY identify Chinese idioms (chengyu), cultural set phrases, and allegorical expressions in the source text.
   - NEVER translate them literally (no calques/word-for-word).
   - Adapt them into natural, idiomatic literary Russian that preserves the emotional nuance, atmosphere, and dramatic weight of the scene.

3. GENDER & GRAMMATICAL AGREEMENT IN RUSSIAN:
   - Use the 'character' name and rolling 'context' (previous lines) to strictly determine grammatical gender (verb and adjective endings).
   - Female characters (Amiya, Kal'tsit, Ch'en, Exusiai, Texas, Lappland, Nearl, W, Ines, Talulah, FrostNova, etc.) MUST use feminine verb endings (e.g., "пошла", "сказала", "увидела", "готова").
   - Male characters (Doctor, SilverAsh, Phantom, Thorns, Mephisto, Faust, Patriot, etc.) MUST use masculine endings (e.g., "пошёл", "сказал", "увидел", "готов").
   - If character is "Doctor" (Доктор), ALWAYS use masculine grammatical forms by default.

4. DIALOGUE FORMATTING & CODE PRESERVATION:
   - Preserve any inner punctuation, ellipses (...), em-dashes, and tone.
   - If options or subtitle brackets exist, translate the text cleanly.
   - CRITICAL: You MUST translate ALL lines in 'toTranslate'. Do not skip any line.
   - The output JSON array MUST contain the exact same number of items with matching 'id'.

Respond ONLY with a JSON array of objects, each containing:
- 'id': the line id
- 'translatedCharacter': standard Russian name for the speaking character
- 'translatedText': literary, accurate Russian translation`;

function parseTranslationBlocks(rawText: string): TranslationBlock[] {
  const lines = rawText.split(/\r?\n/);
  return lines.map((line, index) => {
    const id = `line-${index}`;
    const trimmed = line.trim();
    
    if (trimmed === '') {
      return { id, type: 'empty', originalText: line, prefix: '', content: {} };
    }
    if (trimmed.startsWith('//')) {
      return { id, type: 'comment', originalText: line, prefix: '', content: {} };
    }
    if (trimmed.toUpperCase().startsWith('[HEADER')) {
      return { id, type: 'command', originalText: line, prefix: '', content: {} };
    }
    
    // Match prefix (multiple [tags]) and the rest of the line
    const match = line.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
    if (match) {
      const prefix = match[1];
      let textToTranslate = match[2];
      
      const isDelay = /\[delay\b/i.test(prefix);
      if (isDelay) {
        textToTranslate = '';
      }
      
      // Extract name if present: [name="阿米娅"]
      let name: string | undefined;
      const nameMatch = prefix.match(/name="([^"]+)"/);
      if (nameMatch) {
        name = nameMatch[1];
      }

      // Extract options if present: [Decision(options="...", ...)]
      const optionsMatch = prefix.match(/options="([^"]+)"/);
      
      // Extract subtitle text if present: [Subtitle(text="...", ...)]
      const subtitleMatch = prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
      
      // Extract sticker text if present: [Sticker(text="...", ...)]
      const stickerMatch = prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);

      if (textToTranslate.trim() !== '' || optionsMatch || subtitleMatch || stickerMatch) {
        const content: Record<string, { text: string, name?: string }> = {};
        content['zh_CN'] = { 
          text: textToTranslate.trim() !== '' ? textToTranslate.trim() : (optionsMatch ? optionsMatch[1] : (subtitleMatch ? subtitleMatch[1] : (stickerMatch ? stickerMatch[1] : ''))),
          name: name
        };

        return { 
          id, 
          type: 'dialogue', 
          originalText: line, 
          prefix, 
          content
        };
      }
      
      return { id, type: 'command', originalText: line, prefix, content: {} };
    }
    
    return { id, type: 'dialogue', originalText: line, prefix: '', content: { zh_CN: { text: line } } };
  });
}

function getCleanChapterName(storyTxt: string, episodeId?: string): string {
  let name = storyTxt.split('/').pop()?.replace('.txt', '') || storyTxt;

  // 1. Remove 'level_' at the start
  if (name.startsWith('level_')) {
    name = name.substring('level_'.length);
  }

  // 2. Exception for main story: keep the episode number (e.g. '14' in 'main_14')
  if (name.startsWith('main_')) {
    name = name.substring('main_'.length);
  } else if (episodeId) {
    if (name.startsWith(episodeId + '_')) {
      name = name.substring((episodeId + '_').length);
    } else if (name.startsWith(episodeId + '-')) {
      name = name.substring((episodeId + '-').length);
    }
  } else {
    // If episodeId is not immediately available, try to auto-detect a common pattern like st_01_
    const match = name.match(/^(st_[a-z0-9]+)[_-](.*)$/i);
    if (match) {
      name = match[2];
    } else {
      // General fallback if no episode ID is provided
      const simpleMatch = name.match(/^[a-z0-9]+_[a-z0-9]+[_-](.*)$/i);
      if (simpleMatch) {
         name = simpleMatch[1];
      }
    }
  }

  return name;
}

export function TranslationInterface({ onClose, onTestTranslation, initialChapter, initialEpisode, initialOperator }: TranslationInterfaceProps) {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const sourceLang: Language = 'zh_CN';
  const [referenceLangs, setReferenceLangs] = useState<Language[]>(['en_US']);
  const [targetLangs, setTargetLangs] = useState<Language[]>(['ru_RU']);
  const [activeTargetLang, setActiveTargetLang] = useState<Language>('ru_RU');
  
  const [selectedEpisode, setSelectedEpisode] = useState<StoryEpisode | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);

  // Operator Dossier Translation state
  const [translationMode, setTranslationMode] = useState<'STORIES' | 'DOSSIERS'>('STORIES');
  const [operators, setOperators] = useState<EnrichedOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<EnrichedOperator | null>(initialOperator || null);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number>(0);
  const [dossierTranslationsMap, setDossierTranslationsMap] = useState<Record<number, DossierTranslationResult>>({});
  const [isTranslatingDossier, setIsTranslatingDossier] = useState<boolean>(false);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState<string>('');
  
  useEffect(() => {
    if (initialEpisode) {
      setSelectedEpisode(initialEpisode);
    }
    if (initialChapter) {
      setSelectedChapter(initialChapter);
    }
  }, [initialChapter, initialEpisode]);

  useEffect(() => {
    getOperatorsList().then(list => {
      setOperators(list);
      const urlParams = new URLSearchParams(window.location.search);
      const opId = urlParams.get('operator');
      if (opId) {
        const found = list.find(o => o.id === opId);
        if (found) {
          setSelectedOperator(found);
        }
      } else if (initialOperator) {
        setSelectedOperator(initialOperator);
      }
    });
  }, [initialOperator, initialEpisode, initialChapter]);

  useEffect(() => {
    if (!selectedOperator) return;
    let isMounted = true;
    const loadDossierTrans = async () => {
      if (!selectedOperator.handbook) return;
      const transMap: Record<number, DossierTranslationResult> = {};
      for (let idx = 0; idx < selectedOperator.handbook.length; idx++) {
        const res = await loadDossierTranslationAsync(selectedOperator.id, idx, activeTargetLang);
        if (res) transMap[idx] = res;
      }
      if (isMounted) {
        setDossierTranslationsMap(transMap);
      }
    };
    loadDossierTrans();
    return () => { isMounted = false; };
  }, [selectedOperator, activeTargetLang]);

  const activeHandbookSections = useMemo(() => {
    if (!selectedOperator || !selectedOperator.handbook) return [];
    return parseOperatorHandbook(selectedOperator.handbook, activeTargetLang);
  }, [selectedOperator, activeTargetLang]);

  const [dossierTranslationProgress, setDossierTranslationProgress] = useState<{
    current: number;
    total: number;
    currentSectionTitle: string;
  } | null>(null);

  const handleTranslateDossierSection = async (sectionIdx: number) => {
    if (!selectedOperator) return;
    setIsTranslatingDossier(true);
    try {
      const section = activeHandbookSections[sectionIdx];
      if (!section) return;

      const title = section.title || section.originalTitle || '';
      const text = section.rawText || '';
      const items = section.items || [];

      const res = await translateDossierSection(
        selectedOperator.id,
        selectedOperator.displayName || selectedOperator.nameEn,
        sectionIdx,
        title,
        text,
        items,
        activeTargetLang,
        userApiKey || undefined,
        selectedModel,
        true // Bypasses cache when single section translation requested explicitly
      );

      setDossierTranslationsMap(prev => ({
        ...prev,
        [sectionIdx]: res
      }));
    } catch (e) {
      console.error('Error translating dossier section:', e);
      alert('Ошибка при ИИ-переводе раздела досье.');
    } finally {
      setIsTranslatingDossier(false);
    }
  };

  const handleTranslateAllDossierSections = async () => {
    if (!selectedOperator || !activeHandbookSections || activeHandbookSections.length === 0) return;
    setIsTranslatingDossier(true);
    const total = activeHandbookSections.length;
    try {
      for (let idx = 0; idx < total; idx++) {
        const section = activeHandbookSections[idx];
        if (!section) continue;

        // If translateOnlyUntranslated is active, skip if already translated
        if (translateOnlyUntranslated && dossierTranslationsMap[idx]?.translatedText?.trim()) {
          continue;
        }

        const title = section.title || section.originalTitle || `Раздел 0${idx + 1}`;
        const text = section.rawText || '';
        const items = section.items || [];

        setDossierTranslationProgress({
          current: idx + 1,
          total,
          currentSectionTitle: title
        });

        const res = await translateDossierSection(
          selectedOperator.id,
          selectedOperator.displayName || selectedOperator.nameEn,
          idx,
          title,
          text,
          items,
          activeTargetLang,
          userApiKey || undefined,
          selectedModel,
          !translateOnlyUntranslated
        );

        setDossierTranslationsMap(prev => ({
          ...prev,
          [idx]: res
        }));
      }
    } catch (e) {
      console.error('Error translating all dossier sections:', e);
      alert('Ошибка при ИИ-переводе разделов досье.');
    } finally {
      setIsTranslatingDossier(false);
      setDossierTranslationProgress(null);
    }
  };

  const handleUpdateDossierTranslation = async (
    sectionIdx: number,
    updatedTitle: string,
    updatedText: string,
    updatedItems?: { label: string; value: string }[]
  ) => {
    if (!selectedOperator) return;
    const res = await saveManualDossierTranslation(
      selectedOperator.id,
      sectionIdx,
      activeTargetLang,
      updatedTitle,
      updatedText,
      updatedItems
    );
    setDossierTranslationsMap(prev => ({
      ...prev,
      [sectionIdx]: res
    }));
  };

  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingText, setEditingText] = useState<string>('');
  const [editingItems, setEditingItems] = useState<{ label: string; value: string }[]>([]);
  const [isSectionSaved, setIsSectionSaved] = useState<boolean>(false);
  const [showDossierModalPreview, setShowDossierModalPreview] = useState<boolean>(false);

  useEffect(() => {
    if (!activeHandbookSections || activeHandbookSections.length === 0) return;
    const currentSection = activeHandbookSections[selectedSectionIdx] || activeHandbookSections[0];
    if (!currentSection) return;

    const trans = dossierTranslationsMap[selectedSectionIdx];
    if (trans) {
      setEditingTitle(trans.translatedTitle || currentSection.title || currentSection.originalTitle || '');
      setEditingText(trans.translatedText || currentSection.rawText || '');
      setEditingItems(trans.translatedItems || currentSection.items || []);
    } else {
      setEditingTitle(currentSection.title || currentSection.originalTitle || '');
      setEditingText(currentSection.rawText || '');
      setEditingItems(currentSection.items || []);
    }
  }, [selectedSectionIdx, selectedOperator, activeHandbookSections, dossierTranslationsMap]);

  const handleSaveActiveSection = async () => {
    if (!selectedOperator) return;
    await handleUpdateDossierTranslation(
      selectedSectionIdx,
      editingTitle,
      editingText,
      editingItems
    );
    setIsSectionSaved(true);
    setTimeout(() => setIsSectionSaved(false), 2000);
  };

  const handleAiTranslateActiveSection = async () => {
    if (!selectedOperator) return;
    await handleTranslateDossierSection(selectedSectionIdx);
  };

  const handleDeleteActiveSectionTranslation = async () => {
    if (!selectedOperator) return;
    await deleteDossierTranslation(selectedOperator.id, selectedSectionIdx, activeTargetLang);
    setDossierTranslationsMap(prev => {
      const copy = { ...prev };
      delete copy[selectedSectionIdx];
      return copy;
    });
  };
  
  useEffect(() => {
    if (!selectedEpisode) {
      setEpisodeCharacters(new Set());
      return;
    }
    
    let isCancelled = false;
    
    const loadChars = async () => {
      const chars = new Set<string>();
      
      // Quick scan from already loaded translations
      selectedEpisode.chapters.forEach(ch => {
        const chapData = allTranslations[ch.storyTxt];
        if (chapData) {
          Object.values(chapData).forEach((item: Record<string, { text?: string; name?: string; edited?: boolean }>) => {
            const srcData = item[sourceLang];
            if (srcData?.name && srcData.name !== "Narrator/System") {
              chars.add(srcData.name);
            }
          });
        }
      });
      
      if (!isCancelled) setEpisodeCharacters(new Set(chars));
      
      // Background fetch for missing chapters to extract names
      for (const ch of selectedEpisode.chapters) {
        if (isCancelled) break;
        try {
          const sourceText = await fetchStoryScript(
            ch.storyTxt, 
            sourceLang, 
            !LANGUAGES.find(l => l.id === sourceLang)?.isOfficial,
            activeProfile === 'Default' ? 'none' : activeProfile
          );
          const parsed = parseTranslationBlocks(sourceText);
          let newlyAdded = false;
          parsed.forEach(b => {
            if (b.type === 'dialogue' && b.content[sourceLang]?.name && b.content[sourceLang].name !== "Narrator/System") {
              if (!chars.has(b.content[sourceLang].name!)) {
                chars.add(b.content[sourceLang].name!);
                newlyAdded = true;
              }
            }
          });
          if (newlyAdded && !isCancelled) {
            setEpisodeCharacters(new Set(chars));
          }
        } catch (e) {
          // ignore fast fails
        }
      }
    };
    
    loadChars();
    
    return () => {
      isCancelled = true;
    };
  }, [selectedEpisode]);
  
  const [blocks, setBlocks] = useState<TranslationBlock[]>([]);
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Profile Management
  const [profiles, setProfiles] = useState<string[]>(() => {
    const saved = localStorage.getItem('ak-profiles');
    return saved ? JSON.parse(saved) : ['Default'];
  });
  
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem('ak-current-profile') || 'Default';
  });


  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('ak-user-api-key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('ak-selected-model') || 'gemini-3.7-flash');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<'chapter' | 'episode'>('chapter');
  const [originalScriptText, setOriginalScriptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatingBlockIds, setTranslatingBlockIds] = useState<Set<string>>(new Set());
  const [translateOnlyUntranslated, setTranslateOnlyUntranslated] = useState<boolean>(() => {
    return localStorage.getItem('ak-translate-only-untranslated') === 'true';
  });
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [rateLimitActive, setRateLimitActive] = useState(false);

  // AI Editor States
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState<'translate' | 'editor' | 'settings'>('translate');
  const [editorScope, setEditorScope] = useState<'chapter' | 'episode'>('episode');
  const [episodeCharacters, setEpisodeCharacters] = useState<Set<string>>(new Set());
  
  const combinedCharacters = useMemo(() => {
    return Array.from(episodeCharacters).sort();
  }, [episodeCharacters]);

  const [isEditorAnalyzing, setIsEditorAnalyzing] = useState(false);
  const [editorProgressStatus, setEditorProgressStatus] = useState('');
  const [editorIssues, setEditorIssues] = useState<EditorIssue[]>([]);
  const [editorDialogueData, setEditorDialogueData] = useState<EditorDialogueItem[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editedSuggestValue, setEditedSuggestValue] = useState('');
  
  // Custom Prompt legacy state (kept for compatibility)
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [additionalPromptText, setAdditionalPromptText] = useState('');
  const [tempAdditionalPromptText, setTempAdditionalPromptText] = useState('');

  const [isTranslatingEpisode, setIsTranslatingEpisode] = useState(false);
  const [episodeProgress, setEpisodeProgress] = useState<{
    completedChapters: number;
    totalChapters: number;
    progressMap: Record<string, { current: number, total: number }>;
  } | null>(null);

  const cancelTranslationRef = React.useRef(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'add' | 'rename' | 'delete'>('add');
  const [profileModalValue, setProfileModalValue] = useState('');

  // Discord Auth State
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; avatar: string | null } | null>(null);
  const [isDiscordMember, setIsDiscordMember] = useState(false);
  const [isCheckingDiscord, setIsCheckingDiscord] = useState(true);
  const [availableTranslators, setAvailableTranslators] = useState<string[]>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isImportingTranslator, setIsImportingTranslator] = useState<string | null>(null);

  const parseCsvPromise = (csvText: string): Promise<TranslationRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse<TranslationRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  };

  const handleImportTranslatorTranslation = async (t: string) => {
    if (!selectedChapter || !activeTargetLang) return;
    setIsImportingTranslator(t);
    try {
      const translatorSuffix = t && t !== 'Community Translators' && t !== 'Переводчики сообщества' ? `_${t}` : '';
      const chaptersToImport = selectedEpisode ? selectedEpisode.chapters : [selectedChapter];
      
      const newTranslations = { ...allTranslations };
      let updatedCurrentBlocks = [...blocks];
      let importedCount = 0;
      const failedChapters: string[] = [];

      await Promise.all(
        chaptersToImport.map(async (ch) => {
          const baseName = ch.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || '';
          const csvUrl = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${activeTargetLang}/${baseName}${translatorSuffix}.csv`;
          
          try {
            const response = await fetch(csvUrl, { cache: 'no-cache' });
            if (!response.ok) {
              failedChapters.push(ch.name || baseName);
              return;
            }
            
            const csvText = await response.text();
            const lowerText = csvText.trim().toLowerCase();
            if (lowerText.startsWith('<!doctype') || lowerText.startsWith('<html') || lowerText.startsWith('404:') || lowerText.startsWith('not found')) {
              failedChapters.push(ch.name || baseName);
              return;
            }

            // We need the parsed source blocks to match IDs correctly,
            // especially since we don't have non-selected chapters loaded in the main state
            const sourceText = await fetchStoryScript(
              ch.storyTxt, 
              sourceLang, 
              !LANGUAGES.find(l => l.id === sourceLang)?.isOfficial,
              activeProfile === 'Default' ? 'none' : activeProfile
            );
            const chBlocks = parseTranslationBlocks(sourceText);
            
            const rows = await parseCsvPromise(csvText);
            const chapterKey = ch.storyTxt;
            if (!newTranslations[chapterKey]) newTranslations[chapterKey] = {};

            const isCurrentChapter = ch.storyTxt === selectedChapter.storyTxt;
            const currentBlocksLocal = isCurrentChapter ? updatedCurrentBlocks : [...chBlocks];

            rows.forEach(row => {
              const id = row['ID']?.toString();
              const translation = row['Translation']?.toString() || '';

              if (!id) return;

              if (id.startsWith('char-')) {
                const charName = row['Character']?.toString() || '';
                if (charName && translation) {
                  currentBlocksLocal.forEach((b, idx) => {
                    if (b.content[sourceLang]?.name === charName) {
                      if (!b.content[activeTargetLang]) b.content[activeTargetLang] = { text: '' };
                      b.content[activeTargetLang].name = translation;
                      
                      if (!newTranslations[chapterKey][idx]) newTranslations[chapterKey][idx] = {};
                      newTranslations[chapterKey][idx][activeTargetLang] = { 
                        ...(newTranslations[chapterKey][idx][activeTargetLang] || { text: '' }), 
                        name: translation 
                      };
                    }
                  });
                }
              } else if (id.startsWith('line-')) {
                const index = currentBlocksLocal.findIndex(b => b.id === id);
                if (index !== -1) {
                  if (!currentBlocksLocal[index].content[activeTargetLang]) {
                    currentBlocksLocal[index].content[activeTargetLang] = { text: '' };
                  }
                  currentBlocksLocal[index].content[activeTargetLang].text = translation;
                  
                  if (!newTranslations[chapterKey][index]) newTranslations[chapterKey][index] = {};
                  newTranslations[chapterKey][index][activeTargetLang] = { 
                    ...(newTranslations[chapterKey][index][activeTargetLang] || { text: '' }), 
                    text: translation 
                  };
                }
              }
            });

            if (isCurrentChapter) {
              updatedCurrentBlocks = currentBlocksLocal;
            }
            importedCount++;
          } catch (err) {
            console.error(`Error importing for ${ch.name || baseName}:`, err);
            failedChapters.push(ch.name || baseName);
          }
        })
      );

      setBlocks(updatedCurrentBlocks);
      setAllTranslations(newTranslations);

      if (importedCount > 0) {
        let msg = `Успешно импортирован перевод для ${importedCount} глав(ы) от ${t} в ваш профиль (${activeProfile})!`;
        if (failedChapters.length > 0) {
          msg += `\n\nНе удалось загрузить перевод для некоторых глав (возможно, они еще не переведены этим автором): ${failedChapters.join(', ')}`;
        }
        alert(msg);
      } else {
        alert(`Не удалось импортировать перевод от ${t}. Возможно, переводы для этого автора отсутствуют или еще не опубликованы.`);
      }
    } catch (e) {
      console.error(e);
      alert(`Произошла непредвиденная ошибка при импорте перевода от ${t}.`);
    } finally {
      setIsImportingTranslator(null);
    }
  };

  const tabsScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = tabsScrollRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY || e.deltaX;
      if (delta !== 0) {
        element.scrollLeft += delta;
        e.preventDefault();
      }
    };

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let dragDistance = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        startX = e.clientX;
        startScrollLeft = element.scrollLeft;
        dragDistance = 0;
        element.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      dragDistance = Math.abs(dx);
      element.scrollLeft = startScrollLeft - dx;
      element.style.cursor = 'grabbing';
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'grab';
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (dragDistance > 10) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('click', handleClickCapture, true);

    element.style.cursor = 'grab';

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('click', handleClickCapture, true);
    };
  }, [selectedEpisode]);

  const [translationProgress, setTranslationProgress] = useState<{current: number, total: number} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);


  useEffect(() => {
    setSubmitStatus('idle');
  }, [selectedChapter]);

  useEffect(() => {
    if (!selectedChapter || !activeTargetLang) return;
    
    const checkTranslators = async () => {
      const registry = TRANSLATION_REGISTRY[activeTargetLang];
      if (!registry || !registry.translators) {
        setAvailableTranslators([]);
        return;
      }
      
      const results = await Promise.all(
        registry.translators.map(async (t) => {
          const exists = await checkScriptExists(selectedChapter.storyTxt, activeTargetLang, t);
          return exists ? t : null;
        })
      );
      
      setAvailableTranslators(sortTranslators(results.filter((t): t is string => t !== null)));
    };
    
    checkTranslators();
  }, [selectedChapter, activeTargetLang]);

  // Persistent translations: Record<storyTxt, Record<lineIndex, { text?: string, name?: string }>>
  const [allTranslations, setAllTranslations] = useState<Record<string, Record<string, { text?: string, name?: string }>>>({});
  const [isTranslationsLoaded, setIsTranslationsLoaded] = useState(false);

  // Store total dialogue lines for progress calculation: Record<storyTxt, totalDialogueLines>
  const [chapterStats, setChapterStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ak-chapter-stats');
    return saved ? JSON.parse(saved) : {};
  });

  const fetchDiscordUser = async () => {
    setIsCheckingDiscord(true);
    try {
      const state = await authService.fetchUser();
      const user = state.user;
      const isMember = state.isMember;

      setDiscordUser(user);
      setIsDiscordMember(isMember);

      if (user && user.username) {
        const currentProfile = localStorage.getItem('ak-current-profile') || 'Default';
        const newName = user.username;
        
        if (currentProfile !== newName) {
          const oldKey = currentProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${currentProfile}`;
          const newKey = `ak-translations-v3-${newName}`;
          
          let oldData = await DbService.get(oldKey);
          if (!oldData) {
            const savedLocal = localStorage.getItem(oldKey);
            if (savedLocal) {
              try { oldData = JSON.parse(savedLocal); } catch (e) {}
            }
          }
          let newData = await DbService.get(newKey);
          if (!newData) {
            const savedLocal = localStorage.getItem(newKey);
            if (savedLocal) {
              try { newData = JSON.parse(savedLocal); } catch (e) {}
            }
          }
          
          // Migrate translations if discord profile is empty but current profile has data
          if (oldData && Object.keys(oldData).length > 0 && (!newData || Object.keys(newData).length === 0)) {
            await DbService.set(newKey, oldData);
            const oldGlossary = localStorage.getItem(`ak-char-glossary-${currentProfile}`);
            if (oldGlossary) {
              localStorage.setItem(`ak-char-glossary-${newName}`, oldGlossary);
            }
          }

          setProfiles((prev: string[]) => {
            if (!prev.includes(newName)) {
              const next = [...prev, newName];
              localStorage.setItem('ak-profiles', JSON.stringify(next));
              return next;
            }
            return prev;
          });
          
          setActiveProfile(newName);
          localStorage.setItem('ak-current-profile', newName);
        }
      } else {
        setDiscordUser(null);
        setIsDiscordMember(false);
        setActiveProfile('Default');
        localStorage.setItem('ak-current-profile', 'Default');
      }
    } catch (error) {
      console.error('Failed to fetch Discord user:', error);
      setDiscordUser(null);
      setIsDiscordMember(false);
      setActiveProfile('Default');
      localStorage.setItem('ak-current-profile', 'Default');
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
      setActiveProfile('Default');
      localStorage.setItem('ak-current-profile', 'Default');
    } catch (error) {
      console.error('Discord logout error:', error);
    }
  };

  useEffect(() => {
    fetchDiscordUser();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        fetchDiscordUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('ak-profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('ak-current-profile', activeProfile);
    
    // Load translations for the new active profile asynchronously
    const loadTranslations = async () => {
      setIsTranslationsLoaded(false);
      const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
      
      try {
        let data = await DbService.get(key);
        
        // Check localStorage fallback/migration
        if (!data) {
          const savedLocal = localStorage.getItem(key);
          if (savedLocal) {
            try {
              data = JSON.parse(savedLocal);
              // Migrate to IndexedDB
              await DbService.set(key, data);
              // Remove from localStorage to free space
              localStorage.removeItem(key);
              console.log(`Successfully migrated ${key} to IndexedDB`);
            } catch (err) {
              console.error(`Failed to parse/migrate ${key}:`, err);
            }
          }
        }
        
        setAllTranslations(data || {});
        lastSavedProfileRef.current = activeProfile;
        setIsTranslationsLoaded(true);
      } catch (err) {
        console.error('Failed to load translations from IndexedDB:', err);
        setAllTranslations({});
        lastSavedProfileRef.current = activeProfile;
        setIsTranslationsLoaded(true);
      }
    };

    loadTranslations();
  }, [activeProfile]);

  // Use a ref to track the profile for which allTranslations is currently valid
  const lastSavedProfileRef = React.useRef(activeProfile);

  useEffect(() => {
    // Only save if translations are loaded and the current state belongs to the active profile
    if (isTranslationsLoaded && lastSavedProfileRef.current === activeProfile) {
      const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
      DbService.set(key, allTranslations).catch((e: any) => {
        console.error('Failed to save to IndexedDB:', e);
        setErrorMessage('Ошибка при сохранении переводов в базу данных!');
      });
    } else if (isTranslationsLoaded) {
      // Update the ref so subsequent changes to allTranslations are saved to the correct key
      lastSavedProfileRef.current = activeProfile;
    }
  }, [allTranslations, activeProfile, isTranslationsLoaded]);

  useEffect(() => {
    localStorage.setItem('ak-chapter-stats', JSON.stringify(chapterStats));
  }, [chapterStats]);

  useEffect(() => {
    localStorage.setItem('ak-user-api-key', userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    localStorage.setItem('ak-selected-model', selectedModel);
  }, [selectedModel]);

  const handleAddProfile = (name: string) => {
    if (name && name.trim() && !profiles.includes(name.trim())) {
      const trimmedName = name.trim();
      setProfiles(prev => [...prev, trimmedName]);
      setActiveProfile(trimmedName);
      setShowProfileModal(false);
    }
  };

  const handleDeleteProfile = async (profileToDelete: string) => {
    if (profileToDelete === 'Default') {
      alert('Нельзя удалить профиль по умолчанию.');
      return;
    }
    setProfiles(prev => prev.filter(p => p !== profileToDelete));
    if (activeProfile === profileToDelete) {
      setActiveProfile('Default');
    }
    
    try {
      await DbService.delete(`ak-translations-v3-${profileToDelete}`);
    } catch (e) {}
    localStorage.removeItem(`ak-translations-v3-${profileToDelete}`);
    setShowProfileModal(false);
  };

  const handleRenameProfile = async (newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === activeProfile) {
      setShowProfileModal(false);
      return;
    }
    
    if (profiles.includes(trimmedNewName)) {
      alert('Профиль с таким именем уже существует.');
      return;
    }

    const oldKey = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
    const newKey = trimmedNewName === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${trimmedNewName}`;
    
    try {
      // Move data in IndexedDB
      let data = await DbService.get(oldKey);
      if (!data) {
        const savedLocal = localStorage.getItem(oldKey);
        if (savedLocal) {
          try { data = JSON.parse(savedLocal); } catch (e) {}
        }
      }

      if (data) {
        await DbService.set(newKey, data);
        if (activeProfile !== 'Default') {
          await DbService.delete(oldKey);
          localStorage.removeItem(oldKey);
        }
      }
    } catch (e) {
      console.error('Failed to rename profile in IndexedDB:', e);
    }

    setProfiles(prev => prev.map(p => p === activeProfile ? trimmedNewName : p));
    setActiveProfile(trimmedNewName);
    setShowProfileModal(false);
  };

  const handleProfileModalSubmit = () => {
    if (profileModalMode === 'add') {
      handleAddProfile(profileModalValue);
    } else if (profileModalMode === 'rename') {
      handleRenameProfile(profileModalValue);
    } else if (profileModalMode === 'delete') {
      handleDeleteProfile(profileModalValue);
    }
  };

  const getChapterProgress = (storyTxt: string) => {
    const total = chapterStats[storyTxt];
    if (!total) return 0;
    
    if (selectedChapter?.storyTxt === storyTxt && blocks.length > 0) {
      const translatedCount = blocks.filter(b => b.type === 'dialogue' && b.content[activeTargetLang]?.text?.trim()).length;
      return Math.round((translatedCount / total) * 100);
    }

    const translations = allTranslations[storyTxt] || {};
    // translations is Record<number, Record<Language, {text, name}>>
    const translatedCount = Object.values(translations).filter((t: any) => t[activeTargetLang]?.text?.trim()).length;
    return Math.round((translatedCount / total) * 100);
  };

  const getEpisodeProgress = (episode: StoryEpisode) => {
    let totalProgress = 0;

    episode.chapters.forEach(ch => {
      const total = chapterStats[ch.storyTxt];
      if (total !== undefined) {
        if (total === 0) {
          totalProgress += 1; // Empty chapter is 100% done
        } else {
          if (selectedChapter?.storyTxt === ch.storyTxt && blocks.length > 0) {
            const translatedCount = blocks.filter(b => b.type === 'dialogue' && b.content[activeTargetLang]?.text?.trim()).length;
            totalProgress += (translatedCount / total);
          } else {
            const translations = allTranslations[ch.storyTxt] || {};
            const translatedCount = Object.values(translations).filter((t: any) => t[activeTargetLang]?.text?.trim()).length;
            totalProgress += (translatedCount / total);
          }
        }
      }
    });

    if (episode.chapters.length === 0) return 0;
    return Math.round((totalProgress / episode.chapters.length) * 100);
  };

  const progress = useMemo(() => {
    if (!selectedChapter) return 0;
    return getChapterProgress(selectedChapter.storyTxt);
  }, [selectedChapter, allTranslations, chapterStats, activeTargetLang, blocks]);

  const chaptersList = useMemo(() => {
    if (!selectedEpisode) return [];
    return selectedEpisode.chapters;
  }, [selectedEpisode]);

  useEffect(() => {
    fetchChapterList()
      .then(data => {
        setEpisodes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load episodes for translation tool', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedChapter) {
      setBlocks([]);
      return;
    }

    let isMounted = true;
    setLoadingScript(true);

    const loadScripts = async () => {
      try {
        // Fetch all required languages
        const allLangs = Array.from(new Set([sourceLang, ...referenceLangs, ...targetLangs]));
        
        const scriptResults = await Promise.all(
          allLangs.map(async (lang) => {
            try {
              const text = await fetchStoryScript(
                selectedChapter.storyTxt, 
                lang, 
                !LANGUAGES.find(l => l.id === lang)?.isOfficial,
                activeProfile === 'Default' ? 'none' : activeProfile
              );
              return { lang, text };
            } catch (e) {
              return { lang, text: '' };
            }
          })
        );

        if (!isMounted) return;

        const sourceResult = scriptResults.find(r => r.lang === sourceLang);
        const sourceText = sourceResult?.text || '';
        setOriginalScriptText(sourceText);
        
        const parsedBlocks = parseTranslationBlocks(sourceText);
        const dialogueBlocks = parsedBlocks.filter(b => b.type === 'dialogue');
        
        // Update stats for progress calculation
        setChapterStats(prev => ({
          ...prev,
          [selectedChapter.storyTxt]: dialogueBlocks.length
        }));

        // Obtain local translations for this chapter
        const profileKey = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
        let localTranslations = await DbService.get(profileKey);
        if (!localTranslations) {
          const savedLocal = localStorage.getItem(profileKey);
          if (savedLocal) {
            try { localTranslations = JSON.parse(savedLocal); } catch (e) {}
          }
        }
        if (!localTranslations) {
          localTranslations = {};
        }

        const finalBlocks: TranslationBlock[] = parsedBlocks.map((block, idx) => {
          const content: Record<string, { text: string, name?: string, edited?: boolean }> = {};
          
          // Add source text
          const sourceMatch = block.originalText.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
          const sourceNameMatch = block.prefix.match(/name="([^"]+)"/);
          let sourceText = sourceMatch ? sourceMatch[2] : block.originalText;
          const sourceName = sourceNameMatch ? sourceNameMatch[1] : undefined;
          
          const optionsMatch = block.prefix.match(/options="([^"]+)"/);
          const subtitleMatch = block.prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
          const stickerMatch = block.prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);
          if (sourceText.trim() === '') {
            if (optionsMatch) {
              sourceText = optionsMatch[1];
            } else if (subtitleMatch) {
              sourceText = subtitleMatch[1];
            } else if (stickerMatch) {
              sourceText = stickerMatch[1];
            }
          }

          content[sourceLang] = {
            text: sourceText,
            name: sourceName
          };

          // Add other languages
          scriptResults.forEach(res => {
            if (res.lang === sourceLang) return;
            
            const lines = res.text.split(/\r?\n/);
            let text = '';
            let name: string | undefined = undefined;

            if (idx < lines.length) {
              const line = lines[idx];
              const match = line.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
              if (match) {
                const nameMatch = match[1].match(/name="([^"]+)"/);
                text = match[2];
                if (/\[delay\b/i.test(match[1])) {
                  text = '';
                }
                name = nameMatch ? nameMatch[1] : undefined;
                
                const optMatch = match[1].match(/options="([^"]+)"/);
                const subMatch = match[1].match(/\[Subtitle[^\]]*text="([^"]+)"/i);
                const stickMatch = match[1].match(/\[Sticker[^\]]*text="([^"]+)"/i);
                if (text.trim() === '') {
                  if (optMatch) {
                    text = optMatch[1];
                  } else if (subMatch) {
                    text = subMatch[1];
                  } else if (stickMatch) {
                    text = stickMatch[1];
                  }
                }
              } else {
                text = line;
              }
            }

            // If this is a target language, and the text is identical to source, 
            // it's likely a fallback. Clear it so the user starts fresh.
            if (targetLangs.includes(res.lang)) {
              if (text === sourceText && name === sourceName) {
                text = '';
                name = undefined;
              }
            }

            content[res.lang] = { text, name };
          });

          // Apply local translations (overwrites server data for target languages)

          targetLangs.forEach(lang => {
            const localData = localTranslations[selectedChapter.storyTxt]?.[idx]?.[lang];
            
            // Auto map name translation from global database if character name exists there
            let nameVal = localData?.name || content[lang]?.name || undefined;

            content[lang] = {
              text: localData?.text || content[lang]?.text || '',
              name: nameVal,
              edited: localData?.edited || false
            };
          });

          return {
            ...block,
            content
          };
        });

        if (isMounted) {
          setBlocks(finalBlocks);
          setLoadingScript(false);
        }
      } catch (err) {
        console.error('Failed to load scripts', err);
        if (isMounted) {
          setBlocks([]);
          setLoadingScript(false);
        }
      }
    };

    loadScripts();

    return () => { isMounted = false; };
  }, [selectedChapter, sourceLang, referenceLangs, targetLangs, activeProfile]);

  const handleTranslationChange = (id: string, newText: string, lang: Language = activeTargetLang) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === id) {
        const newContent = { ...b.content };
        newContent[lang] = { ...newContent[lang], text: newText, edited: true };
        return { ...b, content: newContent };
      }
      return b;
    }));
    
    if (selectedChapter) {
      const index = blocks.findIndex(b => b.id === id);
      if (index !== -1) {
        setAllTranslations(prev => {
          const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
          const current = chapterTranslations[index] || {};
          const langData = current[lang] || {};
          
          if (newText.trim() === '' && !langData.name) {
            const newCurrent = { ...current };
            delete newCurrent[lang];
            if (Object.keys(newCurrent).length === 0) {
              delete chapterTranslations[index];
            } else {
              chapterTranslations[index] = newCurrent;
            }
          } else {
            chapterTranslations[index] = { ...current, [lang]: { ...langData, text: newText, edited: true } };
          }
          return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
        });
      }
    }
  };

  const handleCharacterNameChange = (id: string, newName: string, lang: Language = activeTargetLang) => {
    const targetBlock = blocks.find(b => b.id === id);
    if (!targetBlock) return;

    const sourceName = targetBlock.content[sourceLang]?.name;
    if (!sourceName) return;

    // Update all blocks with the same source name in the current view
    setBlocks(prev => prev.map(b => {
      if (b.content[sourceLang]?.name === sourceName) {
        const newContent = { ...b.content };
        newContent[lang] = { ...newContent[lang], name: newName, edited: true };
        return { ...b, content: newContent };
      }
      return b;
    }));
    
    if (selectedChapter) {
      setAllTranslations(prev => {
        const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
        
        // Find all indices that have this source name
        blocks.forEach((b, idx) => {
          if (b.content[sourceLang]?.name === sourceName) {
            const current = chapterTranslations[idx] || {};
            const langData = current[lang] || {};
            
            if (newName.trim() === '' && !langData.text) {
              const newCurrent = { ...current };
              delete newCurrent[lang];
              if (Object.keys(newCurrent).length === 0) {
                delete chapterTranslations[idx];
              } else {
                chapterTranslations[idx] = newCurrent;
              }
            } else {
              chapterTranslations[idx] = { ...current, [lang]: { ...langData, name: newName, edited: true } };
            }
          }
        });
        
        return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
      });
    }
  };

  const translateBatchWithGemini = async (
    batch: TranslationBlock[], 
    context?: { character: string, text: string }[], 
    lang: Language = activeTargetLang,
    maxRetries: number = 3
  ): Promise<{ id: string, translatedText: string, translatedCharacter: string }[] | null> => {
    const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
    const toLabel = LANGUAGES.find(l => l.id === lang)?.label || lang;
    
    // Dynamic chapter character name mapping
    const dynamicNames = blocks
      .filter(b => b.content[sourceLang]?.name && b.content[lang]?.name)
      .reduce((acc, b) => {
        acc[b.content[sourceLang].name!] = b.content[lang].name!;
        return acc;
      }, {} as Record<string, string>);

    // Merge Canonical Arknights Lore Glossary with dynamically learned character names (canonical takes high authority, dynamic adds episode specifics)
    const glossary = {
      ...ARKNIGHTS_CANONICAL_GLOSSARY,
      ...dynamicNames
    };

    const prompt = {
      glossary,
      context: context || [],
      toTranslate: batch.map(b => ({
        id: b.id,
        character: b.content[sourceLang]?.name || "Narrator/System",
        text: b.content[sourceLang]?.text || ""
      }))
    };

    const baseInstruction = additionalPromptText.trim()
      ? `${DEFAULT_SYSTEM_PROMPT}\n\nADDITIONAL TRANSLATOR INSTRUCTIONS:\n${additionalPromptText}`
      : DEFAULT_SYSTEM_PROMPT;
    const systemInstruction = baseInstruction
      .replace(/{fromLabel}/g, fromLabel)
      .replace(/{toLabel}/g, toLabel)
      .replace(/\${fromLabel}/g, fromLabel)
      .replace(/\${toLabel}/g, toLabel);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (cancelTranslationRef.current) return null;

      try {
        if (!userApiKey && (!discordUser || !isDiscordMember)) {
          throw new Error("GEMINI_API_KEY_MISSING");
        }

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: authService.getAuthHeaders({
            'Content-Type': 'application/json'
          }),
          credentials: 'include',
          body: JSON.stringify({
            customApiKey: userApiKey || undefined,
            model: selectedModel,
            contents: JSON.stringify(prompt),
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    translatedText: { type: Type.STRING },
                    translatedCharacter: { type: Type.STRING }
                  },
                  required: ["id", "translatedText", "translatedCharacter"]
                }
              },
              systemInstruction,
            }
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          if (errorData.error === "GEMINI_API_KEY_MISSING") {
            throw new Error("GEMINI_API_KEY_MISSING");
          }
          if (res.status === 429 || errorData.error?.includes?.("429") || errorData.error?.toLowerCase?.()?.includes?.("quota")) {
            throw new Error("QUOTA_EXCEEDED");
          }
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        const response = await res.json();
        
        if (!response.text) {
          console.warn("Gemini returned an empty response for batch");
          return null;
        }

        const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsed = JSON.parse(cleanedText);
        
        if (!Array.isArray(parsed)) {
          console.error("Gemini response is not an array:", parsed);
          return null;
        }

        // Successfully received and parsed batch
        setRateLimitActive(false);
        setRateLimitCountdown(null);
        return parsed as { id: string, translatedText: string, translatedCharacter: string }[];
      } catch (error: any) {
        console.warn(`Translation attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
        
        if (error?.message === "GEMINI_API_KEY_MISSING") {
          throw error;
        }

        const isRateLimit = error?.message === "QUOTA_EXCEEDED" || error?.message?.includes("429") || error?.status === 429;
        
        if (isRateLimit && attempt < maxRetries) {
          setRateLimitActive(true);
          const waitSeconds = Math.min(20 * Math.pow(2, attempt), 60); // 20s, 40s, 60s
          
          for (let sec = waitSeconds; sec > 0; sec--) {
            if (cancelTranslationRef.current) {
              setRateLimitActive(false);
              setRateLimitCountdown(null);
              return null;
            }
            setRateLimitCountdown(sec);
            await new Promise(r => setTimeout(r, 1000));
          }
          setRateLimitCountdown(null);
          continue; // retry with current or potentially user-switched model
        }

        if (attempt >= maxRetries) {
          setRateLimitActive(false);
          setRateLimitCountdown(null);
          if (isRateLimit) {
            throw new Error("QUOTA_EXCEEDED");
          }
          return null;
        }
      }
    }
    setRateLimitActive(false);
    setRateLimitCountdown(null);
    return null;
  };

  const translateWithGemini = async (blockId: string, lang: Language = activeTargetLang) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return null;

    const block = blocks[blockIndex];
    
    // Provide some context from previous lines
    const context = blocks.slice(Math.max(0, blockIndex - 15), blockIndex).map(b => ({
      character: b.content[sourceLang]?.name || "Narrator/System",
      text: b.content[lang]?.text || b.content[sourceLang]?.text || ""
    }));

    const result = await translateBatchWithGemini([block], context, lang);
    return result?.[0] || null;
  };

  const handleGeminiTranslateBlock = async (blockId: string, lang: Language = activeTargetLang) => {
    if (!userApiKey && (!discordUser || !isDiscordMember)) {
      alert("Вам необходимо авторизоваться в Discord и быть участником сервера, чтобы использовать перевод от ИИ.");
      return;
    }
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.content[sourceLang]?.text) return;
    
    setTranslatingBlockIds(prev => new Set(prev).add(blockId));
    try {
      const result = await translateWithGemini(blockId, lang);
      if (result) {
        handleTranslationChange(blockId, result.translatedText, lang);
        if (block.content[sourceLang]?.name) {
          handleCharacterNameChange(blockId, result.translatedCharacter, lang);
        }
      }
    } catch (error: any) {
      if (error?.message === "QUOTA_EXCEEDED") {
        setErrorMessage("Gemini API quota exceeded. Please wait a moment.");
      } else if (error?.message === "GEMINI_API_KEY_MISSING") {
        setErrorMessage("Gemini API Key is missing. Please provide your own API Key in the sidebar settings.");
      } else {
        setErrorMessage("Translation failed. Please check your API key and connection.");
      }
    } finally {
      setTranslatingBlockIds(prev => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    }
  };

  const handleUpdateTargetLang = (oldLang: Language, newLang: Language) => {
    if (targetLangs.includes(newLang)) return;
    setTargetLangs(prev => prev.map(l => l === oldLang ? newLang : l));
    if (activeTargetLang === oldLang) setActiveTargetLang(newLang);
  };

  const handleRemoveTargetLang = (lang: Language) => {
    if (targetLangs.length <= 1) return;
    setTargetLangs(prev => prev.filter(l => l !== lang));
    if (activeTargetLang === lang) {
      setActiveTargetLang(targetLangs.find(l => l !== lang)!);
    }
  };

  const handleUpdateReferenceLang = (oldLang: Language, newLang: Language) => {
    if (referenceLangs.includes(newLang)) return;
    setReferenceLangs(prev => prev.map(l => l === oldLang ? newLang : l));
  };

  const handleRemoveReferenceLang = (lang: Language) => {
    setReferenceLangs(prev => prev.filter(l => l !== lang));
  };

  const blocksRef = React.useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const handleBatchTranslationChange = (results: { id: string, translatedText: string, translatedCharacter: string }[], lang: Language = activeTargetLang) => {
    if (!selectedChapter) return;
    
    console.log(`Applying ${results.length} translation results to blocks...`);

    setBlocks(prev => {
      const next = [...prev];
      results.forEach(res => {
        // Extremely robust ID matching: trim and handle formats safely
        if (!res || res.id === null || res.id === undefined) return;
        const rawId = String(res.id).trim();
        const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
        const idx = next.findIndex(b => b.id === targetId);
        
        if (idx !== -1) {
          const block = next[idx];
          
          // 1. Update the text for this specific block
          const newContent = { ...block.content };
          newContent[lang] = { ...newContent[lang], text: res.translatedText, edited: true };
          next[idx] = { ...block, content: newContent };
          
          // 2. If there's a character name, update it globally for this character
          if (block.content[sourceLang]?.name && res.translatedCharacter) {
            const sourceName = block.content[sourceLang].name;
            next.forEach((b, bIdx) => {
              if (b.content[sourceLang]?.name === sourceName) {
                const bContent = { ...b.content };
                bContent[lang] = { ...bContent[lang], name: res.translatedCharacter, edited: true };
                next[bIdx] = { ...b, content: bContent };
              }
            });
          }
        } else {
          console.warn(`Could not find block with ID ${res.id} (tried ${targetId})`);
        }
      });
      return next;
    });

    setAllTranslations(prev => {
      const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
      const currentBlocks = blocksRef.current;
      
      results.forEach(res => {
        if (!res || res.id === null || res.id === undefined) return;
        const rawId = String(res.id).trim();
        const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
        const idx = currentBlocks.findIndex(b => b.id === targetId);
        
        if (idx !== -1) {
          const block = currentBlocks[idx];
          const current = chapterTranslations[idx] || {};
          const langData = current[lang] || {};
          
          // Update the specific line's text
          chapterTranslations[idx] = { 
            ...current, 
            [lang]: { ...langData, text: res.translatedText, edited: true } 
          };

          // Update character name locally across the Chapter/blocks if applicable
          if (block.content[sourceLang]?.name && res.translatedCharacter) {
            const sourceName = block.content[sourceLang].name;

            currentBlocks.forEach((b, bIdx) => {
              if (b.content[sourceLang]?.name === sourceName) {
                const bCurrent = chapterTranslations[bIdx] || {};
                const bLangData = bCurrent[lang] || {};
                chapterTranslations[bIdx] = {
                  ...bCurrent,
                  [lang]: { ...bLangData, name: res.translatedCharacter, edited: true }
                };
              }
            });
          }
        }
      });

      return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
    });
  };

  const handleGeminiTranslateAll = async (lang: Language = activeTargetLang) => {
    if (!userApiKey && (!discordUser || !isDiscordMember)) {
      alert("Вам необходимо авторизоваться в Discord и быть участником сервера, чтобы использовать перевод от ИИ.");
      return;
    }
    
    if (!selectedChapter || isTranslatingAll) return;
    
    // Use the latest blocks from ref
    const currentBlocks = blocksRef.current;
    let targetBlocks = currentBlocks.filter(b => b.type === 'dialogue');
    
    // If 'translateOnlyUntranslated' is checked, filter out already translated lines
    if (translateOnlyUntranslated) {
      targetBlocks = targetBlocks.filter(b => !b.content[lang]?.text || b.content[lang]?.text.trim() === '');
    }

    if (targetBlocks.length === 0) {
      if (translateOnlyUntranslated) {
        alert("Все диалоговые строки в данной главе уже переведены.");
      }
      return;
    }

    setIsTranslatingAll(true);
    setErrorMessage(null);
    cancelTranslationRef.current = false;
    setTranslationProgress({ current: 0, total: targetBlocks.length });
    console.log(`Starting translation for ${targetBlocks.length} lines (onlyUntranslated: ${translateOnlyUntranslated})...`);

    try {
      // Large-capacity batching (500 lines per batch)
      const TARGET_BATCH_SIZE = 500;
      const SINGLE_BATCH_THRESHOLD = 500;
      const totalLines = targetBlocks.length;
      
      const batches: TranslationBlock[][] = [];
      
      if (totalLines <= SINGLE_BATCH_THRESHOLD) {
        batches.push(targetBlocks);
      } else {
        const numBatches = Math.ceil(totalLines / TARGET_BATCH_SIZE);
        const actualBatchSize = Math.ceil(totalLines / numBatches);
        for (let i = 0; i < totalLines; i += actualBatchSize) {
          batches.push(targetBlocks.slice(i, i + actualBatchSize));
        }
      }

      for (let i = 0; i < batches.length; i++) {
        if (cancelTranslationRef.current) break;

        const batch = batches[i];
        
        // Mark blocks in current batch as translating
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.add(b.id));
          return next;
        });

        // Dynamic Rolling Context: Take up to 15 immediately preceding lines in story order for character tone and gender coherence
        const latestBlocks = blocksRef.current;
        const firstBlockIndex = latestBlocks.findIndex(b => b.id === batch[0].id);
        const context = latestBlocks.slice(Math.max(0, firstBlockIndex - 15), Math.max(0, firstBlockIndex)).map(b => ({
          character: b.content[sourceLang]?.name || "Narrator/System",
          text: b.content[lang]?.text || b.content[sourceLang]?.text || ""
        }));

        const results = await translateBatchWithGemini(batch, context, lang);
        
        if (results && results.length > 0) {
          handleBatchTranslationChange(results, lang);
          setTranslationProgress(prev => prev ? { ...prev, current: prev.current + results.length } : null);
        } else if (!cancelTranslationRef.current) {
          console.error(`Batch ${i + 1} failed to return results.`);
          setErrorMessage(`Ошибка при переводе блока ${i + 1}. Повторите попытку.`);
        }

        // Clear translating status for this batch
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.delete(b.id));
          return next;
        });

        // Gentle delay between batches
        if (batches.length > 1 && i < batches.length - 1 && !cancelTranslationRef.current) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
      console.log("Translation finished.");
    } catch (error: any) {
      console.error("Mass translation failed:", error);
      if (error?.message === "QUOTA_EXCEEDED") {
        setErrorMessage("Превышена квота Gemini API (429). Вы можете сменить модель в настройках или подождать.");
      } else if (error?.message === "GEMINI_API_KEY_MISSING") {
        setErrorMessage("Ключ Gemini API отсутствует.");
      } else {
        setErrorMessage("Ошибка перевода. Подробности в консоли.");
      }
    } finally {
      setIsTranslatingAll(false);
      setTranslatingBlockIds(new Set());
      setTranslationProgress(null);
      setRateLimitActive(false);
      setRateLimitCountdown(null);
    }
  };

  const handleAnalyzeTranslations = async () => {
    if (!selectedChapter || isEditorAnalyzing) return;

    if (!userApiKey && (!discordUser || !isDiscordMember)) {
      alert("Ключ Gemini API не указан. Пожалуйста, введите свой ключ API в настройках или войдите через Discord.");
      return;
    }

    setIsEditorAnalyzing(true);
    setEditorIssues([]);
    setSelectedIssueId(null);

    try {
      let dialogueData: Array<{
        id: string;
        chapterTitle: string;
        charOriginal: string;
        charTranslated: string;
        textOriginal: string;
        textTranslated: string;
      }> = [];

      if (editorScope === 'chapter') {
        const dialogueBlocks = blocks.filter(b => b.type === 'dialogue');
        if (dialogueBlocks.length === 0) {
          alert("В этой главе нет диалогов для редактирования.");
          setIsEditorAnalyzing(false);
          return;
        }

        setEditorProgressStatus("Сбор и фильтрация диалогов главы...");
        dialogueData = dialogueBlocks.map(b => ({
          id: `${selectedChapter.storyTxt}::${b.id}`,
          chapterTitle: selectedChapter.name || selectedChapter.storyTxt,
          charOriginal: b.content[sourceLang]?.name || "Narrator/System",
          charTranslated: b.content[activeTargetLang]?.name || "",
          textOriginal: b.content[sourceLang]?.text || "",
          textTranslated: b.content[activeTargetLang]?.text || ""
        }));
      } else {
        // Episode-wide scope
        if (!selectedEpisode) {
          alert("Эпизод не выбран.");
          setIsEditorAnalyzing(false);
          return;
        }

        setEditorProgressStatus(`Сбор глав эпизода "${selectedEpisode.name}"...`);
        const chapters = selectedEpisode.chapters;

        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          setEditorProgressStatus(`Загрузка и парсинг главы ${i + 1}/${chapters.length}: ${ch.name}...`);
          
          try {
            // Fetch source script
            const sourceText = await fetchStoryScript(
              ch.storyTxt, 
              sourceLang, 
              !LANGUAGES.find(l => l.id === sourceLang)?.isOfficial,
              activeProfile === 'Default' ? 'none' : activeProfile
            );
            
            // Parse source script blocks
            const parsed = parseTranslationBlocks(sourceText);
            
            // Fetch target script if cached/saved on server
            let targetText = "";
            try {
              targetText = await fetchStoryScript(
                ch.storyTxt,
                activeTargetLang,
                !LANGUAGES.find(l => l.id === activeTargetLang)?.isOfficial,
                activeProfile === 'Default' ? 'none' : activeProfile
              );
            } catch (e) {
              // Ignore target script download failures (if no server translations yet)
            }
            
            const targetLines = targetText ? targetText.split(/\r?\n/) : [];
            
            // Obtain local translations for this chapter
            const profileKey = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
            let localTranslations = await DbService.get(profileKey);
            if (!localTranslations) {
              const savedLocal = localStorage.getItem(profileKey);
              if (savedLocal) {
                try { localTranslations = JSON.parse(savedLocal); } catch (e) {}
              }
            }
            if (!localTranslations) {
              localTranslations = {};
            }
            
            parsed.forEach((block, idx) => {
              if (block.type !== 'dialogue') return;
              
              // Extract original names/texts
              const sourceMatch = block.originalText.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
              const sourceNameMatch = block.prefix.match(/name="([^"]+)"/);
              let sText = sourceMatch ? sourceMatch[2] : block.originalText;
              const sName = sourceNameMatch ? sourceNameMatch[1] : undefined;
              
              const optionsMatch = block.prefix.match(/options="([^"]+)"/);
              const subtitleMatch = block.prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
              const stickerMatch = block.prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);
              if (sText.trim() === '') {
                if (optionsMatch) sText = optionsMatch[1];
                else if (subtitleMatch) sText = subtitleMatch[1];
                else if (stickerMatch) sText = stickerMatch[1];
              }
              
              // Get translated values from downloaded target file (fallback)
              let tText = "";
              let tName: string | undefined = undefined;
              
              if (idx < targetLines.length) {
                const line = targetLines[idx];
                const match = line.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
                if (match) {
                  const nameMatch = match[1].match(/name="([^"]+)"/);
                  tText = match[2];
                  if (/\[delay\b/i.test(match[1])) {
                    tText = '';
                  }
                  tName = nameMatch ? nameMatch[1] : undefined;
                  
                  const optMatch = match[1].match(/options="([^"]+)"/);
                  const subMatch = match[1].match(/\[Subtitle[^\]]*text="([^"]+)"/i);
                  const stickMatch = match[1].match(/\[Sticker[^\]]*text="([^"]+)"/i);
                  if (tText.trim() === '') {
                    if (optMatch) tText = optMatch[1];
                    else if (subMatch) tText = subMatch[1];
                    else if (stickMatch) tText = stickMatch[1];
                  }
                } else {
                  tText = line;
                }
              }
              
              // Avoid duplicates (if same as original)
              if (tText === sText && tName === sName) {
                tText = '';
                tName = undefined;
              }
              
              // Overlay with local storage translations
              const localData = localTranslations[ch.storyTxt]?.[idx]?.[activeTargetLang];
              if (localData) {
                tText = localData.text || tText || '';
                tName = localData.name || tName || undefined;
              }
              
              dialogueData.push({
                id: `${ch.storyTxt}::${block.id}`,
                chapterTitle: ch.name,
                charOriginal: sName || "Narrator/System",
                charTranslated: tName || "",
                textOriginal: sText,
                textTranslated: tText
              });
            });
            
          } catch (chapterErr) {
            console.error(`Error loading chapter ${ch.storyTxt} for AI Editor`, chapterErr);
          }
        }
      }

      // Check how many translations exist across the scope
      const translatedCount = dialogueData.filter(d => d.textTranslated.trim() !== "").length;
      if (translatedCount === 0) {
        setEditorProgressStatus("Нет переведенных строк в выбранной области проверки. Пожалуйста, сначала переведите диалоги.");
        setIsEditorAnalyzing(false);
        return;
      }

      setEditorProgressStatus(`Инициализация ИИ-проверки для ${dialogueData.length} строк (${translatedCount} переведено)...`);
      const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
      const toLabel = LANGUAGES.find(l => l.id === activeTargetLang)?.label || activeTargetLang;

      // 1. Local JavaScript canonical glossary and consistency verification (Fast, 100% coverage of all lines)
      const nameIssues: Array<any> = [];
      const nameGroups: { [key: string]: Array<{ blockId: string; charTranslated: string }> } = {};
      
      dialogueData.forEach(d => {
        if (d.charOriginal && d.charOriginal !== "Narrator/System" && d.charOriginal.trim() !== "") {
          if (d.charTranslated && d.charTranslated.trim() !== "") {
            // Check canonical glossary match first (e.g. Kal'tsit -> Кальцит, Ch'en -> Чэнь, no apostrophes)
            const canonicalExpected = ARKNIGHTS_CANONICAL_GLOSSARY[d.charOriginal.trim()];
            if (canonicalExpected && d.charTranslated.trim() !== canonicalExpected) {
              nameIssues.push({
                id: `canonical-name-${d.charOriginal.replace(/[^a-zA-Z0-9]/g, '')}-${d.id}`,
                type: 'name_consistency',
                severity: 'error',
                title: `Неканоничное имя: ${d.charOriginal}`,
                description: `Имя персонажа "${d.charOriginal}" переведено как "${d.charTranslated}", но каноничным вариантом является "${canonicalExpected}". Апострофы и искажения недопустимы.`,
                originalValue: d.charTranslated,
                suggestedValue: canonicalExpected,
                targetField: 'name',
                blockIds: [d.id]
              });
            }

            if (!nameGroups[d.charOriginal]) {
              nameGroups[d.charOriginal] = [];
            }
            nameGroups[d.charOriginal].push({
              blockId: d.id,
              charTranslated: d.charTranslated
            });
          }
        }
      });
      
      Object.entries(nameGroups).forEach(([charOriginal, list]) => {
        if (list.length === 0) return;
        const uniqueTranslations = Array.from(new Set(list.map(x => x.charTranslated.trim())));
        if (uniqueTranslations.length > 1) {
          const canonicalExpected = ARKNIGHTS_CANONICAL_GLOSSARY[charOriginal.trim()];
          const counts: { [key: string]: number } = {};
          list.forEach(x => {
            const cleaned = x.charTranslated.trim();
            counts[cleaned] = (counts[cleaned] || 0) + 1;
          });
          const sortedTranslations = uniqueTranslations.sort((a, b) => counts[b] - counts[a]);
          const recommended = canonicalExpected || sortedTranslations[0];
          
          sortedTranslations.forEach((wrongTranslation) => {
            if (wrongTranslation === recommended) return;
            const affectedBlocks = list.filter(x => x.charTranslated.trim() === wrongTranslation).map(x => x.blockId);
            
            if (affectedBlocks.length > 0) {
              nameIssues.push({
                id: `js-name-consistency-${charOriginal.replace(/[^a-zA-Z0-9]/g, '')}-${wrongTranslation.replace(/[^a-zA-Z0-9]/g, '')}`,
                type: 'name_consistency',
                severity: 'error',
                title: `Несогласованность имени: ${charOriginal}`,
                description: `Персонаж "${charOriginal}" переведён как "${wrongTranslation}" в некоторых строках, хотя каноничным/основным вариантом является "${recommended}".`,
                originalValue: wrongTranslation,
                suggestedValue: recommended,
                targetField: 'name',
                blockIds: affectedBlocks
              });
            }
          });
        }
      });

      // 2. Batch AI Analysis: Process ALL translated dialogue lines sequentially in structured batches (500 lines per batch)
      const allLinesToAnalyze = dialogueData.filter(d => d.textTranslated.trim() !== "");
      const EDITOR_BATCH_SIZE = 500;
      const batches: (typeof dialogueData)[] = [];
      for (let i = 0; i < allLinesToAnalyze.length; i += EDITOR_BATCH_SIZE) {
        batches.push(allLinesToAnalyze.slice(i, i + EDITOR_BATCH_SIZE));
      }

      const canonicalGlossaryString = Object.entries(ARKNIGHTS_CANONICAL_GLOSSARY)
        .map(([k, v]) => `${k} -> ${v}`)
        .join(', ');

      const editorInstruction = `You are an expert Arknights Russian Localization Lead and Agentic QA Inspector.
Your source language is: ${fromLabel}
Your target language is: ${toLabel} (Russian)

CANONICAL GLOSSARY & UNIFORM DICTIONARY:
${canonicalGlossaryString}

Analyze the provided array of translated dialogue blocks. Your PRIMARY mission is to ensure 100% uniformity in character names, organizations, locations, lore concepts, and natural idiom translation:

1. 'name_consistency' (CRITICAL/HIGH PRIORITY):
   - Check if a character name, organization, or faction name is translated inconsistently, contains forbidden apostrophes ('), or deviates from the canonical glossary (e.g. Amiya -> Амия, Kal'tsit -> Кальцит [never Кель'тсит / Каль'цит], Ch'en -> Чэнь [never Ч'ен / Ч'ень], Texas -> Техас, SilverAsh -> Сильвераш, Rhodes Island -> Родос Айленд, Reunion -> Воссоединение, Lungmen -> Лунмэнь, etc.).
   - No apostrophes (') should ever appear inside Russian character names.
   - If a name is mentioned inside dialogue text ('textOriginal') but mistranslated, inconsistent, or spelled with an apostrophe in 'textTranslated', flag it with targetField 'text'.
   - If a speaker name is mistranslated in 'charTranslated', flag it with targetField 'name'.

2. 'incomplete_translation' (HIGH PRIORITY):
   - Check if a line contains incomplete or partial translation (e.g. untranslated English/Chinese chunks, untranslated options/subtitle fragments). Provide complete translation in 'suggestedValue' with targetField 'text'.

3. 'terminology' (MEDIUM PRIORITY):
   - Verify proper usage of core Arknights lore terms (Originium -> Ориджиниум, Oripathy -> Орипатия, Infected -> Заражённые, Catastrophe -> Катастрофа, Mobile Cities -> Мобильные города). Set targetField to 'text'.

4. 'grammar_style' (MEDIUM PRIORITY):
   - Verify Russian gender verb/adjective agreement (Amiya/Kal'tsit/Ch'en/Texas -> feminine endings; Doctor/SilverAsh/Phantom -> masculine endings). Spot clumsy literal calques of Chinese idioms (成语) and suggest natural Russian phrasing. Set targetField to 'text'.

5. 'generic' (LOW PRIORITY):
   - Identify lines completely left untranslated and suggest a translation. Set targetField to 'text'.

Output MUST be a strict JSON object with a single root key 'issues' containing an array of issues.
Return ONLY valid, parsable JSON. No markdown blocks, no commentary.`;

      const aiIssues: Array<any> = [];

      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        const currentBatch = batches[bIdx];
        setEditorProgressStatus(`Проверка ИИ: этап ${bIdx + 1}/${batches.length} (проанализировано ${bIdx * EDITOR_BATCH_SIZE}/${allLinesToAnalyze.length} строк)...`);

        let batchSuccess = false;
        const maxRetries = 3;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: authService.getAuthHeaders({
                'Content-Type': 'application/json'
              }),
              credentials: 'include',
              body: JSON.stringify({
                customApiKey: userApiKey || undefined,
                model: selectedModel,
                contents: JSON.stringify(currentBatch),
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      issues: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            type: { 
                              type: Type.STRING,
                              description: "Must be: 'terminology', 'grammar_style', 'name_consistency', 'incomplete_translation', or 'generic'"
                            },
                            severity: {
                              type: Type.STRING,
                              description: "Must be: 'error', 'warning', or 'suggestion'"
                            },
                            title: { type: Type.STRING, description: "Short title in Russian" },
                            description: { type: Type.STRING, description: "Detailed explanation in Russian" },
                            originalValue: { type: Type.STRING, description: "Current incorrect value" },
                            suggestedValue: { type: Type.STRING, description: "Correct suggested value" },
                            targetField: { type: Type.STRING, description: "Must be 'name' or 'text'" },
                            blockIds: { 
                              type: Type.ARRAY, 
                              items: { type: Type.STRING },
                              description: "Array of block IDs"
                            }
                          },
                          required: ["id", "type", "severity", "title", "description", "originalValue", "suggestedValue", "targetField", "blockIds"]
                        }
                      }
                    },
                    required: ["issues"]
                  },
                  systemInstruction: editorInstruction,
                }
              })
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ error: res.statusText }));
              if (res.status === 429 || errorData.error?.includes?.("429") || errorData.error?.toLowerCase?.()?.includes?.("quota")) {
                throw new Error("QUOTA_EXCEEDED");
              }
              throw new Error(errorData.error || "Failed to analyze batch");
            }

            const response = await res.json();
            if (response.text) {
              const cleanJson = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
              const parsed = JSON.parse(cleanJson);
              if (parsed && Array.isArray(parsed.issues)) {
                aiIssues.push(...parsed.issues);
              }
            }
            batchSuccess = true;
            break;
          } catch (batchErr: any) {
            console.warn(`AI Editor batch ${bIdx + 1} attempt ${attempt + 1} error:`, batchErr);
            if (batchErr?.message === "QUOTA_EXCEEDED" && attempt < maxRetries) {
              setEditorProgressStatus(`Лимит запросов к ИИ. Ожидание 15 сек перед повтором этапа ${bIdx + 1}/${batches.length}...`);
              await new Promise(r => setTimeout(r, 15000));
              continue;
            }
            if (attempt >= maxRetries) {
              console.error(`Batch ${bIdx + 1} failed after retries`, batchErr);
            }
          }
        }

        // Delay between inspection batches to maintain stable API rate limits
        if (batches.length > 1 && bIdx < batches.length - 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      }

      // Merge the instantaneous JS checks and all completed batch AI checks
      const mergedIssues = [...nameIssues, ...aiIssues];
      const uniqueMerged: Array<any> = [];
      const seenIds = new Set<string>();

      mergedIssues.forEach(issue => {
        if (!seenIds.has(issue.id)) {
          seenIds.add(issue.id);
          uniqueMerged.push(issue);
        }
      });

      setEditorIssues(uniqueMerged);
      setEditorDialogueData(dialogueData);
      setEditorProgressStatus(`Анализ завершен на 100%. Найдено ${uniqueMerged.length} замечаний (полностью проверено ${dialogueData.length} строк).`);
      if (uniqueMerged.length > 0) {
        setSelectedIssueId(uniqueMerged[0].id);
      }
    } catch (error: any) {
      console.error("AI Editor Analysis failed:", error);
      setEditorProgressStatus(`Ошибка при анализе: ${error?.message || error || "Неизвестная ошибка"}`);
    } finally {
      setIsEditorAnalyzing(false);
    }
  };

  const applyFixesBatch = (issuesToFix: EditorIssue[]) => {
    if (issuesToFix.length === 0) return;

    // 1. Batch update allTranslations state
    setAllTranslations(prevTranslations => {
      const nextTranslations = { ...prevTranslations };

      issuesToFix.forEach(issue => {
        if (issue.suggestedValue === undefined) return;

        issue.blockIds.forEach(idWithChapter => {
          const parts = idWithChapter.split("::");
          if (parts.length < 2) return;
          const chapterStoryTxt = parts[0];
          const codeId = parts[1];
          const blockIdx = parseInt(codeId.replace("line-", ""));

          if (isNaN(blockIdx)) return;

          const chapterTranslations = { ...(nextTranslations[chapterStoryTxt] || {}) };
          const current = chapterTranslations[blockIdx] || {};
          const langData = current[activeTargetLang] || {};

          let isNameIssue = false;
          if (issue.targetField) {
            isNameIssue = issue.targetField === 'name';
          } else {
            isNameIssue = issue.type === 'name_consistency';
            if (!isNameIssue && issue.originalValue && langData.name === issue.originalValue && langData.text !== issue.originalValue) {
              isNameIssue = true;
            }
          }

          if (isNameIssue) {
            chapterTranslations[blockIdx] = {
              ...current,
              [activeTargetLang]: { ...langData, name: issue.suggestedValue, edited: true }
            };
          } else {
            let newText = issue.suggestedValue || '';
            const origText = langData.text || '';
            if (issue.originalValue && origText.includes(issue.originalValue)) {
              if (issue.originalValue === origText) {
                newText = issue.suggestedValue || '';
              } else {
                newText = origText.replaceAll(issue.originalValue, issue.suggestedValue || '');
              }
            } else {
              newText = issue.suggestedValue || '';
            }
            
            chapterTranslations[blockIdx] = {
              ...current,
              [activeTargetLang]: { ...langData, text: newText, edited: true }
            };
          }

          nextTranslations[chapterStoryTxt] = chapterTranslations;
        });
      });

      return nextTranslations;
    });

    // 2. Batch update current loaded blocks
    setBlocks(prevUiBlocks => {
      let updatedUiBlocks = [...prevUiBlocks];

      issuesToFix.forEach(issue => {
        if (issue.suggestedValue === undefined) return;

        updatedUiBlocks = updatedUiBlocks.map(b => {
          const compoundId = `${selectedChapter?.storyTxt}::${b.id}`;
          if (issue.blockIds.includes(compoundId)) {
            const newContent = { ...b.content };
            const currentLangData = newContent[activeTargetLang] || { text: '' };

            let isNameIssue = false;
            if (issue.targetField) {
              isNameIssue = issue.targetField === 'name';
            } else {
              isNameIssue = issue.type === 'name_consistency';
              if (!isNameIssue && issue.originalValue && currentLangData.name === issue.originalValue && currentLangData.text !== issue.originalValue) {
                isNameIssue = true;
              }
            }

            if (isNameIssue) {
              newContent[activeTargetLang] = { ...currentLangData, name: issue.suggestedValue, edited: true };
            } else {
              let newText = issue.suggestedValue || '';
              const origText = currentLangData.text || '';
              if (issue.originalValue && origText.includes(issue.originalValue)) {
                if (issue.originalValue === origText) {
                  newText = issue.suggestedValue || '';
                } else {
                  newText = origText.replaceAll(issue.originalValue, issue.suggestedValue || '');
                }
              } else {
                newText = issue.suggestedValue || '';
              }
              newContent[activeTargetLang] = { ...currentLangData, text: newText, edited: true };
            }
            return { ...b, content: newContent };
          }
          return b;
        });
      });

      return updatedUiBlocks;
    });

    // 3. Batch update the dialogue selection in editor UI list
    setEditorDialogueData(prevData => {
      let updatedData = [...prevData];

      issuesToFix.forEach(issue => {
        if (issue.suggestedValue === undefined) return;

        updatedData = updatedData.map(item => {
          if (issue.blockIds.includes(item.id)) {
            let isNameIssue = false;
            if (issue.targetField) {
              isNameIssue = issue.targetField === 'name';
            } else {
              isNameIssue = issue.type === 'name_consistency';
              if (!isNameIssue && issue.originalValue && item.charTranslated === issue.originalValue) {
                isNameIssue = true;
              }
            }

            if (isNameIssue) {
              return { ...item, charTranslated: issue.suggestedValue || "" };
            } else {
              let newText = issue.suggestedValue || '';
              const origText = item.textTranslated || '';
              if (issue.originalValue && origText.includes(issue.originalValue)) {
                if (issue.originalValue === origText) {
                  newText = issue.suggestedValue || '';
                } else {
                  newText = origText.replaceAll(issue.originalValue, issue.suggestedValue || '');
                }
              } else {
                newText = issue.suggestedValue || '';
              }
              return { ...item, textTranslated: newText };
            }
          }
          return item;
        });
      });

      return updatedData;
    });

    // 4. Mark these issues as fixed
    const idsToMarkFixed = new Set(issuesToFix.map(i => i.id));
    setEditorIssues(prev => prev.map(i => idsToMarkFixed.has(i.id) ? { ...i, fixed: true } : i));
  };

  const applyEditorIssueFix = (issueId: string) => {
    const issue = editorIssues.find(i => i.id === issueId);
    if (!issue || issue.fixed) return;
    applyFixesBatch([issue]);
  };

  const handleSaveCustomSuggestion = (issueId: string, val: string) => {
    setEditorIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return { ...issue, suggestedValue: val };
      }
      return issue;
    }));
    setEditingIssueId(null);
  };

  const handleSelectIssue = (issue: EditorIssue) => {
    setSelectedIssueId(issue.id);
    setEditingIssueId(null);
    
    if (issue.blockIds && issue.blockIds.length > 0) {
      const firstBlock = issue.blockIds[0];
      const match = firstBlock.match(/^(.*)::(.*)$/);
      if (match) {
        const [, chapterTxt, blockId] = match;
        
        let needsWait = false;
        if (selectedChapter?.storyTxt !== chapterTxt) {
          const newChapter = selectedEpisode?.chapters.find(c => c.storyTxt === chapterTxt);
          if (newChapter) {
            setSelectedChapter(newChapter);
            needsWait = true;
          }
        }
        
        setTimeout(() => {
          const el = document.getElementById(`block-${blockId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-purple-900/40', 'transition-colors', 'duration-500');
            setTimeout(() => {
              el.classList.remove('bg-purple-900/40');
            }, 2000);
          }
        }, needsWait ? 300 : 100);
      }
    }
  };

  const applyAllEditorFixes = () => {
    const unfixed = editorIssues.filter(i => !i.fixed);
    if (unfixed.length === 0) return;
    applyFixesBatch(unfixed);
    alert(`Успешно применено авто-исправлений: ${unfixed.length}!`);
  };

  const translateChapterInBackground = async (
    ch: StoryChapter,
    lang: Language,
    apiKey: string,
    modelName: string,
    onProgress: (current: number, total: number) => void
  ) => {
    // 1. Fetch all required scripts for this chapter
    const scriptResults = await Promise.all(
      Array.from(new Set([sourceLang, ...referenceLangs, ...targetLangs])).map(async (l) => {
        try {
          const text = await fetchStoryScript(
            ch.storyTxt, 
            l, 
            !LANGUAGES.find(langObj => langObj.id === l)?.isOfficial,
            activeProfile === 'Default' ? 'none' : activeProfile
          );
          return { lang: l, text };
        } catch (e) {
          return { lang: l, text: '' };
        }
      })
    );

    const sourceResult = scriptResults.find(r => r.lang === sourceLang);
    const sourceText = sourceResult?.text || '';
    if (!sourceText.trim()) return;

    const parsedBlocks = parseTranslationBlocks(sourceText);
    const dialogueBlocks = parsedBlocks.filter(b => b.type === 'dialogue');
    if (dialogueBlocks.length === 0) return;

    // Build the final translation blocks for local mapping
    const finalBlocks: TranslationBlock[] = parsedBlocks.map((block, idx) => {
      const content: Record<string, { text: string, name?: string }> = {};
      
      const sourceMatch = block.originalText.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
      const sourceNameMatch = block.prefix.match(/name="([^"]+)"/);
      let blockSourceText = sourceMatch ? sourceMatch[2] : block.originalText;
      const sourceName = sourceNameMatch ? sourceNameMatch[1] : undefined;
      
      const optionsMatch = block.prefix.match(/options="([^"]+)"/);
      const subtitleMatch = block.prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
      const stickerMatch = block.prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);
      if (blockSourceText.trim() === '') {
        if (optionsMatch) blockSourceText = optionsMatch[1];
        else if (subtitleMatch) blockSourceText = subtitleMatch[1];
        else if (stickerMatch) blockSourceText = stickerMatch[1];
      }

      content[sourceLang] = { text: blockSourceText, name: sourceName };

      scriptResults.forEach(res => {
        if (res.lang === sourceLang) return;
        const lines = res.text.split(/\r?\n/);
        let text = '';
        let name: string | undefined = undefined;

        if (idx < lines.length) {
          const line = lines[idx];
          const match = line.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
          if (match) {
            const nameMatch = match[1].match(/name="([^"]+)"/);
            text = match[2];
            if (/\[delay\b/i.test(match[1])) {
              text = '';
            }
            name = nameMatch ? nameMatch[1] : undefined;
            
            const optMatch = match[1].match(/options="([^"]+)"/);
            const subMatch = match[1].match(/\[Subtitle[^\]]*text="([^"]+)"/i);
            const stickMatch = match[1].match(/\[Sticker[^\]]*text="([^"]+)"/i);
            if (text.trim() === '') {
              if (optMatch) text = optMatch[1];
              else if (subMatch) text = subMatch[1];
              else if (stickMatch) text = stickMatch[1];
            }
          } else {
            text = line;
          }
        }

        if (targetLangs.includes(res.lang)) {
          if (text === blockSourceText && name === sourceName) {
            text = '';
            name = undefined;
          }
        }

        content[res.lang] = { text, name };
      });

      // Apply local translations from storage or state
      const localTransOfChapter = allTranslations[ch.storyTxt]?.[idx];
      targetLangs.forEach(tLang => {
        const localData = localTransOfChapter?.[tLang];
        if (localData) {
          content[tLang] = {
            text: localData.text || content[tLang]?.text || '',
            name: localData.name || content[tLang]?.name || undefined
          };
        }
      });

      return {
        ...block,
        content
      };
    });

    setChapterStats(prev => ({
      ...prev,
      [ch.storyTxt]: dialogueBlocks.length
    }));

    const dynamicGlossary = finalBlocks
      .filter(b => b.content[sourceLang]?.name && b.content[lang]?.name)
      .reduce((acc, b) => {
        acc[b.content[sourceLang].name!] = b.content[lang].name!;
        return acc;
      }, {} as Record<string, string>);

    const glossary = {
      ...ARKNIGHTS_CANONICAL_GLOSSARY,
      ...dynamicGlossary
    };

    // Filter untranslated dialogue lines
    const untranslatedDialogue = finalBlocks.filter(b => b.type === 'dialogue' && !b.content[lang]?.text?.trim());
    if (untranslatedDialogue.length === 0) {
      onProgress(dialogueBlocks.length, dialogueBlocks.length);
      return;
    }

    const TARGET_BATCH_SIZE = 500;
    const SINGLE_BATCH_THRESHOLD = 500;
    const totalLinesToTranslate = untranslatedDialogue.length;
    
    const batches: TranslationBlock[][] = [];
    if (totalLinesToTranslate <= SINGLE_BATCH_THRESHOLD) {
      batches.push(untranslatedDialogue);
    } else {
      const numBatches = Math.ceil(totalLinesToTranslate / TARGET_BATCH_SIZE);
      const actualBatchSize = Math.ceil(totalLinesToTranslate / numBatches);
      for (let i = 0; i < totalLinesToTranslate; i += actualBatchSize) {
        batches.push(untranslatedDialogue.slice(i, i + actualBatchSize));
      }
    }

    let progressCount = dialogueBlocks.length - untranslatedDialogue.length;
    onProgress(progressCount, dialogueBlocks.length);

    const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
    const toLabel = LANGUAGES.find(l => l.id === lang)?.label || lang;

    for (let i = 0; i < batches.length; i++) {
      if (cancelTranslationRef.current) break;

      const batch = batches[i];
      const firstBlockIndex = finalBlocks.findIndex(b => b.id === batch[0].id);
      const context = finalBlocks.slice(Math.max(0, firstBlockIndex - 15), Math.max(0, firstBlockIndex)).map(b => ({
        character: b.content[sourceLang]?.name || "Narrator/System",
        text: b.content[lang]?.text || b.content[sourceLang]?.text || ""
      }));

      // Call Gemini for this background batch
      const baseInstruction = additionalPromptText.trim()
        ? `${DEFAULT_SYSTEM_PROMPT}\n\nADDITIONAL TRANSLATOR INSTRUCTIONS:\n${additionalPromptText}`
        : DEFAULT_SYSTEM_PROMPT;
      const systemInstruction = baseInstruction
        .replace(/{fromLabel}/g, fromLabel)
        .replace(/{toLabel}/g, toLabel)
        .replace(/\${fromLabel}/g, fromLabel)
        .replace(/\${toLabel}/g, toLabel);

      const promptPayload = {
        glossary,
        context,
        toTranslate: batch.map(b => ({
          id: b.id,
          character: b.content[sourceLang]?.name || "Narrator/System",
          text: b.content[sourceLang]?.text || ""
        }))
      };

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({
          customApiKey: apiKey || undefined,
          model: modelName,
          contents: JSON.stringify(promptPayload),
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                  translatedCharacter: { type: Type.STRING }
                },
                required: ["id", "translatedText", "translatedCharacter"]
              }
            },
            systemInstruction,
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed secure background translate query");
      }

      const response = await res.json();

      if (!response.text) {
        throw new Error("Empty response from Gemini during background translation");
      }

      const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsedResults = JSON.parse(cleanedText);
      if (!Array.isArray(parsedResults)) {
        throw new Error("Invalid response format from Gemini: expected array");
      }

      // Save results in allTranslations state
      setAllTranslations(prev => {
        const chapterTranslations = { ...(prev[ch.storyTxt] || {}) };
        
        parsedResults.forEach(res => {
          if (!res || res.id === null || res.id === undefined) return;
          const rawId = String(res.id).trim();
          const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
          const blockIdx = finalBlocks.findIndex(b => b.id === targetId);
          
          if (blockIdx !== -1) {
            const block = finalBlocks[blockIdx];
            const current = chapterTranslations[blockIdx] || {};
            const langData = current[lang] || {};
            
            chapterTranslations[blockIdx] = {
              ...current,
              [lang]: { ...langData, text: res.translatedText }
            };

            if (block.content[sourceLang]?.name && res.translatedCharacter) {
              const charSourceName = block.content[sourceLang].name;
              finalBlocks.forEach((b, bIdx) => {
                if (b.content[sourceLang]?.name === charSourceName) {
                  const bCurrent = chapterTranslations[bIdx] || {};
                  const bLangData = bCurrent[lang] || {};
                  chapterTranslations[bIdx] = {
                    ...bCurrent,
                    [lang]: { ...bLangData, name: res.translatedCharacter }
                  };
                }
              });
            }
          }
        });

        // Update active UI blocks if currently opened
        if (selectedChapter?.storyTxt === ch.storyTxt) {
          setBlocks(prevUiBlocks => {
            const nextUiBlocks = [...prevUiBlocks];
            parsedResults.forEach(res => {
              if (!res || res.id === null || res.id === undefined) return;
              const rawId = String(res.id).trim();
              const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
              const uiIdx = nextUiBlocks.findIndex(b => b.id === targetId);
              if (uiIdx !== -1) {
                const uiBlock = nextUiBlocks[uiIdx];
                const newContent = { ...uiBlock.content };
                newContent[lang] = { ...newContent[lang], text: res.translatedText };
                nextUiBlocks[uiIdx] = { ...uiBlock, content: newContent };

                if (uiBlock.content[sourceLang]?.name && res.translatedCharacter) {
                  const charSourceName = uiBlock.content[sourceLang].name;
                  nextUiBlocks.forEach((b, bIdx) => {
                    if (b.content[sourceLang]?.name === charSourceName) {
                      const bContent = { ...b.content };
                      bContent[lang] = { ...bContent[lang], name: res.translatedCharacter };
                      nextUiBlocks[bIdx] = { ...b, content: bContent };
                    }
                  });
                }
              }
            });
            return nextUiBlocks;
          });
        }

        return { ...prev, [ch.storyTxt]: chapterTranslations };
      });

      progressCount += batch.length;
      onProgress(progressCount, dialogueBlocks.length);

      if (batches.length > 1 && i < batches.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const handleGeminiTranslateEpisode = async (lang: Language = activeTargetLang) => {
    if (!userApiKey && (!discordUser || !isDiscordMember)) {
      alert("Вам необходимо авторизоваться в Discord и быть участником сервера, чтобы использовать перевод от ИИ.");
      return;
    }
    
    if (!selectedEpisode || isTranslatingEpisode) return;

    if (!userApiKey && (!discordUser || !isDiscordMember)) {
      alert("Ключ Gemini API не указан. Пожалуйста, введите свой ключ API или войдите через Discord.");
      return;
    }

    const apiKey = userApiKey || '';

    const { chapters } = selectedEpisode;
    if (!chapters || chapters.length === 0) {
      alert("В выбранном эпизоде нет глав.");
      return;
    }

    if (!window.confirm(`Вы действительно хотите перевести весь эпизод "${selectedEpisode.name || selectedEpisode.id}" с помощью Gemini? Это может занять несколько минут.`)) {
      return;
    }

    setIsTranslatingEpisode(true);
    setErrorMessage(null);
    cancelTranslationRef.current = false;

    try {
      const CONCURRENCY_LIMIT = 4; // Translating 4 chapters simultaneously
      let completedChapters = 0;
      
      setEpisodeProgress({
        completedChapters: 0,
        totalChapters: chapters.length,
        progressMap: {}
      });

      const executeWithConcurrency = async () => {
        const queue = [...chapters];
        const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
          while (queue.length > 0 && !cancelTranslationRef.current) {
            const ch = queue.shift();
            if (!ch) continue;
            
            const cleanName = getCleanChapterName(ch.storyTxt, selectedEpisode?.id);
            setEpisodeProgress(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                progressMap: {
                  ...prev.progressMap,
                  [cleanName]: { current: 0, total: 100 }
                }
              };
            });

            try {
              await translateChapterInBackground(
                ch,
                lang,
                apiKey,
                selectedModel,
                (current, total) => {
                  setEpisodeProgress(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      progressMap: {
                        ...prev.progressMap,
                        [cleanName]: { current, total }
                      }
                    };
                  });
                }
              );
            } catch (err) {
              console.error(`Error translating chapter ${cleanName}:`, err);
            }

            completedChapters++;
            setEpisodeProgress(prev => {
              if (!prev) return prev;
              const newMap = { ...prev.progressMap };
              delete newMap[cleanName]; // Remove from active display
              return {
                ...prev,
                completedChapters,
                progressMap: newMap
              };
            });
          }
        });
        
        await Promise.all(workers);
      };

      await executeWithConcurrency();
      
      if (!cancelTranslationRef.current) {
        alert("Перевод всего эпизода успешно завершен!");
      }
    } catch (error: any) {
      console.error("Episode translation failed:", error);
      if (error?.message?.includes("QUOTA") || error?.message?.includes("429")) {
        setErrorMessage("Превышена квота или лимиты запросов Gemini API. Перевод остановлен.");
      } else {
        setErrorMessage("Произошла ошибка при переводе эпизода. Проверьте консоль.");
      }
    } finally {
      setIsTranslatingEpisode(false);
      setEpisodeProgress(null);
    }
  };

  const generateExportText = (lang: Language = activeTargetLang) => {
    const lines = blocks.map(b => {
      if (b.type === 'dialogue') {
        let finalPrefix = b.prefix;
        const sourceName = b.content[sourceLang]?.name;
        const targetName = b.content[lang]?.name;
        if (sourceName && targetName) {
          finalPrefix = finalPrefix.replace(`name="${sourceName}"`, `name="${targetName}"`);
        }
        
        const optionsMatch = b.originalText.match(/options="([^"]+)"/);
        const subtitleMatch = b.originalText.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
        const stickerMatch = b.originalText.match(/\[Sticker[^\]]*text="([^"]+)"/i);
        const sourceMatch = b.originalText.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
        
        // If it was an options-only line (like Decision)
        if (optionsMatch && sourceMatch && sourceMatch[2].trim() === '') {
           const translatedOptions = b.content[lang]?.text || b.content[sourceLang]?.text || optionsMatch[1];
           finalPrefix = finalPrefix.replace(`options="${optionsMatch[1]}"`, `options="${translatedOptions}"`);
           return finalPrefix;
        }

        // If it was a subtitle line
        if (subtitleMatch && sourceMatch && sourceMatch[2].trim() === '') {
           const translatedText = b.content[lang]?.text || b.content[sourceLang]?.text || subtitleMatch[1];
           finalPrefix = finalPrefix.replace(`text="${subtitleMatch[1]}"`, `text="${translatedText}"`);
           return finalPrefix;
        }

        // If it was a sticker line
        if (stickerMatch && sourceMatch && sourceMatch[2].trim() === '') {
           const translatedText = b.content[lang]?.text || b.content[sourceLang]?.text || stickerMatch[1];
           finalPrefix = finalPrefix.replace(`text="${stickerMatch[1]}"`, `text="${translatedText}"`);
           return finalPrefix;
        }

        // If it has text after prefix
        return `${finalPrefix}${b.content[lang]?.text || b.content[sourceLang]?.text || ''}`;
      }
      return b.originalText;
    });

    if (activeProfile !== 'Default') {
      lines.unshift(`// Translated by: ${activeProfile}`);
    }

    return lines.join('\n');
  };

  const handleCopy = (lang: Language = activeTargetLang) => {
    const text = generateExportText(lang);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCSVData = (lang: Language = activeTargetLang) => {
    if (!selectedChapter || !selectedEpisode) return null;

    const refLang = referenceLangs[0] || 'en_US';

    // 1. Metadata
    const metadataRows = [
      { 'ID': '__translator__', 'Character': '', 'Original Text': 'Translator', 'Reference': '', 'Translation': activeProfile },
      { 'ID': '__language__', 'Character': '', 'Original Text': 'Language', 'Reference': refLang, 'Translation': lang },
    ];

    // 2. Characters
    const uniqueCharacters = Array.from(new Set(
      blocks.filter(b => b.type === 'dialogue' && b.content[sourceLang]?.name)
            .map(b => b.content[sourceLang].name!)
    ));

    const characterRows = uniqueCharacters.map((name, index) => {
      // Find the first block with this name to get its current translation
      const firstBlock = blocks.find(b => b.content[sourceLang]?.name === name);
      return {
        'ID': `char-${index + 1}`,
        'Character': name,
        'Original Text': name,
        'Reference': firstBlock?.content[refLang]?.name || '',
        'Translation': firstBlock?.content[lang]?.name || ''
      };
    });

    // 3. Dialogue
    const dialogueRows = blocks
      .filter(b => b.type === 'dialogue')
      .map(b => ({
        'ID': b.id,
        'Character': b.content[sourceLang]?.name || '',
        'Original Text': b.content[sourceLang]?.text || '',
        'Reference': b.content[refLang]?.text || '',
        'Translation': b.content[lang]?.text || ''
      }));

    return [
      ...metadataRows,
      ...characterRows,
      { 'ID': '', 'Character': '', 'Original Text': '', 'Reference': '', 'Translation': '' }, // Blank row
      ...dialogueRows
    ];
  };

  const handleExportCSV = () => {
    const data = generateCSVData(activeTargetLang);
    if (!data || !selectedChapter) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const baseName = selectedChapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'translation';
    const safeTranslatorName = activeProfile.replace(/[^a-z0-9а-яё]/gi, '_');
    const fileName = `${baseName}_${safeTranslatorName}.csv`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChapter) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const jsonData = results.data as any[];
          
          // Try to detect language from metadata
          const langRow = jsonData.find(r => r['ID'] === '__language__');
          const importLang = (langRow?.['Translation'] as Language) || activeTargetLang;

          if (!targetLangs.includes(importLang)) {
            setTargetLangs(prev => [...prev, importLang]);
          }
          setActiveTargetLang(importLang);

          const newTranslations = { ...allTranslations };
          const chapterKey = selectedChapter.storyTxt;
          if (!newTranslations[chapterKey]) newTranslations[chapterKey] = {};

          const updatedBlocks = [...blocks];

          jsonData.forEach(row => {
            const id = row['ID']?.toString();
            const translation = row['Translation']?.toString() || '';

            if (!id) return;

            if (id.startsWith('char-')) {
              const charName = row['Character']?.toString() || '';
              if (charName && translation) {
                updatedBlocks.forEach((b, idx) => {
                  if (b.content[sourceLang]?.name === charName) {
                    if (!b.content[importLang]) b.content[importLang] = { text: '' };
                    b.content[importLang].name = translation;
                    
                    if (!newTranslations[chapterKey][idx]) newTranslations[chapterKey][idx] = {};
                    newTranslations[chapterKey][idx][importLang] = { 
                      ...(newTranslations[chapterKey][idx][importLang] || { text: '' }), 
                      name: translation 
                    };
                  }
                });
              }
            } else if (id.startsWith('line-')) {
              const index = updatedBlocks.findIndex(b => b.id === id);
              if (index !== -1) {
                if (!updatedBlocks[index].content[importLang]) updatedBlocks[index].content[importLang] = { text: '' };
                updatedBlocks[index].content[importLang].text = translation;
                
                if (!newTranslations[chapterKey][index]) newTranslations[chapterKey][index] = {};
                newTranslations[chapterKey][index][importLang] = { 
                  ...(newTranslations[chapterKey][index][importLang] || { text: '' }), 
                  text: translation 
                };
              }
            }
          });

          setBlocks(updatedBlocks);
          setAllTranslations(newTranslations);
          alert(`CSV успешно импортирован для ${importLang}!`);
        } catch (error) {
          console.error('CSV import error:', error);
          alert('Не удалось импортировать CSV. Пожалуйста, проверьте формат файла.');
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Не удалось прочитать CSV файл.');
      }
    });

    e.target.value = '';
  };

  const generateEpisodeCSVsData = async (lang: Language = activeTargetLang): Promise<Array<{ filename: string, csvData: any[] }> | null> => {
    if (!selectedEpisode) return null;

    const refLang = referenceLangs[0] || 'en_US';
    const files: Array<{ filename: string, csvData: any[] }> = [];

    for (let i = 0; i < selectedEpisode.chapters.length; i++) {
      const ch = selectedEpisode.chapters[i];
      const chFilename = ch.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || ch.storyTxt;

      const chapterRows: any[] = [];
      
      // Top Metadata
      chapterRows.push({ 'ID': '__translator__', 'Character': '', 'Original Text': 'Translator', 'Reference': '', 'Translation': activeProfile });
      chapterRows.push({ 'ID': '__language__', 'Character': '', 'Original Text': 'Language', 'Reference': refLang, 'Translation': lang });
      chapterRows.push({ 'ID': '__episode__', 'Character': '', 'Original Text': 'Episode ID', 'Reference': '', 'Translation': selectedEpisode.id });
      chapterRows.push({ 'ID': '__chapter__', 'Character': '', 'Original Text': 'Chapter Name', 'Reference': ch.storyTxt, 'Translation': ch.name || chFilename });
      chapterRows.push({ 'ID': '', 'Character': '', 'Original Text': '', 'Reference': '', 'Translation': '' });

      // Let's get the story script strings
      try {
        const sourceText = await fetchStoryScript(
          ch.storyTxt, 
          sourceLang, 
          !LANGUAGES.find(l => l.id === sourceLang)?.isOfficial,
          activeProfile === 'Default' ? 'none' : activeProfile
        );
        const parsed = parseTranslationBlocks(sourceText);

        // Fetch reference text if possible (otherwise standard fallback)
        let refText = '';
        try {
          refText = await fetchStoryScript(
            ch.storyTxt,
            refLang,
            !LANGUAGES.find(l => l.id === refLang)?.isOfficial,
            activeProfile === 'Default' ? 'none' : activeProfile
          );
        } catch (err) {}
        const refLines = refText ? refText.split(/\r?\n/) : [];

        // Load local translations for this chapter
        const localTranslations = allTranslations;

        // Unique characters in this chapter
        const dialogueBlocks = parsed.filter(b => b.type === 'dialogue');
        const uniqueCharacters = Array.from(new Set(
          dialogueBlocks.filter(b => b.content[sourceLang]?.name).map(b => b.content[sourceLang].name!)
        ));

        // Add character translations for this chapter
        uniqueCharacters.forEach((name, charIdx) => {
          let charTranslated = '';
          
          const firstBlockObjIdx = parsed.findIndex(b => b.content[sourceLang]?.name === name);
          if (firstBlockObjIdx !== -1) {
            const localCharData = localTranslations[ch.storyTxt]?.[firstBlockObjIdx]?.[lang];
            if (localCharData?.name) {
              charTranslated = localCharData.name;
            }
          }

          let charRef = '';
          if (firstBlockObjIdx !== -1 && firstBlockObjIdx < refLines.length) {
            const match = refLines[firstBlockObjIdx].match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
            if (match) {
              const nameMatch = match[1].match(/name="([^"]+)"/);
              if (nameMatch) charRef = nameMatch[1];
            }
          }

          chapterRows.push({
            'ID': `char-${charIdx + 1}`,
            'Character': name,
            'Original Text': name,
            'Reference': charRef,
            'Translation': charTranslated
          });
        });

        chapterRows.push({ 'ID': '', 'Character': '', 'Original Text': '', 'Reference': '', 'Translation': '' });

        // Add dialogue rows
        dialogueBlocks.forEach((block) => {
          const sourceMatch = block.originalText.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
          const sourceNameMatch = block.prefix.match(/name="([^"]+)"/);
          let sText = sourceMatch ? sourceMatch[2] : block.originalText;
          const sName = sourceNameMatch ? sourceNameMatch[1] : undefined;
          
          const optionsMatch = block.prefix.match(/options="([^"]+)"/);
          const subtitleMatch = block.prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
          const stickerMatch = block.prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);
          if (sText.trim() === '') {
            if (optionsMatch) sText = optionsMatch[1];
            else if (subtitleMatch) sText = subtitleMatch[1];
            else if (stickerMatch) sText = stickerMatch[1];
          }

          let rText = '';
          const originalBlockIdx = parsed.findIndex(b => b.id === block.id);
          if (originalBlockIdx !== -1 && originalBlockIdx < refLines.length) {
            const match = refLines[originalBlockIdx].match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
            if (match) {
              rText = match[2];
              if (/\[delay\b/i.test(match[1])) rText = '';
              const optMatch = match[1].match(/options="([^"]+)"/);
              const subMatch = match[1].match(/\[Subtitle[^\]]*text="([^"]+)"/i);
              const stickMatch = match[1].match(/\[Sticker[^\]]*text="([^"]+)"/i);
              if (rText.trim() === '') {
                if (optMatch) rText = optMatch[1];
                else if (subMatch) rText = subMatch[1];
                else if (stickMatch) rText = stickMatch[1];
              }
            } else {
              rText = refLines[originalBlockIdx];
            }
          }

          const localData = localTranslations[ch.storyTxt]?.[originalBlockIdx]?.[lang];
          const tText = localData?.text || '';

          chapterRows.push({
            'ID': block.id,
            'Character': sName || '',
            'Original Text': sText || '',
            'Reference': rText || '',
            'Translation': tText || ''
          });
        });

        files.push({ filename: chFilename, csvData: chapterRows });
      } catch (err) {
        console.error(`Failed to fetch story lines for chapter ${ch.storyTxt} during episode submission:`, err);
      }
    }

    return files;
  };

  const handleSubmitToDiscord = async () => {
    if (!SUBMISSION_WEBHOOK_URL) return;

    if (discordUser && activeProfile !== discordUser.username) {
      alert(`Отправка перевода возможна только под вашим Discord-именем (${discordUser.username}).\n\nПожалуйста, переименуйте текущий профиль или переключитесь на нужный перед отправкой.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const safeTranslatorName = activeProfile.replace(/[^a-z0-9а-яё]/gi, '_');
      
      let filesToUpload: Array<{ file: File, payloadContent: string }> = [];

      if (exportScope === 'chapter') {
        if (!selectedChapter) {
          alert("Пожалуйста, сначала выберите главу для отправки.");
          setIsSubmitting(false);
          return;
        }

        const dialogueBlocks = blocks.filter(b => b.type === 'dialogue');
        const totalDialogue = dialogueBlocks.length;
        const translatedDialogue = dialogueBlocks.filter(b => b.content[activeTargetLang]?.text?.trim()).length;

        if (totalDialogue === 0) {
          alert("Вы пытаетесь отправить главу, в которой нет строк диалогов.");
          setIsSubmitting(false);
          return;
        }

        if (translatedDialogue === 0) {
          alert("Эта глава вообще не переведена! Пожалуйста, переведите хотя бы несколько строк перед отправкой.");
          setIsSubmitting(false);
          return;
        }

        if (translatedDialogue < totalDialogue) {
          const untranslatedBlocks = dialogueBlocks.filter(b => !b.content[activeTargetLang]?.text?.trim());
          const untranslatedExamples = untranslatedBlocks.slice(0, 3).map(b => b.content[sourceLang]?.text || '').filter(Boolean).map(text => `"${text}"`).join('\n- ');
          
          const confirmSubmit = window.confirm(
            `Внимание: глава переведена не полностью!\nПереведено ${translatedDialogue} из ${totalDialogue} строк (${Math.round(translatedDialogue / totalDialogue * 100)}%).\n\nПримеры непереведенных строк:\n- ${untranslatedExamples}\n\nВы уверены, что хотите отправить незавершенный перевод?`
          );
          if (!confirmSubmit) {
            setIsSubmitting(false);
            return;
          }
        }

        // Use original filename from storyTxt
        const originalFileName = selectedChapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'chapter';
        const baseFileName = `${originalFileName}_${safeTranslatorName}`;
        
        const csvData = generateCSVData(activeTargetLang);
        if (!csvData || csvData.length === 0) throw new Error("No data to submit");
        
        const csvString = Papa.unparse(csvData);
        const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const csvFile = new File([csvBlob], `${baseFileName}.csv`);
        const payloadContent = `🚀 **New Translation Submission (Chapter)**\n**Translator:** ${activeProfile}${discordUser ? ` (<@${discordUser.id}>)` : ''}\n**Episode:** ${selectedEpisode?.id || 'Unknown'}\n**Chapter:** ${selectedChapter.storyTxt}\n**Language:** ${LANGUAGES.find(l => l.id === activeTargetLang)?.label}`;
        filesToUpload.push({ file: csvFile, payloadContent });
      } else {
        if (!selectedEpisode) {
          alert("Пожалуйста, выберите эпизод для отправки.");
          setIsSubmitting(false);
          return;
        }

        const tempCsvDataArray = await generateEpisodeCSVsData(activeTargetLang);
        let totalDialogueRows = 0;
        let translatedDialogueRows = 0;
        let untranslatedEpisodeExamples: string[] = [];
        
        if (tempCsvDataArray) {
          tempCsvDataArray.forEach(ch => {
            ch.csvData.forEach(row => {
              if (row.ID && !row.ID.startsWith('__') && !row.ID.startsWith('char-') && row.ID.trim() !== '') {
                totalDialogueRows++;
                if (row.Translation && row.Translation.trim() !== '') {
                  translatedDialogueRows++;
                } else {
                  if (untranslatedEpisodeExamples.length < 3) {
                    const originalText = row['Original Text'] || row.Reference || 'Unknown';
                    untranslatedEpisodeExamples.push(`[${ch.filename}] "${originalText}"`);
                  }
                }
              }
            });
          });
        }

        if (totalDialogueRows === 0) {
          alert("Вы пытаетесь отправить эпизод, в котором нет строк диалогов.");
          setIsSubmitting(false);
          return;
        }

        if (translatedDialogueRows === 0) {
          alert("Этот эпизод вообще не переведен! Пожалуйста, переведите хотя бы несколько строк перед отправкой.");
          setIsSubmitting(false);
          return;
        }

        if (translatedDialogueRows < totalDialogueRows) {
          const examplesText = untranslatedEpisodeExamples.join('\n- ');
          const confirmSubmit = window.confirm(
            `Внимание: эпизод переведен не полностью!\nПереведено ${translatedDialogueRows} из ${totalDialogueRows} строк во всех главах (${Math.round(translatedDialogueRows / totalDialogueRows * 100)}%).\n\nПримеры непереведенных строк:\n- ${examplesText}\n\nВы уверены, что хотите отправить незавершенный эпизод?`
          );
          if (!confirmSubmit) {
            setIsSubmitting(false);
            return;
          }
        }

        if (!tempCsvDataArray || tempCsvDataArray.length === 0) throw new Error("No data to submit");

        const filesWithContent = tempCsvDataArray.filter(ch => ch.csvData.length > 0);
        filesWithContent.forEach((chData, index) => {
          const csvString = Papa.unparse(chData.csvData);
          const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
          const csvFile = new File([csvBlob], `${chData.filename}_${safeTranslatorName}.csv`);
          const payloadContent = `👑 **New Translation Submission (Entire Episode - part ${index + 1}/${filesWithContent.length})**\n**Translator:** ${activeProfile}${discordUser ? ` (<@${discordUser.id}>)` : ''}\n**Episode:** ${selectedEpisode.id} (${selectedEpisode.chapters.length} chapters)\n**Chapter:** ${chData.filename}\n**Language:** ${LANGUAGES.find(l => l.id === activeTargetLang)?.label}`;
          filesToUpload.push({ file: csvFile, payloadContent });
        });
      }

      if (filesToUpload.length === 0) throw new Error("No data to submit");

      // Send each file as a separate message
      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const formData = new FormData();
        const payload = {
          content: item.payloadContent,
          username: "ZOOT"
        };
        formData.append('payload_json', JSON.stringify(payload));
        formData.append('file0', item.file);

        const response = await fetch(SUBMISSION_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
           throw new Error('Failed to submit to Discord');
        }
        
        // Wait 1 second between requests to avoid Discord rate-limits
        if (i + 1 < filesToUpload.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setSubmitStatus('success');
      setTimeout(() => {
        setSubmitStatus(prev => prev === 'success' ? 'idle' : prev);
      }, 3000);
    } catch (error) {
      console.error('Discord submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white font-sans overflow-hidden select-none">
      {/* Unified Top Toolbar containing all selectors and action buttons in a single row */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0a] gap-3 shrink-0 z-20 overflow-x-auto overflow-y-hidden scrollbar-none select-none">
        
        {/* Left Side: Navigation & Core selectors */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors"
            title="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Translation Mode Badge */}
          <div className="flex items-center bg-white/5 px-2.5 py-1 rounded border border-white/10 shrink-0 text-[10px] font-bold uppercase tracking-wider text-white gap-1.5 bg-blue-600/30 border-blue-500/30">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Перевод сюжетов</span>
          </div>

          {/* Stories Mode Info Badge */}
          {translationMode === 'STORIES' && selectedEpisode && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1 rounded-sm">
                Эпизод: <strong className="text-white/85 font-bold font-sans ml-1">{selectedEpisode.name || selectedEpisode.id}</strong>
              </span>
            </div>
          )}

          {/* Dossiers Mode Info Badge */}
          {translationMode === 'DOSSIERS' && selectedOperator && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1 rounded-sm flex items-center gap-1.5">
                Оперативник: <strong className="text-white/85 font-bold font-sans ml-1">{selectedOperator.displayName || selectedOperator.nameEn}</strong>
              </span>
            </div>
          )}
        </div>


        {/* Right Side: Gemini, Actions, Discord / Profile */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          
          {/* Gemini Action Button */}
          <button
            onClick={() => setShowAiMenu(!showAiMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/35 hover:to-indigo-500/35 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-sm transition-all text-[10px] font-bold uppercase tracking-wider relative overflow-hidden shadow-lg group shrink-0"
            title="Gemini: Настройки, Промпты, Перевод, ИИ-Редактор"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:animate-pulse" />
            <span>Gemini</span>
          </button>

          {/* Action & CSV buttons (moved from lower bar so everything is in one row) */}
          {selectedChapter && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => {
                  const win = window.open('about:blank', '_blank');
                  if (win) {
                    win.document.write(`
                      <html>
                        <head>
                          <title>Original Script: ${selectedChapter.storyTxt}</title>
                          <style>
                            body { font-family: monospace; white-space: pre-wrap; padding: 20px; background: white; color: black; }
                          </style>
                        </head>
                        <body>${originalScriptText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
                      </html>
                    `);
                    win.document.close();
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                title="Скрипт"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white/60" /> 
                <span className="hidden xl:inline">Скрипт</span>
              </button>

              {onTestTranslation && (
                <button 
                  onClick={() => onTestTranslation(selectedChapter!, generateExportText())}
                  disabled={!selectedChapter || blocks.length === 0}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                  title="Тест"
                >
                  <Play className="w-3.5 h-3.5" /> 
                  <span className="hidden xl:inline">Тест</span>
                </button>
              )}

              <button 
                onClick={() => setShowExportModal(true)}
                disabled={!selectedChapter || blocks.length === 0}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30 disabled:opacity-30 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                title="Отправить"
              >
                <Check className="w-3.5 h-3.5" /> 
                <span className="hidden xl:inline">Отправить</span>
              </button>

              <div className="h-5 w-px bg-white/10 mx-0.5 shrink-0" />

              <button
                onClick={handleExportCSV}
                disabled={!selectedChapter || blocks.length === 0}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors disabled:opacity-30 text-[10px] font-bold uppercase tracking-wider"
                title="Экспорт CSV"
              >
                <Download className="w-3.5 h-3.5 text-white/60" /> 
                <span className="hidden xl:inline">Экспорт</span>
              </button>
              
              <label 
                className={`flex items-center gap-1.5 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-wider ${!selectedChapter ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Импорт CSV"
              >
                <Upload className="w-3.5 h-3.5 text-white/60" /> 
                <span className="hidden xl:inline">Импорт</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={!selectedChapter} />
              </label>
            </div>
          )}

          {availableTranslators.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-[#4ade80]/80 font-bold">Доступен перевод от:</span>
              <div className="flex items-center gap-1">
                {availableTranslators.map(t => (
                  <button
                    key={t}
                    onClick={() => handleImportTranslatorTranslation(t)}
                    disabled={isImportingTranslator === t}
                    className="px-1.5 py-1 rounded-sm text-[8px] font-black tracking-wider transition-all border bg-white/5 border-white/5 text-white/50 hover:bg-[#4ade80]/15 hover:border-[#4ade80]/30 hover:text-[#4ade80] disabled:opacity-50 flex items-center gap-1"
                    title={`Импортировать все главы от ${t} в текущий профиль`}
                  >
                    {isImportingTranslator === t ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-[#4ade80]" />
                    ) : null}
                    <span>{t}</span>
                    {isAITranslator(t) && (
                      <span className="text-[6.5px] font-bold text-purple-300 bg-purple-500/20 px-1 rounded border border-purple-500/30">
                        Нейроперевод
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="h-6 w-px bg-white/10 mx-1 shrink-0" />

          {/* Discord & Profile */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCheckingDiscord ? (
              <div className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm">
                <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
              </div>
            ) : discordUser ? (
              <div className="flex items-center gap-1.5 bg-white/5 pl-1 pr-2 py-1 border border-white/10 rounded-sm">
                {discordUser.avatar ? (
                  <img src={discordUser.avatar} alt={discordUser.username} className="w-5 h-5 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-2.5 h-2.5 text-white/40" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-white max-w-[70px] truncate">{discordUser.username}</span>
                <button onClick={handleDiscordLogout} className="text-[8px] text-red-400/60 hover:text-red-400 uppercase font-bold ml-1">Выйти</button>
              </div>
            ) : (
              <button 
                onClick={handleDiscordLogin}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-wider"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Войти
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {translationMode === 'DOSSIERS' ? (
          !selectedOperator ? (
            /* Quick Operator Picker Grid */
            <div className="flex-1 flex flex-col items-center justify-start p-6 text-white/40 bg-[#0a0a0a] overflow-y-auto custom-scrollbar">
              <User className="w-12 h-12 mb-3 opacity-40 text-blue-400" />
              <h3 className="text-base font-bold uppercase tracking-widest text-white/80 mb-1">
                Выберите оперативника для перевода досье
              </h3>
              <p className="text-xs text-white/40 max-w-md text-center mb-5">
                Переводите медицинские, боевые и архивные записи оперативников Arknights с помощью ИИ Gemini и сохраняйте локально.
              </p>
              
              {/* Search & Counter Toolbar */}
              <div className="w-full max-w-5xl flex items-center justify-between gap-3 mb-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    value={operatorSearchQuery}
                    onChange={(e) => setOperatorSearchQuery(e.target.value)}
                    placeholder="Поиск по имени или ID..."
                    className="w-full bg-zinc-900/90 border border-white/10 focus:border-blue-400/80 rounded-sm pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/30 font-mono outline-none"
                  />
                  {operatorSearchQuery && (
                    <button
                      onClick={() => setOperatorSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-sm text-xs font-mono">
                  <span className="text-white/60 text-[11px] uppercase font-bold tracking-wider">Всего:</span>
                  <span className="text-blue-400 font-bold font-mono">
                    {operators.filter(op => {
                      if (!operatorSearchQuery) return true;
                      const q = operatorSearchQuery.toLowerCase();
                      return (
                        op.nameEn.toLowerCase().includes(q) ||
                        (op.displayName && op.displayName.toLowerCase().includes(q)) ||
                        (op.nameRu && op.nameRu.toLowerCase().includes(q)) ||
                        op.id.toLowerCase().includes(q)
                      );
                    }).length}
                    {operatorSearchQuery && (
                      <span className="text-white/40 font-normal"> / {operators.length}</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-3 bg-white/5 border border-white/10 rounded-sm">
                {operators
                  .filter(op => {
                    if (!operatorSearchQuery) return true;
                    const q = operatorSearchQuery.toLowerCase();
                    return (
                      op.nameEn.toLowerCase().includes(q) ||
                      (op.displayName && op.displayName.toLowerCase().includes(q)) ||
                      (op.nameRu && op.nameRu.toLowerCase().includes(q)) ||
                      op.id.toLowerCase().includes(q)
                    );
                  })
                  .map(op => (
                    <button
                      key={op.id}
                      onClick={() => {
                        setSelectedOperator(op);
                        setSelectedSectionIdx(0);
                      }}
                      className="p-3 bg-zinc-900/80 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 rounded-sm transition-all flex flex-col items-center gap-2 group text-left"
                    >
                      <div className="w-14 h-14 rounded-sm overflow-hidden bg-black/60 border border-white/10 relative shrink-0">
                        {op.avatarUrl ? (
                          <img src={op.avatarUrl} alt={op.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 font-mono font-bold text-xs">
                            {op.id}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center text-center w-full min-w-0">
                        <span className="text-[11px] font-bold text-white group-hover:text-blue-300 truncate w-full">
                          {op.displayName || op.nameEn}
                        </span>
                        <span className="text-[9px] font-mono text-white/40 uppercase">
                          {op.id}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            /* Active Operator Dossier Workspace */
            <div className="flex-1 flex flex-col bg-[#0d0d0d] overflow-hidden min-h-0">
              {/* Main Workspace Area */}
              <div className="flex-1 flex flex-col bg-[#0f0f0f] overflow-y-auto custom-scrollbar p-4 md:p-6 min-w-0">
                {activeHandbookSections[selectedSectionIdx] ? (
                  <div className="max-w-4xl mx-auto w-full flex flex-col gap-5">
                    
                    {/* Header Bar */}
                    <div className="p-4 bg-zinc-900/90 border border-white/10 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-sm overflow-hidden bg-black border border-white/20 shrink-0 relative shadow-md">
                          {selectedOperator.avatarUrl ? (
                            <img src={selectedOperator.avatarUrl} alt={selectedOperator.nameEn} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono font-bold text-xs text-white/30">
                              {selectedOperator.id}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xs text-[9px] font-mono font-bold uppercase">
                              Запись #{selectedSectionIdx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-white/40">
                              {dossierTranslationsMap[selectedSectionIdx]?.isManual 
                                ? 'Ручной сохранённый перевод' 
                                : dossierTranslationsMap[selectedSectionIdx]?.translatedText
                                ? 'Переведено нейросетью Gemini'
                                : 'Оригинальный текст без перевода'}
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                            <span>{selectedOperator.displayName || selectedOperator.nameEn}</span>
                            <span className="text-white/30 font-normal">/</span>
                            <span className="text-blue-300 font-bold">{editingTitle || activeHandbookSections[selectedSectionIdx].title || activeHandbookSections[selectedSectionIdx].originalTitle}</span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setShowDossierModalPreview(true)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                          title="Просмотреть как выглядит досье в игре"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Просмотр в игре</span>
                        </button>

                        {dossierTranslationsMap[selectedSectionIdx] && (
                          <button
                            onClick={handleDeleteActiveSectionTranslation}
                            className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-sm transition-colors"
                            title="Сбросить перевод и вернуть оригинал"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Title Input */}
                    <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-sm flex flex-col gap-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 flex items-center justify-between">
                        <span>Заголовок раздела</span>
                        <span className="text-white/30">Оригинал: {activeHandbookSections[selectedSectionIdx].originalTitle || activeHandbookSections[selectedSectionIdx].title}</span>
                      </label>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        placeholder="Введите переведенный заголовок..."
                        className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Items Editor */}
                    {editingItems && editingItems.length > 0 && (
                      <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-sm flex flex-col gap-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <Database className="w-3.5 h-3.5" />
                          <span>Структурированные характеристики</span>
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {editingItems.map((item, itemIdx) => (
                            <div key={itemIdx} className="p-2.5 bg-black/40 border border-white/5 rounded-sm flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) => {
                                    const newItems = [...editingItems];
                                    newItems[itemIdx] = { ...newItems[itemIdx], label: e.target.value };
                                    setEditingItems(newItems);
                                  }}
                                  className="w-1/2 bg-white/5 border border-white/10 rounded-sm px-2 py-1 text-xs font-bold text-white/80 outline-none focus:border-blue-500"
                                  placeholder="Метка..."
                                />
                                <span className="text-white/30 font-mono text-xs">:</span>
                                <input
                                  type="text"
                                  value={item.value}
                                  onChange={(e) => {
                                    const newItems = [...editingItems];
                                    newItems[itemIdx] = { ...newItems[itemIdx], value: e.target.value };
                                    setEditingItems(newItems);
                                  }}
                                  className="w-1/2 bg-white/5 border border-white/10 rounded-sm px-2 py-1 text-xs font-bold text-emerald-300 outline-none focus:border-blue-500"
                                  placeholder="Значение..."
                                />
                              </div>
                              {activeHandbookSections[selectedSectionIdx].items?.[itemIdx] && (
                                <div className="text-[9px] font-mono text-white/30 flex justify-between px-1">
                                  <span>Оригинал:</span>
                                  <span>{activeHandbookSections[selectedSectionIdx].items![itemIdx].label}: {activeHandbookSections[selectedSectionIdx].items![itemIdx].value}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Narrative Text Editor */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      
                      {/* Left: Original Text */}
                      <div className="p-4 bg-zinc-950 border border-white/10 rounded-sm flex flex-col gap-2 min-h-[350px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                            ОРИГИНАЛЬНЫЙ ТЕКСТ (CN/EN)
                          </span>
                          <span className="text-[9px] font-mono text-white/30">
                            {activeHandbookSections[selectedSectionIdx].rawText?.length || 0} символов
                          </span>
                        </div>
                        <div className="text-xs text-white/70 font-sans leading-relaxed whitespace-pre-wrap select-text overflow-y-auto custom-scrollbar flex-1 p-2 bg-black/40 border border-white/5 rounded-sm">
                          {activeHandbookSections[selectedSectionIdx].rawText || '---'}
                        </div>
                      </div>

                      {/* Right: Translation Textarea */}
                      <div className="p-4 bg-zinc-900/90 border border-blue-500/30 rounded-sm flex flex-col gap-2 min-h-[350px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ПЕРЕВОД ({LANGUAGES.find(l => l.id === activeTargetLang)?.label})</span>
                          </span>
                          <span className="text-[9px] font-mono text-white/40">
                            {editingText.length} символов
                          </span>
                        </div>

                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          placeholder="Введите переведенный текст записи досье..."
                          className="w-full flex-1 bg-black/80 border border-white/10 focus:border-blue-500/80 rounded-sm p-3 text-xs text-white font-sans leading-relaxed whitespace-pre-wrap outline-none resize-none custom-scrollbar transition-colors min-h-[280px]"
                        />
                      </div>

                    </div>

                    {/* Bottom Save Bar */}
                    <div className="p-4 bg-zinc-900/90 border border-white/10 rounded-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSectionSaved && (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-fade-in">
                            <Check className="w-4 h-4" /> Сохранено в досье!
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleSaveActiveSection}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 font-mono"
                      >
                        <Check className="w-4 h-4" />
                        <span>СОХРАНИТЬ ПЕРЕВОД РАЗДЕЛА</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                    <p className="text-sm font-bold uppercase tracking-widest">Выберите раздел для редактирования</p>
                  </div>
                )}
              </div>

              {/* Bottom Google Sheets-style Tab-Bar Selector panel for DOSSIERS */}
              <div className="h-14 border-t border-white/10 bg-[#0a0a0c] flex items-center justify-between px-4 shrink-0 z-20 overflow-x-auto overflow-y-hidden no-scrollbar select-none">
                <div className="flex items-center gap-3 w-full">
                  {/* Operator Select Button & Progress */}
                  <div className="flex flex-col gap-1 min-w-[160px] max-w-[200px]">
                    <div className="w-full flex items-center gap-1.5 bg-white/5 px-2 py-0.5 border border-white/10 rounded-sm relative">
                      <select 
                        value={selectedOperator?.id || ''}
                        onChange={(e) => {
                          const op = operators.find(o => o.id === e.target.value);
                          setSelectedOperator(op || null);
                          setSelectedSectionIdx(0);
                        }}
                        className="w-full bg-transparent text-[10px] text-white outline-none cursor-pointer appearance-none pr-5 font-bold truncate"
                      >
                        <option value="" className="bg-[#111]">Оперативник...</option>
                        {operators.map(op => (
                          <option key={op.id} value={op.id} className="bg-[#111]">
                            {op.displayName || op.nameEn} ({op.id})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/40 absolute right-1.5 pointer-events-none" />
                    </div>
                    {selectedOperator && activeHandbookSections.length > 0 && (
                      <div className="w-full flex items-center gap-2 pr-1" title="Прогресс перевода досье">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ 
                              width: `${Math.round((Object.values(dossierTranslationsMap).filter(t => !!t?.translatedText?.trim()).length / activeHandbookSections.length) * 100)}%` 
                            }} 
                          />
                        </div>
                        <span className="text-blue-400 font-mono font-bold text-[8px] min-w-[20px] text-right">
                          {Math.round((Object.values(dossierTranslationsMap).filter(t => !!t?.translatedText?.trim()).length / activeHandbookSections.length) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vertical Splitter */}
                  {selectedOperator && activeHandbookSections.length > 0 && (
                    <div className="h-8 w-px bg-white/10 self-center shrink-0 mx-1" />
                  )}

                  {/* Sheets-like Section Tabs */}
                  {selectedOperator && activeHandbookSections.length > 0 && (
                    <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-1 align-middle items-center">
                      {activeHandbookSections.map((sec, idx) => {
                        const isActive = selectedSectionIdx === idx;
                        const trans = dossierTranslationsMap[idx];
                        const hasTranslation = !!trans?.translatedText?.trim();
                        const isManual = !!trans?.isManual;
                        const displayName = trans?.translatedTitle || sec.title || sec.originalTitle || `Раздел 0${idx + 1}`;

                        return (
                          <div key={idx} className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => setSelectedSectionIdx(idx)}
                              className={`h-7 px-3 flex items-center gap-1.5 rounded-sm text-[10px] font-bold uppercase transition-all tracking-wider ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                                  : 'bg-zinc-900/60 text-white/50 border border-white/5 hover:bg-white/5 hover:text-white/80'
                              }`}
                            >
                              <span className="text-[8px] font-mono opacity-50 font-black">0{idx + 1}</span>
                              <span className="truncate max-w-[130px]">{displayName}</span>
                              {hasTranslation && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isManual ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                              )}
                            </button>
                            {/* Progress bar directly matching button width */}
                            <div className="flex items-center gap-1 w-full" title={`Раздел 0${idx + 1}: ${hasTranslation ? 'Переведено' : 'Оригинал'}`}>
                              <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${hasTranslation ? (isManual ? 'bg-blue-400' : 'bg-emerald-400') : 'bg-white/10'}`} 
                                  style={{ width: hasTranslation ? '100%' : '0%' }} 
                                />
                              </div>
                              <span className={`font-mono font-bold text-[8px] ${hasTranslation ? (isManual ? 'text-blue-400' : 'text-emerald-400') : 'text-white/30'}`}>
                                {hasTranslation ? '100%' : '0%'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          /* Editor Area for STORIES mode */
          <div className="flex-1 flex flex-col bg-[#111] min-w-0">
          {!selectedChapter ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">Выберите эпизод и главу для начала</p>
            </div>
          ) : loadingScript ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">Загрузка скрипта...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-2 flex items-center gap-3 animate-in slide-in-from-top duration-300 shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-200 font-medium">{errorMessage}</p>
                  <button 
                    onClick={() => setErrorMessage(null)}
                    className="ml-auto text-red-400 hover:text-red-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Export Submission Modal */}
              {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-[#111] border border-white/10 rounded-sm w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#5865F2]" /> Отправить перевод
                      </h3>
                      <button onClick={() => setShowExportModal(false)} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-6 flex flex-col gap-4">
                      {/* Export scope selection */}
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setExportScope('chapter')}
                            className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all flex items-center justify-center gap-1.5 ${
                              exportScope === 'chapter'
                                ? 'bg-white/10 border-white/30 text-white'
                                : 'bg-[#151515] border-white/5 text-white/40 hover:bg-white/5 hover:text-white/60'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" /> Глава ({selectedChapter ? getCleanChapterName(selectedChapter.storyTxt, selectedEpisode?.id) : 'текущая'})
                          </button>
                          <button
                            onClick={() => setExportScope('episode')}
                            className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-all flex items-center justify-center gap-1.5 ${
                              exportScope === 'episode'
                                ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]'
                                : 'bg-[#151515] border-white/5 text-white/40 hover:bg-white/5 hover:text-white/60'
                            }`}
                          >
                            <Database className="w-3.5 h-3.5" /> Весь эпизод ({selectedEpisode?.id || 'все главы'})
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-sm">
                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-blue-100 uppercase tracking-tight">Уведомление об отправке</p>
                          <p className="text-[11px] text-blue-100/70 leading-relaxed">
                            Чтобы ваш перевод появился на сайте, его необходимо отправить на ручную проверку.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          Мы используем процесс проверки сообществом для обеспечения высокого качества. Пожалуйста, присоединяйтесь к нашему Discord-серверу для отправки экспортированного файла:
                        </p>
                        
                        {SUBMISSION_WEBHOOK_URL ? (
                          <div className="flex flex-col gap-2">
                            {!discordUser ? (
                              <button 
                                onClick={handleDiscordLogin}
                                className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" /> Войти для отправки
                              </button>
                            ) : !isDiscordMember ? (
                              <div className="flex flex-col gap-2">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                                  <p className="text-[10px] text-red-400 font-bold uppercase text-center">
                                    Вы должны быть участником нашего Discord-сервера для отправки.
                                  </p>
                                </div>
                                <a 
                                  href="https://discord.gg/jYvWPeCjC3"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest"
                                >
                                  <MessageSquare className="w-4 h-4" /> Присоединиться к Discord
                                </a>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {discordUser && activeProfile !== discordUser.username && (
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                                    <p className="text-[10px] text-red-400 font-bold uppercase text-center">
                                      Имя профиля должно совпадать с вашим Discord-именем ({discordUser.username}) для отправки.
                                    </p>
                                  </div>
                                )}
                                <button 
                                  onClick={handleSubmitToDiscord}
                                  disabled={isSubmitting || submitStatus === 'success' || (discordUser && activeProfile !== discordUser.username)}
                                  className={`flex items-center justify-center gap-2 py-2.5 text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest ${
                                    submitStatus === 'success' 
                                      ? 'bg-green-600' 
                                      : 'bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50'
                                  }`}
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : submitStatus === 'success' ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <MessageSquare className="w-4 h-4" />
                                  )}
                                  {submitStatus === 'success' ? 'Успешно отправлено' : isSubmitting ? 'Отправка...' : 'Отправить в Discord'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <a 
                              href="https://discord.gg/jYvWPeCjC3"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest"
                            >
                              <MessageSquare className="w-4 h-4" /> Join Discord Server
                            </a>
                            <p className="text-[9px] text-white/30 italic text-center">
                              Пожалуйста, присоединитесь к нашему Discord, чтобы отправить перевод.
                            </p>
                          </div>
                        )}
                        
                        {submitStatus === 'error' && (
                          <p className="text-[9px] text-red-400 text-center font-bold uppercase">
                            Error submitting. Please check your Webhook URL.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Translation List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 bg-[#0a0a0a] min-h-0 select-text">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  <div className="max-w-full mx-auto bg-[#111] border border-white/10 rounded-sm overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-3 font-bold uppercase tracking-widest text-white/40 w-16 sticky left-0 bg-[#111] z-10">ID</th>
                            
                            {/* Source Column */}
                            <th className="p-3 font-bold uppercase tracking-widest text-white/40 min-w-[200px]">
                              <div className="flex flex-col gap-0.5">
                                <span>Оригинал</span>
                                <span className="text-[9px] opacity-50">{LANGUAGES.find(l => l.id === sourceLang)?.label}</span>
                              </div>
                            </th>

                            {/* Reference Column */}
                            <th className="hidden md:table-cell p-3 font-bold uppercase tracking-widest text-white/40 min-w-[200px] border-l border-white/5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span>Референс</span>
                                </div>
                                <select 
                                  value={referenceLangs[0] || ''}
                                  onChange={(e) => {
                                    const lang = e.target.value as Language;
                                    setReferenceLangs([lang]);
                                  }}
                                  className="bg-white/5 border border-white/10 rounded-sm text-[9px] text-white/60 outline-none p-1"
                                >
                                  {LANGUAGES.filter(l => l.isOfficial && l.id !== sourceLang && l.id !== activeTargetLang).map(l => (
                                    <option key={l.id} value={l.id} className="bg-[#111]">{l.label}</option>
                                  ))}
                                </select>
                              </div>
                            </th>

                            {/* Target Column */}
                            <th className={`p-3 font-bold uppercase tracking-widest min-w-[300px] border-l border-white/5 text-[#4ade80]`}>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span>Перевод</span>
                                  </div>
                                </div>
                                <select 
                                  value={activeTargetLang}
                                  onChange={(e) => {
                                    const newLang = e.target.value as Language;
                                    setActiveTargetLang(newLang);
                                    setTargetLangs([newLang]);
                                  }}
                                  className="bg-white/5 border border-white/10 rounded-sm text-[9px] text-white/60 outline-none p-1"
                                >
                                  {LANGUAGES.filter(l => !l.isOfficial || l.id === 'en_US').map(l => (
                                    <option key={l.id} value={l.id} className="bg-[#111]">{l.label}</option>
                                  ))}
                                </select>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {blocks.map((block) => {
                            if (block.type !== 'dialogue') return null;

                            return (
                              <tr id={`block-${block.id}`} key={block.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="p-3 font-mono text-[10px] text-white/30 align-top sticky left-0 bg-[#111] group-hover:bg-[#1a1a1a] z-10">{block.id}</td>
                                
                                {/* Source Column */}
                                <td className="p-2 md:p-3 align-top min-w-[120px] md:min-w-[200px]">
                                  {block.prefix.includes('options="') && (
                                    <div className="text-[10px] font-bold text-amber-400 mb-1 uppercase tracking-tight flex items-center gap-1">
                                      <List className="w-3 h-3" /> <span className="hidden sm:inline">Выбор</span>
                                    </div>
                                  )}
                                  {block.content[sourceLang]?.name && (
                                    <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-tight">
                                      {block.content[sourceLang].name}
                                    </div>
                                  )}
                                  <div 
                                    className="text-[11px] md:text-xs text-white/70 whitespace-pre-wrap leading-relaxed"
                                  >
                                    {block.content[sourceLang]?.text}
                                  </div>
                                </td>

                                {/* Reference Column */}
                                <td className="hidden md:table-cell p-3 align-top border-l border-white/5 bg-white/5 min-w-[200px]">
                                  {block.prefix.includes('options="') && (
                                    <div className="text-[10px] font-bold text-amber-400/60 mb-1 uppercase tracking-tight flex items-center gap-1">
                                      <List className="w-3 h-3" /> Выбор
                                    </div>
                                  )}
                                  {block.content[referenceLangs[0] || 'en_US']?.name && (
                                    <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-tight">
                                      {block.content[referenceLangs[0] || 'en_US'].name}
                                    </div>
                                  )}
                                  <div 
                                    className="text-xs text-white/50 whitespace-pre-wrap leading-relaxed italic"
                                  >
                                    {block.content[referenceLangs[0] || 'en_US']?.text || '---'}
                                  </div>
                                </td>

                                {/* Target Column */}
                                <td className={`p-2 md:p-3 align-top border-l border-white/5 bg-[#4ade80]/5 min-w-[150px] md:min-w-[250px]`}>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                      {block.prefix.includes('options="') ? (
                                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-tight flex items-center gap-1">
                                          <List className="w-3 h-3" /> Выбор
                                        </div>
                                      ) : <div />}
                                      {block.content[activeTargetLang]?.edited && (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded-sm border border-amber-500/20 font-bold tracking-tight uppercase" title="Изменено">
                                          <Check className="w-2.5 h-2.5" /> Изменено
                                        </span>
                                      )}
                                    </div>
                                    {block.content[sourceLang]?.name && (
                                      <input
                                        type="text"
                                        value={block.content[activeTargetLang]?.name || ''}
                                        onChange={(e) => handleCharacterNameChange(block.id, e.target.value, activeTargetLang)}
                                        className="bg-black/50 border border-white/10 rounded-sm px-2 py-1 text-[10px] font-medium text-[#4ade80] outline-none focus:border-[#4ade80]/50 w-full placeholder:text-white/10 transition-colors"
                                        placeholder="Character Name..."
                                      />
                                    )}
                                    <textarea
                                      value={block.content[activeTargetLang]?.text || ''}
                                      onChange={(e) => handleTranslationChange(block.id, e.target.value, activeTargetLang)}
                                      className="w-full bg-black/50 border border-white/10 rounded-sm px-2 py-1.5 text-white outline-none focus:border-white/30 resize-y min-h-[60px] transition-colors placeholder:text-white/10"
                                      placeholder={`Перевести на ${LANGUAGES.find(l => l.id === activeTargetLang)?.label}...`}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Bottom Google Sheets-style Tab-Bar Selector panel */}
          {selectedEpisode && (
            <div className="h-14 border-t border-white/10 bg-[#0a0a0c] flex items-center justify-between px-4 shrink-0 z-20 overflow-x-auto overflow-y-hidden no-scrollbar select-none">
              <div className="flex items-center gap-3 w-full">
                {/* Episode Select Button & Progress */}
                <div className="flex flex-col gap-1 min-w-[140px] max-w-[140px]">
                  <div className="w-[140px] flex items-center gap-1.5 bg-white/5 px-2 py-0.5 border border-white/10 rounded-sm relative">
                    <select 
                      value={selectedEpisode?.id || ''}
                      onChange={(e) => {
                        const ep = episodes.find(ep => ep.id === e.target.value);
                        setSelectedEpisode(ep || null);
                        setSelectedChapter(null);
                      }}
                      className="w-full bg-transparent text-[10px] text-white outline-none cursor-pointer appearance-none pr-5 font-bold"
                    >
                      <option value="" className="bg-[#111]">Эпизод...</option>
                      {episodes.map(ep => (
                        <option key={ep.id} value={ep.id} className="bg-[#111]">{ep.id}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-white/40 absolute right-1.5 pointer-events-none" />
                  </div>
                  <div className="w-[140px] flex items-center gap-2 pr-1" title="Прогресс">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${getEpisodeProgress(selectedEpisode)}%` }} />
                    </div>
                    <span className="text-blue-400 font-mono font-bold text-[8px] min-w-[20px] text-right">{getEpisodeProgress(selectedEpisode)}%</span>
                  </div>
                </div>

                {/* Vertical Splitter */}
                <div className="h-8 w-px bg-white/10 self-center shrink-0 mx-1" />

                {/* Sheets-like Chapter Tabs */}
                <div ref={tabsScrollRef} className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-1 align-middle items-center">
                  {selectedEpisode.chapters.map((ch, idx) => {
                    const isActive = selectedChapter?.storyTxt === ch.storyTxt;
                    const displayName = getCleanChapterName(ch.storyTxt, selectedEpisode?.id);

                    // Read local progress percentage for this specific chapter tab!
                    const localData = allTranslations[ch.storyTxt] || {};
                    const chTotal = chapterStats[ch.storyTxt] || 0;
                    let chProgress = 0;
                    if (chTotal > 0) {
                      let translatedCount = 0;
                      Object.keys(localData).forEach(blockIdxStr => {
                        const blockData = localData[blockIdxStr]?.[activeTargetLang];
                        if (blockData?.text?.trim()) {
                          translatedCount++;
                        }
                      });
                      chProgress = Math.round((translatedCount / chTotal) * 100);
                    }

                    return (
                      <div key={ch.storyTxt} className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedChapter(ch)}
                          className={`h-7 px-3 flex items-center rounded-sm text-[10px] font-bold uppercase transition-all tracking-wider ${
                            isActive
                              ? 'bg-gradient-to-r from-[#4ade80]/15 to-[#4ade80]/5 text-[#4ade80] border border-[#4ade80]/35 shadow-[0_0_12px_rgba(74,222,128,0.1)]'
                              : 'bg-zinc-900/60 text-white/50 border border-white/5 hover:bg-white/5 hover:text-white/80'
                          }`}
                        >
                          <span className="truncate max-w-[120px]">{displayName}</span>
                        </button>
                        {/* Progress bar directly matching chapter button width */}
                        <div className="flex items-center gap-1 w-full" title={`Прогресс ${displayName}`}>
                          <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isActive ? 'bg-[#4ade80]' : 'bg-white/30'}`} 
                              style={{ width: `${chProgress}%` }} 
                            />
                          </div>
                          <span className={`font-mono font-bold text-[8px] ${isActive ? 'text-[#4ade80]' : 'text-white/40'}`}>{chProgress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* AI Sidebar Panel */}
        {showAiMenu && (
          <div className="w-full md:w-[480px] xl:w-[500px] border-l border-white/10 bg-[#0f0f11] flex flex-col h-full shrink-0 overflow-hidden animate-in slide-in-from-right duration-300 z-30">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-[#141417] shrink-0 gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">ИИ Помощник Gemini</span>
              </h3>
              <button 
                onClick={() => setShowAiMenu(false)} 
                className="text-white/40 hover:text-white hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
                title="Закрыть панель"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar Tab Selection */}
            <div className="flex border-b border-white/5 bg-black/25 shrink-0">
              <button
                onClick={() => setAiActiveTab('translate')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                  aiActiveTab === 'translate'
                    ? 'border-purple-500 text-purple-400 bg-white/[0.02]'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                }`}
              >
                Перевод
              </button>
              <button
                onClick={() => setAiActiveTab('editor')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                  aiActiveTab === 'editor'
                    ? 'border-purple-500 text-purple-400 bg-white/[0.02]'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                }`}
              >
                Редактор
              </button>
              <button
                onClick={() => setAiActiveTab('settings')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                  aiActiveTab === 'settings'
                    ? 'border-purple-500 text-purple-400 bg-white/[0.02]'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                }`}
              >
                Настройки
              </button>
            </div>

            {/* Sidebar Tab Contents */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-5 bg-[#0c0c0e]">
              {aiActiveTab === 'translate' ? (
                // TAB 1: Translate Options & Database
                <div className="flex flex-col gap-5">
                  {/* Rate Limit Active Notice with On-The-Fly Model Switch */}
                  {rateLimitActive && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm flex flex-col gap-2 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                        <span className="text-[11px] font-bold uppercase tracking-wider font-sans">
                          Авто-пауза (Превышен лимит 429)
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-200/80 leading-relaxed font-sans">
                        {rateLimitCountdown !== null 
                          ? `Ожидание восстановления квоты: ${rateLimitCountdown} сек... Либо переключите модель прямо сейчас для мгновенного продолжения.` 
                          : `Обработка запроса...`}
                      </p>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[9px] text-white/50 uppercase font-black tracking-wider">Переключить модель на лету:</span>
                        <select 
                          value={selectedModel}
                          onChange={(e) => {
                            setSelectedModel(e.target.value);
                            localStorage.setItem('ak-selected-model', e.target.value);
                          }}
                          className="bg-black/80 border border-amber-500/40 px-2 py-1.5 rounded-sm text-[10px] text-amber-200 outline-none cursor-pointer font-mono w-full"
                        >
                          <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                          <option value="gemini-3.7-pro">Gemini 3.7 Pro</option>
                          <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                          <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                          <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Pinpoint</option>
                          <option value="gemini-flash-latest">Gemini Flash Latest</option>
                          <option value="gemini-pro-latest">Gemini Pro Latest</option>
                          <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Filter & Translation Actions */}
                  <div className="flex flex-col gap-2.5 font-sans">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-sans">Параметры перевода</span>
                    
                    {/* Toggle: Translate Only Untranslated Lines */}
                    <label className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-sm cursor-pointer transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          {translationMode === 'DOSSIERS' ? "Переводить только непереведенные записи" : "Переводить только пустые строки"}
                        </span>
                        <span className="text-[9px] text-white/40">
                          {translationMode === 'DOSSIERS' ? "Пропускать уже переведенные разделы досье" : "Не перезаписывать уже переведенный текст и имена"}
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={translateOnlyUntranslated}
                        onChange={(e) => {
                          setTranslateOnlyUntranslated(e.target.checked);
                          localStorage.setItem('ak-translate-only-untranslated', String(e.target.checked));
                        }}
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                      />
                    </label>

                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-sans mt-2">
                      {translationMode === 'DOSSIERS' ? "ИИ-Перевод Досье" : "Инструменты перевода"}
                    </span>

                    {translationMode === 'DOSSIERS' ? (
                      <div className="grid grid-cols-1 gap-2">
                        {!selectedOperator ? (
                          <div className="p-3 bg-white/5 border border-white/5 rounded-sm text-center">
                            <span className="text-[10px] text-white/50">
                              Выберите оперативника внизу экрана для запуска ИИ-перевода досье.
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Operator Overview card in Gemini Menu */}
                            <div className="p-2.5 bg-white/5 border border-white/10 rounded-sm flex items-center gap-3">
                              <div className="w-10 h-10 rounded-sm overflow-hidden bg-black border border-white/10 shrink-0">
                                {selectedOperator.avatarUrl ? (
                                  <img src={selectedOperator.avatarUrl} alt={selectedOperator.nameEn} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-white/30">
                                    {selectedOperator.id}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-bold text-white truncate">
                                  {selectedOperator.displayName || selectedOperator.nameEn}
                                </span>
                                <span className="text-[9px] font-mono text-blue-400">
                                  {activeHandbookSections.length} записей в досье
                                </span>
                              </div>
                            </div>

                            {/* Translate Entire Dossier Button */}
                            <button 
                              onClick={() => handleTranslateAllDossierSections()}
                              disabled={isTranslatingDossier || !selectedOperator || (!userApiKey && (!discordUser || !isDiscordMember))}
                              className="relative flex flex-col gap-1 p-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {isTranslatingDossier ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-purple-400 group-hover:animate-pulse" />
                                )}
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                  {translateOnlyUntranslated ? "Доперевести всё досье (Gemini)" : "Перевести всё досье целиком (Gemini)"}
                                </span>
                              </div>
                              <span className="text-[9px] text-purple-200/70 leading-relaxed">
                                {dossierTranslationProgress 
                                  ? `Перевод раздела ${dossierTranslationProgress.current} из ${dossierTranslationProgress.total}: ${dossierTranslationProgress.currentSectionTitle}`
                                  : "Последовательно переведет все медицинские, боевые и архивные записи выбранного оперативника с сохранением терминологии."
                                }
                              </span>
                              {dossierTranslationProgress && (
                                <div 
                                  className="absolute bottom-0 left-0 h-1 bg-purple-400 transition-all duration-300 rounded-b-sm" 
                                  style={{ width: `${(dossierTranslationProgress.current / dossierTranslationProgress.total) * 100}%` }} 
                                />
                              )}
                            </button>

                            {/* Translate Active Section Button */}
                            <button 
                              onClick={() => handleAiTranslateActiveSection()}
                              disabled={isTranslatingDossier || !selectedOperator || (!userApiKey && (!discordUser || !isDiscordMember))}
                              className="flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                  Перевести только текущий раздел (Запись #{selectedSectionIdx + 1})
                                </span>
                              </div>
                              <span className="text-[9px] text-white/50 leading-relaxed">
                                {activeHandbookSections[selectedSectionIdx]?.title || activeHandbookSections[selectedSectionIdx]?.originalTitle || `Раздел 0${selectedSectionIdx + 1}`}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => handleGeminiTranslateAll()}
                          disabled={isTranslatingAll || isTranslatingEpisode || !selectedChapter || (!userApiKey && (!discordUser || !isDiscordMember))}
                          className="relative flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {isTranslatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:animate-pulse" />}
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                              {translateOnlyUntranslated ? "Доперевести выбранную Главу (пустые)" : "Перевести выбранную Главу"}
                            </span>
                          </div>
                          <span className="text-[9px] text-white/50 leading-relaxed">
                            {translateOnlyUntranslated ? "Переводит только незаполненные реплики в текущей главе." : "Переводит диалоги текущей выбранной главы."}
                          </span>
                          {translationProgress && (
                            <div className="absolute bottom-0 left-0 h-0.5 bg-purple-500 transition-all duration-300" style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }} />
                          )}
                        </button>

                        <button 
                          onClick={() => handleGeminiTranslateEpisode()}
                          disabled={isTranslatingAll || isTranslatingEpisode || !selectedEpisode || (!userApiKey && (!discordUser || !isDiscordMember))}
                          className="flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {isTranslatingEpisode ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Globe className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />}
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Перевести Весь Эпизод</span>
                          </div>
                          <span className="text-[9px] text-white/50 leading-relaxed">
                            Последовательно переведет все непереведенные главы в активном эпизоде.
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : aiActiveTab === 'settings' ? (
                // TAB 3: Settings
                <div className="flex flex-col gap-5">
                  {/* Access Settings */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-sans">Доступ и Модель API</span>
                    <div className="flex flex-col gap-2 bg-[#121215] p-2.5 rounded-sm border border-white/5">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <input 
                          type="password"
                          placeholder="Ключ Gemini API..."
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                          className="bg-black/50 border border-white/10 px-2 py-1.5 rounded-sm text-xs text-white outline-none w-full flex-1 focus:border-purple-500/50 transition-colors font-mono"
                        />
                      </div>
                      <select 
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          localStorage.setItem('ak-selected-model', e.target.value);
                        }}
                        disabled={!userApiKey}
                        className="bg-black/50 border border-white/10 px-2 py-1.5 rounded-sm text-[10px] text-white outline-none cursor-pointer focus:border-purple-500/50 transition-colors disabled:opacity-30 font-mono w-full"
                      >
                        <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                        <option value="gemini-3.7-pro">Gemini 3.7 Pro</option>
                        <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                        <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Pinpoint</option>
                        <option value="gemini-flash-latest">Gemini Flash Latest</option>
                        <option value="gemini-pro-latest">Gemini Pro Latest</option>
                        <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
                      </select>
                    </div>
                    <div className="text-[9px] text-zinc-500 leading-normal">
                      Получите ключ бесплатно в <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline">Google AI Studio</a>. Сохраняется только в вашем браузере.
                    </div>
                  </div>

                  {/* Additional Instructions */}
                  <div className="flex flex-col gap-2.5 font-sans">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center justify-between">
                      Кастомные Директивы перевода
                    </span>
                    <textarea
                      value={additionalPromptText}
                      onChange={(e) => {
                        setAdditionalPromptText(e.target.value);
                        localStorage.setItem('ak-additional-system-prompt', e.target.value);
                      }}
                      placeholder="Дополнительный контекст для перевода: стили, обращения, гендерные особенности, термины."
                      className="w-full h-24 bg-zinc-900/40 border border-white/15 rounded-sm p-2 text-xs text-white outline-none focus:border-purple-500/50 resize-y font-mono leading-relaxed placeholder:text-white/20"
                    />
                  </div>
                  
                  {/* Cache Settings */}
                  <div className="flex flex-col gap-2.5 font-sans mt-2 border-t border-white/5 pt-4">
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center justify-between">
                      Системные Настройки
                    </span>
                    <button
                      onClick={async () => {
                        if (window.confirm('Очистить кэш изображений и таблиц? (Переводы не будут удалены). Это может помочь, если возникли проблемы с загрузкой.')) {
                          try {
                            await CacheService.clear();
                            setErrorMessage('Кэш успешно очищен. Пожалуйста, перезагрузите страницу.');
                          } catch (e) {
                            setErrorMessage('Произошла ошибка при очистке кэша.');
                          }
                        }
                      }}
                      className="w-full text-left bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer"
                    >
                      Очистить системный кэш
                    </button>
                    <div className="text-[9px] text-zinc-500 leading-normal">
                      Очищает кэшированные JSON-файлы и изображения (IndexedDB). Полезно для устранения ошибок 404 к старым изображениям или устаревшим данным.
                    </div>
                  </div>
                </div>
              ) : (
                // TAB 2: Consistency Check (AI Editor) - RE-ARCHITECTED FOR ERGONOMIC SINGLE-COLUMN SIDEBAR USE with Navigation
                <div className="flex flex-col gap-4">
                  
                  {/* Scope Selector and Start Analyzing Button */}
                  <div className="bg-[#141417]/80 border border-white/5 p-3 rounded-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 font-sans font-bold">
                      <span className="text-[10px] text-white/40 uppercase">Охват проверки</span>
                      <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-white/5">
                        <button
                          onClick={() => {
                            setEditorScope('chapter');
                            setEditorIssues([]);
                            setSelectedIssueId(null);
                          }}
                          className={`px-2 py-1 rounded-sm text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                            editorScope === 'chapter'
                              ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-inner"
                              : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Глава
                        </button>
                        <button
                          onClick={() => {
                            setEditorScope('episode');
                            setEditorIssues([]);
                            setSelectedIssueId(null);
                          }}
                          className={`px-2 py-1 rounded-sm text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                            editorScope === 'episode'
                              ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-inner"
                              : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Эпизод
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyzeTranslations}
                      disabled={isEditorAnalyzing || !selectedChapter || !userApiKey}
                      className={`w-full py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        isEditorAnalyzing 
                          ? "bg-zinc-800 text-white/40 cursor-not-allowed" 
                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/10"
                      }`}
                    >
                      {isEditorAnalyzing ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Анализируем согласованность...
                        </span>
                      ) : (
                        "Начать анализ локализации ИИ"
                      )}
                    </button>
                  </div>

                  {/* Issues lists or active issue details */}
                  {selectedIssueId && editorIssues.find(i => i.id === selectedIssueId) ? (
                    // SHOW ACTIVE ISSUE DETAILED VIEW (WITH BACK NAVIGATION TO PREVENT HORIZONTAL CLUTTER)
                    (() => {
                      const issue = editorIssues.find(i => i.id === selectedIssueId)!;
                      return (
                        <div className="flex flex-col gap-3.5 bg-zinc-900/10 border border-white/5 p-3 rounded-sm animate-in slide-in-from-right duration-200">
                          {/* Back Link */}
                          <button
                            onClick={() => {
                              setSelectedIssueId(null);
                              setEditingIssueId(null);
                            }}
                            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider self-start pb-1 progress-link cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" /> Вернуться к списку ({editorIssues.length})
                          </button>

                          {/* Detail Header Info */}
                          <div className="flex flex-col gap-1 text-xs">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest font-mono self-start ${
                              issue.severity === 'error' ? 'bg-red-500/20 text-red-300' :
                              issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-sky-500/20 text-sky-300'
                            }`}>
                              {issue.severity === 'error' ? 'Ошибка' : issue.severity === 'warning' ? 'Внимание' : 'Предложение'}
                            </span>
                            <div className="text-[9px] font-black uppercase tracking-wider text-purple-400 font-mono mt-1">
                              Категория: {issue.type === 'name_consistency' ? 'БД имён / Организации' :
                              issue.type === 'incomplete_translation' ? 'Неполный перевод' :
                              issue.type === 'terminology' ? 'Игровые понятия' :
                              issue.type === 'grammar_style' ? 'Грамматика' : 'Рекомендации'}
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans mt-0.5">{issue.title}</h3>
                            <p className="text-[11px] text-white/75 leading-relaxed font-sans font-normal">{issue.description}</p>
                          </div>

                          {/* comparative values */}
                          <div className="flex flex-col gap-2">
                            <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-sm flex flex-col gap-1">
                              <span className="text-[9px] text-red-500/80 font-bold uppercase tracking-wider">Текущий перевод в скрипте:</span>
                              <div className="text-xs font-mono font-bold text-zinc-300">{issue.originalValue || "Разнобой / пусто"}</div>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-sm flex flex-col gap-1">
                              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Исправление ИИ:</span>
                              <div className="text-xs font-mono font-bold text-emerald-300">{issue.suggestedValue || "Новый вариант"}</div>
                            </div>
                          </div>

                          {/* Editable customized suggestion */}
                          {issue.suggestedValue !== undefined && (
                            <div className="p-2.5 bg-zinc-950/40 border border-white/5 rounded-sm flex flex-col gap-1.5 animate-in fade-in duration-300">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Корректировка исправления:</span>
                                {!issue.fixed && editingIssueId !== issue.id && (
                                  <button
                                    onClick={() => {
                                      setEditedSuggestValue(issue.suggestedValue || '');
                                      setEditingIssueId(issue.id);
                                    }}
                                    className="text-[9px] text-purple-400 hover:text-purple-300 font-semibold uppercase tracking-widest underline cursor-pointer"
                                  >
                                    Свой вариант
                                  </button>
                                )}
                              </div>

                              {editingIssueId === issue.id ? (
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="text"
                                    value={editedSuggestValue}
                                    onChange={(e) => setEditedSuggestValue(e.target.value)}
                                    className="flex-1 bg-black border border-white/20 px-2 py-1.5 rounded-sm text-xs text-white outline-none focus:border-purple-500/50"
                                    placeholder="Свой перевод"
                                  />
                                  <button
                                    onClick={() => handleSaveCustomSuggestion(issue.id, editedSuggestValue)}
                                    className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                  >
                                    ОК
                                  </button>
                                </div>
                              ) : (
                                <div className="p-1.5 bg-[#121215] rounded border border-white/5">
                                  <span className="text-xs font-bold text-emerald-400 font-mono">{issue.suggestedValue || "Без замены"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Affected dialogues list */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Где встречается ({issue.blockIds.length}):</span>
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                              {issue.blockIds.map((idWithChapter) => {
                                const item = editorDialogueData.find(x => x.id === idWithChapter);
                                if (!item) return null;
                                const lineNum = idWithChapter.split("::")[1]?.replace("line-", "") || "??";
                                return (
                                  <div key={idWithChapter} className="p-2 bg-zinc-900/20 border border-white/5 rounded-sm flex flex-col gap-1 text-[10px] leading-relaxed">
                                    <div className="flex justify-between font-mono text-[8px] text-white/30 border-b border-white/5 pb-0.5 mb-1">
                                      <span>Глава: {item.chapterTitle} (Строка #{lineNum})</span>
                                      <span className="text-purple-400 font-bold">{item.charOriginal}</span>
                                    </div>
                                    <div className="text-white/40 italic">Ориг: {item.textOriginal}</div>
                                    <div className="text-white/85 font-mono flex gap-1 items-start mt-0.5">
                                      <span className="text-purple-400 shrink-0 font-bold">Перевод:</span>
                                      <span>
                                        {item.charTranslated && <span className="text-purple-300">[{item.charTranslated}] </span>}
                                        {item.textTranslated}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Footer Controls */}
                          <div className="pt-2 border-t border-white/5 flex justify-end gap-2 shrink-0">
                            {issue.fixed ? (
                              <div className="w-full flex justify-center py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-[9px] font-black text-emerald-400 uppercase tracking-widest gap-1">
                                <Check className="w-3.5 h-3.5" /> Изменение записано успешно!
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditorIssues(prev => prev.map(i => i.id === issue.id ? { ...i, fixed: true } : i));
                                  }}
                                  className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-wider rounded-sm transition-all cursor-pointer border border-white/5"
                                >
                                  Пропустить
                                </button>
                                <button
                                  onClick={() => applyEditorIssueFix(issue.id)}
                                  className="py-1.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-sm transition-all shadow-md flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Применить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // SHOW ISSUES STREAMING LIST
                    <div className="flex flex-col gap-2">
                      <div className="p-2 border-b border-white/5 bg-zinc-900/10 text-[10px] uppercase font-black tracking-wider text-white/40 flex justify-between">
                        <span>Замеченные Несоответствия</span>
                        <span className="font-mono text-purple-400">{editorIssues.length}</span>
                      </div>

                      {editorIssues.length > 0 && editorIssues.some(i => !i.fixed) && (
                        <button
                          onClick={applyAllEditorFixes}
                          className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-black rounded-sm uppercase tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Применить все исправления ({editorIssues.filter(i => !i.fixed).length})
                        </button>
                      )}

                      {isEditorAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center p-4">
                          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                          <div className="text-[10px] text-zinc-400 font-mono animate-pulse max-w-xs leading-relaxed">
                            {editorProgressStatus}
                          </div>
                        </div>
                      ) : editorIssues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/5 flex items-center justify-center text-indigo-400 border border-indigo-500/10 mb-1">
                            <Sparkles className="w-4.5 h-4.5" />
                          </div>
                          <span className="text-[10px] text-white/85 font-black uppercase tracking-lighter font-mono">Анализ не запущен</span>
                          <p className="text-[9px] text-[#888] max-w-xs leading-relaxed font-sans font-normal">
                            Запустите ИИ локализатор для сканирования реплик и имён на предмет разнобоя, ошибок вежливости и несоответствия глоссарию.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
                          {editorIssues.map((issue) => {
                            const severityColors = {
                              error: "border-red-500 bg-red-500/5",
                              warning: "border-amber-500 bg-amber-500/5",
                              suggestion: "border-sky-500 bg-sky-500/5"
                            };
                            return (
                              <button
                                key={issue.id}
                                onClick={() => handleSelectIssue(issue)}
                                className={`w-full text-left p-2.5 rounded-sm border-l-2 ${severityColors[issue.severity]} transition-all cursor-pointer hover:bg-white/5`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className={`text-[8px] px-1 py-0.5 rounded-full font-black uppercase tracking-widest font-mono ${
                                    issue.severity === 'error' ? 'bg-red-500/20 text-red-300' :
                                    issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-sky-500/20 text-sky-300'
                                  }`}>
                                    {issue.severity === 'error' ? 'Ошибка' : issue.severity === 'warning' ? 'Приоритет' : 'Предложение'}
                                  </span>
                                  {issue.fixed && (
                                    <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.5 rounded">
                                      <Check className="w-2.5 h-2.5" /> OK
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-[11px] font-bold text-white/90 line-clamp-1 mb-0.5">{issue.title}</h4>
                                <p className="text-[9px] text-white/50 line-clamp-2 leading-tight">{issue.description}</p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Profile Management Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111] border border-white/10 rounded-sm w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                {profileModalMode === 'add' && <Plus className="w-4 h-4 text-[#4ade80]" />}
                {profileModalMode === 'rename' && <FileText className="w-4 h-4 text-blue-400" />}
                {profileModalMode === 'delete' && <Trash2 className="w-4 h-4 text-red-400" />}
                {profileModalMode === 'add' && 'Создать новый профиль'}
                {profileModalMode === 'rename' && 'Переименовать профиль'}
                {profileModalMode === 'delete' && 'Удалить профиль'}
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              {profileModalMode === 'delete' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-red-100 uppercase tracking-tight">Предупреждение</p>
                      <p className="text-[11px] text-red-100/70 leading-relaxed">
                        Вы уверены, что хотите удалить профиль <span className="text-white font-bold">"{profileModalValue}"</span>? 
                        Это навсегда удалит все переводы, связанные с этим профилем.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-white/40 font-sans">Имя профиля</label>
                  <input
                    type="text"
                    value={profileModalValue}
                    onChange={(e) => setProfileModalValue(e.target.value)}
                    className="w-full bg-black border border-white/10 p-2.5 rounded-sm text-xs font-medium text-white outline-none focus:border-purple-500/50"
                    placeholder="Например, My Translation 1.0"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-950/40 border-t border-white/10 flex justify-end gap-2.5">
              <button
                onClick={() => setShowProfileModal(false)}
                className="py-1.5 px-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors border border-white/5 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleProfileModalSubmit}
                className={`py-1.5 px-5 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors cursor-pointer ${
                  profileModalMode === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {profileModalMode === 'delete' ? 'Удалить' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Modal (Deprecated - Replaced with Sidebar) */}
      {false && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f0f11] border border-white/10 rounded-sm w-full shadow-2xl flex flex-col overflow-hidden max-w-6xl h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/60 shrink-0 gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 font-sans">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Интеллектуальный Помощник Gemini & Редактор Согласованности</span>
              </h3>

              <button 
                onClick={() => setShowAiMenu(false)} 
                className="text-white/40 hover:text-white hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Unified Workspace */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[#0c0c0e]">
              
              {/* Left Column: Tools, Keys, Glossary, and Directives */}
              <div className="w-[330px] border-r border-[#1a1a1e] flex flex-col h-full shrink-0 bg-[#0f0f11] overflow-y-auto p-4 gap-5 scrollbar-thin">
                
                {/* Access Settings */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-sans">Доступ и Модель API</span>
                  <div className="flex items-center gap-2 bg-zinc-900/40 p-2.5 rounded-sm border border-white/5">
                    <Key className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <input 
                      type="password"
                      placeholder="Ключ Gemini API..."
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="bg-black/50 border border-white/10 px-2 py-1.5 rounded-sm text-xs text-white outline-none w-full flex-1 focus:border-purple-500/50 transition-colors font-mono"
                    />
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!userApiKey}
                      className="bg-black/50 border border-white/10 px-2 py-1.5 rounded-sm text-[10px] text-white outline-none cursor-pointer focus:border-purple-500/50 transition-colors disabled:opacity-30 font-mono"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Pinpoint</option>
                      <option value="gemini-pro-latest">Gemini Pro Latest</option>
                      <option value="gemini-flash-latest">Gemini Flash Latest</option>
                      <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
                    </select>
                  </div>
                  <div className="text-[9px] text-zinc-500 leading-normal">
                    Ключ необходим для переводчика и редактора. Получите его в <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline">Google AI Studio</a>. Ключ сохраняется локально.
                  </div>
                </div>

                {/* Translation Actions */}
                <div className="flex flex-col gap-2.5 font-sans">
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-sans">Инструменты перевода</span>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => {
                        handleGeminiTranslateAll();
                        setShowAiMenu(false);
                      }}
                      disabled={isTranslatingAll || isTranslatingEpisode || !selectedChapter || !userApiKey}
                      className="relative flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isTranslatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:animate-pulse" />}
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Перевести Главу</span>
                      </div>
                      <span className="text-[9px] text-white/50 leading-relaxed">
                        Переводит только текущую выбранную главу.
                      </span>
                      {translationProgress && (
                        <div className="absolute bottom-0 left-0 h-0.5 bg-purple-500 transition-all duration-300" style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }} />
                      )}
                    </button>

                    <button 
                      onClick={() => {
                        handleGeminiTranslateEpisode();
                        setShowAiMenu(false);
                      }}
                      disabled={isTranslatingAll || isTranslatingEpisode || !selectedEpisode || !userApiKey}
                      className="flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-sm disabled:opacity-30 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isTranslatingEpisode ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Globe className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />}
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Перевести Весь Эпизод</span>
                      </div>
                      <span className="text-[9px] text-white/50 leading-relaxed">
                        Переводит все непереведенные главы в текущем эпизоде.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Additional Instructions */}
                <div className="flex flex-col gap-2.5 font-sans">
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center justify-between">
                    Кастомные Директивы
                  </span>
                  <textarea
                    value={additionalPromptText}
                    onChange={(e) => {
                      setAdditionalPromptText(e.target.value);
                      localStorage.setItem('ak-additional-system-prompt', e.target.value);
                    }}
                    placeholder="Дополнительный контекст для перевода: стили, обращения и термины."
                    className="w-full h-24 bg-zinc-900/40 border border-white/15 rounded-sm p-2 text-xs text-white outline-none focus:border-purple-500/50 resize-y font-mono leading-relaxed placeholder:text-white/20"
                  />
                </div>

              </div>

              {/* Right Column: Unified Consistency Editor */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/20 font-sans">
                {/* Consistency Toolbar */}
                <div className="p-4 bg-[#141417] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0 font-sans">
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-white/50">
                      {editorScope === 'chapter' ? (
                        <span>Сканирование главы: <strong className="text-white font-mono">{selectedChapter ? getCleanChapterName(selectedChapter.storyTxt, selectedEpisode?.id) : ''}</strong></span>
                      ) : (
                        <span>Эпизод целиком: <strong className="text-white font-mono">{selectedEpisode?.name || selectedEpisode?.id}</strong></span>
                      )}
                    </div>
                    
                    <div className="h-4 w-px bg-white/10" />

                    {/* Scope selector */}
                    <div className="flex items-center gap-1.5 bg-black/60 p-0.5 rounded border border-white/5">
                      <button
                        onClick={() => {
                          setEditorScope('chapter');
                          setEditorIssues([]);
                          setSelectedIssueId(null);
                        }}
                        className={`px-2 py-1 rounded-sm text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                          editorScope === 'chapter'
                            ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-inner"
                            : "text-white/40 hover:text-white/80"
                        }`}
                      >
                        Глава
                      </button>
                      <button
                        onClick={() => {
                          setEditorScope('episode');
                          setEditorIssues([]);
                          setSelectedIssueId(null);
                        }}
                        className={`px-2 py-1 rounded-sm text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                          editorScope === 'episode'
                            ? "bg-purple-600/30 text-purple-300 border border-purple-500/20 shadow-inner"
                            : "text-white/40 hover:text-white/80"
                        }`}
                      >
                        Эпизод
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAnalyzeTranslations}
                      disabled={isEditorAnalyzing || !selectedChapter || !userApiKey}
                      className={`py-1.5 px-4 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        isEditorAnalyzing 
                          ? "bg-zinc-800 text-white/40 cursor-not-allowed" 
                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/10 disabled:opacity-30"
                      }`}
                    >
                      {isEditorAnalyzing ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Анализируем согласованность...
                        </span>
                      ) : (
                        "Начать анализ локализации ИИ"
                      )}
                    </button>

                    {editorIssues.length > 0 && editorIssues.some(i => !i.fixed) && (
                      <button
                        onClick={applyAllEditorFixes}
                        className="py-1.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-black rounded-sm uppercase tracking-widest transition-all shadow-md cursor-pointer"
                      >
                        Применить всё ({editorIssues.filter(i => !i.fixed).length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-workspace area split */}
                <div className="flex-1 flex overflow-hidden min-h-0 bg-[#0c0c0e]">
                  {/* Issues List Side */}
                  <div className="w-72 border-r border-[#1a1a1e] flex flex-col h-full shrink-0 bg-zinc-950/20">
                    <div className="p-3 border-b border-white/5 bg-zinc-900/20 text-[10px] uppercase font-black tracking-wider text-white/40 flex justify-between font-sans">
                      <span>Замеченные Проблемы</span>
                      <span className="font-mono text-purple-400">{editorIssues.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 scrollbar-thin">
                      {isEditorAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-4">
                          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                          <div className="text-[11px] text-zinc-400 font-mono animate-pulse max-w-xs leading-relaxed">
                            {editorProgressStatus}
                          </div>
                        </div>
                      ) : editorIssues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3 font-sans">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/5 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] text-white/85 font-black font-mono">Анализ не запущен</span>
                          <p className="text-[10px] text-white/40 max-w-xs leading-relaxed font-sans font-normal">
                            Нажмите верхнюю фиолетовую кнопку, чтобы ИИ проверил имена, реплики и ключевые понятия на однородность перевода.
                          </p>
                        </div>
                      ) : (
                        editorIssues.map((issue) => {
                          const isSelected = selectedIssueId === issue.id;
                          const severityColors = {
                            error: "border-red-500 bg-red-500/5",
                            warning: "border-amber-500 bg-amber-500/5",
                            suggestion: "border-sky-500 bg-sky-500/5"
                          };
                          
                          return (
                            <button
                              key={issue.id}
                              onClick={() => handleSelectIssue(issue)}
                              className={`w-full text-left p-3 rounded-sm border-l-2 ${severityColors[issue.severity]} transition-all cursor-pointer ${
                                isSelected 
                                  ? "border-purple-500 bg-white/5 ring-1 ring-white/10" 
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest font-mono ${
                                  issue.severity === 'error' ? 'bg-red-500/20 text-red-300' :
                                  issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {issue.severity === 'error' ? 'Ошибка' :
                                   issue.severity === 'warning' ? 'Внимание' :
                                   'Предложение'}
                                </span>
                                {issue.fixed && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-400 uppercase tracking-wider font-mono bg-emerald-500/10 px-1 py-0.5 rounded">
                                    <Check className="w-3 h-3" /> OK
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="text-xs font-bold text-white/90 line-clamp-1 mb-1 font-sans">{issue.title}</h4>
                              <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed font-sans">{issue.description}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Issue Detail Viewer Side */}
                  <div className="flex-grow flex flex-col h-full overflow-hidden bg-[#0c0c0e]">
                    {selectedIssueId && editorIssues.find(i => i.id === selectedIssueId) ? (() => {
                      const issue = editorIssues.find(i => i.id === selectedIssueId)!;
                      return (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                          {/* Scrollable details */}
                          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scrollbar-thin">
                            {/* Issue Header box */}
                            <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-sm flex flex-col gap-2 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl pointer-events-none" />
                              <div className="text-[9px] font-black uppercase tracking-wider text-purple-400 font-mono">
                                Категория: {issue.type === 'name_consistency' ? 'БД имён / Организации' :
                                issue.type === 'incomplete_translation' ? 'Неполный перевод' :
                                issue.type === 'terminology' ? 'Игровые понятия' :
                                issue.type === 'grammar_style' ? 'Грамматика' : 'Рекомендации'}
                              </div>
                              <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans">{issue.title}</h3>
                              <p className="text-xs text-white/70 leading-relaxed font-sans">{issue.description}</p>
                            </div>

                            {/* Difference comparative view */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-sm flex flex-col gap-1.5 animate-in slide-in-from-left-2 duration-200">
                                <span className="text-[10px] text-red-500/80 font-bold uppercase tracking-wider font-sans">Текущий перевод в скрипте:</span>
                                <div className="text-xs font-mono font-black text-zinc-300 py-1">{issue.originalValue || "Разнобой"}</div>
                              </div>
                              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-sm flex flex-col gap-1.5 animate-in slide-in-from-right-2 duration-200">
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-sans font-sans">Исправление ИИ:</span>
                                <div className="text-xs font-mono font-black text-emerald-300 py-1">{issue.suggestedValue || "Новый вариант"}</div>
                              </div>
                            </div>

                            {/* Fine-tune interactive editing */}
                            {issue.suggestedValue !== undefined && (
                              <div className="p-3.5 bg-zinc-900/30 border border-white/5 rounded-sm flex flex-col gap-2">
                                <div className="flex justify-between items-center font-sans">
                                  <span className="text-[10px] text-white/40 uppercase font-black tracking-wider font-sans">Корректировка исправления:</span>
                                  {!issue.fixed && editingIssueId !== issue.id && (
                                    <button
                                      onClick={() => {
                                        setEditedSuggestValue(issue.suggestedValue || '');
                                        setEditingIssueId(issue.id);
                                      }}
                                      className="text-[9px] text-purple-400 hover:text-purple-300 font-semibold uppercase tracking-widest underline cursor-pointer"
                                    >
                                      Свой вариант
                                    </button>
                                  )}
                                </div>

                                {editingIssueId === issue.id ? (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={editedSuggestValue}
                                      onChange={(e) => setEditedSuggestValue(e.target.value)}
                                      className="flex-1 bg-black border border-white/20 px-2.5 py-1.5 rounded-sm text-xs text-white outline-none focus:border-purple-500/50"
                                      placeholder="Свой перевод"
                                    />
                                    <button
                                      onClick={() => handleSaveCustomSuggestion(issue.id, editedSuggestValue)}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black rounded-sm uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                    >
                                      Сохранить
                                    </button>
                                  </div>
                                ) : (
                                  <div className="p-2 bg-[#121215] rounded border border-white/5">
                                    <span className="text-xs font-bold text-emerald-400 font-mono">{issue.suggestedValue || "Без замены"}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Dialogue Lines affected */}
                            <div className="flex flex-col gap-2 font-sans">
                              <span className="text-[10px] text-white/40 uppercase font-black tracking-wider font-semibold">Где встречается ({issue.blockIds.length}):</span>
                              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                                {issue.blockIds.map((idWithChapter) => {
                                  const item = editorDialogueData.find(x => x.id === idWithChapter);
                                  if (!item) return null;

                                  const lineNum = idWithChapter.split("::")[1]?.replace("line-", "") || "??";
                                  return (
                                    <div key={idWithChapter} className="p-2.5 bg-zinc-900/20 border border-white/5 rounded-sm flex flex-col gap-1 text-[11px] leading-relaxed">
                                      <div className="flex justify-between font-mono text-[9px] text-white/30 border-b border-white/5 pb-1 mb-1">
                                        <span>Глава: {item.chapterTitle} (Строка #{lineNum})</span>
                                        <span className="text-purple-400 font-bold">{item.charOriginal}</span>
                                      </div>
                                      <div className="text-white/40 italic">Оригинал: {item.textOriginal}</div>
                                      <div className="text-white/85 font-mono flex gap-1 items-start mt-0.5">
                                        <span className="text-purple-400 shrink-0 font-sans font-bold">Перевод:</span>
                                        <span>
                                          {item.charTranslated && (
                                            <span className="text-purple-300 font-mono">[{item.charTranslated}] </span>
                                          )}
                                          {item.textTranslated}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Footer Apply Controls */}
                          <div className="p-3 border-t border-white/10 flex justify-end shrink-0 bg-zinc-950/30 gap-3 font-sans">
                            {issue.fixed ? (
                              <div className="w-full flex justify-center py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-[10px] font-black text-emerald-400 uppercase tracking-widest gap-2">
                                <Check className="w-4 h-4" /> Готово! Изменение записано в текущую сессию
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditorIssues(prev => prev.map(i => i.id === issue.id ? { ...i, fixed: true } : i));
                                  }}
                                  className="py-1.5 px-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                                >
                                  Пропустить
                                </button>
                                <button
                                  onClick={() => applyEditorIssueFix(issue.id)}
                                  className="py-1.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-lg flex items-center gap-1.5 cursor-pointer animate-pulse"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Применить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-2 text-white/30 font-sans">
                        <Sparkles className="w-10 h-10 text-zinc-700 hover:text-purple-500 transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Выбор замечания</span>
                        <p className="text-[10px] max-w-xs leading-relaxed">
                          Выберите конкретное замечание из списка слева, чтобы посмотреть детали проблемы и применить исправление ИИ во все диалоги.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Dossier Modal In-Game Preview Overlay */}
      {showDossierModalPreview && selectedOperator && (
        <OperatorDossierModal
          operator={selectedOperator}
          onClose={() => setShowDossierModalPreview(false)}
          uiLang={activeTargetLang}
        />
      )}

      {/* Episode Translation Progress Overlay */}
      {isTranslatingEpisode && episodeProgress && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 rounded-sm w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex flex-col gap-1.5 text-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[#4ade80]">
                Перевод всего эпизода Gemini
              </h3>
              <p className="text-[10px] text-white/40 tracking-wider uppercase">
                {selectedEpisode?.name || selectedEpisode?.id}
              </p>
            </div>

            <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/5 rounded-sm">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide">
                <span className="text-white/40">Главы: {episodeProgress.completedChapters} из {episodeProgress.totalChapters}</span>
                <span className="text-purple-400 font-mono font-bold">
                  {Math.round((episodeProgress.completedChapters / (episodeProgress.totalChapters || 1)) * 100)}%
                </span>
              </div>
              
              <div className="w-full h-1.5 bg-black rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ 
                    width: `${(episodeProgress.completedChapters / (episodeProgress.totalChapters || 1)) * 100}%` 
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {Object.entries(episodeProgress.progressMap || {}).map(([name, prog]: [string, any]) => {
                  const current = prog?.current ?? 0;
                  const total = prog?.total ?? 100;
                  return (
                    <div key={name} className="border-t border-white/10 pt-2">
                      <p className="text-[10px] font-bold text-white max-w-full truncate font-sans">
                        {name}
                      </p>
                      <div className="w-full h-1 bg-black rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-[#4ade80] transition-all duration-300"
                          style={{ 
                            width: `${(current / (total || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-semibold text-white/40 font-mono mt-1">
                        <span>{current} / {total}</span>
                        <span>{Math.round((current / (total || 1)) * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                cancelTranslationRef.current = true;
                setIsTranslatingEpisode(false);
              }}
              className="w-full py-2.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/10 rounded-sm transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              Остановить перевод
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
