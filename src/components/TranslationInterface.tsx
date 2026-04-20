import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Upload, Copy, Check, Globe, FileText, ChevronDown, AlertCircle, Play, Search, Sparkles, Loader2, User, UserPlus, Trash2, Plus, Key, MessageSquare, ExternalLink, X, List, Type as TypeIcon } from 'lucide-react';
import { StoryEpisode, Language, StoryChapter } from '../types';
import { fetchChapterList, fetchStoryScript, checkScriptExists } from '../services/storyService';
import { TRANSLATION_REGISTRY } from '../config/translationsRegistry';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
import { LogModal } from './story/LogModal';

interface TranslationInterfaceProps {
  onClose: () => void;
  onTestTranslation?: (chapter: StoryChapter, script: string) => void;
  initialChapter?: StoryChapter | null;
  initialEpisode?: StoryEpisode | null;
}

// Constants
// Discord Webhook URL for submissions (configured via environment variables)
const SUBMISSION_WEBHOOK_URL = import.meta.env.VITE_SUBMISSION_WEBHOOK_URL || '';

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

type BlockType = 'command' | 'dialogue' | 'comment' | 'empty';

interface TranslationBlock {
  id: string;
  type: BlockType;
  originalText: string;
  prefix: string;
  // Map of lang -> { text: string, name?: string }
  content: Record<string, { text: string, name?: string }>;
}

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
    const match = line.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
    if (match) {
      const prefix = match[1];
      const textToTranslate = match[2];
      
      // Extract name if present: [name="阿米娅"]
      let name: string | undefined;
      const nameMatch = prefix.match(/\[name="([^"]+)"\]/);
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

export function TranslationInterface({ onClose, onTestTranslation, initialChapter, initialEpisode }: TranslationInterfaceProps) {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const sourceLang: Language = 'zh_CN';
  const [referenceLangs, setReferenceLangs] = useState<Language[]>(['en_US']);
  const [targetLangs, setTargetLangs] = useState<Language[]>(['ru_RU']);
  const [activeTargetLang, setActiveTargetLang] = useState<Language>('ru_RU');
  
  const [selectedEpisode, setSelectedEpisode] = useState<StoryEpisode | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);
  
  useEffect(() => {
    if (initialEpisode) {
      setSelectedEpisode(initialEpisode);
    }
    if (initialChapter) {
      setSelectedChapter(initialChapter);
    }
  }, [initialChapter, initialEpisode]);
  
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

  const [readerFont, setReaderFont] = useState(() => localStorage.getItem('ak-reader-font') || 'sans-serif');

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('ak-user-api-key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('ak-selected-model') || 'gemini-3-flash-preview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [originalScriptText, setOriginalScriptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatingBlockIds, setTranslatingBlockIds] = useState<Set<string>>(new Set());

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

  const [translationProgress, setTranslationProgress] = useState<{current: number, total: number} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    localStorage.setItem('ak-reader-font', readerFont);
  }, [readerFont]);

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
      
      setAvailableTranslators(results.filter((t): t is string => t !== null));
    };
    
    checkTranslators();
  }, [selectedChapter, activeTargetLang]);

  // Persistent translations: Record<storyTxt, Record<lineIndex, { text?: string, name?: string }>>
  const [allTranslations, setAllTranslations] = useState<Record<string, Record<string, { text?: string, name?: string }>>>(() => {
    const profile = localStorage.getItem('ak-current-profile') || 'Default';
    const key = profile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${profile}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  // Store total dialogue lines for progress calculation: Record<storyTxt, totalDialogueLines>
  const [chapterStats, setChapterStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ak-chapter-stats');
    return saved ? JSON.parse(saved) : {};
  });

  const fetchDiscordUser = async () => {
    setIsCheckingDiscord(true);
    try {
      const response = await fetch('/api/auth/discord/user');
      if (response.ok) {
        const data = await response.json();
        setDiscordUser(data.user);
        setIsDiscordMember(data.isMember);
        
        // Automatically set profile to Discord username if not already set or if it's "Default"
        if (data.user.username && (activeProfile === 'Default' || !profiles.includes(data.user.username))) {
          if (!profiles.includes(data.user.username)) {
            const newProfiles = [...profiles, data.user.username];
            setProfiles(newProfiles);
            localStorage.setItem('ak-profiles', JSON.stringify(newProfiles));
          }
          setActiveProfile(data.user.username);
          localStorage.setItem('ak-current-profile', data.user.username);
        }
      } else {
        setDiscordUser(null);
        setIsDiscordMember(false);
      }
    } catch (error) {
      console.error('Failed to fetch Discord user:', error);
      setDiscordUser(null);
      setIsDiscordMember(false);
    } finally {
      setIsCheckingDiscord(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      const width = 600;
      const height = 800;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Open window immediately to avoid popup blockers
      const authWindow = window.open(
        '',
        'discord_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert('Пожалуйста, разрешите всплывающие окна для входа через Discord');
        return;
      }

      authWindow.document.write('<div style="font-family: sans-serif; padding: 20px; text-align: center; background: #0a0a0a; color: white;">Загрузка входа через Discord...</div>');

      const response = await fetch('/api/auth/discord/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      authWindow.location.href = url;
    } catch (error) {
      console.error('Discord login error:', error);
    }
  };

  const handleDiscordLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', { method: 'POST' });
      setDiscordUser(null);
      setIsDiscordMember(false);
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
    
    // Load translations for the new active profile
    const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
    const saved = localStorage.getItem(key);
    setAllTranslations(saved ? JSON.parse(saved) : {});
  }, [activeProfile]);

  // Use a ref to track the profile for which allTranslations is currently valid
  const lastSavedProfileRef = React.useRef(activeProfile);

  useEffect(() => {
    // Only save if the current state belongs to the active profile
    // This prevents saving 'Default' data into a newly created profile's key
    // during the brief moment before the load effect triggers.
    if (lastSavedProfileRef.current === activeProfile) {
      const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
      localStorage.setItem(key, JSON.stringify(allTranslations));
    } else {
      // Update the ref so subsequent changes to allTranslations are saved to the correct key
      lastSavedProfileRef.current = activeProfile;
    }
  }, [allTranslations, activeProfile]);

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

  const handleDeleteProfile = (profileToDelete: string) => {
    if (profileToDelete === 'Default') {
      alert('Нельзя удалить профиль по умолчанию.');
      return;
    }
    setProfiles(prev => prev.filter(p => p !== profileToDelete));
    if (activeProfile === profileToDelete) {
      setActiveProfile('Default');
    }
    localStorage.removeItem(`ak-translations-v3-${profileToDelete}`);
    setShowProfileModal(false);
  };

  const handleRenameProfile = (newName: string) => {
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
    
    // Move data in localStorage
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
      // Don't remove 'ak-translations-v3' if it was the default, just leave it as is or clear it
      if (activeProfile !== 'Default') {
        localStorage.removeItem(oldKey);
      }
    }

    setProfiles(prev => prev.map(p => p === activeProfile ? trimmedNewName : p));
    setActiveProfile(trimmedNewName);
    setShowProfileModal(false);
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

        // Initialize content for each block
        const finalBlocks: TranslationBlock[] = parsedBlocks.map((block, idx) => {
          const content: Record<string, { text: string, name?: string }> = {};
          
          // Add source text
          const sourceMatch = block.originalText.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
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
              const match = line.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
              if (match) {
                const nameMatch = match[1].match(/name="([^"]+)"/);
                text = match[2];
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
          const profileKey = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
          const savedLocal = localStorage.getItem(profileKey);
          const localTranslations = savedLocal ? JSON.parse(savedLocal) : {};

          targetLangs.forEach(lang => {
            const localData = localTranslations[selectedChapter.storyTxt]?.[idx]?.[lang];
            if (localData) {
              content[lang] = {
                text: localData.text || content[lang]?.text || '',
                name: localData.name || content[lang]?.name || undefined
              };
            }
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
        newContent[lang] = { ...newContent[lang], text: newText };
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
            chapterTranslations[index] = { ...current, [lang]: { ...langData, text: newText } };
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
        newContent[lang] = { ...newContent[lang], name: newName };
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
              chapterTranslations[idx] = { ...current, [lang]: { ...langData, name: newName } };
            }
          }
        });
        
        return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
      });
    }
  };

  const translateBatchWithGemini = async (batch: TranslationBlock[], context?: { character: string, text: string }[], lang: Language = activeTargetLang) => {
    try {
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({ apiKey });
      const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
      const toLabel = LANGUAGES.find(l => l.id === lang)?.label || lang;
      
      const glossary = blocks
        .filter(b => b.content[sourceLang]?.name && b.content[lang]?.name)
        .reduce((acc, b) => {
          acc[b.content[sourceLang].name!] = b.content[lang].name!;
          return acc;
        }, {} as Record<string, string>);

      const prompt = {
        glossary,
        context: context || [],
        toTranslate: batch.map(b => ({
          id: b.id,
          character: b.content[sourceLang]?.name || "Narrator/System",
          text: b.content[sourceLang]?.text || ""
        }))
      };

      const response = await ai.models.generateContent({
        model: selectedModel,
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
          systemInstruction: `You are a professional game translator specializing in Arknights. 
          Translate the dialogue lines in 'toTranslate' from ${fromLabel} to ${toLabel}. 
          Maintain the tone, style, and any specific terminology related to Arknights. 
          
          CRITICAL: You MUST translate ALL lines provided in 'toTranslate'. Do not skip any lines. 
          The output JSON array MUST have exactly the same number of items as the input 'toTranslate' array.
          
          CRITICAL FOR RUSSIAN TRANSLATION (and other gendered languages):
          - Use the 'character' name and 'context' (previous lines) to determine the correct gender endings for verbs and adjectives.
          - If the character is female (e.g., Amiya, Kal'tsit, Ch'en, Exusiai, Texas, Lappland), use feminine endings (e.g., "пошла", "сделала", "готова").
          - If the character is male (e.g., Doctor, SilverAsh, Phantom, Thorns), use masculine endings (e.g., "пошел", "сделал", "готов").
          - If the character is "Doctor" (Доктор), ALWAYS use masculine endings by default unless specified otherwise.
          - Maintain a consistent tone (formal/informal) based on character relationships. Kal'tsit is formal and verbose. Amiya is polite.
          
          CHARACTER NAMES:
          - Use the 'glossary' for consistent character name translations if available.
          - Translate the 'character' name into ${toLabel} if it's a common name or title (e.g., "Guard" -> "Охранник", "Medic" -> "Медик").
          - For unique names (e.g., "Amiya"), provide the transliteration/standard translation in ${toLabel} (e.g., "Амия").
          - If the character is "Narrator/System", keep it as is or translate appropriately.
          
          Respond ONLY with a JSON array of objects, each containing the 'id', 'translatedCharacter', and 'translatedText'.`,
        },
        contents: JSON.stringify(prompt),
      });
      
      console.log(`Gemini response for batch of ${batch.length} lines received.`);
      
      if (!response.text) {
        console.warn("Gemini returned an empty response for batch");
        return null;
      }

      try {
        const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsed = JSON.parse(cleanedText);
        
        if (!Array.isArray(parsed)) {
          console.error("Gemini response is not an array:", parsed);
          return null;
        }

        console.log(`Successfully parsed ${parsed.length} translations.`);
        return parsed as { id: string, translatedText: string, translatedCharacter: string }[];
      } catch (e) {
        console.error("Failed to parse Gemini JSON response:", response.text);
        return null;
      }
    } catch (error: any) {
      console.error("Gemini translation error:", error);
      // Check for quota/rate limit errors
      if (error?.message?.includes("429") || error?.status === 429 || error?.message?.toLowerCase().includes("quota")) {
        throw new Error("QUOTA_EXCEEDED");
      }
      return null;
    }
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
      if (error.message === "QUOTA_EXCEEDED") {
        setErrorMessage("Gemini API quota exceeded. Please wait a moment.");
      } else if (error.message === "GEMINI_API_KEY_MISSING") {
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
        // Extremely robust ID matching: trim and handle formats
        const rawId = res.id.toString().trim();
        const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
        const idx = next.findIndex(b => b.id === targetId);
        
        if (idx !== -1) {
          const block = next[idx];
          
          // 1. Update the text for this specific block
          const newContent = { ...block.content };
          newContent[lang] = { ...newContent[lang], text: res.translatedText };
          next[idx] = { ...block, content: newContent };
          
          // 2. If there's a character name, update it globally for this character
          if (block.content[sourceLang]?.name && res.translatedCharacter) {
            const sourceName = block.content[sourceLang].name;
            next.forEach((b, bIdx) => {
              if (b.content[sourceLang]?.name === sourceName) {
                const bContent = { ...b.content };
                bContent[lang] = { ...bContent[lang], name: res.translatedCharacter };
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
        const rawId = res.id.toString().trim();
        const targetId = rawId.startsWith('line-') ? rawId : `line-${rawId}`;
        const idx = currentBlocks.findIndex(b => b.id === targetId);
        
        if (idx !== -1) {
          const block = currentBlocks[idx];
          const current = chapterTranslations[idx] || {};
          const langData = current[lang] || {};
          
          // Update the specific line's text
          chapterTranslations[idx] = { 
            ...current, 
            [lang]: { ...langData, text: res.translatedText } 
          };

          // Update character name globally if applicable
          if (block.content[sourceLang]?.name && res.translatedCharacter) {
            const sourceName = block.content[sourceLang].name;
            currentBlocks.forEach((b, bIdx) => {
              if (b.content[sourceLang]?.name === sourceName) {
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

      return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
    });
  };

  const handleGeminiTranslateAll = async (lang: Language = activeTargetLang) => {
    if (!selectedChapter || isTranslatingAll) return;
    
    // Use the latest blocks from ref
    const currentBlocks = blocksRef.current;
    const dialogueBlocks = currentBlocks.filter(b => b.type === 'dialogue');
    if (dialogueBlocks.length === 0) return;

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("Ключ Gemini API не указан. Пожалуйста, введите свой ключ API.");
      return;
    }

    setIsTranslatingAll(true);
    setErrorMessage(null);
    setTranslationProgress({ current: 0, total: dialogueBlocks.length });
    console.log(`Starting mass translation for ${dialogueBlocks.length} lines...`);

    try {
      // Dynamic balanced batching:
      // Instead of fixed 100+30, for 130 lines we do 65+65.
      // If lines are 101-110, we translate all in one batch as requested.
      const TARGET_BATCH_SIZE = 100;
      const SINGLE_BATCH_THRESHOLD = 110;
      const totalLines = dialogueBlocks.length;
      
      const batches: TranslationBlock[][] = [];
      
      if (totalLines <= SINGLE_BATCH_THRESHOLD) {
        batches.push(dialogueBlocks);
        console.log(`Single batch: ${totalLines} lines (within threshold of ${SINGLE_BATCH_THRESHOLD}).`);
      } else {
        const numBatches = Math.ceil(totalLines / TARGET_BATCH_SIZE);
        const actualBatchSize = Math.ceil(totalLines / numBatches);
        for (let i = 0; i < totalLines; i += actualBatchSize) {
          batches.push(dialogueBlocks.slice(i, i + actualBatchSize));
        }
        console.log(`Dynamic batching: ${totalLines} lines split into ${batches.length} batches of ~${actualBatchSize} lines.`);
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} lines)...`);
        
        // Mark blocks in current batch as translating
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.add(b.id));
          return next;
        });

        // Get context from preceding blocks (using latest state from ref)
        const latestBlocks = blocksRef.current;
        const firstBlockIndex = latestBlocks.findIndex(b => b.id === batch[0].id);
        const context = latestBlocks.slice(Math.max(0, firstBlockIndex - 15), firstBlockIndex).map(b => ({
          character: b.content[sourceLang]?.name || "Narrator/System",
          text: b.content[lang]?.text || b.content[sourceLang]?.text || ""
        }));

        const results = await translateBatchWithGemini(batch, context, lang);
        
        if (results && results.length > 0) {
          handleBatchTranslationChange(results, lang);
          setTranslationProgress(prev => prev ? { ...prev, current: prev.current + results.length } : null);
        } else {
          console.error(`Batch ${i + 1} failed to return results.`);
          setErrorMessage(`Ошибка при переводе блока ${i + 1}. Проверьте консоль.`);
        }

        // Clear translating status for this batch
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.delete(b.id));
          return next;
        });

        // Small delay to avoid rate limits
        if (batches.length > 1 && i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      console.log("Mass translation completed.");
    } catch (error: any) {
      console.error("Mass translation failed:", error);
      if (error.message === "QUOTA_EXCEEDED") {
        setErrorMessage("Превышена квота Gemini API. Перевод остановлен.");
      } else if (error.message === "GEMINI_API_KEY_MISSING") {
        setErrorMessage("Ключ Gemini API отсутствует.");
      } else {
        setErrorMessage("Ошибка перевода. Подробности в консоли.");
      }
    } finally {
      setIsTranslatingAll(false);
      setTranslatingBlockIds(new Set());
      setTranslationProgress(null);
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
        const sourceMatch = b.originalText.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
        
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

  const handleSubmitToDiscord = async () => {
    if (!SUBMISSION_WEBHOOK_URL || !selectedChapter) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const safeTranslatorName = activeProfile.replace(/[^a-z0-9а-яё]/gi, '_');
      // Use original filename from storyTxt
      const originalFileName = selectedChapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'chapter';
      const baseFileName = `${originalFileName}_${safeTranslatorName}`;
      
      // Prepare CSV file
      const csvData = generateCSVData(activeTargetLang);
      if (!csvData) throw new Error("No data to submit");

      const csvString = Papa.unparse(csvData);
      const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const csvFile = new File([csvBlob], `${baseFileName}.csv`);

      // Prepare form data for Discord
      const formData = new FormData();
      const payload = {
        content: `🚀 **New Translation Submission**\n**Translator:** ${activeProfile}${discordUser ? ` (<@${discordUser.id}>)` : ''}\n**Episode:** ${selectedEpisode?.id || 'Unknown'}\n**Chapter:** ${selectedChapter.storyTxt}\n**Language:** ${LANGUAGES.find(l => l.id === activeTargetLang)?.label}`,
        username: "ZOOT"
      };
      
      formData.append('payload_json', JSON.stringify(payload));
      formData.append('file0', csvFile);

      const response = await fetch(SUBMISSION_WEBHOOK_URL, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          setSubmitStatus(prev => prev === 'success' ? 'idle' : prev);
        }, 3000);
      } else {
        throw new Error('Failed to submit to Discord');
      }
    } catch (error) {
      console.error('Discord submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white font-sans overflow-hidden select-none">
      {/* Unified Toolbar */}
      <div className="h-16 border-b border-white/10 flex items-center px-4 bg-[#0a0a0a] gap-3 shrink-0 z-20">
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />

        {/* Discord & Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {isCheckingDiscord ? (
            <div className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm">
              <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
            </div>
          ) : discordUser ? (
            <div className="flex items-center gap-2 bg-white/5 pl-1 pr-2 py-1 border border-white/10 rounded-sm">
              {discordUser.avatar ? (
                <img src={discordUser.avatar} alt={discordUser.username} className="w-6 h-6 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-white/40" />
                </div>
              )}
              <span className="text-[10px] font-bold text-white max-w-[80px] truncate">{discordUser.username}</span>
              <button onClick={handleDiscordLogout} className="text-[8px] text-red-400/60 hover:text-red-400 uppercase font-bold ml-1">Выйти</button>
            </div>
          ) : (
            <button 
              onClick={handleDiscordLogin}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-wider"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Войти
            </button>
          )}

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-sm relative" ref={profileDropdownRef}>
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[10px] font-bold text-white min-w-[60px] text-left">{activeProfile}</span>
              <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#111] border border-white/10 rounded-sm shadow-2xl z-[70] py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Выберите профиль</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {profiles.map(p => (
                    <div 
                      key={p}
                      className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors ${
                        activeProfile === p ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-white/5 text-white/60 hover:text-white'
                      }`}
                      onClick={() => {
                        setActiveProfile(p);
                        setIsProfileDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {p === 'Default' ? <Globe className="w-3 h-3 shrink-0" /> : <User className="w-3 h-3 shrink-0" />}
                        <span className="text-[10px] font-bold truncate">{p}</span>
                      </div>
                      
                      {p !== 'Default' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileModalMode('rename');
                              setProfileModalValue(p);
                              setShowProfileModal(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="p-1 hover:bg-white/10 rounded-sm text-white/40 hover:text-white transition-colors"
                            title="Переименовать"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileModalMode('delete');
                              setProfileModalValue(p);
                              setShowProfileModal(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="p-1 hover:bg-red-500/20 rounded-sm text-white/40 hover:text-red-400 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-white/5">
                  <button 
                    onClick={() => {
                      setProfileModalMode('add');
                      setProfileModalValue('');
                      setShowProfileModal(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 hover:bg-white/5 text-[#4ade80] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Новый профиль</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-1 shrink-0" />

          {availableTranslators.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mr-1">Доступны:</span>
              <div className="flex items-center gap-1">
                {availableTranslators.map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      if (!profiles.includes(t)) {
                        handleAddProfile(t);
                      } else {
                        setActiveProfile(t);
                      }
                    }}
                    className={`px-2 py-1 rounded-sm text-[9px] font-bold transition-all border ${
                      activeProfile === t 
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/10'
                    }`}
                    title={`Переключиться на перевод от ${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />

        <div className="flex items-center gap-4">
          {/* Episode Selector */}
          <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 border border-white/10 rounded-sm relative shrink-0">
            <select 
              value={selectedEpisode?.id || ''}
              onChange={(e) => {
                const ep = episodes.find(ep => ep.id === e.target.value);
                setSelectedEpisode(ep || null);
                setSelectedChapter(null);
              }}
              className="bg-transparent text-[10px] text-white outline-none cursor-pointer appearance-none pr-5 max-w-[120px]"
            >
              <option value="" className="bg-[#111]">Выберите эпизод...</option>
              {episodes.map(ep => (
                <option key={ep.id} value={ep.id} className="bg-[#111]">{ep.id} ({getEpisodeProgress(ep)}%)</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-white/40 absolute right-1.5 pointer-events-none" />
          </div>

          {selectedEpisode && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 h-1.5 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${getEpisodeProgress(selectedEpisode)}%` }} />
              </div>
              <span className="text-[10px] text-blue-400 font-mono font-bold">{getEpisodeProgress(selectedEpisode)}%</span>
            </div>
          )}

          <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />

          {/* Font Selector */}
          <div className="flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/10 rounded-sm shrink-0">
            <TypeIcon className="w-3.5 h-3.5 text-white/40" />
            <select 
              value={readerFont}
              onChange={(e) => setReaderFont(e.target.value)}
              className="bg-transparent text-[10px] text-white outline-none cursor-pointer appearance-none pr-4"
            >
              <option value="sans-serif" className="bg-[#111]">Sans-serif</option>
              <option value="serif" className="bg-[#111]">Serif</option>
              <option value="monospace" className="bg-[#111]">Monospace</option>
              <option value="system-ui" className="bg-[#111]">System</option>
              <option value="'Comic Sans MS', cursive" className="bg-[#111]">Comic Sans</option>
            </select>
          </div>

          <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />

          {/* Gemini API Key */}
          <div className="relative flex flex-col justify-center group">
            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/10 rounded-sm shrink-0">
              <Key className="w-3.5 h-3.5 text-white/40" />
              <input 
                type="password"
                placeholder="Ключ Gemini..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="bg-transparent text-[10px] text-white outline-none w-24 placeholder:text-white/20"
              />
              {userApiKey && (
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-[10px] text-white/60 outline-none cursor-pointer border-l border-white/10 pl-2 ml-1"
                >
                  <option value="gemini-3-flash-preview" className="bg-[#111]">Flash</option>
                  <option value="gemini-3.1-pro-preview" className="bg-[#111]">Pro</option>
                  <option value="gemini-3.1-flash-lite-preview" className="bg-[#111]">Lite</option>
                </select>
              )}
            </div>
            
            {/* Info below API key */}
            <div className="mt-0.5 whitespace-nowrap">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[8px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 opacity-80 transition-opacity"
                title="API ключ нужен для нейросетевого перевода. Нажмите, чтобы получить бесплатно."
              >
                Что это и как получить? <ExternalLink className="w-2 h-2" />
              </a>
            </div>
            
            {/* Detailed Tooltip on Hover */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-white/10 p-3 rounded-sm shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              <p className="text-[10px] text-white/70 mb-2 leading-relaxed whitespace-normal">
                <strong>API ключ Gemini</strong> используется для автоматического перевода текста с помощью ИИ. Ваш ключ сохраняется только локально в вашем браузере.
              </p>
              <p className="text-[10px] text-white/50 whitespace-normal">
                Вы можете получить его бесплатно в Google AI Studio.
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#111] min-w-0">
          {/* Editor Toolbar (Lower Bar) */}
          <div className="h-auto md:h-12 py-2 md:py-0 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center px-4 md:px-6 bg-white/5 justify-between shrink-0 gap-2 md:gap-0">
            <div className="flex items-center gap-4 shrink-0">
              {/* Chapter Selector */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 border border-white/10 rounded-sm relative">
                  <select 
                    value={selectedChapter?.storyTxt || ''}
                    onChange={(e) => {
                      const ch = selectedEpisode?.chapters.find(ch => ch.storyTxt === e.target.value);
                      setSelectedChapter(ch || null);
                    }}
                    disabled={!selectedEpisode}
                    className="bg-transparent text-[10px] text-white outline-none cursor-pointer appearance-none pr-5 max-w-[150px] disabled:opacity-30"
                  >
                    <option value="" className="bg-[#111]">Выберите главу...</option>
                    {selectedEpisode?.chapters.map(ch => {
                      const technicalName = ch.storyTxt.split('/').pop()?.replace('.txt', '') || ch.storyTxt;
                      return (
                        <option key={ch.storyTxt} value={ch.storyTxt} className="bg-[#111]">{technicalName} ({getChapterProgress(ch.storyTxt)}%)</option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3 h-3 text-white/40 absolute right-1.5 pointer-events-none" />
                </div>
              </div>

              {/* Chapter Progress */}
              <div className="flex items-center gap-2">
                <div className="w-12 md:w-16 h-1.5 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-[#4ade80] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] text-[#4ade80] font-mono font-bold whitespace-nowrap">
                  <span className="hidden sm:inline">Глава: </span>{progress}%
                </span>
              </div>
            </div>

            {/* Actions & CSV Tools */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {selectedChapter && (
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
                  className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                  title="Скрипт"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 
                  <span className="hidden lg:inline">Скрипт</span>
                </button>
              )}

              {onTestTranslation && (
                <button 
                  onClick={() => onTestTranslation(selectedChapter!, generateExportText())}
                  disabled={!selectedChapter}
                  className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                  title="Тест"
                >
                  <Play className="w-3.5 h-3.5" /> 
                  <span className="hidden lg:inline">Тест</span>
                </button>
              )}

          <button 
            onClick={() => handleGeminiTranslateAll()}
            disabled={isTranslatingAll || !selectedChapter || !userApiKey}
            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-30 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider relative overflow-hidden"
            title="Gemini Всё"
          >
            {isTranslatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">
              {translationProgress ? `Перевод: ${translationProgress.current}/${translationProgress.total}` : 'Gemini Всё'}
            </span>
            {translationProgress && (
              <div 
                className="absolute bottom-0 left-0 h-0.5 bg-purple-500 transition-all duration-300" 
                style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }}
              />
            )}
          </button>

              <button 
                onClick={() => setShowExportModal(true)}
                disabled={!selectedChapter || blocks.length === 0}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30 disabled:opacity-30 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-wider"
                title="Отправить"
              >
                <Check className="w-3.5 h-3.5" /> 
                <span className="hidden lg:inline">Отправить</span>
              </button>

              <div className="h-6 w-px bg-white/10 mx-0.5 md:mx-1 shrink-0" />

              <button
                onClick={handleExportCSV}
                disabled={!selectedChapter || blocks.length === 0}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors disabled:opacity-30 text-[10px] font-bold uppercase tracking-wider"
                title="Экспорт CSV"
              >
                <Download className="w-3.5 h-3.5" /> 
                <span className="hidden xl:inline">Экспорт CSV</span>
              </button>
              <label 
                className={`flex items-center gap-2 px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-wider ${!selectedChapter ? 'opacity-30 cursor-not-allowed' : ''}`}
                title="Импорт CSV"
              >
                <Upload className="w-3.5 h-3.5" /> 
                <span className="hidden xl:inline">Импорт CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={!selectedChapter} />
              </label>
            </div>
          </div>

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
                              <button 
                                onClick={handleSubmitToDiscord}
                                disabled={isSubmitting || submitStatus === 'success'}
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
                              <tr key={block.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
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
                                    style={{ fontFamily: readerFont }}
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
                                    style={{ fontFamily: readerFont }}
                                  >
                                    {block.content[referenceLangs[0] || 'en_US']?.text || '---'}
                                  </div>
                                </td>

                                {/* Target Column */}
                                <td className={`p-2 md:p-3 align-top border-l border-white/5 bg-[#4ade80]/5 min-w-[150px] md:min-w-[250px]`}>
                                  <div className="flex flex-col gap-2">
                                    {block.prefix.includes('options="') && (
                                      <div className="text-[10px] font-bold text-amber-400 mb-1 uppercase tracking-tight flex items-center gap-1">
                                        <List className="w-3 h-3" /> Выбор
                                      </div>
                                    )}
                                    {block.content[sourceLang]?.name && (
                                      <input
                                        type="text"
                                        value={block.content[activeTargetLang]?.name || ''}
                                        onChange={(e) => handleCharacterNameChange(block.id, e.target.value, activeTargetLang)}
                                        className="bg-black/50 border border-white/10 rounded-sm px-2 py-1 text-[10px] font-medium text-[#4ade80] outline-none focus:border-[#4ade80]/50 w-full placeholder:text-white/10 transition-colors"
                                        placeholder="Character Name..."
                                      />
                                    )}
                                    <div className="relative group/cell">
                                      <textarea
                                        value={block.content[activeTargetLang]?.text || ''}
                                        onChange={(e) => handleTranslationChange(block.id, e.target.value, activeTargetLang)}
                                        className="w-full bg-black/50 border border-white/10 rounded-sm px-2 py-1.5 text-white outline-none focus:border-white/30 resize-y min-h-[60px] transition-colors placeholder:text-white/10"
                                        placeholder={`Перевести на ${LANGUAGES.find(l => l.id === activeTargetLang)?.label}...`}
                                        style={{ fontFamily: readerFont }}
                                      />
                                      <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => handleGeminiTranslateBlock(block.id, activeTargetLang)}
                                          disabled={translatingBlockIds.has(block.id)}
                                          className="p-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-sm transition-colors disabled:opacity-50"
                                          title="Перевести с помощью Gemini"
                                        >
                                          {translatingBlockIds.has(block.id) ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Sparkles className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
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
        </div>
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
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowProfileModal(false)}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                      >
                        Отмена
                      </button>
                      <button 
                        onClick={() => handleDeleteProfile(profileModalValue)}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                      >
                        Удалить
                      </button>
                    </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Имя профиля</label>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 border border-white/10 rounded-sm">
                      <User className="w-4 h-4 text-white/40" />
                      <input 
                        type="text"
                        placeholder="Введите имя профиля..."
                        value={profileModalValue}
                        onChange={(e) => setProfileModalValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (profileModalMode === 'add') handleAddProfile(profileModalValue);
                            else handleRenameProfile(profileModalValue);
                          }
                        }}
                        className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  {profileModalMode === 'add' && TRANSLATION_REGISTRY[activeTargetLang]?.translators && TRANSLATION_REGISTRY[activeTargetLang]!.translators.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Общие переводы</label>
                      <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                        {TRANSLATION_REGISTRY[activeTargetLang]?.translators.map(t => (
                          <button
                            key={t}
                            onClick={() => {
                              handleAddProfile(t);
                              setShowProfileModal(false);
                            }}
                            disabled={profiles.includes(t)}
                            className="flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors text-left disabled:opacity-30"
                          >
                            <span className="text-[11px] font-medium">{t}</span>
                            <Plus className="w-3 h-3 text-[#4ade80]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={() => {
                        if (profileModalMode === 'add') handleAddProfile(profileModalValue);
                        else handleRenameProfile(profileModalValue);
                      }}
                      disabled={!profileModalValue.trim()}
                      className="flex-1 py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-black text-[10px] font-black rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      {profileModalMode === 'add' ? 'Создать профиль' : 'Сохранить изменения'}
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
}
