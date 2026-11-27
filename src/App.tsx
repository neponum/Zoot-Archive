import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, useParams, useSearchParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { MonsterTextStage } from './components/MonsterTextStage';
import { motion } from 'motion/react';
import { fetchChapterList } from './services/storyService';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TerraPage } from './components/TerraPage';
import { TranslationRepoPage } from './components/translation/TranslationRepoPage';
import type { StoryOperationBrief } from './components/MainThemeStoryView';
import STORY_OPERATION_DESCRIPTIONS_RU from './data/storyOperationDescriptionsRu.json';
import STORY_DESCRIPTIONS_RU from './data/storyDescriptionsRu.json';
import STORY_TITLES_RU from './data/storyTitlesRu.json';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useTranslationState } from './hooks/useTranslationState';
import { usePageMeta } from './hooks/usePageMeta';
import { operatorShortIdFromMemoryStory } from './utils/operatorUtils';
import { getUiLanguage } from './utils/uiLanguage';
import { platform } from './platform';
import {
  fetchStoryOperations,
  resolveOperationScenes,
} from './services/story/operationScenes';

// В приложении WebView не умеет отдавать index.html для глубоких путей,
// поэтому нативные сборки ходят по hash-роутингу, а сайт — по обычным URL.
const AppRouter = platform.kind === 'web' ? BrowserRouter : HashRouter;

// Крупные экраны грузим отдельными чанками: главная не тянет движок читалки,
// архив оперативников и переводчик, пока они реально не понадобятся.
const ChapterSelector = React.lazy(() =>
  import('./components/ChapterSelector').then((m) => ({ default: m.ChapterSelector }))
);
const StoryViewer = React.lazy(() =>
  import('./components/StoryViewer').then((m) => ({ default: m.StoryViewer }))
);
const MainThemeStoryView = React.lazy(() =>
  import('./components/MainThemeStoryView').then((m) => ({ default: m.MainThemeStoryView }))
);
const OperatorArchivePage = React.lazy(() =>
  import('./components/OperatorArchivePage').then((m) => ({ default: m.OperatorArchivePage }))
);
const IntegratedStrategiesPage = React.lazy(() =>
  import('./components/IntegratedStrategiesPage').then((m) => ({
    default: m.IntegratedStrategiesPage,
  }))
);
const ReclamationAlgorithmView = React.lazy(() =>
  import('./components/ReclamationAlgorithmView').then((m) => ({
    default: m.ReclamationAlgorithmView,
  }))
);
const LegalPage = React.lazy(() =>
  import('./components/LegalPage').then((m) => ({ default: m.LegalPage }))
);
const StoragePage = React.lazy(() =>
  import('./components/StoragePage').then((m) => ({ default: m.StoragePage }))
);

/** Нейтральная заглушка на время загрузки чанка — без мигания белым. */
const RouteFallback = () => <div className="h-full w-full bg-black" />;

function StoryViewerRoute({
  testScript,
  translator,
  readChapters,
  onToggleRead,
  handleChapterComplete,
  handleBack,
  storyTxtOverride,
  sceneOptions,
  scenePart,
  autoStart,
  onComplete,
}: {
  testScript?: string;
  translator?: string;
  readChapters?: Set<string>;
  onToggleRead?: (chapterId: string) => void;
  handleChapterComplete: (storyTxt: string) => void;
  handleBack: (storyTxt: string) => void;
  /** Прямая сцена для маршрута `/story/event/<chapter>/<op>` */
  storyTxtOverride?: string;
  sceneOptions?: { beg?: string | null; end?: string | null };
  scenePart?: 'beg' | 'end' | 'both';
  autoStart?: boolean;
  onComplete?: () => void;
}) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const storyTxt = storyTxtOverride ?? params['*'];
  const operation = (location.state as { operation?: StoryOperationBrief } | null)
    ?.operation;
  /** Куда вернуться, если читалка открыта из другого раздела (например, из досье). */
  const stateBackTo = (location.state as { backTo?: string } | null)?.backTo;

  /** Из читалки операции возвращаемся на страницу эпизода, а не в меню карты. */
  const routeChapter = params.chapter;
  const [chapterId, setChapterId] = useState<string>(() => storyTxt || '');
  /** Родительское событие сцены: нужно для прямых ссылок `/story/<path>`. */
  const [parentChapter, setParentChapter] = useState<string | null>(null);

  const leaveViewer = useCallback(() => {
    // Личное дело (память) открыто из досье: возвращаемся к оперативнику,
    // а не в терминал историй. После перезагрузки state теряется, поэтому
    // дополнительно разбираем путь `obt/memory/story_<id>_<set>_<n>`.
    if (!testScript) {
      if (stateBackTo) {
        navigate(stateBackTo, { replace: true });
        return;
      }
      const memoryOperator = operatorShortIdFromMemoryStory(storyTxt);
      if (memoryOperator) {
        navigate(`/operators/${encodeURIComponent(memoryOperator)}`, { replace: true });
        return;
      }
    }
    const target = routeChapter || parentChapter;
    if (target) {
      navigate(`/story/event/${encodeURIComponent(target)}`, { replace: true });
      return;
    }
    if (operation) {
      navigate(-1);
      return;
    }
    handleBack(storyTxt ?? '');
  }, [routeChapter, parentChapter, operation, navigate, handleBack, storyTxt, stateBackTo, testScript]);

  /**
   * Русское описание операции, если оно есть: `chapter|code`.
   * Применяется только к русскому интерфейсу — на английском остаётся
   * оригинальное описание из архива.
   */
  const withRussianDesc = useCallback(
    (brief?: StoryOperationBrief): StoryOperationBrief | undefined => {
      if (!brief) return brief;
      const uiLang = getUiLanguage();
      if (uiLang !== 'ru_RU' && uiLang !== 'ru_RU_CN') return brief;
      const key = brief.code && params.chapter ? `${params.chapter}|${brief.code}` : '';
      const operationDesc = key
        ? (STORY_OPERATION_DESCRIPTIONS_RU as Record<string, string>)[key]
        : undefined;
      const chapterDesc = params.chapter
        ? (STORY_DESCRIPTIONS_RU as Record<string, string>)[params.chapter]
        : undefined;
      const russian = operationDesc || chapterDesc?.split('\n')[0];

      const titles = STORY_TITLES_RU as {
        chapters?: Record<string, string>;
        episodes?: Record<string, string>;
      };
      const chapterTitle = params.chapter
        ? titles.chapters?.[params.chapter]
        : undefined;
      const episodeTitle =
        params.chapter && brief.code
          ? titles.episodes?.[`${params.chapter}|${brief.code}`]
          : undefined;

      return {
        ...brief,
        desc: russian || brief.desc,
        chapter: chapterTitle || brief.chapter,
        name: episodeTitle || brief.name,
      };
    },
    [params.chapter]
  );

  const [resolvedOperation, setResolvedOperation] = useState<StoryOperationBrief | undefined>(
    () => withRussianDesc(operation)
  );

  useEffect(() => {
    setResolvedOperation(withRussianDesc(operation));
  }, [operation, withRussianDesc]);

  useEffect(() => {
    if (!storyTxt) return;
    let isMounted = true;
    fetchChapterList().then(async (episodes) => {
      if (!isMounted) return;
      for (const ep of episodes) {
        const found = ep.chapters?.find(c => c.storyTxt === storyTxt || c.id === storyTxt);
        if (found) {
          setChapterId(found.id);
          setParentChapter(ep.id);
          // Прямая ссылка `/story/event/<chapter>/<code>` приходит без
          // `location.state`: добираем заголовок, метку и синопсис из архива.
          if (!operation) {
            const brief: StoryOperationBrief = {
              code: found.code,
              name: found.name,
              chapter: ep.name,
            };
            try {
              const response = await fetch(platform.dataUrl('/data/archive/story/index.json'));
              if (response.ok) {
                const archive = await response.json();
                const chapters = (archive.categories ?? []).flatMap(
                  (category: { chapters?: Record<string, unknown>[] }) =>
                    category.chapters ?? []
                );
                const chapter = chapters.find(
                  (item: { id?: string }) => item.id === params.chapter
                ) as
                  | {
                      titleMain?: string;
                      subtitle?: string;
                      synopsisLines?: string[];
                      episodes?: { code?: string; tag?: string; desc?: string }[];
                    }
                  | undefined;
                if (chapter) {
                  const episode = chapter.episodes?.find(
                    (item) => item.code === found.code
                  );
                  brief.chapter = chapter.subtitle || chapter.titleMain || brief.chapter;
                  brief.tag = episode?.tag;
                  brief.desc =
                    episode?.desc ?? String(chapter.synopsisLines?.[0] ?? '');
                }
              }
            } catch {
              // без архива покажем хотя бы код и название
            }
            if (isMounted) setResolvedOperation(withRussianDesc(brief));
          }
          break;
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [storyTxt, operation, withRussianDesc]);

  if (!storyTxt) {
    // Сцена не разрешилась (например, у операции нет end-сцены) — не
    // выбрасываем пользователя на главную, а возвращаем к списку операций.
    return (
      <Navigate
        to={routeChapter ? `/story/event/${encodeURIComponent(routeChapter)}` : '/story/map'}
        replace
      />
    );
  }

  const isRead = !!(readChapters?.has(chapterId) || readChapters?.has(storyTxt));

  return (
    <ErrorBoundary
      sectionName={`StoryViewer (${storyTxt})`}
      fallbackTitle="Ошибка воспроизведения сцены"
      fallbackMessage="Не удалось обработать сценарий или загрузить медиа-ресурсы сцены."
      onReset={leaveViewer}
    >
      <StoryViewer
        key={storyTxt}
        storyTxt={storyTxt}
        customScript={testScript}
        translator={translator}
        operation={resolvedOperation}
        isRead={isRead}
        onToggleRead={() => onToggleRead?.(chapterId || storyTxt)}
        onBack={leaveViewer}
        onComplete={() => (onComplete ? onComplete() : handleChapterComplete(storyTxt))}
        sceneOptions={sceneOptions}
        scenePart={scenePart}
        autoStart={autoStart}
      />
    </ErrorBoundary>
  );
}

/** Экран вместо чёрной бесконечности, пока грузится карта операций. */
function OperationSceneStatus({
  loading,
  onRetry,
  onBack,
}: {
  loading: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const uiLang = getUiLanguage();
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      {loading ? (
        <>
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <p className="text-sm text-white/60">
            {isRu ? 'Загружаем карту операций…' : 'Loading the operation map…'}
          </p>
        </>
      ) : (
        <>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            {isRu
              ? 'Не удалось открыть сцену этой операции: у неё может не быть сюжета или карта операций не загрузилась.'
              : 'Could not open this operation scene: it may have no story, or the operation map failed to load.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer border border-white/25 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
            >
              {isRu ? 'Повторить' : 'Retry'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer border border-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 transition-colors hover:border-white/40 hover:text-white"
            >
              {isRu ? 'К главе' : 'Back to chapter'}
            </button>
          </div>
          <span className="sr-only">operation scene unavailable</span>
        </>
      )}
    </div>
  );
}

/**
 * Канонические ссылки истории: `/story/event/<chapter>` — выбор операции,
 * `/story/event/<chapter>/<operation>[/end]` — сразу нужная сцена.
 */
function StoryEventRoute({
  testScript,
  translator,
  readChapters,
  onToggleRead,
  handleChapterComplete,
  handleBack,
}: {
  testScript?: string;
  translator?: string;
  readChapters?: Set<string>;
  onToggleRead?: (chapterId: string) => void;
  handleChapterComplete: (storyTxt: string) => void;
  handleBack: (storyTxt: string) => void;
}) {
  const { chapter: chapterParam, chapterId: singleChapter, operation, part } = useParams();
  const chapter = chapterParam ?? singleChapter ?? '';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const autoStart = params.get('auto') === '1';
  /**
   * Сцены привязаны к операции, для которой загружены. Сравнение в рендере
   * (а не сброс в useEffect) не даёт смонтировать читалку со сценой прошлой
   * операции и не оставляет «missing» от предыдущего клика.
   */
  const operationKey = operation ? `${chapter}|${operation}` : null;
  const [loadedScenes, setLoadedScenes] = useState<{
    key: string;
    scenes: { beg?: string | null; end?: string | null };
  } | null>(null);
  const [missingOperation, setMissingOperation] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const scenes =
    loadedScenes && loadedScenes.key === operationKey ? loadedScenes.scenes : null;
  const missing = Boolean(operationKey) && missingOperation === operationKey;

  useEffect(() => {
    if (!operation || !operationKey) return;
    let cancelled = false;
    fetchStoryOperations()
      .then((payload) => {
        if (cancelled) return;
        const found = resolveOperationScenes(payload, chapter, operation);
        if (found) {
          setLoadedScenes({ key: operationKey, scenes: found });
          setMissingOperation((current) =>
            current === operationKey ? null : current
          );
        } else {
          setMissingOperation(operationKey);
        }
      })
      .catch(() => {
        if (!cancelled) setMissingOperation(operationKey);
      });
    return () => {
      cancelled = true;
    };
  }, [operation, chapter, operationKey, reloadToken]);

  if (!operation) {
    return (
      <StoryMapRoute
        readChapters={readChapters ?? new Set()}
        onToggleRead={onToggleRead}
        initialChapter={normalizeChapterId(chapter)}
      />
    );
  }
  if (missing) {
    return (
      <OperationSceneStatus
        loading={false}
        onRetry={() => {
          setMissingOperation(null);
          setReloadToken((value) => value + 1);
        }}
        onBack={() =>
          navigate(`/story/event/${encodeURIComponent(chapter)}`, {
            replace: true,
          })
        }
      />
    );
  }
  if (!scenes) {
    return <OperationSceneStatus loading onRetry={() => {}} onBack={() => {}} />;
  }

  const scenePart: 'beg' | 'end' | 'both' =
    part === 'both' ? 'both' : part === 'end' ? 'end' : 'beg';
  const playAfter = scenePart === 'end';
  // У части операций есть только сцена «до боя», но плитка «после боя»
  // всё равно показывается: не оставляем её без сцены и не уходим на главную.
  const scene = playAfter
    ? scenes.end || scenes.beg
    : scenes.beg || scenes.end;
  if (!scene) {
    return (
      <OperationSceneStatus
        loading={false}
        onRetry={() => {
          setMissingOperation(null);
          setReloadToken((value) => value + 1);
        }}
        onBack={() =>
          navigate(`/story/event/${encodeURIComponent(chapter)}`, {
            replace: true,
          })
        }
      />
    );
  }

  return (
    <div className="h-full">
      <StoryViewerRoute
        key={`${chapter}:${operation}:${scenePart}:${scene ?? ''}`}
        testScript={testScript}
        translator={translator}
        readChapters={readChapters}
        onToggleRead={onToggleRead}
        handleChapterComplete={handleChapterComplete}
        handleBack={handleBack}
        storyTxtOverride={scene ?? undefined}
        sceneOptions={scenes}
        scenePart={scenePart}
        autoStart={autoStart}
        onComplete={() => {
          // «Обе»: после сцены до боя сразу переходим к сцене после боя.
          if (scenePart === 'both' && scenes.end) {
            navigate(
              `/story/event/${encodeURIComponent(chapter)}/${encodeURIComponent(
                operation ?? ''
              )}/end?auto=1`,
              { replace: true }
            );
            return;
          }
          handleChapterComplete(scene ?? '');
        }}
      />
    </div>
  );
}

function ReclamationAlgorithmRoute() {
  const navigate = useNavigate();
  return (
    <ReclamationAlgorithmView
      onBackToTerminal={() => navigate('/terminal')}
      onBackToHome={() => navigate('/')}
      onOpenStory={(path) =>
        navigate(`/story/${path}`, { state: { backTo: '/reclamation-algorithm' } })
      }
    />
  );
}

function OperatorArchiveRoute() {
  const { operatorId } = useParams();
  return <OperatorArchivePage initialOperatorId={operatorId ?? null} />;
}

/** Карта сюжета (1:1 с untitled/MainThemeStoryView). */
function StoryMapRoute({
  readChapters,
  onToggleRead,
  initialChapter,
  initialMode,
}: {
  readChapters: Set<string>;
  onToggleRead?: (chapterId: string) => void;
  initialChapter?: string;
  initialMode?: 'map' | 'year' | 'line';
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chapter = initialChapter ?? params.get('chapter') ?? undefined;

  return (
    <MainThemeStoryView
      onBackToTerminal={() => navigate('/terminal')}
      onBackToHome={() => navigate('/')}
      readChapters={readChapters}
      onToggleRead={onToggleRead}
      initialChapter={chapter}
      initialMode={initialMode}
      onModeChange={(mode) =>
        navigate(
          mode === 'map'
            ? '/story/map'
            : mode === 'line'
              ? '/story/grid/lines'
              : '/story/grid',
          { replace: true }
        )
      }
      onCloseChapter={() => {
        // Из deep link /story/<chapterId> «назад» ведёт к карте, а не
        // оставляет в адресе открытую главу.
        if (chapter) navigate('/story/map', { replace: true });
      }}
      onSelectChapter={(chapterId) =>
        navigate(`/story/${encodeURIComponent(chapterId)}`)
      }
      onOpenChapter={(storyTxt, operation) =>
        navigate(`/story/${storyTxt}`, { state: { operation } })
      }
      onOpenEvent={(chapterId, code, part, operation) =>
        navigate(
          `/story/event/${encodeURIComponent(chapterId)}/${encodeURIComponent(code)}${
            part === 'end' ? '/end' : ''
          }`,
          { state: { operation } }
        )
      }
    />
  );
}

/** `ep00`, `main-0`, `main_09` → `main_0`; остальные id не трогаем. */
function normalizeChapterId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const id = raw.replace(/-/g, '_');
  const epMatch = /^ep_?(\d+)$/i.exec(id);
  if (epMatch) return `main_${Number(epMatch[1])}`;
  const mainMatch = /^main_(\d+)$/i.exec(id);
  if (mainMatch) return `main_${Number(mainMatch[1])}`;
  return id;
}

/** Старые ссылки `/event/<chapterId>` ведут на карту с открытой главой. */
function EventChapterRedirect() {
  const { eventId } = useParams();

  // Поддерживаем короткие адреса вида `/event/ep00` и `/event/ep09`.
  const chapterId = normalizeChapterId(eventId);

  return (
    <Navigate
      to={chapterId ? `/story?chapter=${encodeURIComponent(chapterId)}` : '/story'}
      replace
    />
  );
}

function AppContent() {
  const location = useLocation();

  const translation = useTranslationState();
  const reading = useReadingProgress();

  // Sync dynamic document title and Open Graph metadata
  usePageMeta();

  const path = location.pathname;
  // «Читалка» — только многосегментные адреса сценария (`/story/<path/...>`).
  // Карта, сетка, панель главы и `/story/event/...` остаются одной страницей,
  // поэтому переключение map/grid не перемонтирует дерево.
  const isStoryReader =
    path.startsWith('/story/') &&
    !path.startsWith('/story/event/') &&
    path !== '/story/map' &&
    path !== '/story/grid' &&
    path !== '/story/grid/lines' &&
    path.split('/').filter(Boolean).length > 2;

  return (
    <div className="w-screen h-[100dvh] bg-black overflow-hidden font-sans select-none relative">
      {/* Без AnimatePresence mode="wait": exit-анимация могла зависнуть на
          Suspense-границе, и после «Назад в меню» поверх нового маршрута
          оставалась старая читалка (URL уже новый, а на экране — прошлая
          операция). Маршруты переключаются сразу, остаётся только fade-in. */}
      <motion.div
        key={isStoryReader ? 'viewer' : 'selector'}
        className="w-full h-full absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
          <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<MonsterTextStage />} />
            {/* У каждого раздела главной свой адрес */}
            <Route path="/terminal" element={<MonsterTextStage />} />
            {/* Карта сюжета из untitled (MainThemeStoryView); читалка — /story/* */}
            <Route path="/story" element={<StoryMapRoute readChapters={reading.readChapters} onToggleRead={reading.handleToggleRead} />} />
            <Route
              path="/story/map"
              element={<StoryMapRoute readChapters={reading.readChapters} onToggleRead={reading.handleToggleRead} initialMode="map" />}
            />
            <Route
              path="/story/grid"
              element={<StoryMapRoute readChapters={reading.readChapters} onToggleRead={reading.handleToggleRead} initialMode="year" />}
            />
            <Route
              path="/story/grid/lines"
              element={<StoryMapRoute readChapters={reading.readChapters} onToggleRead={reading.handleToggleRead} initialMode="line" />}
            />
            {/* Короткие алиасы */}
            <Route path="/maps" element={<Navigate to="/story/map" replace />} />
            <Route path="/grid" element={<Navigate to="/story/grid" replace />} />
            {/* Полный список глав с поиском/переводом остаётся доступен напрямую */}
            <Route
              path="/chapters"
              element={
                <div className="h-full">
                  <ChapterSelector
                    onSelect={translation.handleSelectChapter}
                    onTranslatorChange={translation.setSelectedTranslator}
                    readChapters={reading.readChapters}
                    onToggleRead={reading.handleToggleRead}
                  />
                </div>
              }
            />
            {/* Музыкальный раздел убран: аудио принадлежит правообладателю. */}
            <Route path="/music" element={<Navigate to="/" replace />} />
            <Route path="/vote" element={<Navigate to="/" replace />} />
            <Route path="/translate" element={<TranslationRepoPage />} />
            <Route path="/translate/*" element={<TranslationRepoPage />} />
            <Route path="/export" element={<Navigate to="/translate" replace />} />
            <Route path="/integrated-strategies" element={<IntegratedStrategiesPage />} />
            <Route path="/terra" element={<TerraPage />} />
            <Route path="/reclamation-algorithm" element={<ReclamationAlgorithmRoute />} />
            <Route path="/operators" element={<OperatorArchiveRoute />} />
            <Route path="/operators/:operatorId" element={<OperatorArchiveRoute />} />
            <Route path="/operator/:operatorId" element={<OperatorArchiveRoute />} />
            <Route
              path="/event/:eventId"
              element={<EventChapterRedirect />}
            />
            <Route
              path="/story/:chapterId"
              element={
                <StoryEventRoute
                  testScript={translation.testScript}
                  translator={translation.selectedTranslator}
                  readChapters={reading.readChapters}
                  onToggleRead={reading.handleToggleRead}
                  handleChapterComplete={reading.handleChapterComplete}
                  handleBack={translation.handleBackFromViewer}
                />
              }
            />
            <Route
              path="/story/event/:chapter/:operation?/:part?"
              element={
                <StoryEventRoute
                  testScript={translation.testScript}
                  translator={translation.selectedTranslator}
                  readChapters={reading.readChapters}
                  onToggleRead={reading.handleToggleRead}
                  handleChapterComplete={reading.handleChapterComplete}
                  handleBack={translation.handleBackFromViewer}
                />
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
            {/* Legal / fan-project disclosures */}
            <Route path="/disclaimer" element={<LegalPage doc="disclaimer" />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
            <Route path="/takedown" element={<LegalPage doc="takedown" />} />
            <Route path="/legal" element={<Navigate to="/disclaimer" replace />} />
            <Route path="/storage" element={<StoragePage />} />
            {/* Fallback for other unmatched routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
      </motion.div>

      {/* Аналитика Vercel существует только на сайте: в приложении её
          скрипты отдают 404 и зря шумят. */}
      {platform.kind === 'web' && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}
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
      <ToastProvider>
        <ConfirmProvider>
          <AppRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </AppRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
