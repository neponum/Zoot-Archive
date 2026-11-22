/**
 * Калибровка динамических иллюстраций.
 *
 * В игре динамический образ — это два слоя: статичная иллюстрация (пейзаж,
 * дым, снег, дальний план) и Spine поверх неё (персонаж, дракон, ближний
 * план). Чтобы слои совпали, Spine нужно рисовать не «по границам модели»,
 * а в тех же координатах, что и арт. Преобразование задаёт игровой prefab,
 * которого у нас нет, поэтому оно посчитано офлайн: setup-поза модели
 * сопоставляется с артом по SIFT-признакам, результат лежит в
 * `public/data/dyn-illust-align.json`.
 *
 * Координаты нормализованы по размеру арта (арт квадратный):
 * `a`..`d` — линейная часть аффинного преобразования модели в арт,
 * `x`, `y` — положение точки (0, 0) модели в долях арта.
 *
 * `assets` — точные имена файлов модели: у части образов `.skel` лежит без
 * расширения или называется иначе, и по шаблону его не найти.
 */
export interface DynIllustAssets {
  folder: string;
  atlas: string;
  skel: string;
  png: string;
}

export interface DynIllustAlign {
  a: number;
  b: number;
  c: number;
  d: number;
  x: number;
  y: number;
  assets?: DynIllustAssets;
}

interface AlignEntry {
  status?: string;
  a_norm?: number;
  b_norm?: number;
  c_norm?: number;
  d_norm?: number;
  ox_norm?: number;
  oy_norm?: number;
  assets?: DynIllustAssets;
}

type AlignFile = Record<string, AlignEntry>;

const ALIGN_URL = '/data/dyn-illust-align.json';

let cache: Promise<AlignFile> | null = null;

function loadAlignFile(): Promise<AlignFile> {
  if (!cache) {
    cache = fetch(ALIGN_URL)
      .then((response) => (response.ok ? (response.json() as Promise<AlignFile>) : {}))
      .catch(() => ({}));
  }
  return cache;
}

export async function getDynIllustAlign(id: string): Promise<DynIllustAlign | null> {
  const file = await loadAlignFile();
  const entry = file[id];
  if (!entry || entry.status !== 'ok') return null;
  const { a_norm: a, b_norm: b, c_norm: c, d_norm: d, ox_norm: x, oy_norm: y } = entry;
  if (![a, b, c, d, x, y].every((value) => Number.isFinite(value))) return null;
  // Страховка от битой калибровки: масштаб должен быть правдоподобным.
  if (!(a as number) || Math.abs((a as number) - (d as number)) > Math.abs(a as number) * 0.2) return null;
  return {
    a: a as number,
    b: b as number,
    c: c as number,
    d: d as number,
    x: x as number,
    y: y as number,
    assets: entry.assets,
  };
}
