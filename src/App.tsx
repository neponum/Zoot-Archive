import React, { useState, useEffect } from 'react';
import { ChapterSelector } from './components/ChapterSelector';
import { StoryViewer } from './components/StoryViewer';
import { TranslationInterface } from './components/TranslationInterface';
import { StoryChapter, StoryEpisode } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { OrientationOverlay } from './components/story/OrientationOverlay';
import { audioManager } from './services/audioManager';

function App() {
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);
  const [readChapters, setReadChapters] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ak-read-chapters');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [bookmarkedChapters, setBookmarkedChapters] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ak-bookmarked-chapters');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [selectedTranslator, setSelectedTranslator] = useState<string | undefined>(() => {
    return localStorage.getItem('ak-selected-translator') || undefined;
  });
  const [showTranslationUI, setShowTranslationUI] = useState(() => {
    return localStorage.getItem('ak-show-translation-ui') === 'true';
  });
  const [translationChapter, setTranslationChapter] = useState<StoryChapter | null>(() => {
    const saved = localStorage.getItem('ak-translation-chapter');
    return saved ? JSON.parse(saved) : null;
  });
  const [translationEpisode, setTranslationEpisode] = useState<StoryEpisode | null>(() => {
    const saved = localStorage.getItem('ak-translation-episode');
    return saved ? JSON.parse(saved) : null;
  });
  const [testScript, setTestScript] = useState<string | undefined>(undefined);

  const handleSelectChapter = (chapter: StoryChapter) => {
    audioManager.unlock();
    setSelectedChapter(chapter);
    window.history.pushState({ isViewer: true }, '', `/story/${chapter.storyTxt}`);
  };

  const handleChapterComplete = (chapterId: string) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      next.add(chapterId);
      localStorage.setItem('ak-read-chapters', JSON.stringify(Array.from(next)));
      return next;
    });
    setBookmarkedChapters(prev => {
      if (prev.has(chapterId)) {
        const next = new Set(prev);
        next.delete(chapterId);
        localStorage.setItem('ak-bookmarked-chapters', JSON.stringify(Array.from(next)));
        return next;
      }
      return prev;
    });
  };

  const handleToggleBookmark = (chapterId: string) => {
    setBookmarkedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      localStorage.setItem('ak-bookmarked-chapters', JSON.stringify(Array.from(next)));
      return next;
    });
  };

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

  const handleOpenTranslation = (chapter?: StoryChapter, episode?: StoryEpisode) => {
    if (chapter) setTranslationChapter(chapter);
    if (episode) setTranslationEpisode(episode);
    setShowTranslationUI(true);
  };

  const handleTestTranslation = (chapter: StoryChapter, script: string) => {
    audioManager.unlock();
    setTestScript(script);
    setSelectedChapter(chapter);
    setShowTranslationUI(false);
    window.history.pushState({ isViewer: true }, '', `/story/${chapter.storyTxt}`);
  };

  const handleBackFromViewer = () => {
    if (window.history.state?.isViewer) {
      window.history.back();
    } else {
      setSelectedChapter(null);
      if (testScript) {
        setShowTranslationUI(true);
        setTestScript(undefined);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setSelectedChapter(null);
      if (testScript) {
        setShowTranslationUI(true);
        setTestScript(undefined);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [testScript]);

  useEffect(() => {
    // Initial load handling
    const path = window.location.pathname;
    if (path.startsWith('/story/')) {
      const storyTxt = path.replace('/story/', '');
      if (storyTxt) {
        import('./services/storyService').then(({ fetchChapterList }) => {
          fetchChapterList().then((episodes: StoryEpisode[]) => {
            for (const ep of episodes) {
              const chapter = ep.chapters.find(c => c.storyTxt === storyTxt);
              if (chapter) {
                setSelectedChapter(chapter);
                return;
              }
            }
            // Fallback if not found
            setSelectedChapter({
              id: storyTxt,
              code: '',
              name: storyTxt,
              storyTxt: storyTxt,
              iconId: ''
            });
          }).catch(console.error);
        });
      }
    }
  }, []);

  return (
    <div className="w-screen h-[100dvh] bg-black overflow-hidden font-sans select-none relative">
      <AnimatePresence mode="wait">
        {!selectedChapter ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <ChapterSelector 
              onSelect={handleSelectChapter} 
              onOpenTranslation={handleOpenTranslation}
              onTranslatorChange={setSelectedTranslator}
              readChapters={readChapters}
              bookmarkedChapters={bookmarkedChapters}
              onToggleBookmark={handleToggleBookmark}
            />
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <StoryViewer 
              storyTxt={selectedChapter.storyTxt} 
              customScript={testScript}
              translator={selectedTranslator}
              onBack={handleBackFromViewer}
              onComplete={() => handleChapterComplete(selectedChapter.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation UI - Keep mounted to preserve translation progress */}
      <div 
        className={`absolute inset-0 z-50 bg-black transition-opacity duration-300 ${
          showTranslationUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <TranslationInterface 
          onClose={() => setShowTranslationUI(false)} 
          onTestTranslation={handleTestTranslation}
          initialChapter={translationChapter}
          initialEpisode={translationEpisode}
        />
      </div>
    </div>
  );
}

export default App;
