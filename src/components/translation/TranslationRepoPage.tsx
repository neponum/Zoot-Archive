import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Home,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { fetchChapterList } from '../../services/storyService';
import type { StoryEpisode } from '../../types';
import STORY_TITLES_RU from '../../data/storyTitlesRu.json';

/**
 * Браузер переводов в `neponum/zoot-data/translation` в духе файлового
 * дерева GitHub: папки эпизодов, CSV-файлы, поиск и размеры.
 *
 * Листинг берётся из GitHub Contents API (один запрос на папку), а для поиска
 * по всему `story/` — один запрос дерева (`git/trees?recursive=1`). Рядом с
 * кодами (`act55side`) показываются названия эпизодов из каталога историй,
 * поэтому искать можно по «Время в путь!», а не только по `actN`.
 */

const REPO = 'neponum/zoot-data';
const API = `https://api.github.com/repos/${REPO}/contents`;
const TREE_API = `https://api.github.com/repos/${REPO}/git/trees`;
const RAW = `https://raw.githubusercontent.com/${REPO}/main/translation/ru_RU`;
const ROOT = 'translation/ru_RU';

interface Entry {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const parentOf = (path: string) => path.split('/').slice(0, -1).join('/');

/** Сколько строк CSV показываем в предпросмотре: файлы бывают по несколько тысяч строк. */
const MAX_PREVIEW_ROWS = 300;

/**
 * Разбор CSV с кавычками и переводами строк внутри полей: в шаблонах
 * реплик тексты многострочные, обычный `split('\n')` их ломает.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const META_LABELS: Record<string, string> = {
  __translator__: 'Переводчик',
  __language__: 'Язык',
  __episode__: 'Эпизод',
  __chapter__: 'Глава',
};

interface PreviewData {
  entry: Entry;
  header: string[];
  meta: Array<{ label: string; value: string }>;
  rows: string[][];
  total: number;
  /** Для JSON: готовый текст вместо таблицы. */
  text?: string;
}

/** Ширина колонок по смыслу заголовка: ID и имена узкие, тексты — свободные. */
function columnClass(name: string): string {
  const key = name.trim().toLowerCase();
  if (key === 'id') return 'w-[112px]';
  if (key === 'character' || key === 'title') return 'w-[136px]';
  if (key === 'reference' || key === 'original_zh') return 'w-[160px]';
  return '';
}

export const TranslationRepoPage: React.FC = () => {
  const navigate = useNavigate();
  const [path, setPath] = useState(ROOT);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [storyTree, setStoryTree] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [titles, setTitles] = useState<{
    episodes: Map<string, string[]>;
    files: Map<string, string[]>;
  }>({ episodes: new Map(), files: new Map() });
  const cache = useRef(new Map<string, Entry[]>());

  const load = useCallback(async (target: string, force = false) => {
    const cached = cache.current.get(target);
    if (cached && !force) {
      setEntries(cached);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/${target}`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (response.status === 403) {
        throw new Error('GitHub ограничил число запросов (60 в час на IP). Попробуйте позже.');
      }
      if (!response.ok) throw new Error(`GitHub ответил ${response.status}`);
      const data = (await response.json()) as Array<Record<string, unknown>>;
      const list: Entry[] = data
        .map((item) => ({
          name: String(item.name || ''),
          path: String(item.path || ''),
          type: item.type === 'dir' ? ('dir' as const) : ('file' as const),
          size: Number(item.size || 0),
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name, 'ru');
        });
      cache.current.set(target, list);
      setEntries(list);

      // Дерево `story/` нужно один раз: по нему идёт поиск по всем эпизодам.
      if (target === ROOT) {
        const story = data.find((item) => item.name === 'story' && item.type === 'dir');
        const sha = story ? String(story.sha || '') : '';
        if (sha) void loadStoryTree(sha);
      }
    } catch (caught) {
      setEntries([]);
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStoryTree = useCallback(async (sha: string) => {
    try {
      const response = await fetch(`${TREE_API}/${sha}?recursive=1`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) return;
      const data = (await response.json()) as { tree?: Array<Record<string, unknown>> };
      const list: Entry[] = (data.tree || [])
        .filter((item) => item.type === 'tree' || item.type === 'blob')
        .map((item) => ({
          name: String(item.path || '').split('/').pop() || '',
          path: `translation/ru_RU/story/${String(item.path || '')}`,
          type: item.type === 'tree' ? ('dir' as const) : ('file' as const),
          size: Number(item.size || 0),
        }));
      setStoryTree(list);
    } catch {
      // Поиск по дереву просто не включится — браузер продолжит работать.
    }
  }, []);

  useEffect(() => {
    void load(path);
  }, [path, load]);

  // Названия эпизодов и глав: искать по «Время в путь!» удобнее, чем по act55side.
  useEffect(() => {
    let cancelled = false;
    fetchChapterList()
      .then((episodes: StoryEpisode[]) => {
        if (cancelled) return;
        const ruChapters = (STORY_TITLES_RU as { chapters?: Record<string, string> }).chapters || {};
        const ruEpisodes = (STORY_TITLES_RU as { episodes?: Record<string, string> }).episodes || {};
        const episodeTitles = new Map<string, string[]>();
        const fileTitles = new Map<string, string[]>();
        for (const episode of episodes) {
          const names = [ruChapters[episode.id], episode.name].filter(Boolean) as string[];
          if (names.length) episodeTitles.set(episode.id.toLowerCase(), names);
          for (const chapter of episode.chapters || []) {
            const base = chapter.storyTxt.split('/').pop()?.replace(/\.txt$/, '');
            if (!base) continue;
            const code = chapter.code || '';
            const localized = ruEpisodes[`${episode.id}|${code}`];
            const values = [localized, chapter.name, code].filter(Boolean) as string[];
            if (values.length) fileTitles.set(base.toLowerCase(), values);
          }
        }
        setTitles({ episodes: episodeTitles, files: fileTitles });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const aliasesOf = useCallback(
    (entry: Entry): string[] => {
      if (entry.type === 'dir') return titles.episodes.get(entry.name.toLowerCase()) || [];
      const base = entry.name.replace(/\.csv$/, '');
      const direct = titles.files.get(base.toLowerCase());
      if (direct) return direct;
      // `level_act55side_st01_nep0num.csv` → `level_act55side_st01`
      const stripped = base.replace(
        /_(neksi0762|frostymisery17|naoshka_v|ilarhion|num4ar|nep0num|neponum|vendigo|myshanin)$/i,
        ''
      );
      return titles.files.get(stripped.toLowerCase()) || [];
    },
    [titles]
  );

  const titleOf = useCallback(
    (entry: Entry): string => aliasesOf(entry)[0] || '',
    [aliasesOf]
  );

  /** Родительская папка: хлебных крошек больше нет, вверх ведёт кнопка. */
  const parentPath = useMemo(() => {
    const parts = path.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  }, [path]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const pool = storyTree.length ? storyTree : entries;
    const seen = new Set<string>();
    const results: Entry[] = [];
    for (const entry of pool) {
      // В результатах оставляем только папки эпизодов (story/<эпизод>),
      // а не вложенные служебные каталоги.
      if (entry.type === 'dir' && entry.path.split('/').length !== 5) continue;
      const haystack = [entry.name, entry.path, ...aliasesOf(entry)]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) continue;
      if (seen.has(entry.path)) continue;
      seen.add(entry.path);
      results.push(entry);
      if (results.length >= 200) break;
    }
    return results;
  }, [query, storyTree, entries, aliasesOf]);

  const visible = query.trim() ? searchResults : entries;

  const download = async (entry: Entry) => {
    setBusyFile(entry.path);
    try {
      const response = await fetch(`${RAW}/${entry.path.replace('translation/ru_RU/', '')}`);
      if (!response.ok) throw new Error(String(response.status));
      saveBlob(entry.name, await response.blob());
    } catch {
      setError(`Не удалось скачать ${entry.name}`);
    } finally {
      setBusyFile(null);
    }
  };

  const openPreview = async (entry: Entry) => {
    setPreviewLoading(entry.path);
    try {
      const response = await fetch(`${RAW}/${entry.path.replace(`${ROOT}/`, '')}`);
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();

      if (entry.name.toLowerCase().endsWith('.json')) {
        let pretty = text;
        try {
          pretty = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          // Битый JSON показываем как есть — так его хотя бы видно.
        }
        setPreview({ entry, header: [], meta: [], rows: [], total: 0, text: pretty });
        return;
      }

      const parsed = parseCsv(text);
      const header = parsed[0] || [];
      const body = parsed
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim() !== ''));
      const meta = body
        .filter((row) => /^__.+__$/.test((row[0] || '').trim()))
        .map((row) => ({
          label: META_LABELS[(row[0] || '').trim()] || (row[0] || '').replace(/^__|__$/g, ''),
          value: row.slice(1).map((cell) => cell.trim()).filter(Boolean).join(' · '),
        }));
      const rows = body.filter((row) => !/^__.+__$/.test((row[0] || '').trim()));

      setPreview({
        entry,
        header,
        meta,
        rows: rows.slice(0, MAX_PREVIEW_ROWS),
        total: rows.length,
      });
    } catch {
      setError(`Не удалось открыть ${entry.name}`);
    } finally {
      setPreviewLoading(null);
    }
  };

  const openEntry = (entry: Entry) => {
    if (entry.type === 'dir') {
      setQuery('');
      setPath(entry.path);
      return;
    }
    void openPreview(entry);
  };

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b0b0b] text-[#c9c9c9]">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#060606] px-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
          title="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
          title="На главную"
        >
          <Home className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => parentPath && setPath(parentPath)}
          disabled={!parentPath}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:text-white/20"
          title="Уровень выше"
        >
          <ArrowUp className="h-4 w-4" />
        </button>

        <div className="ml-1 flex h-8 min-w-0 max-w-[460px] flex-1 items-center gap-2 border border-white/15 bg-[#0b0b0b] px-2 focus-within:border-white/40">
          <Search className="h-3.5 w-3.5 shrink-0 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск: act55side, «Время в путь!», TL-ST-1, файл…"
            className="h-full w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 text-white/40 hover:text-white"
              title="Очистить"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/30 lg:block">
          {query.trim() ? `найдено ${visible.length}` : `${entries.length} в папке`}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              cache.current.delete(path);
              void load(path, true);
            }}
            className="flex h-8 w-8 items-center justify-center text-white/50 hover:bg-white/10 hover:text-white"
            title="Обновить"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={`https://github.com/${REPO}/tree/main/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 px-2 text-white/50 hover:bg-white/10 hover:text-white"
            title="Открыть папку на GitHub"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden text-[11px] uppercase tracking-wider sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto site-scrollbar">
        {error && (
          <div className="m-3 border border-[#f5b400]/40 bg-[#f5b400]/5 px-3 py-2 text-[12px] text-[#f5b400]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/10 bg-[#141414] px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/40">
          {/* Вместо хлебных крошек — текущая папка как заголовок списка. */}
          <span className="flex-1 truncate font-mono text-white/55">
            {path.replace('translation/ru_RU/', '') || ROOT}
          </span>
          <span className="w-24 shrink-0 text-right">Размер</span>
        </div>

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загружаем список…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-[12px] text-white/35">
            {query.trim() ? 'Ничего не найдено' : 'Папка пуста'}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {visible.map((entry) => {
              const title = titleOf(entry);
              return (
                <li key={entry.path}>
                  <div className="group flex items-center gap-2 px-4 py-2 hover:bg-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => openEntry(entry)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      title={entry.type === 'file' ? 'Открыть предпросмотр' : entry.path}
                    >
                      {entry.type === 'dir' ? (
                        <Folder className="h-4 w-4 shrink-0 text-[#8b8b8b]" fill="currentColor" />
                      ) : previewLoading === entry.path ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8b8b8b]" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-[#8b8b8b]" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-[#e8e8e8] group-hover:underline">
                          {entry.name}
                        </span>
                        {(title || query.trim()) && (
                          <span className="block truncate text-[11px] text-white/35">
                            {title || parentOf(entry.path).replace('translation/ru_RU/', '')}
                          </span>
                        )}
                      </span>
                    </button>

                    <span className="w-24 shrink-0 text-right font-mono text-[11px] text-white/35">
                      {entry.type === 'dir' ? 'папка' : formatSize(entry.size)}
                    </span>

                    {entry.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => void download(entry)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center text-white/35 hover:text-white"
                        title="Скачать"
                      >
                        {busyFile === entry.path ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/70"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex h-full w-full max-w-[900px] flex-col border-l border-white/10 bg-[#0b0b0b] shadow-[-24px_0_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start gap-2 border-b border-white/10 bg-[#060606] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-[#e8e8e8]">
                  {preview.entry.name}
                </div>
                <div className="truncate font-mono text-[10px] text-white/35">
                  {preview.entry.path.replace('translation/ru_RU/', '')} ·{' '}
                  {formatSize(preview.entry.size)}
                </div>
              </div>

              <a
                href={`https://github.com/${REPO}/blob/main/${preview.entry.path}`}
                target="_blank"
                rel="noreferrer"
                title="Открыть на GitHub"
                className="flex h-8 w-8 items-center justify-center text-white/40 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => void download(preview.entry)}
                title="Скачать"
                className="flex h-8 w-8 items-center justify-center text-white/40 hover:bg-white/10 hover:text-white"
              >
                {busyFile === preview.entry.path ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                title="Закрыть"
                className="flex h-8 w-8 items-center justify-center text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {preview.meta.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 border-b border-white/10 px-4 py-2 text-[11px]">
                {preview.meta.map((item) => (
                  <span key={item.label} className="text-white/40">
                    {item.label}:{' '}
                    <span className="text-[#e8e8e8]/85">{item.value || '—'}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto site-scrollbar">
              {preview.text !== undefined ? (
                <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-[11px] leading-relaxed text-white/75">
                  {preview.text}
                </pre>
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 z-10 bg-[#141414] text-[10px] uppercase tracking-wider text-white/40">
                    <tr>
                      {preview.header.map((name, index) => (
                        <th
                          key={`${name}-${index}`}
                          className={`border-b border-white/10 px-3 py-2 font-semibold ${columnClass(name)}`}
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="align-top hover:bg-white/[0.03]">
                        {preview.header.map((name, cellIndex) => {
                          const value = row[cellIndex] ?? '';
                          const emptyTranslation = /translation/i.test(name) && !value.trim();
                          return (
                            <td
                              key={`${name}-${cellIndex}`}
                              className={`border-b border-white/[0.06] px-3 py-2 ${columnClass(name)} ${
                                emptyTranslation ? 'text-white/25' : 'text-[#d8d8d8]'
                              }`}
                            >
                              <span className="block whitespace-pre-wrap break-words">
                                {emptyTranslation ? '—' : value}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#060606] px-4 py-2 text-[10px] uppercase tracking-wider text-white/30">
              <span>
                {preview.text !== undefined
                  ? 'JSON'
                  : `показано ${preview.rows.length} из ${preview.total} строк`}
              </span>
              <span className="font-mono normal-case tracking-normal text-white/25">
                Esc — закрыть
              </span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
