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

### `operators_database.json` (Array, ~441+ items)
Contains detailed dossiers for each playable operator:
- `id`: Internal operator ID (e.g. `char_002_amiya`, `char_017_huang`, `char_308_swire`).
- `name`: Localized display name.
- `appellation`: English codename (e.g. `Amiya`, `Blaze`, `Swire`).
- `rarity`: Operator star tier (1 to 6).
- `profession`: Class (e.g. `WARRIOR`, `SNIPER`, `CASTER`, `MEDIC`, `SUPPORT`).
- `subProfessionId`: Archetype branch (e.g. `dreadnought`, `centurion`).
- `lore`: Background logs, physical exam, clinical analysis, paradox records.
- `voices`: Audio lines with text transcripts and speaker identifiers.

### `operator_names_map.json` (Object, ~1200+ keys)
High-speed lookup index mapping various name forms (ID, EN, CN, RU, appellation) to the primary operator record.
- Used by search filters, dossier quick-links, and story dialogue speaker tags.

### `tags_database.json` & `translations.json`
- `tags_database.json`: Recruitment and class archetype tags.
- `translations.json`: Core UI strings across supported locales.

---

## 3. Maintenance Scripts & Validation Routines

Whenever data files in `src/data/` are updated, the following developer commands must be run:

### Data Validation (`npm run validate:data`)
Script: `scripts/validate_data.js`
Validates:
1. Syntax and JSON formatting across all files in `src/data/`.
2. Array structure of `operators_database.json`.
3. Object structure of `operator_names_map.json`.
4. Alignment between `operators_database.json` IDs and `operator_names_map.json`.
If any mismatch or corrupt JSON syntax is detected, the script exits with non-zero code.

### Operator Name Map Synchronization (`npm run sync:operators`)
Script: `scripts/sync_operators.js`
Rebuilds `src/data/operator_names_map.json` directly from `src/data/operators_database.json`.
- Extracts all appellations, code names, and localized names.
- Adds normalized lowercase keys for instant $O(1)$ search lookups.

---

## 4. Canonical Localization Glossary (`src/config/arknightsGlossary.ts`)

Zoot Archive enforces strict Russian nomenclature aligned with canonical community standards. Any translations or AI-assisted prompts must reference `ARKNIGHTS_CANONICAL_GLOSSARY`:

### Factions & Nations
- **Rhodes Island**: *Родос Айленд*
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
- **Reunion**: *Воссоединение*
- **Lungmen Guard Department (L.G.D.)**: *Департамент гвардии Лунмэня*
- **Doctor**: *Доктор*
- **Amiya**: *Амия*
- **Kal'tsit**: *Кель'си*
- **Ch'en**: *Чэнь*
- **Blaze**: *Блэйз*
- **Swire**: *Свайр*
- **Hoshiguma**: *Хосигума*
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
