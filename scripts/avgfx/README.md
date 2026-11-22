# avgfx — выгрузка игровых эффектов сценария

`[bgeffect(name="$eb_snow")]` в скриптах ссылается не на картинку, а на
Unity-префаб (`avg/effects/background/avg_snow_01.ab`). Бандлы не отдаёт
`torappu.prts.wiki`, зато их умеет скачивать и распаковывать
[`MooncellWiki/torappu`](https://github.com/MooncellWiki/torappu) — тот же
инструмент, которым собран `torappu`-контент.

`export.py` превращает бандл в JSON и WebP, чтобы читалка могла рисовать
эффект сама, без Unity.

## Запуск

Нужен Python 3.13 и checkout `torappu` с его зависимостями (UnityPy, lz4inv):

```bash
git clone --depth 1 https://github.com/MooncellWiki/torappu /tmp/torappu
cd /tmp/torappu && uv sync

cd ZOOT-ARCHIVE
uv run --project /tmp/torappu python scripts/avgfx/export.py \
  --out /tmp/avgfx avg_snow_01 avg_firefly_01
```

`--res` можно не указывать: скрипт берёт свежий `resVersion` с официального
конфига Hypergryph. Скачанные бандлы кэшируются в `storage/` внутри
checkout'а `torappu`, повторный прогон их не качает.

## Что на выходе

```
<out>/<stem>/index.json      дерево префаба, системы частиц, материалы
<out>/<stem>/<texture>.webp  текстуры материалов
```

`index.json`:

| поле | смысл |
|---|---|
| `prefabs` | дерево GameObject'ов: `name`, `path`, `pos`, `rot`, `scale`, `kids`, `components` |
| `systems` | по одной записи на `ParticleSystem`: `life`, `startSpeed`, `startSize`, `startSizeY`, `gravity`, `rate`, `bursts`, `velocity`, `shape`, `sizeOverLife`, `rotationOverLife`, `colorOverLife`, `uv`, `scalingMode`, `renderer` |
| `materials` | материал: `shader`, `floats`, `colors`, `textures` (слот → файл, scale, offset) |
| `renderer.meshSize` | размах меша (2 × `m_LocalAABB.m_Extent`) у `mode = 4`: размер mesh-частицы = `startSize × meshSize` |
| `images` | файл → короткий хэш (для кэша) |
| `bundle` | исходный бандл, для сверки |

`uv` — атлас кадров (`tilesX`, `tilesY`, `animationType`, `rowMode`,
`frameOverTime`): у светлячков 2×2, у плёнки 2×8 и 1×4.

Кривые — компактный вид `MinMaxCurve`: `state` (0 — константа, 1 — две
константы, 2 — кривая, 3 — две кривые), `scalar`/`min`, `keys`/`minKeys`
(`[time, value, inSlope, outSlope]`). Градиенты — `colors` и `alphas`.

Выключенные модули (`SizeModule`, `RotationModule`, `ColorModule`) выгружаются
как `null`: Unity хранит в них значения по умолчанию, и у 73% систем это
`rotationOverLife = 0.785` рад/с — если применить его, маска поворачивается на
90° и открывает углы экрана.

## Объём

Проверено на семи эффектах: 24–180 КБ на эффект (JSON 10–24 КБ + текстуры).
Всего в сценариях используется 154 переменных `$eb_*`, из них 149 есть в
наборе `bgfx`; полный набор — около 15–20 МБ.

## Переменные `$eb_*`

Имя в скрипте — переменная, а не файл. Таблица лежит в gamedata игры
(`sounds` / `soundMap`): `eb_snow → AVG_snow_01`, `eb_firefly →
AVG_firefly_01`, `eb_blackmask → AVG_062_black_01` и т.д. Префикс `$` —
синтаксис скрипта, при выгрузке он отбрасывается.

## Какие бывают эффекты

В скриптах два вида:

- `[bgeffect(name="$eb_...")]` — фоновые, переменные `eb_*`;
- `[effect(name="$e_...", layer=..., x=..., y=..., xto=..., yto=...)]` —
  наложенные (выстрелы, вспышки, слэши), переменные `e_*`; могут двигаться
  за `movetime` и снимаются `[finisheffect]`/`[effect]` без имени.

Таблица `$eb_*`/`$e_*` → префаб берётся из `story_variables.json`
(PRTS), поэтому в `src/data/avgEffectMap.json` лежит 345 записей.

## Где данные и кто их рисует

Выгрузка лежит в `ZOOT-DATA/avgfx/<stem>/` (278 эффектов, ~45 МБ).
Читалка берёт её с GitHub raw, при ошибке — с jsDelivr:
`src/services/story/storyFxAssets.ts`.

Рисует `src/components/story/StoryFxCanvas.tsx`: canvas 2D, эмиссия по
`rate` и `bursts`, кривые жизни/скорости/размера/цвета, аддитивное и обычное
смешивание, тонирование текстуры цветом материала. 1 юнит = 100 px,
координаты префаба — пиксели сцены 1280×720 с центром посередине.

Режимы рендера: `0` — billboard, `1` — stretched billboard (длина полосы =
`|lengthScale| × скорость`), `4` — mesh (квад размером `startSize × meshSize`),
`5` — без рендера. `scalingMode` не масштабирует размер: у AVG-контейнеров
масштаб в сотни раз больше экрана (он нужен мешам), и умножение дало бы
миллионы пикселей.

Если данных нет (CDN недоступен, эффект не выгружен), сцена остаётся без
эффекта: приближённых CSS-заглушек в проекте больше нет — только игровые
данные.

## Порядок пересборки

`export.py` пишет базовые данные, но два поля Unity отдаёт только отдельным
проходом — без них маски выходят меньше экрана:

    uv run --project /path/to/torappu python scripts/avgfx/export.py --out DIR <stems...>
    uv run --project /path/to/torappu python scripts/avgfx/patch_scaling.py --dir DIR
    uv run --project /path/to/torappu python scripts/avgfx/patch_modules.py --dir DIR
    uv run --project /path/to/torappu python scripts/avgfx/patch_mesh.py --dir DIR

`patch_scaling.py` дописывает `scalingMode` (без него `avg_062_black_01` не
закрывает кадр), `patch_modules.py` обнуляет выключенные `Size`/`Rotation`/
`Color`-модули, `patch_mesh.py` — размах мешей у mesh-частиц.

## Проверка всех эффектов

`verify.py` проходит по всей папке `avgfx` и повторяет решения читалки:
какие системы выживут, будет ли эмиссия, виден ли размер и альфа, попадает
ли эмиттер в кадр, есть ли у эффекта квады `MeshRenderer`.

    python3 scripts/avgfx/verify.py --dir /path/to/zoot-data/avgfx \
        --out docs/effects-render-audit.md

Отчёт содержит сводку, разбор пустых эффектов и таблицу со статусом
каждого из 287 эффектов.

## Что выгружается

`index.json` на эффект: дерево префаба с трансформами и компонентами,
системы частиц (`id` для суб-эмиттеров, `rateOverDistance`, `delay`,
`trail`, `subEmitters`), материалы с текстурами, контроллер эффекта
(`effects`: `_effectDuration`, `_fadeType`), клипы `Animator` (`animations`:
путь узла, атрибут и ключи), геометрию квадов (`meshes`) и WebP-текстуры.

`meshes` — словарь «имя меша → `{v, uv, idx}`»: позиции вершин в локальных
координатах меша, UV и индексы треугольников. `MeshFilter.mesh` в узле хранит
только имя, поэтому одна геометрия (`AVG_plane_06` у трёх лучей
`avg_sunshine_01`) не дублируется. Сами вершины лежат не в `m_Vertices`
(оно пустое), а inline в `m_VertexData.m_DataSize`: поток читается по каналам
(`stride = len(data) / m_VertexCount`, канал 0 — позиция, канал 4 — UV).

Поля MonoBehaviour читаются через `ObjectReader.read_typetree()` — раньше
вызов шёл у прочитанного компонента, падал, и все 720 скриптов выгружались
с `script: null` и пустыми полями.

## Ограничения

- Из клипов `Animator` декодируется только `m_StreamedClip` (`clip_animations`
  в `export.py`): читалка проигрывает по ним растворение квадов (`_Amount`),
  один раз до `stop`. Остальные кривые (трансформы, цвета) не применяются —
  статичная поза берётся из префаба. Клип `avg_line_01` проверен: 1 кривая,
  `_Amount` 1 → 0 за 4.5 с.
- Скролл UV (`_MainUSpeed`/`_MainVSpeed`) применяется к квадам только у
  бесшовных текстур (`seamlessAxes`) и только если маска растворения — та же
  текстура: иначе застывшая виньетка уехала бы с кадра. У квадов с мешем
  спрайт печётся один раз, поэтому их UV-скролл не проигрывается.
- `_DisturTex` — искажение кадра — не воспроизводится: это шейдер поверх
  сцены, а не спрайт. Так же не рисуются камерные пост-эффекты
  (`avg_mohu_biyan_01`, `avg_mohu_zhengyan_01`, `avg_mohu_zhuanchang_01`):
  в префабе нет ни одной текстуры.
- `_MaskTex`/`_AlphaTex`/`_NoiseTex` в материалах не учитываются.
- Квады `MeshRenderer` рисуются настоящей геометрией (`meshes`): силуэт
  совпадает с игрой, поэтому лучи солнца — это ленты, а не лист на весь кадр.
  Mesh-частицы (`renderMode = 4`) по-прежнему рисуются квадом по размаху меша
  (`startSize × meshSize`): растеризовать геометрию на каждую частицу дорого.
- Направление частиц приближено: берётся ось +Z эмиттера, для «плоских»
  случаев — вниз (снег/дождь), вверх (дым) или случайное (светлячки).
- Шейдерные эффекты вроде `_UVTween` не анимируются.

## История правок

- 2026-11-19: добавлен `verify.py` (проверка всех 287 эффектов); читалка
  рисует квады `MeshRenderer` у эффектов без частиц, пропускает выключенные
  узлы и `renderMode = 5`, учитывает `delay`, `_Opacity` и
  `rateOverDistance` (у снега и слэшей поток задан только им).
- 2026-11-20: декодирование клипов (`m_StreamedClip`) — квады анимируются
  растворением; правило «незавершённое растворение не рисуем» снято (оно
  гасило 82 законных квада, включая солнечный луч `avg_sunshine_01`), вместо
  него работают проверки альфы и непрозрачного края. Добавлен скролл UV
  бесшовных текстур у квадов (лучи, блики камеры).
- 2026-11-20: квады рисуются настоящей геометрией меша (`meshes` в выгрузке,
  растеризация треугольников в спрайт при загрузке). Раньше квад считался
  единичным прямоугольником по масштабу узла: у `avg_sunshine_01` лента
  `AVG_plane_06` (56 вершин, 108 треугольников) заливала кадр. Тинт квада
  берётся из `_MainColor` (у лучей это `[.53,.50,.44]` с альфой 0.116, а
  `_Color` белый), аддитивность — из `_DstBlend` (0/1 — аддитивно, 10 — альфа).
- 2026-11-20: выгрузка пересобрана — поля MonoBehaviour читаются через
  `ObjectReader.read_typetree()`, добавлены `effects` (длительность и тип
  затухания), `trail`, `subEmitters` и `id` систем. Читалка рисует
  trail-полосы, суб-эмиттеры, скролл текстуры и квады у всех эффектов.

- 2026-11-18: добавлены `meshSize` (`patch_mesh.py`) и обнуление выключенных
  модулей (`patch_modules.py`); stretched billboard рисуется полосой вдоль
  скорости. До этого маски выходили вдвое крупнее, а дым и искры — квадратами.
- 2026-11-18: обход дерева префаба не спускался в `RectTransform`, из-за
  чего 11 эффектов (`avg_069_smoke_01`, `avg_060_glitch_01`,
  `avg_062_black_01`, …) выгружались без систем частиц: их эмиттеры лежат
  внутри узла `static_offset` с RectTransform. Исправлено, набор
  перегенерирован с текущего `resVersion`.
