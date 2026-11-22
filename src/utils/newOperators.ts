import newOperatorEntries from '../data/new_operators.json';

/**
 * «Новые» оперативники: релизы за последние 30 дней, но не больше шести
 * самых свежих. Даты релизов ведутся в `src/data/new_operators.json`;
 * `validate:data` проверяет, что каждый id существует в каталоге.
 */
export const NEW_OPERATOR_WINDOW_DAYS = 30;
export const NEW_OPERATOR_LIMIT = 6;

interface NewOperatorEntry {
  id: string;
  releasedAt: string;
}

const entries: NewOperatorEntry[] = (newOperatorEntries as unknown[]).map(
  (entry) => {
    if (typeof entry === 'string') {
      // Обратная совместимость со старым форматом-массивом id.
      return { id: entry, releasedAt: '' };
    }
    const value = entry as Partial<NewOperatorEntry>;
    return { id: String(value.id ?? ''), releasedAt: String(value.releasedAt ?? '') };
  }
);

function releaseTime(entry: NewOperatorEntry): number {
  if (!entry.releasedAt) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(`${entry.releasedAt}T00:00:00Z`);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/** Id оперативников, которые ещё «новые» на указанную дату. */
export function getNewOperatorIds(now: Date = new Date()): Set<string> {
  const cutoff = now.getTime() - NEW_OPERATOR_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return new Set(
    entries
      .filter((entry) => entry.id && releaseTime(entry) >= cutoff)
      .sort((a, b) => releaseTime(b) - releaseTime(a))
      .slice(0, NEW_OPERATOR_LIMIT)
      .map((entry) => entry.id)
  );
}

export const NEW_OPERATOR_IDS: ReadonlySet<string> = getNewOperatorIds();

export function isNewOperator(id: string, now: Date = new Date()): boolean {
  return getNewOperatorIds(now).has(id);
}
