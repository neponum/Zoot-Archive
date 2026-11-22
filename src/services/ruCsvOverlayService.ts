import Papa from 'papaparse';

/**
 * Русские overlays поверх официальных JSON-таблиц игры.
 *
 * Официальные досье и реплики сайт всегда берёт из game-таблиц (`handbook_info_table`,
 * `charword_table`). Русский текст хранится отдельными CSV в zoot-data и
 * подменяет только переводимые поля.
 *
 *   translation/ru_RU/dossiers/<operator_id>.csv
 *   translation/ru_RU/voices/<operator_id>.csv
 */
const ZOOT_DATA_RAW = 'https://raw.githubusercontent.com/neponum/zoot-data/main';
const TRANSLATION_ROOT = `${ZOOT_DATA_RAW}/translation/ru_RU`;

export interface DossierOverlayRow {
  index: number;
  titleRu: string;
  textRu: string;
}

export interface VoiceOverlayRow {
  id: string;
  title: string;
  original: string;
  translation: string;
}

type CsvRow = Record<string, string>;

const dossierCache = new Map<string, Map<number, DossierOverlayRow>>();
const voiceCache = new Map<string, Map<string, VoiceOverlayRow>>();

const dossierInflight = new Map<string, Promise<Map<number, DossierOverlayRow>>>();
const voiceInflight = new Map<string, Promise<Map<string, VoiceOverlayRow>>>();

async function fetchCsv(url: string): Promise<CsvRow[] | null> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    const text = await response.text();
    const trimmed = text.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) return null;
    const parsed = Papa.parse<CsvRow>(text.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data.filter((row) => !!row && Object.values(row).some((value) => !!value));
  } catch {
    return null;
  }
}

const dossierUrl = (operatorId: string) =>
  `${TRANSLATION_ROOT}/dossiers/${encodeURIComponent(operatorId)}.csv`;

const voiceUrl = (operatorId: string) =>
  `${TRANSLATION_ROOT}/voices/${encodeURIComponent(operatorId)}.csv`;

/** Русские заголовки и тексты разделов досье по `section_index`. */
export async function loadDossierOverlay(
  operatorId: string
): Promise<Map<number, DossierOverlayRow>> {
  const cached = dossierCache.get(operatorId);
  if (cached) return cached;
  const inflight = dossierInflight.get(operatorId);
  if (inflight) return inflight;

  const task = (async () => {
    const rows = await fetchCsv(dossierUrl(operatorId));
    const map = new Map<number, DossierOverlayRow>();
    for (const row of rows || []) {
      const index = Number(row.section_index);
      if (!Number.isFinite(index)) continue;
      map.set(index, {
        index,
        titleRu: (row.title_ru || '').trim(),
        textRu: (row.text_ru || '').trim(),
      });
    }
    dossierCache.set(operatorId, map);
    return map;
  })();

  dossierInflight.set(operatorId, task);
  try {
    return await task;
  } finally {
    dossierInflight.delete(operatorId);
  }
}

/** Русские переводы реплик: ключ — id реплики, запасной — title + original. */
export async function loadVoiceOverlay(
  operatorId: string
): Promise<Map<string, VoiceOverlayRow>> {
  const cached = voiceCache.get(operatorId);
  if (cached) return cached;
  const inflight = voiceInflight.get(operatorId);
  if (inflight) return inflight;

  const task = (async () => {
    const rows = await fetchCsv(voiceUrl(operatorId));
    const map = new Map<string, VoiceOverlayRow>();
    for (const row of rows || []) {
      const translation = (row.translation || '').trim();
      if (!translation) continue;
      const item: VoiceOverlayRow = {
        id: (row.id || '').trim(),
        title: (row.title || '').trim(),
        original: (row.original || '').trim(),
        translation,
      };
      if (item.id) map.set(item.id, item);
      // На случай, если CSV собран без id.
      map.set(`${item.title}||${item.original}`, item);
    }
    voiceCache.set(operatorId, map);
    return map;
  })();

  voiceInflight.set(operatorId, task);
  try {
    return await task;
  } finally {
    voiceInflight.delete(operatorId);
  }
}

/** Найти перевод реплики по id, затем по названию + оригиналу. */
export function findVoiceTranslation(
  overlay: Map<string, VoiceOverlayRow>,
  id: string,
  title: string,
  original: string
): string {
  return (
    overlay.get(id)?.translation ||
    overlay.get(`${title}||${original}`)?.translation ||
    ''
  );
}
