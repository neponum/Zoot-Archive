# 🤖 AGENTS.md — AI Coding Agent Master Directive & Protocols

This file is automatically loaded into the AI Studio agent environment. It serves as the primary operational directive, architectural index, and safety rulebook for **rhodes.monster** (Arknights Dossier & Visual Novel Reader).

---

## 📚 Deep-Dive Technical Documentation Index

For exhaustive subsystem specifications, consult the dedicated manuals in the `docs/` directory:
- **[System Architecture & Topology](docs/ARCHITECTURE.md)**: Full-stack component composition, state lifecycle, dev/prod Express mounting, and audio subsystem details.
- **[Visual Novel & Story Engine](docs/STORY_ENGINE.md)**: Arknights AST parser syntax, camera tweens, coordinate normalization math, scale-aware clamping, and character sprite resolution.
- **[Security Architecture & Hardening](docs/SECURITY.md)**: SSRF defenses in `/api/proxy`, anonymous bug-report hardening, rate-limiting tiers, and client XSS sanitization.
- **[Data Pipeline & Localization](docs/DATA_PIPELINE.md)**: Torappu PRTS data sources, JSON schemas, sync/validation routines, and the canonical Russian lore glossary.
- **[Build Guide](docs/BUILD.md)**: сборка сайта и Android APK, переменные окружения, релизный workflow, `release/` с хэшами.
- **[App Migration Plan](docs/APP_MIGRATION.md)**: сайт + Capacitor (Android), платформенный слой, офлайн-кэш и релизы. Десктоп отменён 2026-11-15.
- **[Legal & Content Policy](docs/LEGAL.md)**: правовой контур (`/disclaimer`, `/privacy`, `/takedown`), запрет на скачивание аудио, правила обработки персональных данных и границы некоммерческого использования.

---

## 🏛️ Project Architecture at a Glance

- **Framework**: React 19 + TypeScript 5.8 + Vite 6 + Express 4 (Full-Stack).
- **Deployment**: Hosted on **Vercel** & Google Cloud Run. Uses `@vercel/analytics` and `@vercel/speed-insights`.
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`).
- **Motion & Physics**: Motion (`motion/react` v12).
- **Audio Engine**: Howler.js (`src/services/audioManager.ts`) with IndexedDB binary persistence (`CacheService`).

---

## 🗺️ Client Route Map (`react-router-dom` v6)

| Route Path | Component / View | Purpose |
| :--- | :--- | :--- |
| `/` | `MonsterTextStage` | Главный экран: эмблема, слово MONSTER, меню, подвал с правовыми ссылками. Меню: слева от эмблемы — оперативники и терминал, справа — терра и перевод. Разделы «архив» и «соцсеть» сняты (2026-11-18); каталог ссылок сохранён в `docs/archive-links.backup.json` |
| `/terminal` | `MonsterTextStage` | Экран терминала (тот же главный экран, свой адрес) |
| `/story` | `StoryTimelinePage` → `StoryTimelineView` | Таймлайн историй: 14 настоящих Story Line игры (MS, RL, UR, LA, KJ, SI, KA, SU, RH, Æ, LE, TA, ST, TS), деталь главы с реальным синопсисом |
| `/story/map`, `/maps` | `StoryMapRoute` | Карта сюжета (timeline) |
| `/story/grid`, `/grid` | `StoryMapRoute` | Сетка глав по годам |
| `/story/grid/lines` | `StoryMapRoute` | Сетка глав по сюжетным линиям |
| `/chapters` | `ChapterSelector` | Полный список глав с поиском и переводом (прежний экран истории) |
| `/event/:eventId` | `ChapterSelector` | Deep link to a specific event story collection |
| `/operators` | `OperatorArchivePage` → `OperatorArchiveView` | Архив оперативников: полароид-сетка 441 оперативника, фильтр по классу, поиск |
| `/operators/:operatorId` | `OperatorArchivePage` → `OperatorArchiveView` | Досье оперативника (deep link): file / voice / records / skins |
| `/operator/:operatorId` | `OperatorArchivePage` | Route alias for `/operators/:operatorId` |
| `/disclaimer`, `/privacy`, `/takedown` | `LegalPage` | Fan-project disclosures, privacy policy, takedown procedure |
| `/storage` | `StoragePage` | Языки офлайн-текста, прогресс фоновой докачки, размер кэша и очистка |
| `/story/*` | `StoryViewerRoute` (`StoryViewer`) | Visual novel engine reproducing in-game story scenarios |
| `/translate/*` | `TranslationInterface` | Community translation workbench (opens with a project-purpose intro screen) |
| `/terra` | `TerraPage` | Раздел в разработке: арт Кальцит и реплика в её стиле вместо заглушки |

---

## 🛡️ Non-Negotiable AI Coding Directives & Invariants

When modifying code in rhodes.monster, all AI agents **MUST** strictly adhere to the following invariants:

### 1. Absolute Fidelity to Raw Script Character Assets
- **RULE**: NEVER replace or alias character sprite IDs requested in game scripts (`[Character(name="...")]`).
- **WHY**: In Arknights, different chapters use specific character variants (combat uniforms, damaged clothes, rain gear, shadowy silhouettes). Replacing IDs with arbitrary skins (e.g. swimsuits or summer alts) corrupts the story narrative.

### 2. Scale-Aware Coordinate Clamping Math (`BackgroundLayer.tsx`)
- **RULE**: Always clamp image and background translations to the zoom margin:
  $$\text{maxBound} = \frac{(S - 1)}{2} \times 100\% \quad (\text{for } S > 1)$$
- **WHY**: Prevents extreme coordinates in raw scripts (e.g. `yTO=600` in 04-02) from moving illustrations off-screen into empty black voids.

### 3. Russian Typography Invariants
- **RULE**: Always write `ё` where the word takes it (пришёл, ещё, счёт, мёртвый, чёрный, сестры) and use a SINGLE em-dash `—`. Never emit `——` runs.
- **WHY**: Enforced repo-wide by the sweeps in the `zoot-data` repository (`tools/apply_canon.py`, `tools/apply_yo.py`). Stray forms are a measurable regression, not a matter of taste.

### 4. Prohibition of `window.alert` and `window.open`
- **RULE**: NEVER invoke `window.alert()`, `window.confirm()`, or `window.open()` in React components.
- **WHY**: The application runs inside sandboxed iframes where popups and modal alerts are blocked by browser security policies. Always use in-app modals (`LogModal`, `BackConfirmation`, `SettingsModal`, `BugReportModal`).

### 5. Zero-Tolerance for SSRF in Asset Proxying (`server/routes/proxy.ts`)
- **RULE**: Maintain strict protocol checks (`https:`/`http:`), block all private/loopback/cloud metadata IP ranges, and validate against `ALLOWED_PREFIXES`.
- **WHY**: Protects internal server network surfaces and metadata endpoints from exploitation.

### 6. No Accounts, No Third-Party Login
- **RULE**: Do not reintroduce Discord OAuth, user accounts, or any flow that stores personal data (IDs, usernames, avatars, emails) on the server. Bug reports are anonymous and rate-limited per IP.
- **WHY**: The project must not process personal data in a way that triggers data-protection obligations (Belarus 99-З, GDPR). If a new feature needs identity, it requires explicit approval plus a `/privacy` update in the same commit.

### 7. Data Integrity Protocol
- **RULE**: Before building or committing after modifying files in `src/data/`:
  - Run `npm run validate:data`.
  - If `operators_database.json` was altered, run `npm run sync:operators`.
- **ARCHIVE DOSSIERS ARE NOT STORED IN THE REPO**: the operator archive downloads game tables
  (`handbook_info_table`, `charword_table`, `skin_table`) from jsDelivr
  (`ArknightsAssets/ArknightsGamedata@master`, branch per language: `en`, `cn`, `jp`, `kr`)
  only when a dossier is opened, and keeps them in the browser Cache Storage
  (`zoot-dossier-tables-v1`, 7-day TTL). `public/data/archive/op/` must stay absent:
  do not commit generated dossiers or prefetch tables for the whole catalog.
  - Dossier languages: RU (community translation overlay from `neponum/zoot-data`), EN, 中文, 日本語, 한국어.
  - The catalog itself is `src/data/operators_database.json` (curated: RU names, class, camp);
    adding new operators is still a manual editorial step.
- Таймлайн историй (`/story`) читает `public/data/archive/story/index.json`, собранный `npm run sync:story`
  (`story_review_table`, `chapter_table`, синопсисы из `story/[uc]info`; обложки — `neponum/zoot-data/banners`).
  Группировка событий по Story Line взята со страницы PRTS `关卡一览/曲谱` (в таблицах игры её нет),
  иконки линий — реальные файлы игры `图标_曲谱_*.png` с `media.prts.wiki` в `public/assets/storyline/`.
  После `sync:story` перезапускать dev-сервер: Vite кеширует список файлов `public/`.
  - **Freshness**: dossiers refresh themselves (browser cache expires after 7 days and the next open pulls the current tables). Story/terminal datasets are rebuilt monthly by `.github/workflows/sync-game-data.yml` (`sync:all`), which commits `public/data` and lets Vercel redeploy.

### 8. Canonical Lore & Russian Localization Standard
- **RULE**: Always adhere to `ARKNIGHTS_CANONICAL_GLOSSARY` in `src/config/arknightsGlossary.ts` for all Russian names and terminology (*Родос*, *Урсус*, *Ориджиниум*, *Орипатия*, *Кальцит*, *Чэнь*, *Кастер*, *Искусство*).
- **RULE — ZH-first (2026-11-20):** All Russian localization data in `zoot-data` (story CSV, dossiers, voices, skins) is built from `zh_CN` originals only; EN is a hint. When EN conflicts with or is missing from ZH, ZH wins. A missing EN entry is never a reason to omit an operator — e.g. `char_4247_oxi` has no EN dossier but must have a Russian one. Never "correct" RU by EN against ZH.

### 9. Verification Ownership
- **RULE**: Do not open the site in a browser to verify UI/player behaviour on your own initiative.
  The author checks the player and pages himself and will explicitly ask when an agent-side check is
  needed. After code changes run only `npm run validate:data`, `npm run lint`, `npm run build`.
- **WHY**: The author tests on his own dev server and browser; duplicate automated checks waste time.

### 10. UI Scrollbars
- **RULE**: Never ship the OS default scrollbar. Any scrollable surface must use the site skin —
  `overflow-y-auto` + `.site-scrollbar` (thin translucent thumb on a transparent track). Hiding a
  scrollbar entirely is `no-scrollbar`; the bare default look is a regression.
- **WHY**: The system scrollbar (light track on Windows, arrows on some platforms) breaks the dark
  archive UI and was explicitly rejected by the author.

### 11. Vercel Hobby Free-Tier Budget
- **RULE**: The site MUST remain deployable within the Vercel Hobby free tier. Any storage, API, caching, or asset-delivery change must be evaluated against free-tier limits (Fast Data Transfer, function invocations, Blob storage/operations, build size).
- **WHY**: Adding a paid dependency or a function call per asset request can silently exceed the budget. Prefer static/CDN delivery and long-lived caching over per-request server reads.
- **PROCESS**: State the expected traffic/storage/function cost in the proposal; do not introduce paid services or designs that exceed the free tier without explicit approval.

---

### 13. Only Real Game Effects, Never CSS Approximations
- **RULE**: Story effects (`[bgeffect]`, `[effect]`) must render from the extracted Unity
  prefabs in `ZOOT-DATA/avgfx` (`StoryFxCanvas`). Do not add CSS/JS look-alikes for snow,
  glitch, TV noise, slashes, masks or any other effect. If an effect has no data, the scene
  stays without it.
- **WHY**: The author explicitly rejected the CSS fallback layer; a wrong picture is worse
  than no picture. `scripts/avgfx/export.py` extracts the real ParticleSystems (materials,
  textures, UV atlases, curves); `scripts/avgfx/README.md` documents the format and limits.

---

### 12. Monochrome Palette (No Blue Accent)
- **RULE**: No blue accent colours anywhere — buttons, borders, links, glows, scrollbars, focus rings,
  gradients, progress bars. The palette is black/white/grey plus the existing warm gold `#f5b400` when
  an accent is needed. Replace Tailwind `blue-*`, arbitrary `#3b82f6`-family hexes and blue `rgba()`
  glows with white/grey equivalents.
- **WHY**: The author explicitly rejected the global blue as off-brand.

## 🛠️ Mandatory Verification Workflow

After every task or code modification, run the following sequential verification:

1. `npm run validate:data` — Validates JSON database syntax and ID alignment.
2. `npm run lint` — Runs TypeScript compiler check (`tsc --noEmit`). Must produce 0 errors.
3. `npm run build` — Compiles the Vite frontend bundle and server bundle.

Для нативных сборок используется отдельная команда `npm run build:native`
(`NATIVE_BUILD=1`): без PWA и server bundle. Подробности — `docs/BUILD.md`.
