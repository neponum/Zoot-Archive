import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  Home,
  Loader2,
  Mic,
  User,
  Languages,
  Compass,
} from 'lucide-react';
import { fetchChapterList, fetchStoryScript } from '../../services/storyService';
import {
  fetchOperatorHandbookAsync,
  getOperatorsList,
  type EnrichedOperator,
} from '../../services/operatorService';
import { loadOperatorVoices } from '../../services/operatorArchiveService';
import { ARKNIGHTS_CANONICAL_GLOSSARY } from '../../config/arknightsGlossary';
import operatorNamesMap from '../../data/operator_names_map.json';
import type { OperatorVoiceLine } from '../OperatorArchiveView';
import type { Language, StoryChapter, StoryEpisode } from '../../types';
import { StageHeader } from '../StageHeader';
import { useStageLanguage } from '../../hooks/useStageLanguage';
import type { StageNavId } from '../../config/stageCopy';
import { TRANSLATION_REGISTRY, getTranslatorDisplayName, isAITranslator } from '../../config/translationsRegistry';
import { getTranslationCsvCandidates, getTranslatorSuffix } from '../../utils/translationPaths';
import { isOperatorEpisode } from '../../utils/operatorUtils';
import { platform } from '../../platform';

type ExportTab = 'episodes' | 'operatorStories' | 'is' | 'dossiers' | 'voices' | 'glossary';

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(name: string, rows: Array<Record<string, string | number>>) {
  const csv = `\uFEFF${Papa.unparse(rows)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function chapterBase(chapter: StoryChapter): string {
  return chapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'story';
}

/** Простой разбор строки сценария для CSV: ID, персонаж, оригинал. */
function parseScriptLines(raw: string): Array<{ id: string; name: string; text: string }> {
  return raw.split(/\r?\n/).map((line, index) => {
    const name = line.match(/name="([^"]+)"/)?.[1] || '';
    const match = line.match(
      /^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/
    );
    return { id: `line-${index}`, name, text: (match?.[2] || line).trim() };
  });
}

export const CsvExportPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ExportTab>('episodes');
  // Вступительный экран убран: кнопка «перевод» ведёт сразу к файлам.
  const { locale } = useStageLanguage();
  const [status, setStatus] = useState('');

  const navRoutes: Partial<Record<StageNavId, string>> = {
    operator: '/operators',
    terminal: '/terminal',
    terra: '/terra',
    translation: '/translate',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#050505] text-white">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0c0c0c] px-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
          title="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-8 w-8 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
          title="На главную"
        >
          <Home className="h-4 w-4" />
        </button>
        <FileText className="h-4 w-4 text-white/35" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/70">
          Перевод
        </span>
        <span className="hidden text-[10px] uppercase tracking-wider text-white/30 sm:inline">
          файлы для переводчиков
        </span>
      </header>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto no-scrollbar border-b border-white/10 bg-[#080808] px-2 py-1">
        {(
          [
            { id: 'episodes' as const, label: 'Эпизоды', icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: 'operatorStories' as const, label: 'Истории оперативников', icon: <FileText className="h-3.5 w-3.5" /> },
            { id: 'is' as const, label: 'IS', icon: <Compass className="h-3.5 w-3.5" /> },
            { id: 'dossiers' as const, label: 'Досье', icon: <User className="h-3.5 w-3.5" /> },
            { id: 'voices' as const, label: 'Реплики', icon: <Mic className="h-3.5 w-3.5" /> },
            { id: 'glossary' as const, label: 'Глоссарий', icon: <Languages className="h-3.5 w-3.5" /> },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex h-8 items-center gap-1.5 border px-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              tab === item.id
                ? 'border-white/30 bg-white text-black'
                : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-white/30">
          {status}
        </span>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'episodes' && <StoryExport mode="episodes" onStatus={setStatus} />}
        {tab === 'operatorStories' && <StoryExport mode="operator" onStatus={setStatus} />}
        {tab === 'is' && <IsExport onStatus={setStatus} />}
        {tab === 'dossiers' && <DossierExport onStatus={setStatus} />}
        {tab === 'voices' && <VoiceExport onStatus={setStatus} />}
        {tab === 'glossary' && <GlossaryExport onStatus={setStatus} />}
      </main>

    </div>
  );
};

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

const StoryExport: React.FC<{ mode: 'episodes' | 'operator'; onStatus: (value: string) => void }> = ({ mode, onStatus }) => {
  const [episodes, setEpisodes] = useState<StoryEpisode[]>([]);
  const [episode, setEpisode] = useState<StoryEpisode | null>(null);
  const [chapter, setChapter] = useState<StoryChapter | null>(null);
  const [query, setQuery] = useState('');
  const [referenceLang, setReferenceLang] = useState<Language>('en_US');
  const [targetLang, setTargetLang] = useState<Language>('ru_RU');
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<Array<{ name: string; label: string; url: string }>>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchChapterList()
      .then(setEpisodes)
      .catch(() => onStatus('Не удалось загрузить список глав'));
  }, [onStatus]);

  const filteredEpisodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const scoped = episodes.filter((item) =>
      mode === 'operator' ? isOperatorEpisode(item) : !isOperatorEpisode(item)
    );
    if (!needle) return scoped;
    return scoped.filter(
      (item) =>
        item.id.toLowerCase().includes(needle) ||
        (item.name || '').toLowerCase().includes(needle) ||
        item.chapters.some((ch) => ch.storyTxt.toLowerCase().includes(needle))
    );
  }, [episodes, query, mode]);

  useEffect(() => {
    if (!chapter) {
      setExisting([]);
      return;
    }
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      const baseName = chapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || '';
      const registry = TRANSLATION_REGISTRY[targetLang]?.translators || [];
      const found: Array<{ name: string; label: string; url: string }> = [];

      const testUrl = async (url: string) => {
        try {
          const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          return response.ok;
        } catch {
          return false;
        }
      };

      await Promise.all(
        registry.map(async (translator) => {
          const suffix = getTranslatorSuffix(translator);
          const candidates = getTranslationCsvCandidates(targetLang, baseName, suffix).filter(
            (url) => url.endsWith(`${suffix}.csv`)
          );
          for (const url of candidates) {
            if (await testUrl(url)) {
              found.push({ name: translator, label: getTranslatorDisplayName(translator), url });
              break;
            }
          }
        })
      );

      // Общий файл без суффикса автора.
      const community = getTranslationCsvCandidates(targetLang, baseName, '');
      for (const url of community) {
        if (await testUrl(url)) {
          if (!found.some((item) => item.url === url)) {
            found.push({ name: 'community', label: 'Общий перевод', url });
          }
          break;
        }
      }

      if (!cancelled) {
        setExisting(found);
        setChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [chapter, targetLang]);

  const handleTemplate = async () => {
    if (!chapter || !episode) return;
    setLoading(true);
    onStatus('Готовим шаблон…');
    try {
      const [sourceText, referenceText] = await Promise.all([
        fetchStoryScript(chapter.storyTxt, 'zh_CN'),
        fetchStoryScript(chapter.storyTxt, referenceLang).catch(() => ''),
      ]);
      const source = parseScriptLines(sourceText);
      const reference = parseScriptLines(referenceText);

      const rows: Array<Record<string, string>> = [
        {
          ID: '__language__',
          Character: '',
          'Original Text': 'Language',
          Reference: referenceLang,
          Translation: targetLang,
        },
        {
          ID: '__episode__',
          Character: '',
          'Original Text': 'Episode ID',
          Reference: '',
          Translation: episode.id,
        },
      ];

      const seenNames = new Set<string>();
      source.forEach((line) => {
        if (!line.name || seenNames.has(line.name)) return;
        seenNames.add(line.name);
        rows.push({
          ID: `char-${seenNames.size}`,
          Character: line.name,
          'Original Text': line.name,
          Reference: '',
          Translation: '',
        });
      });

      source.forEach((line, index) => {
        rows.push({
          ID: line.id,
          Character: line.name,
          'Original Text': line.text,
          Reference: reference[index]?.text || '',
          Translation: '',
        });
      });

      downloadCsv(`${chapterBase(chapter)}.csv`, rows);
      onStatus(`Шаблон готов: ${rows.length} строк`);
    } catch {
      onStatus('Не удалось собрать шаблон');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExisting = async (item: { name: string; url: string }) => {
    if (!chapter) return;
    setLoading(true);
    onStatus('Скачиваем перевод…');
    try {
      const response = await fetch(item.url, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP');
      const text = await response.text();
      const base = chapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || 'translation';
      const suffix = item.name === 'community' ? '' : `_${item.name}`;
      downloadFile(`${base}${suffix}.csv`, text, 'text/csv;charset=utf-8');
      onStatus('Перевод скачан');
    } catch {
      onStatus('Не удалось скачать перевод');
    } finally {
      setLoading(false);
    }
  };

  const languages: Array<{ id: Language; label: string }> = [
    { id: 'en_US', label: 'English' },
    { id: 'zh_CN', label: '中文' },
    { id: 'ja_JP', label: '日本語' },
    { id: 'ko_KR', label: '한국어' },
    { id: 'ru_RU', label: 'Русский' },
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr]">
      {/* Слева: эпизоды */}
      <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#080808]">
        <div className="border-b border-white/10 p-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск эпизода или главы…"
            className="h-8 w-full border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {filteredEpisodes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setEpisode(item);
                setChapter(null);
              }}
              className={`flex w-full items-center justify-between gap-2 border-b border-white/5 px-3 py-2 text-left transition-colors ${
                episode?.id === item.id ? 'bg-white/10' : 'hover:bg-white/[0.04]'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-white/80">
                  {item.name || item.id}
                </span>
                <span className="block font-mono text-[9px] text-white/30">{item.id}</span>
              </span>
              <span className="shrink-0 font-mono text-[9px] text-white/25">
                {item.chapters.length}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Справа: глава и CSV */}
      <section className="min-h-0 overflow-y-auto custom-scrollbar p-4">
        {!episode ? (
          <div className="flex h-full flex-col items-center justify-center text-white/25">
            <BookOpen className="mb-3 h-10 w-10" />
            <p className="text-[10px] uppercase tracking-widest">Выберите эпизод слева</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <header className="border-b border-white/10 pb-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                {episode.id}
              </p>
              <h1 className="text-lg font-black uppercase tracking-wide text-white/85">
                {episode.name || episode.id}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {episode.chapters.map((item) => (
                  <button
                    key={item.storyTxt}
                    type="button"
                    onClick={() => setChapter(item)}
                    className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      chapter?.storyTxt === item.storyTxt
                        ? 'border-white/40 bg-white text-black'
                        : 'border-white/10 text-white/45 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {item.storyTxt.split('/').pop()?.replace(/\.txt$/, '') || item.name}
                  </button>
                ))}
              </div>
            </header>

            {!chapter ? (
              <div className="border border-white/10 bg-white/[0.02] p-4 text-[11px] text-white/40">
                Выберите главу, чтобы скачать шаблон или готовый перевод.
              </div>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.02] p-3">
                    <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Языки CSV
                    </h2>
                    <div className="grid gap-2">
                      <label className="flex items-center justify-between gap-2 text-[11px] text-white/45">
                        Референс
                        <select
                          value={referenceLang}
                          onChange={(event) => setReferenceLang(event.target.value as Language)}
                          className="h-7 border border-white/10 bg-black/50 px-2 text-[10px] text-white outline-none"
                        >
                          {languages.map((item) => (
                            <option key={item.id} value={item.id} className="bg-[#111]">
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-2 text-[11px] text-white/45">
                        Переводим на
                        <select
                          value={targetLang}
                          onChange={(event) => setTargetLang(event.target.value as Language)}
                          className="h-7 border border-white/10 bg-black/50 px-2 text-[10px] text-white outline-none"
                        >
                          {languages.map((item) => (
                            <option key={item.id} value={item.id} className="bg-[#111]">
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="border border-white/10 bg-white/[0.02] p-3">
                    <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Шаблон
                    </h2>
                    <button
                      type="button"
                      onClick={handleTemplate}
                      disabled={loading}
                      className="flex h-8 w-full items-center justify-center gap-2 border border-white/25 bg-white/10 text-[9px] font-bold uppercase tracking-wider text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Скачать пустой CSV
                    </button>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                      Готовые переводы
                    </h2>
                    {checking && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />}
                  </div>
                  {existing.length === 0 ? (
                    <p className="text-[11px] text-white/35">
                      Для этой главы пока нет опубликованного перевода на выбранный язык.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {existing.map((item) => (
                        <div
                          key={item.url}
                          className="flex items-center justify-between gap-3 border border-white/5 bg-black/30 px-2 py-1.5"
                        >
                          <span className="flex items-center gap-2 text-[11px] text-white/65">
                            <span className="font-bold text-white/80">{item.label}</span>
                            {item.name !== 'community' && (
                              <span className="font-mono text-[9px] text-white/25">{item.name}</span>
                            )}
                            {isAITranslator(item.name) && (
                              <span className="border border-white/10 px-1 text-[8px] uppercase tracking-wider text-white/35">
                                AI
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDownloadExisting(item)}
                            disabled={loading}
                            className="flex h-6 items-center gap-1.5 border border-white/15 bg-white/5 px-2 text-[9px] font-bold uppercase tracking-wider text-white/60 hover:text-white disabled:opacity-30"
                          >
                            <Download className="h-3 w-3" />
                            Скачать
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dossiers
// ---------------------------------------------------------------------------

const DossierExport: React.FC<{ onStatus: (value: string) => void }> = ({ onStatus }) => {
  const [operators, setOperators] = useState<EnrichedOperator[]>([]);
  const [selected, setSelected] = useState<EnrichedOperator | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOperatorsList()
      .then(setOperators)
      .catch(() => onStatus('Не удалось загрузить каталог'));
  }, [onStatus]);

  const handleExport = async () => {
    if (!selected) return;
    setLoading(true);
    onStatus('Готовим CSV…');
    try {
      const handbook = await fetchOperatorHandbookAsync(selected.id, 'en_US');
      const rows = handbook.map((section, index) => ({
        operator_id: selected.id,
        section_index: index,
        title_en: section.titleEn || '',
        text_en: section.textEn || '',
        title_ru: '',
        text_ru: '',
      }));
      downloadCsv(`${selected.id}.csv`, rows);
      onStatus(`Готово: ${rows.length} разделов`);
    } catch {
      onStatus('Не удалось собрать CSV досье');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <select
        value={selected?.id || ''}
        onChange={(event) => setSelected(operators.find((item) => item.id === event.target.value) || null)}
        className="h-9 w-full border border-white/10 bg-white/5 px-2 text-xs text-white/80 outline-none"
      >
        <option value="">Оперативник…</option>
        {operators.map((operator) => (
          <option key={operator.id} value={operator.id} className="bg-[#111]">
            {operator.displayName || operator.nameEn} ({operator.id})
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleExport}
        disabled={!selected || loading}
        className="mt-3 flex h-9 items-center gap-2 border border-white/25 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/20 disabled:opacity-30"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Скачать CSV досье
      </button>

    </div>
  );
};

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

const VoiceExport: React.FC<{ onStatus: (value: string) => void }> = ({ onStatus }) => {
  const [operators, setOperators] = useState<EnrichedOperator[]>([]);
  const [selected, setSelected] = useState<EnrichedOperator | null>(null);
  const [lines, setLines] = useState<OperatorVoiceLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOperatorsList()
      .then(setOperators)
      .catch(() => onStatus('Не удалось загрузить каталог'));
  }, [onStatus]);

  useEffect(() => {
    if (!selected) {
      setLines([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadOperatorVoices(selected.id)
      .then((result) => {
        if (!cancelled) setLines(result);
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          onStatus('Не удалось загрузить реплики');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selected, onStatus]);

  const handleExport = () => {
    if (!selected) return;
    const rows = lines.map((line) => ({
      id: line.id,
      title: line.title,
      original: line.transcript,
      translation: '',
    }));
    downloadCsv(`${selected.id}_voices.csv`, rows);
    onStatus(`Готово: ${rows.length} реплик`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <select
        value={selected?.id || ''}
        onChange={(event) => setSelected(operators.find((item) => item.id === event.target.value) || null)}
        className="h-9 w-full border border-white/10 bg-white/5 px-2 text-xs text-white/80 outline-none"
      >
        <option value="">Оперативник…</option>
        {operators.map((operator) => (
          <option key={operator.id} value={operator.id} className="bg-[#111]">
            {operator.displayName || operator.nameEn} ({operator.id})
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleExport}
        disabled={!selected || loading || lines.length === 0}
        className="mt-3 flex h-9 items-center gap-2 border border-white/25 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/20 disabled:opacity-30"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Скачать CSV реплик
      </button>

    </div>
  );
};

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

const GlossaryExport: React.FC<{ onStatus: (value: string) => void }> = ({ onStatus }) => {
  const terms = useMemo(() => Object.entries(ARKNIGHTS_CANONICAL_GLOSSARY), []);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, value] of Object.entries(
      operatorNamesMap as Record<
        string,
        { englishName?: string; displayName?: string; russianName?: string }
      >
    )) {
      if (!id.startsWith('char_') || !value.russianName) continue;
      const source = value.englishName || value.displayName || id;
      if (!map.has(source)) map.set(source, value.russianName);
    }
    return Array.from(map.entries());
  }, []);

  const handleExport = () => {
    const rows = [
      ...terms.map(([source, translation]) => ({ kind: 'term', source, translation, note: '' })),
      ...names.map(([source, translation]) => ({ kind: 'name', source, translation, note: '' })),
    ];
    downloadCsv('glossary.csv', rows);
    onStatus(`Готово: ${rows.length} строк`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.02] p-3">
          <p className="text-2xl font-black text-white/80">{terms.length}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">Терминов</p>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-3">
          <p className="text-2xl font-black text-white/80">{names.length}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">Имён</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="mt-3 flex h-9 items-center gap-2 border border-white/25 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/20"
      >
        <Download className="h-4 w-4" />
        Скачать CSV глоссария
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Integrated Strategies
// ---------------------------------------------------------------------------

interface IsTheme {
  id: string;
  name: string;
  titleTop?: string;
  titleCursive?: string;
  lines?: string[];
}

const IsExport: React.FC<{ onStatus: (value: string) => void }> = ({ onStatus }) => {
  const [themes, setThemes] = useState<IsTheme[]>([]);
  const [selected, setSelected] = useState<IsTheme | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(platform.dataUrl('/data/archive/terminal.json'))
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { integratedStrategies?: IsTheme[] } | null) => {
        setThemes(payload?.integratedStrategies || []);
      })
      .catch(() => onStatus('Не удалось загрузить IS'));
  }, [onStatus]);

  useEffect(() => {
    if (!selected) {
      setExistingUrl(null);
      return;
    }
    let cancelled = false;
    const url = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/ru_RU/is/${encodeURIComponent(selected.id)}.csv`;
    fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then((response) => {
        if (!cancelled) setExistingUrl(response.ok ? url : null);
      })
      .catch(() => {
        if (!cancelled) setExistingUrl(null);
      });
    return () => { cancelled = true; };
  }, [selected]);

  const handleTemplate = () => {
    if (!selected) return;
    const rows: Array<Record<string, string>> = [
      { theme_id: selected.id, field: 'name', original: selected.name || '', translation: '' },
      { theme_id: selected.id, field: 'title_top', original: selected.titleTop || '', translation: '' },
      { theme_id: selected.id, field: 'title_cursive', original: selected.titleCursive || '', translation: '' },
    ];
    (selected.lines || []).forEach((line, index) => {
      rows.push({
        theme_id: selected.id,
        field: `line_${index + 1}`,
        original: line,
        translation: '',
      });
    });
    downloadCsv(`${selected.id}.csv`, rows);
    onStatus(`Готово: ${rows.length} строк`);
  };

  const handleDownloadExisting = async () => {
    if (!existingUrl || !selected) return;
    setLoading(true);
    try {
      const response = await fetch(existingUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP');
      downloadFile(`${selected.id}.csv`, await response.text(), 'text/csv;charset=utf-8');
      onStatus('Перевод скачан');
    } catch {
      onStatus('Не удалось скачать перевод');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <select
        value={selected?.id || ''}
        onChange={(event) => setSelected(themes.find((item) => item.id === event.target.value) || null)}
        className="h-9 w-full border border-white/10 bg-white/5 px-2 text-xs text-white/80 outline-none"
      >
        <option value="">Тема IS…</option>
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id} className="bg-[#111]">
            {theme.name || theme.id}
          </option>
        ))}
      </select>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleTemplate}
          disabled={!selected}
          className="flex h-9 items-center gap-2 border border-white/25 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/20 disabled:opacity-30"
        >
          <Download className="h-4 w-4" />
          Скачать CSV темы
        </button>
        {existingUrl && (
          <button
            type="button"
            onClick={handleDownloadExisting}
            disabled={loading}
            className="flex h-9 items-center gap-2 border border-white/15 bg-white/5 px-4 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать готовый перевод
          </button>
        )}
      </div>

      {selected && (
        <div className="mt-4 border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            {selected.id} · {selected.name}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {(selected.lines || []).map((line, index) => (
              <p key={index} className="m-0 text-[11px] leading-relaxed text-white/55">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
