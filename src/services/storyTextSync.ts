import { CacheService } from './cacheService';
import { platform } from '../platform';
import { getBaseUrl } from './story/storyTreeService';
import {
  TRANSLATION_REGISTRY,
  getDefaultTranslator,
  sortTranslators,
} from '../config/translationsRegistry';
import {
  getTranslationCsvCandidates,
  getTranslatorSuffix,
} from '../utils/translationPaths';

/**
 * Фоновая синхронизация текстов сценариев.
 *
 * Приложение не хранит тексты у себя: очередь качает `.txt` с torappu/raw
 * GitHub и складывает в Cache Storage. `fetchStoryScript` уже проверяет этот
 * кэш перед сетью, поэтому после синхронизации главы читаются офлайн.
 *
 * Правила:
 * - один запрос за раз (PRTS не любит пачки);
 * - приоритет у главы, которую открыл пользователь;
 * - прогресс переживает перезапуск;
 * - языки выбираются в настройках: zh_CN/en_US/ja_JP/ko_KR + ru (zh_CN + CSV).
 */

export type OfflineTextLanguage = 'zh_CN' | 'en_US' | 'ja_JP' | 'ko_KR' | 'ru_RU';

export const OFFLINE_TEXT_LANGUAGES: OfflineTextLanguage[] = [
  'ru_RU',
  'en_US',
  'zh_CN',
  'ja_JP',
  'ko_KR',
];

const LANGS_KEY = 'arknights_offline_text_langs';
const DONE_KEY_PREFIX = 'arknights_offline_text_done_';
const AUTOSTART_KEY = 'arknights_offline_text_autostart';
const MANIFEST_PATH = '/data/archive/story/scripts.json';
const REQUEST_DELAY_MS = 80;

interface ScriptManifest {
  files: string[];
  baseLanguages?: string[];
  russianOverlay?: boolean;
}

export interface StoryTextSyncState {
  running: boolean;
  paused: boolean;
  total: number;
  done: number;
  current: string | null;
  errors: number;
  languages: OfflineTextLanguage[];
  /** Сколько всего файлов сценариев в манифесте (0, пока он не загружен). */
  filesTotal: number;
  /** Прогресс по каждому выбранному языку. */
  byLanguage: Array<{ lang: OfflineTextLanguage; done: number; total: number }>;
}

let manifest: ScriptManifest | null = null;
let manifestPromise: Promise<ScriptManifest> | null = null;
let queue: Array<{ lang: OfflineTextLanguage; path: string }> = [];
let running = false;
let paused = false;
let stopped = false;
let currentLabel: string | null = null;
let starting = false;
let pendingPriority: string | null = null;
let errors = 0;
let totalJobs = 0;
let doneJobs = 0;
let runId = 0;

const doneSets = new Map<OfflineTextLanguage, Set<string>>();
const persistTimers = new Map<OfflineTextLanguage, ReturnType<typeof setTimeout>>();
const listeners = new Set<(state: StoryTextSyncState) => void>();

function readLanguages(): OfflineTextLanguage[] {
  try {
    const raw = localStorage.getItem(LANGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((lang): lang is OfflineTextLanguage =>
          OFFLINE_TEXT_LANGUAGES.includes(lang)
        );
        if (valid.length > 0) return valid;
      }
    }
  } catch {
    /* ignore */
  }
  return [defaultLanguage()];
}

function defaultLanguage(): OfflineTextLanguage {
  try {
    const raw =
      localStorage.getItem('arknights_ui_lang') ||
      localStorage.getItem('arknights_story_lang');
    switch (raw) {
      case 'en_US':
        return 'en_US';
      case 'ja_JP':
        return 'ja_JP';
      case 'ko_KR':
        return 'ko_KR';
      case 'zh_CN':
        return 'zh_CN';
      default:
        return 'ru_RU';
    }
  } catch {
    return 'ru_RU';
  }
}

let languages: OfflineTextLanguage[] = readLanguages();

function loadDoneSet(lang: OfflineTextLanguage): Set<string> {
  const cached = doneSets.get(lang);
  if (cached) return cached;
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem(DONE_KEY_PREFIX + lang);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const path of parsed) {
          if (typeof path === 'string') set.add(path);
        }
      }
    }
  } catch {
    /* ignore */
  }
  doneSets.set(lang, set);
  return set;
}

function scheduleDonePersist(lang: OfflineTextLanguage): void {
  const existing = persistTimers.get(lang);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    lang,
    setTimeout(() => {
      persistTimers.delete(lang);
      try {
        const values = Array.from(loadDoneSet(lang));
        localStorage.setItem(DONE_KEY_PREFIX + lang, JSON.stringify(values));
      } catch {
        /* localStorage may be full — не критично, кэш всё равно есть */
      }
    }, 1500)
  );
}

function emit(): void {
  const state = getStoryTextSyncState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      /* ignore */
    }
  });
}

function yieldDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBadText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    !lower ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.startsWith('404:') ||
    lower.startsWith('not found')
  );
}

async function loadManifest(): Promise<ScriptManifest> {
  if (manifest) return manifest;
  if (manifestPromise) return manifestPromise;

  manifestPromise = (async () => {
    const response = await platform.fetch(platform.dataUrl(MANIFEST_PATH));
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const payload = (await response.json()) as ScriptManifest;
    if (!Array.isArray(payload.files)) throw new Error('Manifest has no files');
    manifest = payload;
    return payload;
  })();

  return manifestPromise;
}

function officialUrls(lang: Exclude<OfflineTextLanguage, 'ru_RU'>, path: string): string[] {
  const base = getBaseUrl(lang);
  const urls = [`${base}/gamedata/story/${path}.txt`];
  // `gamedata/latest` на torappu.prts.wiki — это китайский клиент. Для
  // en/ja/ko он вернул бы китайский текст и закэшировал его под чужим
  // языком, поэтому адрес добавляем только для zh_CN.
  if (lang === 'zh_CN') {
    urls.push(`https://torappu.prts.wiki/gamedata/latest/story/${path}.txt`);
  }
  return urls;
}

function ruCsvUrls(path: string): string[] {
  const baseName = path.split('/').pop();
  if (!baseName) return [];
  const registry = TRANSLATION_REGISTRY['ru_RU'];
  const translators = sortTranslators(registry?.translators ?? []);
  const defaultTranslator = getDefaultTranslator(translators);
  const ordered = defaultTranslator
    ? [defaultTranslator, ...translators.filter((name) => name !== defaultTranslator)]
    : translators;

  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  for (const name of ordered) {
    const suffix = getTranslatorSuffix(name);
    if (!suffix) continue;
    for (const url of getTranslationCsvCandidates('ru_RU', baseName, suffix)) {
      push(url);
    }
  }
  for (const url of getTranslationCsvCandidates('ru_RU', baseName, '')) push(url);
  return urls;
}

async function fetchAndCacheText(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const cached = await CacheService.getCachedText(url);
      if (cached && !isBadText(cached)) return true;
      const response = await platform.fetch(url, { cache: 'no-cache' });
      if (!response.ok) continue;
      const text = await response.text();
      if (isBadText(text)) continue;
      await CacheService.cacheText(url, text);
      return true;
    } catch {
      // Пробуем следующий источник.
    }
  }
  return false;
}

async function syncOne(lang: OfflineTextLanguage, path: string): Promise<boolean> {
  if (lang === 'ru_RU') {
    const baseOk = await fetchAndCacheText(officialUrls('zh_CN', path));
    if (!baseOk) return false;
    // Overlay не обязателен: если перевода нет, глава читается на zh_CN.
    await fetchAndCacheText(ruCsvUrls(path));
    return true;
  }
  return fetchAndCacheText(officialUrls(lang, path));
}

function buildQueue(): void {
  const jobs: Array<{ lang: OfflineTextLanguage; path: string }> = [];
  let alreadyDone = 0;

  for (const lang of languages) {
    const doneSet = loadDoneSet(lang);
    alreadyDone += doneSet.size;
    for (const path of manifest?.files ?? []) {
      if (doneSet.has(path)) continue;
      jobs.push({ lang, path });
    }
  }

  if (pendingPriority) {
    for (const lang of languages) {
      const index = jobs.findIndex(
        (job) => job.lang === lang && job.path === pendingPriority
      );
      if (index !== -1) {
        const [job] = jobs.splice(index, 1);
        jobs.unshift(job);
      }
    }
    pendingPriority = null;
  }

  queue = jobs;
  totalJobs = jobs.length + alreadyDone;
  doneJobs = alreadyDone;
}

/** Текущее состояние очереди для UI. */
export function getStoryTextSyncState(): StoryTextSyncState {
  const filesTotal = manifest?.files.length ?? 0;
  return {
    running,
    paused,
    total: totalJobs,
    done: doneJobs,
    current: currentLabel,
    errors,
    languages: [...languages],
    filesTotal,
    byLanguage: languages.map((lang) => ({
      lang,
      done: loadDoneSet(lang).size,
      total: filesTotal,
    })),
  };
}

export function subscribeStoryTextSync(
  listener: (state: StoryTextSyncState) => void
): () => void {
  listeners.add(listener);
  listener(getStoryTextSyncState());
  return () => listeners.delete(listener);
}

export function getOfflineTextLanguages(): OfflineTextLanguage[] {
  return [...languages];
}

/**
 * Сбрасывает очередь и запускает её заново — нужен после смены языков,
 * чтобы в загрузку попали только актуальные файлы.
 */
export function restartStoryTextSync(): void {
  stopStoryTextSync();
  void startStoryTextSync().catch(() => {});
}

export function resetOfflineTextProgress(lang?: OfflineTextLanguage): void {
  const targets = lang ? [lang] : languages;
  for (const target of targets) {
    loadDoneSet(target).clear();
    try {
      localStorage.removeItem(DONE_KEY_PREFIX + target);
    } catch {
      /* ignore */
    }
  }
  emit();
}

export function setOfflineTextLanguages(next: OfflineTextLanguage[]): void {
  const unique = Array.from(new Set(next)).filter((lang): lang is OfflineTextLanguage =>
    OFFLINE_TEXT_LANGUAGES.includes(lang)
  );
  languages = unique.length > 0 ? unique : [defaultLanguage()];
  try {
    localStorage.setItem(LANGS_KEY, JSON.stringify(languages));
  } catch {
    /* ignore */
  }
  emit();
}

export function isOfflineTextAutostartEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOSTART_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setOfflineTextAutostart(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSTART_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

async function runLoop(token: number): Promise<void> {
  running = true;
  paused = false;
  stopped = false;
  emit();

  while (!stopped && queue.length > 0) {
    if (token !== runId) return;
    if (paused) break;
    const job = queue.shift();
    if (!job) break;

    const doneSet = loadDoneSet(job.lang);
    if (doneSet.has(job.path)) continue;

    currentLabel = `${job.lang} · ${job.path.split('/').pop() ?? job.path}`;
    emit();

    const ok = await syncOne(job.lang, job.path);
    if (ok) {
      doneSet.add(job.path);
      scheduleDonePersist(job.lang);
      doneJobs += 1;
    } else {
      errors += 1;
    }
    emit();

    if (REQUEST_DELAY_MS > 0) await yieldDelay(REQUEST_DELAY_MS);
  }

  if (token !== runId) return;
  running = false;
  currentLabel = null;
  if (queue.length === 0) {
    totalJobs = doneJobs;
  }
  emit();
}

/** Запустить/продолжить синхронизацию. Повторный вызов безопасен. */
export async function startStoryTextSync(): Promise<void> {
  if (running) {
    paused = false;
    emit();
    return;
  }
  if (starting) return;
  starting = true;
  try {
    await loadManifest();
    if (queue.length === 0) buildQueue();
    runId += 1;
    void runLoop(runId);
  } finally {
    starting = false;
  }
}

export function pauseStoryTextSync(): void {
  paused = true;
  emit();
}

export function resumeStoryTextSync(): void {
  if (queue.length === 0) return;
  if (running) {
    paused = false;
    emit();
    return;
  }
  runId += 1;
  void runLoop(runId);
}

export function stopStoryTextSync(): void {
  runId += 1;
  stopped = true;
  paused = false;
  queue = [];
  running = false;
  currentLabel = null;
  emit();
}

/**
 * Ставит главу в начало очереди. Вызывается при открытии истории, чтобы
 * текущая глава скачалась раньше остальных.
 */
export function prioritizeStoryText(storyPath: string): void {
  const normalized = storyPath
    .replace(/\.txt$/i, '')
    .replace(/^\/+/, '')
    .replace(/^gamedata\/story\//, '');

  if (!manifest) {
    pendingPriority = normalized;
    return;
  }

  for (const lang of languages) {
    if (loadDoneSet(lang).has(normalized)) continue;
    const index = queue.findIndex(
      (job) => job.lang === lang && job.path === normalized
    );
    if (index !== -1) {
      const [job] = queue.splice(index, 1);
      queue.unshift(job);
    } else if (manifest?.files?.includes(normalized)) {
      queue.unshift({ lang, path: normalized });
      totalJobs += 1;
    }
  }
  emit();
}

/** Автозапуск только в нативных приложениях; на сайте не качаем 75 МБ. */
export function maybeAutoStartStoryTextSync(): void {
  if (platform.kind === 'web') return;
  if (!isOfflineTextAutostartEnabled()) return;
  void startStoryTextSync().catch(() => {});
}

/** Загружает манифест заранее, чтобы экран «Хранилище» показал объём. */
export async function preloadStoryTextManifest(): Promise<void> {
  try {
    await loadManifest();
    emit();
  } catch {
    /* экран покажет нули и кнопку повтора */
  }
}
