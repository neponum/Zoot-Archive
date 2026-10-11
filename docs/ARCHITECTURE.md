# 🏛️ Zoot Archive — System Architecture & Topology

This document provides a comprehensive architectural reference for developers and AI models working on the **Zoot Archive** codebase.

---

## 1. System Topology Overview

Zoot Archive is a full-stack web application designed to run seamlessly on containerized environments (Google Cloud Run / AI Studio dev server on port 3000) as well as serverless platforms (Vercel).

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZOOT ARCHIVE TOPOLOGY                         │
└────────────────────────────────────────────────────────────────────────┘

    Client Browser (React 19 + TypeScript + Vite 6 + Tailwind CSS v4)
      │
      ├── Client Routing (`react-router-dom` v6):
      │     ├── `/` & `/story`          ──> ChapterSelector (Main Hub)
      │     ├── `/event/:eventId`       ──> Event Story Collection
      │     ├── `/operators`            ──> Operators Dossier List
      │     ├── `/operators/:operatorId`──> Operator Records & Handbook
      │     ├── `/music`                ──> PRTS Music & OST Browser
      │     ├── `/story/*`              ──> StoryViewerRoute (Visual Novel Engine)
      │     └── `/translate/*`          ──> Translation Workbench
      │
      ├── Visual Novel Playback Engine:
      │     ├── Parser: storyParser.ts (Raw text -> AST tokens)
      │     ├── Reducer: useStoryReducer.ts (Command playback state machine)
      │     ├── Controls: useStoryControls.ts (Auto-play, skipping, history)
      │     ├── Physics/Tweens: CssTransformBox.tsx (Hardware-accelerated CSS)
      │     └── Display Layers:
      │           ├── BackgroundLayer.tsx (Backgrounds & CG illustrations)
      │           ├── CharacterLayer.tsx & CharacterCutinLayer.tsx (Sprites & expressions)
      │           ├── CinematicEffectsLayer.tsx (Camera shake, flash, weather)
      │           └── DialogueUI.tsx & Typewriter.tsx (Rich text printing)
      │
      ├── Audio Engine:
      │     └── audioManager.ts (Howler.js + IndexedDB CacheService)
      │
      ▼ (HTTP JSON & Binary Media Stream)
┌────────────────────────────────────────────────────────────────────────┐
│ Express Backend (0.0.0.0:3000 / server.ts / server/routes)              │
├────────────────────────────────────────────────────────────────────────┤
│  Security Layer & Middlewares:                                         │
│    • Custom Security Headers: nosniff, XSS protection, Referrer Policy │
│    • Tiered Rate Limiting: Global (1000/15m), Proxy (10000/15m)        │
│    • Cookie-Parser: HttpOnly, Secure, SameSite=Lax                     │
│                                                                        │
│  API Route Endpoints:                                                  │
│    ├── `/api/proxy?url=...`    ──> SSRF-guarded asset proxy            │
│    ├── `/api/auth/discord/...` ──> Discord OAuth2 & member verification│
│    ├── `/api/translate`        ──> Gemini 2.5 Flash assisted translation│
│    ├── `/api/bug-report`       ──> Discord webhook payload validator   │
│    └── `/api/vote`             ──> Local community poll storage        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Client-Server Lifecycle & Dev/Prod Mount

### Development Mode (`npm run dev` -> `tsx server.ts`)
In development, Express acts as the parent server listening on `0.0.0.0:3000`. Vite's dev server is mounted directly into Express via middleware mode:

```typescript
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});
app.use(vite.middlewares);
```

This architecture ensures that all API routes (`/api/*`) and OAuth callbacks (`/auth/discord/*`) are handled by Express first, while client assets and hot-reloaded modules are piped through Vite without requiring reverse proxy tools or multi-port orchestration.

### Production Mode (`npm run build` -> `npm start`)
1. `vite build` bundles the frontend into the `dist/` folder.
2. `esbuild` bundles `server.ts` and its dependencies into `dist-server/server.cjs`.
3. `node dist-server/server.cjs` serves compiled static files from `dist/` and acts as fallback for client-side HTML5 SPA routing (`app.get('*', ...)`).

> Security note: the server bundle is intentionally written to `dist-server/`, **outside** the `dist/` directory that `@vercel/static-build` publishes. Never move it back into `dist/` — it would expose server source code (and its source map) as public static assets.

---

## 3. Application State & Storage Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                       STATE STORAGE TAXONOMY                        │
├─────────────────────────┬──────────────────────┬────────────────────┤
│ Storage Layer           │ Key / Namespace      │ Content            │
├─────────────────────────┼──────────────────────┼────────────────────┤
│ IndexedDB (CacheService)│ `arknights_cache_...`│ BGM Audio Blobs,   │
│                         │                      │ Large CG Textures, │
│                         │                      │ Character JSON Maps│
├─────────────────────────┼──────────────────────┼────────────────────┤
│ Browser localStorage    │ `ak-read-chapters`   │ Completed chapters │
│                         │ `ak-doc-name`        │ Doctor custom name │
│                         │ `ak-story-settings`  │ Text speed, volume │
│                         │ `ak-bookmarks`       │ Saved scene points │
├─────────────────────────┼──────────────────────┼────────────────────┤
│ React Reducer State     │ `useStoryReducer`    │ Active VN dialogue,│
│ (In-Memory)             │                      │ camera, characters,│
│                         │                      │ audio snapshot     │
├─────────────────────────┼──────────────────────┼────────────────────┤
│ Server JSON Storage     │ `votes.json`         │ Community poll &   │
│                         │                      │ translation votes  │
└─────────────────────────┴──────────────────────┴────────────────────┘
```

### IndexedDB Persistence (`src/services/cacheService.ts`)
High-resolution illustrations (often 1080p–4K PNGs) and lossless BGM tracks are stored in browser IndexedDB via `CacheService`. Before any external network request is made:
1. `CacheService.getCachedBlobUrl(url)` is queried.
2. If found, a local `blob:` URI is returned instantly, bypassing network latency.
3. If missing, the asset is fetched via the server-side proxy `/api/proxy`, and persisted into IndexedDB asynchronously in the background.

---

## 4. Audio Subsystem Architecture

Managed via `src/services/audioManager.ts` and `src/services/story/storyAssetService.ts`:
- **Engine**: Howler.js (`howler` v2.2.4).
- **Channels**:
  - `bgm`: Single active background music channel with automatic crossfading.
  - `sfx`: Polyphonic sound effect channel for impacts, UI clicks, and ambient noise.
  - `voice`: Operator voice playback channel.
- **Autoplay Policy Handling**: Browsers block audio prior to first user gesture. The UI triggers `audioManager.unlock()` on the first interaction (e.g. clicking a chapter or opening the story player).
- **Dynamic URL Resolution**: Sound asset keys (e.g. `$darkness02_loop`, `b_char_shoot`) are dynamically mapped against official Torappu sound tables with fallback CDNs.

---

## 5. Removed Subsystem: D3 Relationship Graph

The interactive D3.js operator relationship graph (`src/components/OperationRecordsGraph.tsx`)
was never mounted by any route and has been removed together with its documentation
references. The `d3` package remains declared in `package.json` for legacy reasons, but
nothing imports it and it is not part of the client bundle. Operator relationship data is
now sourced directly from `src/data/operators_database.json` records and rendered as
static dossier fields.
