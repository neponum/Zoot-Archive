import React, { useState, useEffect } from 'react';
import { ChapterSelector } from './components/ChapterSelector';
import { StoryViewer } from './components/StoryViewer';
import { TranslationInterface } from './components/TranslationInterface';
import { StoryChapter, StoryEpisode } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { OrientationOverlay } from './components/story/OrientationOverlay';

function App() {
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(() => {
    const saved = localStorage.getItem('ak-selected-chapter');
    return saved ? JSON.parse(saved) : null;
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

  useEffect(() => {
    if (selectedChapter) {
      localStorage.setItem('ak-selected-chapter', JSON.stringify(selectedChapter));
    } else {
      localStorage.removeItem('ak-selected-chapter');
    }
  }, [selectedChapter]);

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
    setTestScript(script);
    setSelectedChapter(chapter);
    setShowTranslationUI(false);
  };

  const handleBackFromViewer = () => {
    setSelectedChapter(null);
    if (testScript) {
      setShowTranslationUI(true);
      setTestScript(undefined);
    }
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-sans select-none relative">
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
              onSelect={setSelectedChapter} 
              onOpenTranslation={handleOpenTranslation}
              onTranslatorChange={setSelectedTranslator}
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
