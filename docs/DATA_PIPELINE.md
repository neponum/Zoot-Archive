# 📊 rhodes.monster — Data Pipeline & Localization Standards

This document describes the data pipeline, database schemas, validation workflows, and localization standards used in **rhodes.monster**.

---

## 1. Data Ecosystem Overview

rhodes.monster operates on authoritative game data synchronized from open-source repositories and the official Torappu PRTS Wiki:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPSTREAM DATA SOURCES                           │
├────────────────────────────────┬───────────────────────────────────────┤
│ Source Repository / Wiki       │ Data Assets Provided                  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Kengxxiao/ArknightsGameData    │ Raw Chinese story scripts (.txt),     │
│ (obt/main, obt/record, etc.)   │ character tables, voice line scripts  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Kengxxiao/ArknightsGameData_...│ Global story scripts (EN, JP, KR)     │
│ YoStar (zh_CN, en_US, ja_JP)   │                                       │
├────────────────────────────────┼───────────────────────────────────────┤
│ Torappu PRTS Wiki              │ High-res CG illustrations, avatars,   │
│ (https://torappu.prts.wiki/)   │ portraits, operator cards, storyline  │
│                                │ icons, story backgrounds, BGM & SFX   │
├────────────────────────────────┼───────────────────────────────────────┤
│ Aceship/AN-EN-Tags             │ Recruitment tags & operator metadata  │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Core Local JSON Databases (`src/data/`)

### `operators_database.json` (Array, 454 items)
Flat descriptor records for every playable operator (13 scalar fields per record):
- `id`: Internal operator ID (e.g. `char_002_amiya`, `char_017_huang`, `char_308_swire`).
- `nameZh`: Official Chinese display name.
- `nameEn`: English codename (e.g. `Amiya`, `Blaze`, `Swire`).
- `rarity`: Operator star tier (integer 1 to 6).
- `profession`: Class (e.g. `WARRIOR`, `SNIPER`, `CASTER`, `MEDIC`, `SUPPORT`).
- `subProfessionId`: Archetype branch (e.g. `dreadnought`, `centurion`).
- `nationId`, `groupId`, `teamId`: faction/organization identifiers (may be empty strings).
- `position`: In-game deploy position code.
- `displayNumber`: Skin/collection number (e.g. `B003`, `RE41`).
- `drawName`, `infoName`: asset key names for the portrait/avatar.

> Note: lore records and voice lines are **not** stored in this file. Dossier
> title/text structure is fetched from the upstream `handbook_info_table.json` on
> demand, while curated Russian dossier texts live in the sibling `zoot-data`
> repository (`translation/ru_RU/dossiers/<operator_id>.json`) and are fetched
> at runtime by `src/services/operatorService.ts`; voice lines are fetched from
> `charword_table.json` on demand, and Russian voice overlays are read from
> `translation/ru_RU/voices/<operator_id>.csv` (`ruCsvOverlayService.ts`).

### `operator_names_map.json` (Object, 1249 keys)
High-speed lookup index built from `operators_database.json`. Five lookup slots per operator:
`id`, lowercased `id`, normalized id (`amiya` from `char_002_amiya`), Chinese name, and
alphanumeric-only English name. Additionally a small hardcoded set of Russian aliases
(`extraAliases` in `scripts/sync_operators.js`) is merged in.
- Used by search filters, dossier quick-links, and story dialogue speaker tags.

### `operator_birthdays.json` (Object, ~412 keys)
Компактный индекс дней рождения: `char_id` → `MM-DD` (например `"char_197_poca": "10-31"`).
Собирается из официального `handbook_info_table.json` (раздел `Basic Info` / `基础档案`,
поле `[Date of Birth]` / `【生日】`):
- `npm run sync:birthdays` — `scripts/build_birthdays.mjs`, скачивает CN/EN-таблицы с jsDelivr
  и перезаписывает файл; оперативники без раскрытой даты (`Undisclosed`, `未公开`, …) в индекс не попадают.
- Используется фильтром **BIRTHDAY TODAY** в сетке архива (`src/utils/operatorBirthdays.ts`):
  сравнение с локальной датой браузера, поэтому список сам обновляется после полуночи.

### `new_operators.json` (Array, 7 ids)
Список оперативников последних релизов (`char_*`), которые ещё не разошлись по
каталогу: питает кнопку-фильтр **NEW** и жёлтую плашку `NEW` на поляроидах
(`src/utils/newOperators.ts`). Список ведётся вручную — при добавлении новых
оперативников в `operators_database.json` допишите их id здесь.
`npm run validate:data` проверяет, что каждый id существует в каталоге.

### `tags_database.json` (Object, 28 keys)
Dictionary of story script AST tags consumed by the visual novel engine
(`HEADER`, `Dialog`, `Character`, `Background`, `ImageTween`, `CameraShake`,
`Decision`, `Predicate`, `CharacterCutin`, `blocker`, `cameraEffect`, …).
It is **not** the in-game recruitment tag set (that data comes from `Aceship/AN-EN-Tags`).

### `translations.json` (Object, 13 locales)
Core UI strings per locale. Only the six locales declared in `Language`
(`src/types.ts`) are reachable from the UI; the remaining blocks are reserved
and still contain untranslated English fallbacks.

### Russian dossier / voice overlays (in `zoot-data`)
Russian text is not bundled with the site. Official structure comes from the game
tables (`handbook_info_table.json`, `charword_table.json`), and Russian fields are
merged from the sibling `zoot-data` repository:
- `translation/ru_RU/dossiers/<operator_id>.json` — curated dossier sections
  (`{ index, titleEn, titleRu, textRu }`), loaded by `loadRussianDossier`.
- `translation/ru_RU/dossiers/<operator_id>.csv` — newer CSV overlay
  (`operator_id, section_index, title_en, text_en, title_ru, text_ru`).
- `translation/ru_RU/voices/<operator_id>.csv` — voice overlay
  (`id, title, original, translation`).

`ruCsvOverlayService.ts` prefers the CSV overlay when present and otherwise uses
the JSON file; if neither exists, the original game text is shown. Export
templates can be generated on the site at `/export`.

---

## 3. Maintenance Scripts & Validation Routines

Whenever data files in `src/data/` are updated, the following developer commands must be run:

### Data Validation (`npm run validate:data`)
Script: `scripts/validate_data.js` (path-independent — it resolves `src/data` from its own
location, so it can be run from any working directory).

Validates:
1. Existence and JSON syntax of the top-level data files (`operators_database.json`,
   `operator_names_map.json`, `new_operators.json`, `operator_birthdays.json`,
   `tags_database.json`, `translations.json`).
2. Root type of each file (array vs object).
3. Localization completeness of `ru_RU` and `en_US` in `translations.json`.
4. Record schema of `operators_database.json`: required non-empty string fields
   (`id`, `nameZh`, `nameEn`, `profession`, `drawName`, `infoName`), optional string fields,
   and `rarity` as an integer within 1..6.
5. Alignment between `operators_database.json` and `operator_names_map.json`
   (every operator must be reachable by at least one of its lookup aliases).

**Any** failure — missing file, corrupt JSON, schema violation, or name-map
mismatch — makes the script exit with a non-zero code and block the build.

### Operator Name Map Synchronization (`npm run sync:operators`)
Script: `scripts/sync_operators.js`
Rebuilds `src/data/operator_names_map.json` directly from `src/data/operators_database.json`.
- Extracts all lookup aliases and the hardcoded Russian aliases.
- Adds normalized lowercase keys for instant $O(1)$ search lookups.
- Overwrites the file in a single write (no `--dry-run`/diff mode and no atomic
  temp-file swap), so review the resulting diff before committing.

### Birthday Index (`npm run sync:birthdays`)
Script: `scripts/build_birthdays.mjs`
Rebuilds `src/data/operator_birthdays.json` (`char_id` → `MM-DD`) from the CN/EN
`handbook_info_table.json` on jsDelivr. Run it after adding new operators so the
**BIRTHDAY TODAY** filter in the archive sees them.

### Operator Dossiers: Runtime Download + Browser Cache
Service: `src/services/operatorArchiveService.ts`.

Dossiers are **not** stored in the repository. When a user opens an operator, the service
fetches the official tables for the selected language directly from jsDelivr and extracts the
single operator on the client:

| Table | Purpose |
| :--- | :--- |
| `gamedata/excel/handbook_info_table.json` | Basic info, physical exam, profile, archive files |
| `gamedata/excel/charword_table.json` | Voice lines, transcripts, voice actors (`voiceLangDict`) |
| `gamedata/excel/skin_table.json` | Outfits, illustrators, palettes |

- CDN: `https://cdn.jsdelivr.net/gh/ArknightsAssets/ArknightsGamedata@master/<branch>/gamedata/excel/`
  with `<branch>` = `en` · `cn` · `jp` · `kr`.
- Download happens **only on demand**, per language (~2,8–3,1 MB compressed for all three tables).
- Tables are cached in the browser Cache Storage (`zoot-dossier-tables-v1`) for 7 days; after
  that the next open revalidates them, so monthly game updates arrive without a redeploy.
- Dossier languages: RU (community overlay from `neponum/zoot-data`), EN, 中文 (CN tables),
  日本語 (JP) and 한국어 (KR); labels for basic/exam sections are mapped per language.
- Vercel never serves dossier payloads, so the Hobby bandwidth budget is unaffected.

The catalog (`src/data/operators_database.json`) is curated and stays in the repository:
adding new playable operators (RU name, class, camp) is a manual editorial step.

### Story & Terminal Datasets
`scripts/build_story_data.mjs`, `scripts/build_terminal_data.mjs`; rebuilt with `npm run sync:all`.
`.github/workflows/sync-game-data.yml` runs on the 2nd of each month (and via `workflow_dispatch`):
it rebuilds both datasets, runs `validate:data` + `lint`, and commits `public/data`, so Vercel
redeploys automatically.

### Story Map (`src/data/storymapData.ts`)
The storyline map (lines, chapter sets, operation lists) is a static dataset. Two things keep it
current:

- `npm run sync:storymap-desc` (`scripts/fill_storymap_descriptions.mjs`) fills empty chapter and
  episode descriptions from the EN game tables: operation briefings from `stage_table.json`
  (matched by stage `code`), scene summaries from `story/[uc]info/*` for interludes and story-only
  nodes, and chapter synopses from `public/data/archive/story/index.json`. It only touches empty
  `desc` fields, so it is safe to re-run; it is also part of `sync:all`.
- The map merges `public/data/archive/story/index.json` at runtime: any chapter that exists in the
  archive but is missing from the static set is appended to the end of its storyline and opens the
  reader at its `startStoryTxt`. New stories therefore show up without editing `storymapData.ts`.
- CN-only chapters are included as soon as they exist in the CN `story_review_table`, even before the
  EN tables catch up: `build_story_data.mjs` falls back to the CN entry (and CN `[uc]info` synopses)
  when the EN chapter is missing. The new event id still has to be listed in the matching Story Line
  `events` array (its Chinese name). Each chapter also carries `year` (Year-1 = 2019), which drives
  the grid mode grouping; e.g. CN `act55side` («时间啊，向前！») lands in Year-8.
- CN-only chapters take their artwork from `torappu.prts.wiki/assets/mixstory`: the builder keeps a
  small map `CN_ART_SLUGS` (`act55side → time_set_forth`) and builds `logoUrl = title_<slug>.png`,
  `imageSrc = kv_<slug>.png`. If a chapter has no slug yet, it falls back to the PRTS API
  (`文件:图标 <CN name>.png`) and then to the generic banner.
- The same chapter gets a list of operations built from the CN `stage_table.json` + the review scenes:
  each scene maps to a stage by its file name, so the chapter page shows the usual operation grid
  (`Interlude` / `Before Operation` / `After Operation`) instead of a single "read" button. Clicking
  an operation opens that exact scene (`beg` for before-battle, `end` for after-battle) via
  `operations.json`.

### Operation Scenes (`public/data/archive/story/operations.json`)
`npm run sync:story-operations` (`scripts/build_story_operations.mjs`, part of `sync:all`) maps an
operation code to its story scenes, so the chapter panel only lists operations that actually have
story and opens the right scene.

- Stage codes come from `stage_table.json` (`9-2` → stage `main_09-01`, `BB-1` → `act33side_01`),
  scenes from the keys of `story_table.json` (`obt/main/level_main_09-01_beg`).
- Each entry is `{ beg, end }`: `beg` is the pre-battle scene (or the single scene of a
  story-only node), `end` the post-battle one; either may be `null`.
- Story-only nodes without a stage (the mini-events such as `act8mini` are made only of them) are
  listed in `chapterOperations` with the key `<chapter>|<code>`: their code is just `ST-1`…`ST-7`,
  which repeats across chapters, so a flat map would mix them up. Scenes are matched from
  `story_table.json` by `activities/<act>/level_<act>_stNN`.
- The app resolves a tile through `services/story/operationScenes.ts`: `chapterOperations` first,
  then `operations`. A tile is shown **only** when a scene resolves — training (`TR-*`), supply
  (`S*-*`, `H*-*`) and storyless operations are hidden, so a click never lands on an empty reader.
- Operations with both scenes open a small chooser («До боя» / «После боя»), tagged episodes open
  their own fragment directly, and a direct link to a scene-less operation redirects back to the
  chapter page.

### Проверка обложек и галереи (`npm run check:story-assets`)
`scripts/check_story_assets.mjs` сверяет данные галереи с `torappu.prts.wiki`:
`/api/v1/story-resources?type=image` даёт список всех картинок сцен,
`/api/v1/story-resource-usages?type=image&id=…` — какие сценарии их используют.
Скрипт сообщает о битых `imageSrc`/`logoUrl`, об id, которых нет на PRTS, о
сценах, которые не используют привязанную картинку, и о картинках, не
встречающихся ни в одном сценарии. Ответы кэшируются в `os.tmpdir()`, поэтому
повторный прогон почти мгновенный; `--strict` возвращает код 1 при расхождениях.

### Chapter Gallery (`public/data/archive/story/gallery.json`)
`npm run sync:story-gallery` (`scripts/build_story_gallery.mjs`) builds the CG gallery opened from the
CHAPTER RECOLLECTION button (a separate full-screen page), and is part of `sync:all`.

- Source: `stage_table.json` → `cgGalleryGroups` (images per chapter `setId`), `cgGalleryDisplays`
  (caption, scene, image list) and `cgGalleryCgs` (multi-file composites). The CN table is the
  completeness source, EN only supplies display names.
- One display = one gallery cell (`cgList` may hold several animation frames; the first one is used).
  When `cgGalleryCgs[..].compositeList` exists, the cell is rendered as a seam of `HORIZONTAL` or
  `VERTICAL` pieces; the grid shows the first piece and the lightbox the whole seam.
- Artwork lives on `torappu.prts.wiki`: `assets/avg/images/` for `cgSource = IMAGE`,
  `assets/avg/background/` for `BACKGROUND` (note: `background`, not `backgrounds`), all lowercase.
- Thumbnails are resized on the fly by `wsrv.nl` (`w=480` in the grid, `w=1600` in the lightbox,
  `output=webp&q=72`); full PNGs are ~1 MB each, so the origin is never used directly in the UI.
- The JSON is fetched lazily the first time the page opens; the page is full-screen (header with
  back to the story map), shows the captions under the thumbnails and supports arrow-key paging,
  Esc to close and "Open scene →" into the reader.
- `npm run check:story-assets` verifies every gallery id against the PRTS story-resource index and
  checks that the scene attached to an entry actually uses that image.

### Translation Repository Layout (`neponum/zoot-data`)

Community translations live in a separate data repository and are fetched at runtime from
`https://raw.githubusercontent.com/neponum/zoot-data/main/translation/<lang>/story/<episode>/<storyBaseName>_<translator>.csv`.

- `<episode>` is the in-game episode/chapter ID (`main`, `a001`, `act47side`, `act15d5`,
  `act10mini`, `st`, `spst`, `ui`, `guide`, `memory`) — 79 folders for `ru_RU` at the time of writing.
  Operator records (密录, `obt/memory/story_<operator>_<set>_<part>`) map to `story/memory/`;
  those translations belong in `zoot-data`, not in this repository.
- `<translator>` is the profile nickname used in the registry; `neponum` is normalized to `nep0num`.
- Candidates are generated by `getTranslationCsvCandidates()` (`src/utils/translationPaths.ts`) and
  always probed in order: episode folder → legacy flat path → community file (no translator suffix).
  The flat fallback keeps freshly bot-uploaded CSVs working while the repository is migrated.
- `buildTranslationCandidates()` (`storyTreeService.ts`) walks **every** translator from
  `TRANSLATION_REGISTRY` for the language, starting with the selected/default one, before giving up
  and showing the Chinese original. Chapters translated by a different author (EP09 → `ilarhion`)
  therefore stay in Russian instead of silently falling back to CN; `checkScriptExists()` uses the
  same order, so the "no Russian translation" warning only appears when no author has the scene.
- Consumers: `checkScriptExists()` / `fetchStoryScript()` (`src/services/story/storyTreeService.ts`)
  and the translator import flow (`src/components/TranslationInterface.tsx`).
- `npx tsx scripts/verify_translation_paths.ts <path-to-zoot-data>` asserts that every CSV in a
  local clone is still reachable by the loader (must report 0 missing).

---

## 4. Canonical Localization Glossary (`src/config/arknightsGlossary.ts`)

rhodes.monster enforces strict Russian nomenclature aligned with canonical community standards. Any translations or AI-assisted prompts must reference `ARKNIGHTS_CANONICAL_GLOSSARY`:

### Factions & Nations
- **Rhodes Island**: *Родос*
- **Ursus**: *Урсус*
- **Lungmen**: *Лунмэн*
- **Yan**: *Янь*
- **Victoria**: *Виктория*
- **Columbia**: *Колумбия*
- **Kazimierz**: *Казимеж*
- **Sami**: *Сами*
- **Sargon**: *Саргон*
- **Iberia**: *Иберия*
- **Laterano**: *Латерано*
- **Siracusa**: *Сиракуза*
- **Rim Billiton**: *Рим Биллитон*
- **Kjerag**: *Кьераг*
- **Higashi**: *Хигаси*
- **Minos**: *Минос*

### Key Lore Terminology
- **Originium**: *Ориджиниум*
- **Oripathy**: *Орипатия*
- **Infected**: *Инфицированные*
- **Catastrophe**: *Катастрофа*
- **Catastrophe Messenger**: *Вестник Катастроф*
- **Penguin Logistics**: *Пингвин Лоджистикс*
- **Arts**: *Искусство*
- **Caster**: *Кастер*
- **Reunion**: *Воссоединение*
- **Lungmen Guard Department (L.G.D.)**: *Департамент Гвардии Лунмэня*
- **Doctor**: *Доктор*
- **Amiya**: *Амия*
- **Kal'tsit**: *Кальцит*
- **Ch'en**: *Чэнь*
- **Blaze**: *Блэйз*
- **Swire**: *Свайр*
- **Hoshiguma**: *Хошигума*
- **Talulah**: *Талула*
- **Mephisto**: *Мефисто*
- **Faust**: *Фауст*
- **Frostnova**: *Фростновы / Фростнова*
- **Patriot**: *Патриот*

---

## 5. Adding New Operators or Story Data

To import a new operator into rhodes.monster:
1. Append the operator's record into `src/data/operators_database.json`.
2. Run `npm run sync:operators` to refresh `src/data/operator_names_map.json`.
3. Run `npm run validate:data` to confirm integrity.
4. Run `npm run lint` (`tsc --noEmit`) to verify type safety.


## 5.1 Typography rules applied across all Russian translations

Established by editorial decision and enforced by the sweep tools in the
`zoot-data` repository (`tools/apply_canon.py`, `tools/apply_yo.py`,
`tools/apply_names.py`, `tools/apply_infected.py`):

- **«ё»** is always written: *пришёл, ещё, счёт, мёртвый, чёрный, сестры*.
  The sweep only touches unambiguous forms — verb stems with endings
  `-ёт/-ёшь/-ём/-ёте` plus a closed noun list. *Все/всё*, *все-таки* and
  *мёртвые/мёртвый* style ambiguities are left for manual review.
- **Single em-dash**: `——`, `————` and longer runs collapse to `—`.
- **Infected** is *Инфицированные* in every case, both in labels and prose.
  Process words (*заражение, заразиться, заражается*) stay as they are, and
  *незаражённые* («not infected») is a different word and is left untouched.

### jsDelivr and `neponum/zoot-data`

jsDelivr refuses to serve files from packages over 50 MB. `neponum/zoot-data`
crossed that limit once `avgfx` grew to ~48 MB, so **new** files (banners of
recent chapters, for example) answer `403 Package size exceeded the configured
limit of 50 MB`; only entries already in the CDN cache still work.

Rules that follow from this:

- `src/lib/cdn.ts#preferGitHubRaw()` rewrites `fastly.jsdelivr.net/gh/neponum/zoot-data@…`
  to `raw.githubusercontent.com/…`; chapter covers and banners go through it.
- New data loaders prefer raw GitHub over jsDelivr for this repository
  (`storyFxAssets`, `character.json`, `ChapterSelector` banners). Other repos
  (Aceship, ArknightsGamedata) are small enough and keep using jsDelivr.
- Do not add new large assets to `zoot-data` expecting jsDelivr delivery.

## 5.2 Audio resolution via the host manifest

BGM tracks in Arknights story scripts are referenced by logical name
(`[PlayMusic(key="$babel_loop")]`), but the file lives in a release-tagged folder
that cannot be guessed: `$babel_loop` is `music/beta1_180603/m_dia_babel_loop.mp3`,
`$escape_loop` is `music/beta2_180603/m_dia_escape_loop.mp3`, `$ekg_loop` is not in
`music/` at all — it is `dialog/d_avg_ekg_loop.mp3`.

`torappu.prts.wiki` exposes its own asset manifest:

```
GET /api/v1/version                                  → [{ id, resVersion, … }]
GET /api/v1/manifest/{versionId}/search?q={name}     → [{ name, path, nodeType }]
```

`path` is the in-game path without extension, e.g.
`audio/sound_beta_2/music/beta1_180603/m_dia_babel_loop`. The served URL is
`assets/audio/<rest>.mp3` — i.e. strip the `sound_beta_2/` segment and add `.mp3`.

`src/services/story/audioManifest.ts` resolves a track as:
cache → manifest search (plain name, then `m_dia_`/`m_sys_`/`m_bat_`/`m_avg_`
variants) → folder probing as a last resort.

Measured over all 186 distinct tracks referenced by `cn/gamedata/story`:
**179 resolved (96%), 0 broken URLs**; the remaining 7 are absent from the host.
The manifest is maintained by the host owner, so no index has to be rebuilt here.
Negative answers are cached for a week only, so tracks added later are picked up.

Folder probing is deliberately sequential — the host rate-limits, and parallel
probes turn real 206s into false 404s.

## 5.3 Story text sources

Scripts are fetched per language from the GitHub mirrors (`getBaseUrl()` in
`storyTreeService.ts`). The host also serves the CN client's scripts directly:

```
GET https://torappu.prts.wiki/gamedata/latest/story/<path>.txt   → text/plain
```

That copy is **Chinese only**, so it is used as a fallback for `zh_CN` (and for
`ru_RU`, which is built on top of `zh_CN`) and never for `en_US`/`ja_JP`/`ko_KR`
— otherwise a failed GitHub request would silently cache Chinese text under an
English key. Both `fetchStoryScript()` and the background sync
(`storyTextSync.officialUrls()`) follow this rule.
