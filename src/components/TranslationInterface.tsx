import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Copy, Check, Globe, FileText, ChevronDown, AlertCircle, Play, Search, Sparkles, Loader2, User, UserPlus, Trash2, Plus, Key, MessageSquare, ExternalLink, X } from 'lucide-react';
import { StoryEpisode, Language, StoryChapter } from '../types';
import { fetchChapterList, fetchStoryScript } from '../services/storyService';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';

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
  textToTranslate: string;
  translatedText: string;
  characterName?: string;
  translatedCharacterName?: string;
}

function parseTranslationBlocks(rawText: string): TranslationBlock[] {
  const lines = rawText.split(/\r?\n/);
  return lines.map((line, index) => {
    const id = `line-${index}`;
    const trimmed = line.trim();
    
    if (trimmed === '') {
      return { id, type: 'empty', originalText: line, prefix: '', textToTranslate: '', translatedText: '' };
    }
    if (trimmed.startsWith('//')) {
      return { id, type: 'comment', originalText: line, prefix: '', textToTranslate: '', translatedText: '' };
    }
    if (trimmed.toUpperCase().startsWith('[HEADER')) {
      return { id, type: 'command', originalText: line, prefix: '', textToTranslate: '', translatedText: '' };
    }
    
    const match = line.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
    if (match) {
      const prefix = match[1];
      const textToTranslate = match[2];
      
      let characterName = undefined;
      const nameMatch = prefix.match(/name="([^"]+)"/);
      if (nameMatch) {
        characterName = nameMatch[1];
      }
      
      if (textToTranslate.trim() === '') {
        return { id, type: 'command', originalText: line, prefix, textToTranslate: '', translatedText: '' };
      } else {
        return { 
          id, 
          type: 'dialogue', 
          originalText: line, 
          prefix, 
          textToTranslate,
          translatedText: '',
          characterName,
          translatedCharacterName: characterName
        };
      }
    }
    
    return { id, type: 'dialogue', originalText: line, prefix: '', textToTranslate: line, translatedText: '' };
  });
}

export function TranslationInterface({ onClose, onTestTranslation, initialChapter, initialEpisode }: TranslationInterfaceProps) {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLang, setSourceLang] = useState<Language>('en_US');
  const [targetLang, setTargetLang] = useState<Language>('ru_RU');
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

  const [searchQuery, setSearchQuery] = useState('');
  
  const [episodeNameTranslation, setEpisodeNameTranslation] = useState('');
  const [chapterNameTranslation, setChapterNameTranslation] = useState('');
  
  // Profile Management
  const [profiles, setProfiles] = useState<string[]>(() => {
    const saved = localStorage.getItem('ak-profiles');
    return saved ? JSON.parse(saved) : ['Default'];
  });
  
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem('ak-current-profile') || 'Default';
  });

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('ak-user-api-key') || '');
  const [showExportModal, setShowExportModal] = useState(false);
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
      const response = await fetch('/api/auth/discord/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const width = 600;
      const height = 800;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'discord_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert('Please allow popups to login with Discord');
      }
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
    localStorage.setItem('ak-profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('ak-current-profile', activeProfile);
    
    // Load translations for the new active profile
    const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
    const saved = localStorage.getItem(key);
    setAllTranslations(saved ? JSON.parse(saved) : {});
  }, [activeProfile]);

  useEffect(() => {
    const key = activeProfile === 'Default' ? 'ak-translations-v3' : `ak-translations-v3-${activeProfile}`;
    localStorage.setItem(key, JSON.stringify(allTranslations));
  }, [allTranslations, activeProfile]);

  useEffect(() => {
    localStorage.setItem('ak-chapter-stats', JSON.stringify(chapterStats));
  }, [chapterStats]);

  useEffect(() => {
    localStorage.setItem('ak-user-api-key', userApiKey);
  }, [userApiKey]);

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
      alert('Cannot delete the Default profile.');
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
      alert('A profile with this name already exists.');
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
    const translations = allTranslations[storyTxt] || {};
    const translatedCount = Object.values(translations).filter(t => t.text?.trim()).length;
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
          const translations = allTranslations[ch.storyTxt] || {};
          const translatedCount = Object.values(translations).filter(t => t.text?.trim()).length;
          totalProgress += (translatedCount / total);
        }
      }
    });

    if (episode.chapters.length === 0) return 0;
    return Math.round((totalProgress / episode.chapters.length) * 100);
  };

  const progress = useMemo(() => {
    if (!selectedChapter) return 0;
    return getChapterProgress(selectedChapter.storyTxt);
  }, [selectedChapter, allTranslations, chapterStats]);

  const filteredEpisodes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // If an episode is selected and no search query, only show the selected episode
    if (selectedEpisode && !query) {
      return [selectedEpisode];
    }

    return episodes.filter(ep => {
      if (ep.entryType === 'NONE') return false;
      if (!query) return true;
      
      const matchEpisode = ep.name.toLowerCase().includes(query) || ep.id.toLowerCase().includes(query);
      const matchChapter = ep.chapters.some(ch => 
        (ch.storyName && ch.storyName.toLowerCase().includes(query)) || 
        (ch.storyCode && ch.storyCode.toLowerCase().includes(query)) ||
        ch.storyTxt.toLowerCase().includes(query)
      );
      
      return matchEpisode || matchChapter;
    });
  }, [episodes, searchQuery, selectedEpisode]);

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
        const sourceText = await fetchStoryScript(selectedChapter.storyTxt, sourceLang);
        if (!isMounted) return;

        const parsedBlocks = parseTranslationBlocks(sourceText);
        const dialogueBlocks = parsedBlocks.filter(b => b.type === 'dialogue');
        
        // Update stats for progress calculation
        setChapterStats(prev => ({
          ...prev,
          [selectedChapter.storyTxt]: dialogueBlocks.length
        }));

        // Check if we have local translations first
        const localTranslations = allTranslations[selectedChapter.storyTxt];
        
        if (localTranslations) {
          if (localTranslations['__episode_name__']?.text) {
            setEpisodeNameTranslation(localTranslations['__episode_name__'].text);
          } else {
            setEpisodeNameTranslation('');
          }
          if (localTranslations['__chapter_name__']?.text) {
            setChapterNameTranslation(localTranslations['__chapter_name__'].text);
          } else {
            setChapterNameTranslation('');
          }

          parsedBlocks.forEach((block, idx) => {
            if (block.type === 'dialogue') {
              if (localTranslations[idx]?.text) {
                block.translatedText = localTranslations[idx].text!;
              }
              if (localTranslations[idx]?.name) {
                block.translatedCharacterName = localTranslations[idx].name!;
              }
            }
          });
        } else {
          // Fallback to fetching existing translation from server if no local data
          try {
            const targetText = await fetchStoryScript(selectedChapter.storyTxt, targetLang, true);
            if (isMounted && targetText && targetText !== sourceText) {
              const targetLines = targetText.split(/\r?\n/);
              parsedBlocks.forEach((block, idx) => {
                if (block.type === 'dialogue' && idx < targetLines.length) {
                  const targetLine = targetLines[idx];
                  const match = targetLine.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
                  if (match) {
                    block.translatedText = match[2];
                    if (block.characterName) {
                      const targetNameMatch = match[1].match(/name="([^"]+)"/);
                      if (targetNameMatch) {
                        block.translatedCharacterName = targetNameMatch[1];
                      }
                    }
                  } else {
                    block.translatedText = targetLine;
                  }
                }
              });
            }
          } catch (e) {
            // Expected if no translation exists
          }
        }

        if (isMounted) {
          setBlocks(parsedBlocks);
          setLoadingScript(false);
        }
      } catch (err) {
        console.error('Failed to load source script', err);
        if (isMounted) {
          setBlocks([]);
          setLoadingScript(false);
        }
      }
    };

    loadScripts();

    return () => { isMounted = false; };
  }, [selectedChapter, sourceLang, targetLang]);

  const handleTranslationChange = (id: string, newText: string) => {
    if (id === '__episode_name__') {
      setEpisodeNameTranslation(newText);
      if (selectedChapter) {
        setAllTranslations(prev => {
          const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
          chapterTranslations['__episode_name__'] = { ...(chapterTranslations['__episode_name__'] || {}), text: newText };
          return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
        });
      }
      return;
    }
    if (id === '__chapter_name__') {
      setChapterNameTranslation(newText);
      if (selectedChapter) {
        setAllTranslations(prev => {
          const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
          chapterTranslations['__chapter_name__'] = { ...(chapterTranslations['__chapter_name__'] || {}), text: newText };
          return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
        });
      }
      return;
    }

    setBlocks(prev => prev.map(b => b.id === id ? { ...b, translatedText: newText } : b));
    
    if (selectedChapter) {
      const index = blocks.findIndex(b => b.id === id);
      if (index !== -1) {
        setAllTranslations(prev => {
          const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
          const current = chapterTranslations[index] || {};
          
          if (newText.trim() === '' && !current.name) {
            delete chapterTranslations[index];
          } else {
            chapterTranslations[index] = { ...current, text: newText };
          }
          return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
        });
      }
    }
  };

  const handleCharacterNameChange = (id: string, newName: string) => {
    const targetBlock = blocks.find(b => b.id === id);
    if (!targetBlock || !targetBlock.characterName) return;

    const originalName = targetBlock.characterName;

    // Update all blocks with the same original name in the current view
    setBlocks(prev => prev.map(b => 
      b.characterName === originalName ? { ...b, translatedCharacterName: newName } : b
    ));
    
    if (selectedChapter) {
      setAllTranslations(prev => {
        const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
        
        // Find all indices that have this original name
        blocks.forEach((b, idx) => {
          if (b.characterName === originalName) {
            const current = chapterTranslations[idx] || {};
            if (newName.trim() === '' && !current.text) {
              delete chapterTranslations[idx];
            } else {
              chapterTranslations[idx] = { ...current, name: newName };
            }
          }
        });
        
        return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
      });
    }
  };

  const translateBatchWithGemini = async (batch: TranslationBlock[], context?: { character: string, text: string }[]) => {
    try {
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        alert("Gemini API Key is missing. Please provide your own API Key in the sidebar settings.");
        return null;
      }

      const ai = new GoogleGenAI({ apiKey });
      const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
      const toLabel = LANGUAGES.find(l => l.id === targetLang)?.label || targetLang;
      
      const glossary = blocks
        .filter(b => b.characterName && b.translatedCharacterName)
        .reduce((acc, b) => {
          acc[b.characterName!] = b.translatedCharacterName!;
          return acc;
        }, {} as Record<string, string>);

      const prompt = {
        glossary,
        context: context || [],
        toTranslate: batch.map(b => ({
          id: b.id,
          character: b.characterName || "Narrator/System",
          text: b.textToTranslate
        }))
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
          
          CRITICAL FOR RUSSIAN TRANSLATION:
          - Use the 'character' name and 'context' (previous lines) to determine the correct gender endings for verbs and adjectives.
          - If the character is female (e.g., Amiya, Kal'tsit, Ch'en, etc.), use feminine endings.
          - If the character is male (e.g., Doctor, SilverAsh, etc.), use masculine endings.
          - Maintain a consistent tone (formal/informal) based on character relationships.
          
          CHARACTER NAMES:
          - Use the 'glossary' for consistent character name translations if available.
          - Translate the 'character' name into ${toLabel} if it's a common name or title (e.g., "Guard" -> "Охранник").
          - For unique names (e.g., "Amiya"), provide the transliteration/standard translation in ${toLabel} (e.g., "Амия").
          - If the character is "Narrator/System", keep it as is or translate appropriately.
          
          Respond ONLY with a JSON array of objects, each containing the 'id', 'translatedCharacter', and 'translatedText'.`,
        },
        contents: JSON.stringify(prompt),
      });
      
      if (!response.text) {
        console.warn("Gemini returned an empty response for batch");
        return null;
      }

      try {
        const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanedText) as { id: string, translatedText: string, translatedCharacter: string }[];
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

  const translateWithGemini = async (blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return null;

    const block = blocks[blockIndex];
    
    // Provide some context from previous lines
    const context = blocks.slice(Math.max(0, blockIndex - 3), blockIndex).map(b => ({
      character: b.characterName || "Narrator/System",
      text: b.translatedText || b.textToTranslate
    }));

    const result = await translateBatchWithGemini([block], context);
    return result?.[0] || null;
  };

  const handleGeminiTranslateMetadata = async (type: 'episode' | 'chapter') => {
    const textToTranslate = type === 'episode' ? selectedEpisode?.name : selectedChapter?.name;
    if (!textToTranslate) return;

    const id = type === 'episode' ? '__episode_name__' : '__chapter_name__';
    setTranslatingBlockIds(prev => new Set(prev).add(id));

    try {
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        alert("Gemini API Key is missing. Please provide your own API Key in the sidebar settings.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const fromLabel = LANGUAGES.find(l => l.id === sourceLang)?.label || sourceLang;
      const toLabel = LANGUAGES.find(l => l.id === targetLang)?.label || targetLang;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a professional game translator specializing in Arknights. 
          Translate the following ${type} title from ${fromLabel} to ${toLabel}. 
          Maintain the tone and style of Arknights. 
          Respond ONLY with the translated text.`,
        },
        contents: textToTranslate,
      });

      if (response.text) {
        handleTranslationChange(id, response.text.trim());
      }
    } catch (error: any) {
      console.error(`Gemini metadata translation error (${type}):`, error);
      if (error?.message?.toLowerCase().includes("quota")) {
        alert("Gemini API quota exceeded. Please wait a moment.");
      }
    } finally {
      setTranslatingBlockIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleGeminiTranslateBlock = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.textToTranslate) return;
    
    setTranslatingBlockIds(prev => new Set(prev).add(blockId));
    try {
      const result = await translateWithGemini(blockId);
      if (result) {
        handleTranslationChange(blockId, result.translatedText);
        if (block.characterName) {
          handleCharacterNameChange(blockId, result.translatedCharacter);
        }
      }
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") {
        alert("Gemini API quota exceeded. Please wait a moment.");
      }
    } finally {
      setTranslatingBlockIds(prev => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    }
  };

  const handleGeminiTranslateAll = async () => {
    if (!selectedChapter || isTranslatingAll) return;
    
    const emptyBlocks = blocks.filter(b => b.type === 'dialogue' && !b.translatedText.trim());
    if (emptyBlocks.length === 0) return;

    setIsTranslatingAll(true);
    
    // Batch size for context and efficiency
    const BATCH_SIZE = 5;
    const batches: TranslationBlock[][] = [];
    for (let i = 0; i < emptyBlocks.length; i += BATCH_SIZE) {
      batches.push(emptyBlocks.slice(i, i + BATCH_SIZE));
    }

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Mark all blocks in batch as translating
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.add(b.id));
          return next;
        });
        
        // Get context from preceding blocks (even if not in current batch)
        const firstBlockInBatch = batch[0];
        const firstBlockIndex = blocks.findIndex(b => b.id === firstBlockInBatch.id);
        const context = blocks.slice(Math.max(0, firstBlockIndex - 5), firstBlockIndex).map(b => ({
          character: b.characterName || "Narrator/System",
          text: b.translatedText || b.textToTranslate
        }));

        const results = await translateBatchWithGemini(batch, context);
        
        if (results) {
          // Use a functional update for blocks to avoid stale state issues in the loop
          setBlocks(prev => {
            const next = [...prev];
            results.forEach(res => {
              const idx = next.findIndex(b => b.id === res.id);
              if (idx !== -1) {
                const originalName = next[idx].characterName;
                const translatedName = res.translatedCharacter;

                // Update this block
                next[idx] = { 
                  ...next[idx], 
                  translatedText: res.translatedText,
                  translatedCharacterName: originalName ? translatedName : next[idx].translatedCharacterName
                };

                // Apply character name translation globally in the current script
                if (originalName && translatedName) {
                  for (let j = 0; j < next.length; j++) {
                    if (next[j].characterName === originalName) {
                      next[j].translatedCharacterName = translatedName;
                    }
                  }
                }
              }
            });
            return next;
          });
          
          // Also update persistent state
          if (selectedChapter) {
            setAllTranslations(prev => {
              const chapterTranslations = { ...(prev[selectedChapter.storyTxt] || {}) };
              results.forEach(res => {
                const blockIndex = blocks.findIndex(b => b.id === res.id);
                if (blockIndex !== -1) {
                  const originalName = blocks[blockIndex].characterName;
                  const translatedName = res.translatedCharacter;

                  // Update this block's translation
                  const current = chapterTranslations[blockIndex] || {};
                  chapterTranslations[blockIndex] = { ...current, text: res.translatedText, name: originalName ? translatedName : current.name };

                  // Apply character name translation globally in persistent state
                  if (originalName && translatedName) {
                    blocks.forEach((b, idx) => {
                      if (b.characterName === originalName) {
                        const chCurrent = chapterTranslations[idx] || {};
                        chapterTranslations[idx] = { ...chCurrent, name: translatedName };
                      }
                    });
                  }
                }
              });
              return { ...prev, [selectedChapter.storyTxt]: chapterTranslations };
            });
          }
        }
        
        // Clear translating status for this batch
        setTranslatingBlockIds(prev => {
          const next = new Set(prev);
          batch.forEach(b => next.delete(b.id));
          return next;
        });
        
        // Increased delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") {
        alert("Gemini API quota exceeded. Translation stopped.");
      } else {
        console.error("Batch translation failed:", error);
      }
    } finally {
      setTranslatingBlockIds(new Set());
      setIsTranslatingAll(false);
    }
  };

  const generateExportText = () => {
    const lines = blocks.map(b => {
      if (b.type === 'dialogue') {
        let finalPrefix = b.prefix;
        if (b.characterName && b.translatedCharacterName) {
          finalPrefix = finalPrefix.replace(`name="${b.characterName}"`, `name="${b.translatedCharacterName}"`);
        }
        return `${finalPrefix}${b.translatedText || b.textToTranslate}`;
      }
      return b.originalText;
    });

    if (activeProfile !== 'Default') {
      lines.unshift(`// Translated by: ${activeProfile}`);
    }

    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generateExportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateExcelWorkbook = () => {
    if (!selectedChapter || !selectedEpisode) return null;

    // 0. Metadata rows
    const metadataRows = [
      { 'ID': 'meta-episode-name', 'Original Text': selectedEpisode.name, 'Translation': episodeNameTranslation },
      { 'ID': 'meta-chapter-name', 'Original Text': selectedChapter.name, 'Translation': chapterNameTranslation },
      { 'ID': '', 'Original Text': '', 'Translation': '' } // Blank row
    ];

    // 1. Get unique character names
    const uniqueCharacters = Array.from(new Set(
      blocks
        .filter(b => b.type === 'dialogue' && b.characterName)
        .map(b => b.characterName!)
    ));

    const characterRows = uniqueCharacters.map((name, index) => {
      // Find the first block with this name to get its current translation
      const firstBlock = blocks.find(b => b.characterName === name);
      return {
        'ID': `char-${index + 1}`,
        'Original Text': name,
        'Translation': firstBlock?.translatedCharacterName || ''
      };
    });

    // 2. Get dialogue lines
    const dialogueRows = blocks
      .filter(b => b.type === 'dialogue')
      .map(b => ({
        'ID': b.id,
        'Original Text': b.textToTranslate,
        'Translation': b.translatedText || ''
      }));

    // 3. Combine with a blank row
    const data = [
      ...metadataRows,
      ...characterRows,
      { 'ID': '', 'Original Text': '', 'Translation': '' }, // Blank row
      ...dialogueRows
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Translations");
    
    // Set column widths
    const wscols = [
      { wch: 15 }, // ID
      { wch: 60 }, // Original Text
      { wch: 60 }, // Translation
    ];
    worksheet['!cols'] = wscols;

    return workbook;
  };

  const handleExportExcel = () => {
    const workbook = generateExcelWorkbook();
    if (!workbook || !selectedChapter) return;

    const baseName = selectedChapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'translation';
    const fileName = `${baseName}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChapter) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newTranslations = { ...allTranslations };
        const chapterKey = selectedChapter.storyTxt;
        if (!newTranslations[chapterKey]) newTranslations[chapterKey] = {};

        // We'll update blocks state in one go at the end
        const updatedBlocks = [...blocks];

        jsonData.forEach(row => {
          const id = row['ID']?.toString();
          const translation = row['Translation']?.toString() || '';
          const original = row['Original Text']?.toString() || '';

          if (!id) return;

          if (id === 'meta-episode-name') {
            newTranslations[chapterKey]['__episode_name__'] = { ...(newTranslations[chapterKey]['__episode_name__'] || {}), text: translation };
            setEpisodeNameTranslation(translation);
            return;
          }
          if (id === 'meta-chapter-name') {
            newTranslations[chapterKey]['__chapter_name__'] = { ...(newTranslations[chapterKey]['__chapter_name__'] || {}), text: translation };
            setChapterNameTranslation(translation);
            return;
          }

          if (id.startsWith('char-')) {
            // Character name translation
            if (original && translation) {
              // Update all blocks with this original character name
              updatedBlocks.forEach((b, idx) => {
                if (b.characterName === original) {
                  b.translatedCharacterName = translation;
                  
                  // Update persistent state
                  const current = newTranslations[chapterKey][idx] || {};
                  newTranslations[chapterKey][idx] = { ...current, name: translation };
                }
              });
            }
          } else if (id.startsWith('line-')) {
            // Dialogue translation
            const index = updatedBlocks.findIndex(b => b.id === id);
            if (index !== -1) {
              updatedBlocks[index].translatedText = translation;
              
              // Update persistent state
              const current = newTranslations[chapterKey][index] || {};
              newTranslations[chapterKey][index] = { ...current, text: translation };
            }
          }
        });

        setBlocks(updatedBlocks);
        setAllTranslations(newTranslations);
        alert('Excel imported successfully!');
      } catch (error) {
        console.error('Excel import error:', error);
        alert('Failed to import Excel. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = '';
  };

  const handleSubmitToDiscord = async () => {
    if (!SUBMISSION_WEBHOOK_URL || !selectedChapter) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeTranslatorName = activeProfile.replace(/[^a-z0-9]/gi, '_');
      const safeChapterName = (selectedChapter.storyName || selectedChapter.storyCode || 'chapter').replace(/[^a-z0-9]/gi, '_');
      
      const baseFileName = `[${safeTranslatorName}]_${safeChapterName}_${timestamp}`;
      
      // 1. Prepare TXT file
      const exportText = generateExportText();
      const txtBlob = new Blob([exportText], { type: 'text/plain' });
      const txtFile = new File([txtBlob], `${baseFileName}.txt`);

      // 2. Prepare Excel file
      const workbook = generateExcelWorkbook();
      let excelFile: File | null = null;
      if (workbook) {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        excelFile = new File([excelBlob], `${baseFileName}.xlsx`);
      }

      // Prepare form data for Discord
      const formData = new FormData();
      const payload = {
        content: `🚀 **New Translation Submission**\n**Translator:** ${activeProfile}${discordUser ? ` (<@${discordUser.id}>)` : ''}\n**Episode:** ${selectedEpisode?.name || 'Unknown'}\n**Chapter:** ${selectedChapter.storyName || selectedChapter.storyCode}\n**Language:** ${LANGUAGES.find(l => l.id === targetLang)?.label}`,
        username: "Arknights Translator Bot"
      };
      
      formData.append('payload_json', JSON.stringify(payload));
      formData.append('file0', txtFile);
      if (excelFile) {
        formData.append('file1', excelFile);
      }

      const response = await fetch(SUBMISSION_WEBHOOK_URL, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setSubmitStatus('success');
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
  const handleExport = () => {
    if (!selectedChapter) return;
    const text = generateExportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract filename from path (e.g. "level_act11d0_st01.txt")
    const baseName = selectedChapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'translation';
    const filename = `${baseName}.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chaptersList = useMemo(() => {
    if (!selectedEpisode) return [];
    return selectedEpisode.chapters;
  }, [selectedEpisode]);

  return (
    <div className="w-full h-full bg-black flex flex-col text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="h-auto md:h-16 py-3 md:py-0 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center px-4 md:px-6 justify-between shrink-0 bg-[#0a0a0a] gap-4 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <button 
            onClick={() => onClose()}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white/10 rounded-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-lg font-black uppercase tracking-widest truncate">Community Translation Tool</h1>
            <p className="text-[9px] md:text-[10px] text-white/50 uppercase tracking-widest hidden sm:block">Contribute to the Archive</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <div className="flex items-center gap-2 bg-white/5 px-2 md:px-3 py-1.5 border border-white/10 rounded-sm shrink-0">
            <span className="text-[9px] md:text-[10px] font-bold text-white/50 uppercase">Source</span>
            <select 
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as Language)}
              className="bg-transparent text-[10px] md:text-xs font-medium outline-none cursor-pointer"
            >
              {LANGUAGES.filter(l => l.isOfficial).map(l => (
                <option key={l.id} value={l.id} className="bg-black">{l.label}</option>
              ))}
            </select>
          </div>
          <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 text-white/20 rotate-180 shrink-0" />
          <div className="flex items-center gap-2 bg-white/5 px-2 md:px-3 py-1.5 border border-white/10 rounded-sm shrink-0">
            <span className="text-[9px] md:text-[10px] font-bold text-white/50 uppercase">Target</span>
            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as Language)}
              className="bg-transparent text-[10px] md:text-xs font-medium outline-none cursor-pointer"
            >
              {LANGUAGES.filter(l => !l.isOfficial).map(l => (
                <option key={l.id} value={l.id} className="bg-black">{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Episode List */}
        <div className={`w-full md:w-80 border-r border-white/10 flex-col bg-[#0a0a0a] shrink-0 ${selectedChapter ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 shrink-0 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Translator Profile</h2>
                {discordUser && (
                  <button 
                    onClick={handleDiscordLogout}
                    className="text-[8px] text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
              
              {isCheckingDiscord ? (
                <div className="flex items-center justify-center py-3 bg-white/5 border border-white/10 rounded-sm">
                  <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />
                </div>
              ) : discordUser ? (
                <div className="flex items-center gap-3 bg-white/5 p-2 border border-white/10 rounded-sm">
                  {discordUser.avatar ? (
                    <img src={discordUser.avatar} alt={discordUser.username} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-white truncate">{discordUser.username}</span>
                    <span className={`text-[8px] uppercase font-black tracking-wider ${isDiscordMember ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {isDiscordMember ? 'Verified Member' : 'Not on Server'}
                    </span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleDiscordLogin}
                  className="flex items-center justify-center gap-2 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-wider"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Login with Discord
                </button>
              )}

              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 border border-white/10 rounded-sm group relative">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  <select 
                    value={activeProfile}
                    onChange={(e) => setActiveProfile(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none flex-1 cursor-pointer appearance-none pr-6"
                  >
                    {profiles.map(p => (
                      <option key={p} value={p} className="bg-[#111] text-white">{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2 pointer-events-none" />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => {
                      setProfileModalMode('add');
                      setProfileModalValue('');
                      setShowProfileModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                  <button 
                    onClick={() => {
                      setProfileModalMode('rename');
                      setProfileModalValue(activeProfile);
                      setShowProfileModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Rename
                  </button>
                  <button 
                    onClick={() => {
                      if (activeProfile === 'Default') return;
                      setProfileModalMode('delete');
                      setProfileModalValue(activeProfile);
                      setShowProfileModal(true);
                    }}
                    disabled={activeProfile === 'Default'}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-colors text-white/40 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white/40"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Gemini API Key</h2>
              <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 border border-white/10 rounded-sm">
                <Key className="w-3.5 h-3.5 text-white/40" />
                <input 
                  type="password"
                  placeholder="Paste your API Key..."
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none flex-1 placeholder:text-white/20"
                />
              </div>
              <p className="text-[8px] text-white/30 leading-tight">
                Your key is stored locally in your browser and never sent to our server. Get one at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Excel Tools</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportExcel}
                  disabled={!selectedChapter}
                  className="flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
                <label className="flex items-center justify-center gap-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" /> Import
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    onChange={handleImportExcel}
                    disabled={!selectedChapter}
                  />
                </label>
              </div>
              <p className="text-[8px] text-white/30 leading-tight">
                Export to Excel for offline translation, then import back.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Search & Filter</h2>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search episodes or chapters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
            {loading ? (
              <div className="p-4 text-center text-white/40 text-xs">Loading...</div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredEpisodes.map(ep => {
                  const epProgress = getEpisodeProgress(ep);
                  return (
                    <div key={ep.id} className="flex flex-col">
                      <button
                        onClick={() => setSelectedEpisode(selectedEpisode?.id === ep.id ? null : ep)}
                        className={`text-left px-3 py-2 text-xs rounded-sm transition-colors flex justify-between items-center ${
                          selectedEpisode?.id === ep.id 
                            ? 'bg-white/10 text-white font-bold' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="truncate">{ep.name}</div>
                          <span className={`text-[9px] px-1 rounded-full ${epProgress === 100 ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-white/10 text-white/40'}`}>
                            {epProgress}%
                          </span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${selectedEpisode?.id === ep.id ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {selectedEpisode?.id === ep.id && (
                        <div className="pl-4 pr-2 py-1 flex flex-col gap-1 border-l border-white/10 ml-3 my-1">
                          {ep.chapters.map(ch => {
                            const chProgress = getChapterProgress(ch.storyTxt);
                            return (
                              <button
                                key={ch.storyTxt}
                                onClick={() => setSelectedChapter(ch)}
                                className={`text-left px-3 py-1.5 text-[11px] rounded-sm transition-colors flex justify-between items-center ${
                                  selectedChapter?.storyTxt === ch.storyTxt
                                    ? 'bg-white/20 text-white font-bold'
                                    : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                                }`}
                              >
                                <span className="truncate">{ch.storyName || ch.storyCode || ch.storyTxt.split('/').pop()}</span>
                                <span className={`text-[8px] px-1 rounded-full ${chProgress === 100 ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-white/10 text-white/30'}`}>
                                  {chProgress}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className={`flex-1 flex-col bg-[#111] min-w-0 ${!selectedChapter ? 'hidden md:flex' : 'flex'}`}>
          {!selectedChapter ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">Select a chapter to start translating</p>
            </div>
          ) : loadingScript ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Script...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Editor Toolbar */}
              <div className="h-auto md:h-12 py-2 md:py-0 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center px-4 md:px-6 bg-white/5 justify-between shrink-0 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                  <button 
                    onClick={() => setSelectedChapter(null)}
                    className="md:hidden w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-sm mr-1 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/10 rounded-sm shrink-0">
                    <span className="text-[9px] font-bold text-white/40 uppercase">Translator</span>
                    <input 
                      type="text" 
                      placeholder="Enter Your Name" 
                      value={activeProfile}
                      onChange={(e) => handleRenameProfile(e.target.value)}
                      className="bg-transparent text-[10px] text-white outline-none w-24 md:w-32 placeholder:text-white/20"
                    />
                  </div>

                  <div className="h-4 w-px bg-white/10 mx-1 hidden md:block" />

                  <span className="text-[10px] md:text-xs font-bold text-white/70 truncate">{selectedChapter.storyName || selectedChapter.storyCode}</span>
                  
                  {/* Progress Bar (Desktop) */}
                  <div className="hidden md:flex items-center gap-2 ml-2">
                    <div className="w-16 h-1.5 bg-black rounded-full overflow-hidden">
                      <div className="h-full bg-[#4ade80] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-white/50 font-mono">{progress}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {/* Progress Text (Mobile) */}
                  <div className="md:hidden flex items-center gap-2 mr-auto">
                    <span className="text-[10px] text-[#4ade80] font-mono">{progress}%</span>
                  </div>

                  {onTestTranslation && (
                    <button 
                      onClick={() => onTestTranslation(selectedChapter, generateExportText())}
                      className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-sm transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-wider shrink-0"
                    >
                      <Play className="w-3 h-3 md:w-3.5 md:h-3.5" /> Test
                    </button>
                  )}
                  <button 
                    onClick={handleGeminiTranslateAll}
                    disabled={isTranslatingAll}
                    className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 rounded-sm transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-wider shrink-0"
                  >
                    {isTranslatingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Gemini All
                  </button>
                  <button 
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30 rounded-sm transition-colors text-[9px] md:text-[10px] font-bold uppercase tracking-wider shrink-0"
                  >
                    <Download className="w-3 h-3 md:w-3.5 md:h-3.5" /> Export
                  </button>
                </div>
              </div>

              {/* Export Submission Modal */}
              {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-[#111] border border-white/10 rounded-sm w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Download className="w-4 h-4 text-[#4ade80]" /> Export Translation
                      </h3>
                      <button onClick={() => setShowExportModal(false)} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-sm">
                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-blue-100 uppercase tracking-tight">Submission Notice</p>
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
                                className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest"
                              >
                                <MessageSquare className="w-4 h-4" /> Login to Submit
                              </button>
                            ) : !isDiscordMember ? (
                              <div className="flex flex-col gap-2">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                                  <p className="text-[10px] text-red-400 font-bold uppercase text-center">
                                    You must be a member of our Discord server to submit.
                                  </p>
                                </div>
                                <a 
                                  href="https://discord.gg/arknights-story-archive" // Placeholder link
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest"
                                >
                                  <MessageSquare className="w-4 h-4" /> Join Discord Server
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
                                {submitStatus === 'success' ? 'Submitted Successfully' : isSubmitting ? 'Submitting...' : 'Submit to Discord'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <a 
                              href="https://discord.gg/arknights-story-archive" // Placeholder link
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-widest"
                            >
                              <MessageSquare className="w-4 h-4" /> Join Discord Server
                            </a>
                            <p className="text-[9px] text-white/30 italic text-center">
                              Please join our Discord to submit your translation.
                            </p>
                          </div>
                        )}
                        
                        {submitStatus === 'error' && (
                          <p className="text-[9px] text-red-400 text-center font-bold uppercase">
                            Error submitting. Please check your Webhook URL.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/5 mt-2">
                        <button 
                          onClick={() => {
                            handleExport();
                            setShowExportModal(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black text-xs font-black rounded-sm transition-colors uppercase tracking-widest"
                        >
                          <Download className="w-4 h-4" /> Download Script Now
                        </button>
                        <p className="text-[9px] text-center text-white/30 mt-3 uppercase tracking-tighter">
                          Файл будет экспортирован в формате скрипта Arknights (.txt)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Translation List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 bg-[#0a0a0a] min-h-0 select-text">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  {/* Episode & Chapter Name Translation */}
                  {selectedEpisode && selectedChapter && (
                    <div className="flex flex-col gap-3 mb-6 p-4 bg-white/5 border border-white/10 rounded-sm">
                      <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Story Metadata</h2>
                      
                      {/* Episode Name */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Episode Name</span>
                          <span className="text-[9px] font-mono text-white/20">{selectedEpisode.id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-2 bg-black/40 border border-white/5 rounded-sm text-xs text-white/60 italic">
                            {selectedEpisode.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={episodeNameTranslation}
                              onChange={(e) => handleTranslationChange('__episode_name__', e.target.value)}
                              placeholder="Translate episode name..."
                              className="flex-1 p-2 bg-white/5 border border-white/10 rounded-sm text-xs text-white outline-none focus:border-white/30 transition-colors"
                            />
                            <button 
                              onClick={() => handleGeminiTranslateMetadata('episode')}
                              disabled={translatingBlockIds.has('__episode_name__')}
                              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors disabled:opacity-50"
                              title="Translate with Gemini"
                            >
                              {translatingBlockIds.has('__episode_name__') ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-white/40" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Chapter Name */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Chapter Name</span>
                          <span className="text-[9px] font-mono text-white/20">{selectedChapter.id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-2 bg-black/40 border border-white/5 rounded-sm text-xs text-white/60 italic">
                            {selectedChapter.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={chapterNameTranslation}
                              onChange={(e) => handleTranslationChange('__chapter_name__', e.target.value)}
                              placeholder="Translate chapter name..."
                              className="flex-1 p-2 bg-white/5 border border-white/10 rounded-sm text-xs text-white outline-none focus:border-white/30 transition-colors"
                            />
                            <button 
                              onClick={() => handleGeminiTranslateMetadata('chapter')}
                              disabled={translatingBlockIds.has('__chapter_name__')}
                              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors disabled:opacity-50"
                              title="Translate with Gemini"
                            >
                              {translatingBlockIds.has('__chapter_name__') ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-white/40" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {blocks.map((block) => {
                    if (block.type === 'command') {
                      if (block.originalText.toUpperCase().includes('[HEADER')) {
                        return null;
                      }
                      return (
                        <div key={block.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm opacity-50 select-none">
                          <AlertCircle className="w-3 h-3 text-white/40" />
                          <span className="text-[10px] font-mono text-white/60 truncate">{block.originalText}</span>
                        </div>
                      );
                    }
                    
                    if (block.type === 'comment' || block.type === 'empty') {
                      return null; // Hide comments and empty lines to reduce clutter
                    }

                    return (
                      <div key={block.id} className="flex flex-col bg-[#111] border border-white/10 rounded-sm overflow-hidden focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/30 transition-all">
                        {/* Source Text */}
                        <div className="p-3 bg-white/5 border-b border-white/10 flex flex-col gap-1">
                          {block.prefix && (
                            <span className="text-[10px] font-mono text-white/40 select-none">{block.prefix}</span>
                          )}
                          <p className="text-sm text-white/80 leading-relaxed">{block.textToTranslate}</p>
                        </div>
                        
                        {/* Target Text Input */}
                        <div className="p-3 flex flex-col gap-3 bg-black/20">
                          {block.characterName && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#4ade80]/60 flex items-center gap-1.5">
                                <User className="w-2.5 h-2.5" /> Character Name Translation
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-white/20 select-none">{block.characterName} →</span>
                                <input
                                  type="text"
                                  value={block.translatedCharacterName || ''}
                                  onChange={(e) => handleCharacterNameChange(block.id, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-sm px-2 py-1 text-xs font-medium text-[#4ade80] outline-none focus:border-[#4ade80]/50 flex-1 placeholder:text-white/10"
                                  placeholder="Enter translated name..."
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                              <MessageSquare className="w-2.5 h-2.5" /> Dialogue Translation
                            </label>
                            <textarea
                              value={block.translatedText}
                              onChange={(e) => handleTranslationChange(block.id, e.target.value)}
                              placeholder="Enter dialogue translation..."
                              className="w-full bg-transparent resize-none outline-none text-sm text-white leading-relaxed placeholder:text-white/20 min-h-[40px]"
                              rows={Math.max(1, block.translatedText.split('\n').length, block.textToTranslate.split('\n').length)}
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleGeminiTranslateBlock(block.id)}
                              disabled={translatingBlockIds.has(block.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 rounded-sm transition-colors text-[9px] font-bold uppercase tracking-wider"
                              title="Translate with Gemini"
                            >
                              {translatingBlockIds.has(block.id) ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                              Gemini
                            </button>
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
                {profileModalMode === 'add' && 'Create New Profile'}
                {profileModalMode === 'rename' && 'Rename Profile'}
                {profileModalMode === 'delete' && 'Delete Profile'}
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
                      <p className="text-xs font-bold text-red-100 uppercase tracking-tight">Warning</p>
                      <p className="text-[11px] text-red-100/70 leading-relaxed">
                        Are you sure you want to delete the profile <span className="text-white font-bold">"{profileModalValue}"</span>? 
                        This will permanently remove all translations associated with this profile.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleDeleteProfile(profileModalValue)}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Profile Name</label>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 border border-white/10 rounded-sm">
                      <User className="w-4 h-4 text-white/40" />
                      <input 
                        type="text"
                        placeholder="Enter profile name..."
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-sm transition-colors uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (profileModalMode === 'add') handleAddProfile(profileModalValue);
                        else handleRenameProfile(profileModalValue);
                      }}
                      disabled={!profileModalValue.trim()}
                      className="flex-1 py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-black text-[10px] font-black rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      {profileModalMode === 'add' ? 'Create Profile' : 'Save Changes'}
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
