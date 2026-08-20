# AGENTS.md — AI Coding Agent Project Context & Development Protocols

This file is automatically loaded into the AI Studio agent environment to guide development, data maintenance, and code architecture for **Zoot Archive** (Arknights Dossier & Story Reader).

---

## 🏛️ Project Architecture Overview

- **Framework**: React 19 + TypeScript + Vite + Express (Full-Stack).
- **Hosting & Deployment**: Hosted on **Vercel** (uses `@vercel/analytics` and `@vercel/speed-insights`, with `vercel.json` config).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/index.css`).
- **Data Layer**:
  - `src/data/operators_database.json`: Main dossier dataset for operators.
  - `src/data/operator_names_map.json`: Fast ID/name lookup dictionary mapping operator keys to `{ displayName, englishName, chineseName, russianName }`.
  - `src/data/tags_database.json` & `src/data/translations.json`: Tag descriptions and UI strings.
  - `src/data/audio_sound.json` & `src/data/audio_music.json`: Audio assets index.
- **Lore & Glossaries**:
  - `src/config/arknightsGlossary.ts`: Canonical Arknights lore glossary for Russian translation (`ARKNIGHTS_CANONICAL_GLOSSARY`).
- **AI Services**:
  - `@google/genai` on server-side (`server.ts`) for real-time translation and dossier enrichment.

---

## 🛠️ Mandatory Agent Workflow & Safety Rules

1. **JSON Data Integrity Check**:
   - Before building or after modifying any file in `src/data/`, run `npm run validate:data`.
   - If `src/data/operators_database.json` is modified or extended, run `npm run sync:operators` to refresh `src/data/operator_names_map.json`.

2. **TypeScript & Type Safety**:
   - Strict TypeScript rules apply (`noImplicitAny`).
   - Use explicit interfaces from `src/types.ts`. Avoid `any` types wherever possible.
   - Run `npm run lint` (`tsc --noEmit`) to verify zero type errors.

3. **Lore & Localization Standards**:
   - Always refer to `ARKNIGHTS_CANONICAL_GLOSSARY` in `src/config/arknightsGlossary.ts` when translating or displaying Russian terms (e.g., *Родос Айленд*, *Кальцит*, *Чэнь*, *Ориджиниум*).
   - Ensure operator handbook titles follow `getCanonicalHandbookTitle` formatting in `src/utils/operatorUtils.ts`.

4. **Useful Developer Commands**:
   - `npm run validate:data` — Validates all JSON files for syntax and completeness.
   - `npm run sync:operators` — Re-generates `src/data/operator_names_map.json`.
   - `npm run lint` — Runs TypeScript compiler check without emitting files.

---

*Keep this file up to date whenever new architectural modules, API routes, or dataset structures are introduced.*
