# 📊 Zoot Archive — Data Pipeline & Localization Standards

This document describes the data pipeline, database schemas, validation workflows, and localization standards used in **Zoot Archive**.

---

## 1. Data Ecosystem Overview

Zoot Archive operates on authoritative game data synchronized from open-source repositories and the official Torappu PRTS Wiki:

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
│ Torappu PRTS Wiki              │ High-res CG illustrations, character  │
│ (https://torappu.prts.wiki/)   │ face overlays, audio BGM & SFX        │
├────────────────────────────────┼───────────────────────────────────────┤
│ fexli/ArknightsResource        │ Operator assistant portraits & skins  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Aceship/AN-EN-Tags             │ Recruitment tags & operator metadata  │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Core Local JSON Databases (`src/data/`)

### `operators_database.json` (Array, 441 items)
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

> Note: lore records and voice lines are **not** stored in this file. Dossier text
> comes from the upstream data sources and is localized at runtime
> (`src/services/dossierTranslationService.ts`, `src/data/dossiers_ru.json`);
> voice lines are fetched from `charword_table.json` on demand
> (`src/services/operatorVoiceService.ts`).

### `operator_names_map.json` (Object, 1210 keys)
High-speed lookup index built from `operators_database.json`. Five lookup slots per operator:
`id`, lowercased `id`, normalized id (`amiya` from `char_002_amiya`), Chinese name, and
alphanumeric-only English name. Additionally a small hardcoded set of Russian aliases
(`extraAliases` in `scripts/sync_operators.js`) is merged in.
- Used by search filters, dossier quick-links, and story dialogue speaker tags.

### `tags_database.json` (Object, 28 keys)
Dictionary of story script AST tags consumed by the visual novel engine
(`HEADER`, `Dialog`, `Character`, `Background`, `ImageTween`, `CameraShake`,
`Decision`, `Predicate`, `CharacterCutin`, `blocker`, `cameraEffect`, …).
It is **not** the in-game recruitment tag set (that data comes from `Aceship/AN-EN-Tags`).

### `translations.json` (Object, 13 locales)
Core UI strings per locale. Only the six locales declared in `Language`
(`src/types.ts`) are reachable from the UI; the remaining blocks are reserved
and still contain untranslated English fallbacks.

### `dossiers_ru.json` (Object)
Manual Russian dossier labels and translations, keyed by operator; consumed by
`src/services/dossierTranslationService.ts`. Contains the `_common_labels` dictionary
shared across all dossiers.

---

## 3. Maintenance Scripts & Validation Routines

Whenever data files in `src/data/` are updated, the following developer commands must be run:

### Data Validation (`npm run validate:data`)
Script: `scripts/validate_data.js` (path-independent — it resolves `src/data` from its own
location, so it can be run from any working directory).

Validates:
1. Existence and JSON syntax of all five data files (`operators_database.json`,
   `operator_names_map.json`, `tags_database.json`, `translations.json`, `dossiers_ru.json`).
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

### Translation Repository Layout (`neponum/zoot-data`)

Community translations live in a separate data repository and are fetched at runtime from
`https://raw.githubusercontent.com/neponum/zoot-data/main/translation/<lang>/<episode>/<storyBaseName>_<translator>.csv`.

- `<episode>` is the in-game episode/chapter ID (`main`, `a001`, `act47side`, `act15d5`,
  `act10mini`, `st`, `spst`, `ui`, `guide`) — 79 folders for `ru_RU` at the time of writing.
- `<translator>` is the profile nickname used in the registry; `neponum` is normalized to `nep0num`.
- Candidates are generated by `getTranslationCsvCandidates()` (`src/utils/translationPaths.ts`) and
  always probed in order: episode folder → legacy flat path → community file (no translator suffix).
  The flat fallback keeps freshly bot-uploaded CSVs working while the repository is migrated.
- Consumers: `checkScriptExists()` / `fetchStoryScript()` (`src/services/story/storyTreeService.ts`)
  and the translator import flow (`src/components/TranslationInterface.tsx`).
- `npx tsx scripts/verify_translation_paths.ts <path-to-zoot-data>` asserts that every CSV in a
  local clone is still reachable by the loader (must report 0 missing).

---

## 4. Canonical Localization Glossary (`src/config/arknightsGlossary.ts`)

Zoot Archive enforces strict Russian nomenclature aligned with canonical community standards. Any translations or AI-assisted prompts must reference `ARKNIGHTS_CANONICAL_GLOSSARY`:

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

To import a new operator into Zoot Archive:
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
