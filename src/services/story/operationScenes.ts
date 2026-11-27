/**
 * Карта «операция → её сюжетные сцены».
 *
 * Данные собирает `scripts/build_story_operations.mjs` из `stage_table.json` и
 * `story_table.json`. В игре у операции бывает сцена до боя (`beg`), после боя
 * (`end`) или обе; у стори-онли узлов (интерлюдий) сцена одна.
 *
 * Ключ `operations` — код операции (`0-1`, `TL-1`), но он не всегда уникален:
 * у мини-событий интерлюдии называются просто `ST-1`, `ST-2`, и такой код
 * встречается в десятке глав. Поэтому для них есть `chapterOperations` с
 * ключом `<chapter>|<code>`; он проверяется первым.
 */

export interface OperationScenes {
  beg?: string | null;
  end?: string | null;
}

export interface StoryOperationsPayload {
  operations?: Record<string, OperationScenes>;
  /** Сцены операций, код которых не уникален: ключ `<chapter>|<code>`. */
  chapterOperations?: Record<string, OperationScenes>;
  /** Коды, у которых в таблицах игры точно нет сцен (для диагностики). */
  storyless?: string[];
}

import { platform } from '../../platform';

const OPERATIONS_URL = '/data/archive/story/operations.json';

let payloadPromise: Promise<StoryOperationsPayload | null> | null = null;

/**
 * Однократная загрузка карты сцен на страницу: карту одновременно просят
 * панель главы и маршрут читалки, дублировать запрос незачем.
 */
export function fetchStoryOperations(): Promise<StoryOperationsPayload | null> {
  if (!payloadPromise) {
    // Без таймаута запрос мог висеть вечно, а маршрут читалки в это время
    // показывал бесконечный чёрный экран.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    payloadPromise = platform
      .fetch(platform.dataUrl(OPERATIONS_URL), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((payload: StoryOperationsPayload | null) => {
        clearTimeout(timer);
        // Не кэшируем пустой ответ: сеть могла отвалиться, и повторный
        // переход должен попробовать снова.
        if (!payload) payloadPromise = null;
        return payload;
      });
  }
  return payloadPromise;
}

/** Сцены операции или `undefined`, если сюжета у неё нет. */
export function resolveOperationScenes(
  payload: StoryOperationsPayload | null | undefined,
  chapter: string | undefined,
  code: string | undefined
): OperationScenes | undefined {
  if (!payload || !code) return undefined;

  const scoped = chapter
    ? payload.chapterOperations?.[`${chapter}|${code}`]
    : undefined;
  const scenes = scoped ?? payload.operations?.[code];
  if (!scenes) return undefined;
  if (!scenes.beg && !scenes.end) return undefined;
  return scenes;
}
