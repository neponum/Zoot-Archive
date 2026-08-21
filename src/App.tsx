import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom';
import { ChapterSelector } from './components/ChapterSelector';
import { StoryViewer } from './components/StoryViewer';
import { TranslationInterface } from './components/TranslationInterface';
import { AnimatePresence, motion } from 'motion/react';
import { fetchChapterList } from './services/storyService';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useTranslationState } from './hooks/useTranslationState';
import { usePageMeta } from './hooks/usePageMeta';

function StoryViewerRoute({
  testScript,
  translator,
  readChapters,
  onToggleRead,
  handleChapterComplete,
  handleBack
}: {
  testScript?: string;
  translator?: string;
  readChapters?: Set<string>;
  onToggleRead?: (chapterId: string) => void;
  handleChapterComplete: (storyTxt: string) => void;
  handleBack: (storyTxt: string) => void;
}) {
  const params = useParams();
  const storyTxt = params['*'];

  const [chapterId, setChapterId] = useState<string>(() => storyTxt || '');

  useEffect(() => {
    if (!storyTxt) return;
    let isMounted = true;
    fetchChapterList().then(episodes => {
      if (!isMounted) return;
      for (const ep of episodes) {
        const found = ep.chapters?.find(c => c.storyTxt === storyTxt || c.id === storyTxt);
        if (found) {
          setChapterId(found.id);
          break;
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [storyTxt]);

  if (!storyTxt) {
    return <Navigate to="/" replace />;
  }

  const isRead = !!(readChapters?.has(chapterId) || readChapters?.has(storyTxt));

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
        isRead={isRead}
        onToggleRead={() => onToggleRead?.(chapterId || storyTxt)}
        onBack={() => handleBack(storyTxt)}
        onComplete={() => handleChapterComplete(storyTxt)}
      />
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();

  const translation = useTranslationState();
  const reading = useReadingProgress(translation.setTranslationEpisode);

  // Sync dynamic document title and Open Graph metadata
  usePageMeta();

  return (
    <div className="w-screen h-[100dvh] bg-black overflow-hidden font-sans select-none relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname.startsWith('/story/') ? 'viewer' : 'selector'} 
          className="w-full h-full absolute inset-0" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          <Routes location={location}>
            <Route 
              path="/" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/story" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/music" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
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
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/operators/:operatorId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/operator/:operatorId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/event/:eventId" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/translate/*" 
              element={
                <div className="h-full">
                  <ChapterSelector 
                    onSelect={translation.handleSelectChapter} 
                    onOpenTranslation={translation.handleOpenTranslation}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              } 
            />
            <Route 
              path="/story/*" 
              element={
                <div className="h-full">
                  <StoryViewerRoute 
                    testScript={translation.testScript}
                    translator={translation.selectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                    handleChapterComplete={reading.handleChapterComplete}
                    handleBack={translation.handleBackFromViewer}
                  />
                </div>
              } 
            />
            {/* Fallback for old routes (/records, /progress, etc.) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Translation UI - Keep mounted to preserve translation progress */}
      {translation.hasOpenedTranslation && (
        <div 
          className={`absolute inset-0 z-50 bg-black transition-opacity duration-300 ${
            translation.isTranslateRoute ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ErrorBoundary
            sectionName="Интерфейс перевода"
            fallbackTitle="Ошибка в редакторе перевода"
            fallbackMessage="Произошел сбой при отрисовке интерфейса перевода. Ваш прогресс сохранен локально."
            onReset={translation.handleCloseTranslation}
          >
            <TranslationInterface 
              onClose={translation.handleCloseTranslation} 
              onTestTranslation={translation.handleTestTranslation}
              initialChapter={translation.translationChapter || undefined}
              initialEpisode={translation.translationEpisode || undefined}
              initialOperator={translation.translationOperator || undefined}
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
