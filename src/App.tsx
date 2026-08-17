import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { ChapterSelector } from './components/ChapterSelector';
import { StoryViewer } from './components/StoryViewer';
import { TranslationInterface } from './components/TranslationInterface';
import { StoryChapter, StoryEpisode } from './types';
import { EnrichedOperator } from './services/operatorService';
import { isOperatorEpisode, extractOperatorKey } from './utils/operatorUtils';
import { AnimatePresence, motion } from 'motion/react';
import { OrientationOverlay } from './components/story/OrientationOverlay';
import { audioManager } from './services/audioManager';
import { fetchChapterList } from './services/storyService';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function StoryViewerRoute({
  testScript,
  translator,
  handleChapterComplete,
  handleBack
}: {
  testScript?: string;
  translator?: string;
  handleChapterComplete: (storyTxt: string) => void;
  handleBack: (storyTxt: string) => void;
}) {
  const params = useParams();
  const storyTxt = params['*'];

  if (!storyTxt) {
    return <Navigate to="/" replace />;
  }

  return (
    <ErrorBoundary
      sectionName={`StoryViewer (${storyTxt})`}
      fallbackTitle="Ошибка воспроизведения сцены"
      fallbackMessage="Не удалось обработать сценарий или загрузить медиа-ресурсы сцены."
      onReset={() => handleBack(storyTxt)}
    >
      <StoryViewer 
        storyTxt={storyTxt}
        customScript={testScript}
        translator={translator}
        onBack={() => handleBack(storyTxt)}
        onComplete={() => handleChapterComplete(storyTxt)}
      />
    </ErrorBoundary>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [readChapters, setReadChapters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ak-read-chapters');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.error('Failed to parse read chapters from localStorage:', e);
      return new Set();
    }
  });
  const [bookmarkedChapters, setBookmarkedChapters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ak-bookmarked-chapters');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.error('Failed to parse bookmarked chapters from localStorage:', e);
      return new Set();
    }
  });

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

  const handleSelectChapter = async (chapter: StoryChapter) => {
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
  };

  const handleChapterComplete = async (storyTxt: string) => {
    // Find chapter ID by storyTxt
    try {
      const episodes = await fetchChapterList();
      let chapterId = storyTxt; // fallback to storyTxt itself
      let foundEpisode: StoryEpisode | null = null;
      for (const ep of episodes) {
        const chapter = ep.chapters.find(c => c.storyTxt === storyTxt);
        if (chapter) {
          chapterId = chapter.id;
          foundEpisode = ep;
          break;
        }
      }

      if (foundEpisode) {
        setTranslationEpisode(foundEpisode);
      }

      setReadChapters(prev => {
        const next = new Set(prev);
        next.add(chapterId);
        localStorage.setItem('ak-read-chapters', JSON.stringify(Array.from(next)));
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRead = (chapterId: string) => {
    setReadChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      localStorage.setItem('ak-read-chapters', JSON.stringify(Array.from(next)));
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

  const handleOpenTranslation = (chapter?: StoryChapter, episode?: StoryEpisode, operator?: EnrichedOperator) => {
    if (chapter) {
      setTranslationChapter(chapter);
    } else {
      setTranslationChapter(undefined);
    }

    if (episode) {
      setTranslationEpisode(episode);
    } else {
      setTranslationEpisode(undefined);
    }

    if (operator) {
      setTranslationOperator(operator);
    } else {
      setTranslationOperator(undefined);
    }
    
    if (operator && !episode && !chapter) {
      navigate(`/translate?operator=${operator.id}`);
    } else if (episode) {
      navigate(`/translate/${episode.id}`);
    } else {
      navigate('/translate');
    }
  };

  const handleTestTranslation = (chapter: StoryChapter, script: string) => {
    audioManager.unlock();
    setTestScript(script);
    navigate(`/story/${chapter.storyTxt}`);
  };

  const handleBackFromViewer = async (storyTxt: string) => {
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
  };

  const isTranslateRoute = location.pathname.startsWith('/translate');
  const [hasOpenedTranslation, setHasOpenedTranslation] = useState(false);

  useEffect(() => {
    if (isTranslateRoute) {
      setHasOpenedTranslation(true);
    }
  }, [isTranslateRoute]);

  // Dynamic SEO Page Title and Meta Tags Manager
  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'ZOOT Archive — Arknights Story Reader & Translation Archive | Читалка Arknights';

    if (path.startsWith('/story/')) {
      const storyName = path.replace('/story/', '').replace(/\.txt$/, '').split('/').pop() || 'Story';
      pageTitle = `${storyName} — Arknights Story Viewer | ZOOT Archive`;
    } else if (path.startsWith('/translate')) {
      pageTitle = 'Студия перевода Arknights | Translation Studio — ZOOT Archive';
    } else if (path.startsWith('/event/')) {
      const eventId = path.replace('/event/', '');
      pageTitle = `Эпизод ${eventId} — Сюжет Arknights | ZOOT Archive`;
    }

    document.title = pageTitle;

    // Update Open Graph Title if tag exists
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      ogTitleMeta.setAttribute('content', pageTitle);
    }
  }, [location.pathname]);

  const prevPathRef = useRef(location.pathname);

  // Reset test script if leaving viewer (moving FROM /story/ to another route)
  useEffect(() => {
    if (prevPathRef.current.startsWith('/story/') && !location.pathname.startsWith('/story/') && testScript) {
      setTestScript(undefined);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, testScript]);

  return (
    <div className="w-screen h-[100dvh] bg-black overflow-hidden font-sans select-none relative">
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname.startsWith('/story/') ? 'viewer' : 'selector'} className="w-full h-full absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Routes location={location}>
            <Route 
              path="/" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/story" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/records/*" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/music" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route path="/vote" element={<Navigate to="/music" replace />} />
            <Route 
              path="/operators" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/operators/:operatorId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/operator/:operatorId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/event/:eventId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/translate/*" 
              element={
                <div className="h-full">
                  {/* The actual TranslationInterface is outside Routes to stay mounted */}
                  <ChapterSelector 
                    onSelect={handleSelectChapter} 
                    onOpenTranslation={handleOpenTranslation}
                    onTranslatorChange={setSelectedTranslator}
                    readChapters={readChapters}
                    onToggleRead={handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/story/*" 
              element={
                <div className="h-full">
                  <StoryViewerRoute 
                    testScript={testScript}
                    translator={selectedTranslator}
                    handleChapterComplete={handleChapterComplete}
                    handleBack={handleBackFromViewer}
                  />
                </div>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Translation UI - Keep mounted to preserve translation progress */}
      {hasOpenedTranslation && (
        <div 
          className={`absolute inset-0 z-50 bg-black transition-opacity duration-300 ${
            isTranslateRoute ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ErrorBoundary
            sectionName="Интерфейс перевода"
            fallbackTitle="Ошибка в редакторе перевода"
            fallbackMessage="Произошел сбой при отрисовке интерфейса перевода. Ваш прогресс сохранен локально."
            onReset={() => {
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
            }}
          >
            <TranslationInterface 
              onClose={() => {
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
              }} 
              onTestTranslation={handleTestTranslation}
              initialChapter={translationChapter}
              initialEpisode={translationEpisode}
              initialOperator={translationOperator}
            />
          </ErrorBoundary>
        </div>
      )}

      <PWAInstallPrompt />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      sectionName="PRTS Root System"
      fallbackTitle="Критический сбой приложения"
      fallbackMessage="Приложению не удалось инициализировать корневое дерево компонентов."
      showHomeButton={false}
    >
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
