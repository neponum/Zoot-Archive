import birthdays from '../data/operator_birthdays.json';

/**
 * Дни рождения оперативников (`char_id` → `MM-DD`).
 * Собирается скриптом `npm run sync:birthdays` из `handbook_info_table`.
 */
export const OPERATOR_BIRTHDAYS: Record<string, string> = birthdays;

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/** `08-30` для переданной даты (локальное время браузера). */
export function getMonthDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/** Идентификаторы оперативников, у которых сегодня день рождения. */
export function getBirthdayOperatorIds(date: Date = new Date()): Set<string> {
  const today = getMonthDay(date);
  const ids = new Set<string>();
  for (const [id, birthday] of Object.entries(OPERATOR_BIRTHDAYS)) {
    if (birthday === today) ids.add(id);
  }
  return ids;
}

/** `08-30` → `AUG 30`; пустая строка, если даты нет. */
export function formatBirthday(monthDay?: string): string {
  if (!monthDay) return '';
  const [month, day] = monthDay.split('-').map(Number);
  if (!month || !day) return '';
  return `${MONTH_NAMES[month - 1]} ${String(day).padStart(2, '0')}`;
}
