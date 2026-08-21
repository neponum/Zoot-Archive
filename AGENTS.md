# AGENTS.md — AI Coding Agent Project Context & Development Protocols

This file is automatically loaded into the AI Studio agent environment to guide development, data maintenance, and code architecture for **Zoot Archive** (Arknights Dossier & Story Reader).

---

## 🏛️ Project Architecture Overview

- **Framework**: React 19 + TypeScript + Vite + Express (Full-Stack).
- **Hosting & Deployment**: Hosted on **Vercel** (production deployment uses `@vercel/analytics` and `@vercel/speed-insights`, configured via `vercel.json`).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`).
- **Audio Engine**: Howler.js wrapped in `src/services/audioManager.ts`.
- **Animation & Motion**: Motion (`motion/react`).
- **Data Visualization**: D3.js for operator relationships and node graphs (`OperationRecordsGraph.tsx`).

---

## 🗺️ Client Routing & Views

The frontend uses `react-router-dom` with the following route structure:

| Route Path | Component / View | Purpose |
| :--- | :--- | :--- |
| `/` | `ChapterSelector` | Main hub: Event/Main/Story selector & navigation |
| `/story` | `ChapterSelector` | Story tab navigation |
| `/event/:eventId` | `ChapterSelector` | Deep link to a specific event story collection |
| `/operators` | `ChapterSelector` | Operator records list & dossiers overview |
| `/operators/:operatorId` | `ChapterSelector` | Operator specific records and dossier modal |
| `/operator/:operatorId` | `ChapterSelector` | Alias for `/operators/:operatorId` |
| `/music` | `ChapterSelector` | Music player & track listing |
| `/story/*` | `StoryViewerRoute` (`StoryViewer`) | Visual novel engine reproducing in-game story scenarios |
| `/translate/*` | `TranslationInterface` | Community translation workbench with live preview & AI assistance |

---

## 🪝 Application State & Custom Hooks (`src/hooks/`)

- `useReadingProgress.ts`: Manages read chapters (`ak-read-chapters`), bookmarked chapters, and mark-as-read/completion logic.
- `useTranslationState.ts`: Manages active translation session, translator preferences, chapter/episode context, and viewer testing state.
- `usePageMeta.ts`: Dynamic document title and Open Graph metadata synchronizer across routes.
- `useStoryControls.ts` & `useStoryReducer.ts`: Visual novel runtime engine, state reducer, and playback controls.

---

## 🎬 Visual Novel & Story Engine Architecture

The visual novel player lives in `src/components/StoryViewer.tsx` and `src/components/story/`, powered by services in `src/services/story/`:

1. **Parser (`storyParser.ts`)**:
   - Parses Arknights visual novel text scripts into AST/command tokens (`[name="..."]`, `[Decision(...)]`, `[Background(...)]`, `[Blocker(...)]`, etc.).
2. **State & Reducer (`useStoryReducer.ts`, `useStoryControls.ts`)**:
   - Manages dialog lines, character positioning/cut-ins, screen shakes, sound/music cues, branch decisions, and auto/skip modes.
3. **Stage Layers**:
   - `BackgroundLayer.tsx`: Scene backgrounds and transitions.
   - `CharacterLayer.tsx` & `CharacterCutinLayer.tsx`: Operator portraits, sprite coordinates, and facial expressions.
   - `CinematicEffectsLayer.tsx` & `EffectsLayer.tsx`: Flashes, shakes, fades, and weather particles.
   - `DialogueUI.tsx` & `DialogueBox.tsx` & `Typewriter.tsx`: Text printing with formatting tags, speaker names, and rich text effects.
   - `DecisionOverlay.tsx`: Interactive player dialogue choices.
   - `ControlsOverlay.tsx` & `TopControls.tsx` & `SkipControls.tsx`: Auto-play, log history, fast-forward, and audio toggles.

---

## 🎵 Audio Subsystem

Managed via `src/services/audioManager.ts`:
- **Datasets**:
  - `src/data/audio_sound.json`: Sound effects (SFX) manifest.
  - `src/data/audio_music.json`: Background music (BGM) manifest.
- **Audio Unlock Policy**: Browsers block autoplay before user interaction. `audioManager.unlock()` is triggered on initial user interaction (e.g. selecting a chapter).
- **Fade & Crossfade**: Smooth volume transitions for BGM changes.

---

## 🌐 Server & API Routes (`server/`)

Express backend running at `0.0.0.0:3000` (and integrated as Serverless functions on Vercel):

- **Discord Authentication (`/api/auth/discord`)**:
  - `GET /api/auth/discord/login` — Initiates OAuth flow.
  - `GET /api/auth/discord/callback` / `GET /auth/discord/callback` — Handles OAuth code exchange and sets secure session cookies.
  - `GET /api/auth/discord/me` — Fetches current authenticated user profile & permissions.
  - `POST /api/auth/discord/logout` — Clears authentication cookie.
- **Proxy Services (`/api/proxy`)**:
  - Proxies requests to external raw assets (Github, Torappu, Mooncell, Fexli) with CORS headers, timeouts, and fallback handling to avoid client-side CORS blocking.
- **AI Translation (`/api/translate`)**:
  - Uses `@google/genai` (Gemini API with `GEMINI_API_KEY`) to provide assisted translation of Arknights dialogue with context-aware lore awareness.
- **Community Voting (`/api/vote`)**:
  - Community polls, song rankings, and story translation votes persisted via `server/services/voteStorage.ts` (`votes.json`).
- **Bug Reporting (`/api/bug-report`)**:
  - Sends formatted bug reports and scene error logs directly to Discord webhook (`DISCORD_BUG_WEBHOOK_URL`).

---

## 📚 Lore & Data Layer

- **Canonical Lore Glossary**: `src/config/arknightsGlossary.ts` (`ARKNIGHTS_CANONICAL_GLOSSARY`)
  - Strict Russian nomenclature for factions (*Родос Айленд*, *Урсус*, *Янь*), operators (*Кальцит*, *Чэнь*, *Кель'си*), and terms (*Ориджиниум*, *Орипатия*).
- **Operators Database**: `src/data/operators_database.json`
  - Operator dossiers, voice lines, talents, modules, and lore logs.
- **Operator Names Map**: `src/data/operator_names_map.json`
  - Fast lookup map for ID ↔ EN/CN/RU names.
- **Tags & UI Strings**: `src/data/tags_database.json`, `src/data/translations.json`, `src/translations.ts`.

---

## 🛠️ Mandatory Agent Workflow & Safety Rules

1. **Hosting Awareness**:
   - The application is hosted on **Vercel** and containerized on Cloud Run. Maintain `@vercel/analytics`, `@vercel/speed-insights`, and `vercel.json` compatibility.

2. **JSON Data Integrity Check**:
   - Before building or after modifying any file in `src/data/`, run `npm run validate:data`.
   - If `src/data/operators_database.json` is modified or extended, run `npm run sync:operators` to refresh `src/data/operator_names_map.json`.

3. **TypeScript & Type Safety**:
   - Strict TypeScript rules apply (`noImplicitAny`).
   - Use explicit interfaces from `src/types.ts`. Avoid `any` types wherever possible.
   - Run `npm run lint` (`tsc --noEmit`) to verify zero type errors.

4. **Lore & Localization Standards**:
   - Always refer to `ARKNIGHTS_CANONICAL_GLOSSARY` in `src/config/arknightsGlossary.ts` when translating or displaying Russian terms.
   - Ensure operator handbook titles follow `getCanonicalHandbookTitle` formatting in `src/utils/operatorUtils.ts`.

5. **Useful Developer Commands**:
   - `npm run validate:data` — Validates all JSON files for syntax and completeness.
   - `npm run sync:operators` — Re-generates `src/data/operator_names_map.json`.
   - `npm run lint` — Runs TypeScript compiler check (`tsc --noEmit`).
   - `npm run build` — Compiles Vite frontend and bundles server into `dist/server.cjs`.

---

*Keep this file up to date whenever new architectural modules, API routes, or dataset structures are introduced.*

