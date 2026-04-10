import React, { useState } from 'react';
import { ChapterSelector } from './components/ChapterSelector';
import { StoryViewer } from './components/StoryViewer';
import { TranslationInterface } from './components/TranslationInterface';
import { StoryChapter, StoryEpisode } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { OrientationOverlay } from './components/story/OrientationOverlay';

function App() {
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);
  const [selectedTranslator, setSelectedTranslator] = useState<string | undefined>(undefined);
  const [showTranslationUI, setShowTranslationUI] = useState(false);
  const [translationChapter, setTranslationChapter] = useState<StoryChapter | null>(null);
  const [translationEpisode, setTranslationEpisode] = useState<StoryEpisode | null>(null);
  const [testScript, setTestScript] = useState<string | undefined>(undefined);

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
