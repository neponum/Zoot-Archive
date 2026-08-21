import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StoryChapter, StoryEpisode } from '../types';
import { EnrichedOperator } from '../services/operatorService';
import { audioManager } from '../services/audioManager';
import { fetchChapterList } from '../services/storyService';
import { isOperatorEpisode, extractOperatorKey } from '../utils/operatorUtils';

export function useTranslationState() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTranslator, setSelectedTranslator] = useState<string | undefined>(() => {
    return localStorage.getItem('ak-selected-translator') || undefined;
  });

  const [showTranslationUI, setShowTranslationUI] = useState(() => {
    return localStorage.getItem('ak-show-translation-ui') === 'true';
  });

  const [translationChapter, setTranslationChapter] = useState<StoryChapter | null>(() => {
    try {
      const saved = localStorage.getItem('ak-translation-chapter');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse translation chapter from localStorage:', e);
      return null;
    }
  });

  const [translationEpisode, setTranslationEpisode] = useState<StoryEpisode | null>(() => {
    try {
      const saved = localStorage.getItem('ak-translation-episode');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse translation episode from localStorage:', e);
      return null;
    }
  });

  const [translationOperator, setTranslationOperator] = useState<EnrichedOperator | null>(null);
  const [testScript, setTestScript] = useState<string | undefined>(undefined);

  const isTranslateRoute = location.pathname.startsWith('/translate');
  const [hasOpenedTranslation, setHasOpenedTranslation] = useState(false);

  useEffect(() => {
    if (isTranslateRoute) {
      setHasOpenedTranslation(true);
    }
  }, [isTranslateRoute]);

  useEffect(() => {
    if (selectedTranslator) {
      localStorage.setItem('ak-selected-translator', selectedTranslator);
    } else {
      localStorage.removeItem('ak-selected-translator');
    }
  }, [selectedTranslator]);

  useEffect(() => {
    localStorage.setItem('ak-show-translation-ui', showTranslationUI.toString());
  }, [showTranslationUI]);

  useEffect(() => {
    if (translationChapter) {
      localStorage.setItem('ak-translation-chapter', JSON.stringify(translationChapter));
    } else {
      localStorage.removeItem('ak-translation-chapter');
    }
  }, [translationChapter]);

  useEffect(() => {
    if (translationEpisode) {
      localStorage.setItem('ak-translation-episode', JSON.stringify(translationEpisode));
    } else {
      localStorage.removeItem('ak-translation-episode');
    }
  }, [translationEpisode]);

  const prevPathRef = useRef(location.pathname);

  // Reset test script if leaving viewer (moving FROM /story/ to another route)
  useEffect(() => {
    if (prevPathRef.current.startsWith('/story/') && !location.pathname.startsWith('/story/') && testScript) {
      setTestScript(undefined);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, testScript]);

  const handleSelectChapter = useCallback(async (chapter: StoryChapter) => {
    audioManager.unlock();
    navigate(`/story/${chapter.storyTxt}`);

    try {
      const episodes = await fetchChapterList();
      const episode = episodes.find(ep => ep.chapters.some(c => c.id === chapter.id));
      if (episode) {
        setTranslationEpisode(episode);
      }
    } catch (e) {
      console.error('Failed to save last played episode:', e);
    }
  }, [navigate]);

  const handleOpenTranslation = useCallback((chapter?: StoryChapter, episode?: StoryEpisode, operator?: EnrichedOperator) => {
    if (chapter) {
      setTranslationChapter(chapter);
    } else {
      setTranslationChapter(null);
    }

    if (episode) {
      setTranslationEpisode(episode);
    } else {
      setTranslationEpisode(null);
    }

    if (operator) {
      setTranslationOperator(operator);
    } else {
      setTranslationOperator(null);
    }
    
    if (operator && !episode && !chapter) {
      navigate(`/translate?operator=${operator.id}`);
    } else if (episode) {
      navigate(`/translate/${episode.id}`);
    } else {
      navigate('/translate');
    }
  }, [navigate]);

  const handleTestTranslation = useCallback((chapter: StoryChapter, script: string) => {
    audioManager.unlock();
    setTestScript(script);
    navigate(`/story/${chapter.storyTxt}`);
  }, [navigate]);

  const handleBackFromViewer = useCallback(async (storyTxt: string) => {
    if (testScript) {
      setTestScript(undefined);
      if (translationEpisode) {
        if (isOperatorEpisode(translationEpisode)) {
          const opKey = extractOperatorKey(translationEpisode.id);
          navigate(`/operators/${opKey}`);
        } else {
          navigate(`/translate/${translationEpisode.id}`);
        }
      } else {
        navigate('/translate');
      }
      return;
    }

    try {
      const episodes = await fetchChapterList();
      const episode = episodes.find(ep => ep.chapters.some(c => c.storyTxt === storyTxt));
      if (episode) {
        if (isOperatorEpisode(episode)) {
          const opKey = extractOperatorKey(episode.id) || extractOperatorKey(storyTxt);
          navigate(`/operators/${opKey}`);
        } else {
          navigate(`/event/${episode.id}`);
        }
      } else {
        const opKey = extractOperatorKey(storyTxt);
        if (opKey) {
          navigate(`/operators/${opKey}`);
        } else {
          navigate(-1);
        }
      }
    } catch (e) {
      navigate(-1);
    }
  }, [testScript, translationEpisode, navigate]);

  const handleCloseTranslation = useCallback(() => {
    if (translationEpisode) {
      if (isOperatorEpisode(translationEpisode) || translationOperator) {
        const opKey = translationOperator ? translationOperator.id : extractOperatorKey(translationEpisode.id);
        navigate(`/operators/${opKey}`);
      } else {
        navigate(`/event/${translationEpisode.id}`);
      }
    } else if (translationOperator) {
      navigate(`/operators/${translationOperator.id}`);
    } else {
      navigate('/');
    }
  }, [translationEpisode, translationOperator, navigate]);

  return {
    selectedTranslator,
    setSelectedTranslator,
    showTranslationUI,
    setShowTranslationUI,
    translationChapter,
    setTranslationChapter,
    translationEpisode,
    setTranslationEpisode,
    translationOperator,
    setTranslationOperator,
    testScript,
    setTestScript,
    hasOpenedTranslation,
    isTranslateRoute,
    handleSelectChapter,
    handleOpenTranslation,
    handleTestTranslation,
    handleBackFromViewer,
    handleCloseTranslation,
  };
}
