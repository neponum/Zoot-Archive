# 🤖 AGENTS.md — AI Coding Agent Master Directive & Protocols

This file is automatically loaded into the AI Studio agent environment. It serves as the primary operational directive, architectural index, and safety rulebook for **Zoot Archive** (Arknights Dossier & Visual Novel Reader).

---

## 📚 Deep-Dive Technical Documentation Index

For exhaustive subsystem specifications, consult the dedicated manuals in the `docs/` directory:
- **[System Architecture & Topology](docs/ARCHITECTURE.md)**: Full-stack component composition, state lifecycle, dev/prod Express mounting, and audio subsystem details.
- **[Visual Novel & Story Engine](docs/STORY_ENGINE.md)**: Arknights AST parser syntax, camera tweens, coordinate normalization math, scale-aware clamping, and character sprite resolution.
- **[Security Architecture & Hardening](docs/SECURITY.md)**: SSRF defenses in `/api/proxy`, Discord OAuth2 state validation, rate-limiting tiers, and client XSS sanitization.
- **[Data Pipeline & Localization](docs/DATA_PIPELINE.md)**: Torappu PRTS data sources, JSON schemas, sync/validation routines, and the canonical Russian lore glossary.

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
| `/` | `ChapterSelector` | Main hub: Event/Main/Story selector & navigation |
| `/story` | `ChapterSelector` | Story tab navigation |
| `/event/:eventId` | `ChapterSelector` | Deep link to a specific event story collection |
| `/operators` | `ChapterSelector` | Operator records list & dossiers overview |
| `/operators/:operatorId` | `ChapterSelector` | Operator specific records and dossier modal |
| `/operator/:operatorId` | `ChapterSelector` | Route alias for `/operators/:operatorId` |
| `/music` | `ChapterSelector` | PRTS music player & track listing |
| `/story/*` | `StoryViewerRoute` (`StoryViewer`) | Visual novel engine reproducing in-game story scenarios |
| `/translate/*` | `TranslationInterface` | Community translation workbench with live preview & AI assistance |

---

## 🛡️ Non-Negotiable AI Coding Directives & Invariants

When modifying code in Zoot Archive, all AI agents **MUST** strictly adhere to the following invariants:

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

### 6. Mandatory State & Cookie CSRF in OAuth (`server/routes/auth.ts`)
- **RULE**: Discord OAuth callbacks must strictly require both query `state` and cookie `oauth_state` to match. Session cookies must always carry `httpOnly: true`, `sameSite: 'lax'`, and `secure: isSecureRequest(req)`.

### 7. Data Integrity Protocol
- **RULE**: Before building or committing after modifying files in `src/data/`:
  - Run `npm run validate:data`.
  - If `operators_database.json` was altered, run `npm run sync:operators`.

### 8. Canonical Lore & Russian Localization Standard
- **RULE**: Always adhere to `ARKNIGHTS_CANONICAL_GLOSSARY` in `src/config/arknightsGlossary.ts` for all Russian names and terminology (*Родос*, *Урсус*, *Ориджиниум*, *Орипатия*, *Кальцит*, *Чэнь*, *Кастер*, *Искусство*).

---

## 🛠️ Mandatory Verification Workflow

After every task or code modification, run the following sequential verification:

1. `npm run validate:data` — Validates JSON database syntax and ID alignment.
2. `npm run lint` — Runs TypeScript compiler check (`tsc --noEmit`). Must produce 0 errors.
3. `npm run build` — Compiles the Vite frontend bundle and server bundle.
