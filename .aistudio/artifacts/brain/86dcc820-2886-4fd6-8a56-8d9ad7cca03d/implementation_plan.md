# Comprehensive Project Documentation, Security Hardening & UI/UX Audit

This plan establishes exhaustive architectural and operational documentation for AI models and human developers in `AGENTS.md` and a dedicated `docs/` suite, while executing an end-to-end security audit and a design/responsive UX review across Zoot Archive.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during Phase 1 interactive clarification:
> - **Documentation Architecture**: Primary AI developer instructions in root `AGENTS.md` paired with deep-dive technical documents in a new `docs/` directory (`docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/STORY_ENGINE.md`, `docs/DATA_PIPELINE.md`).
> - **Security Audit Scope**: Full-spectrum audit across the Express backend, SSRF/open-proxy defenses in `/api/proxy`, Discord OAuth2 state and session validation, and client-side sanitization/XSS prevention in the story typewriter and dialogue rendering.
> - **Design & UX Scope**: Complete audit across the Visual Novel story viewer, dialogue staging, responsive mobile viewport constraints (touch targets $\ge 44\text{px}$, sticky overlays $\le 15\%$), and operator dossier layouts with D3 graph performance.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. **Omni-Model Developer Documentation**: A definitive manual that prevents future AI agents from hallucinating aliases, misconfiguring asset URLs, breaking data schemas, or introducing regressions in story tweening and coordinate math.
  2. **Security Hardening Verification**: Elimination of SSRF vectors in raw asset proxying, CSRF/state verification in Discord OAuth, cookie security configuration, and input sanitization against XSS in custom translation submissions and rich dialogue tags.
  3. **Visual & UX Polish**: Elimination of visual glitches, compliance with WCAG AA readability, responsive viewport integrity across mobile, tablet, and 1440px desktop screens, and anti-slop aesthetic refinement.
- **Target Audience**: Future AI coding models (Gemini, Claude, GPT), open-source contributors, community story translators, and Arknights readers on mobile and desktop devices.
- **Core Value**: Turns Zoot Archive into a battle-tested, self-documenting, and secure open-source reference implementation of an in-browser visual novel engine and Arknights lore database.

---

## 2. User Experience & Visual Design

### Key User Flows & Visual Touchpoints

1. **Visual Novel Playback (`StoryViewer`)**:
   - High-contrast, cinematic stage maintaining a 16:9 aspect ratio (`aspect-video max-w-[177.78dvh]`) without aspect ratio distortion.
   - Dialogue container with subtle, calibrated contrast scrims (`bg-gradient-to-t from-black/90 via-black/60 to-transparent`) ensuring 4.5:1 text readability over bright or flashing CG backgrounds.
   - Interactive choice overlays (`DecisionOverlay`) with distinct visual feedback on hover/tap without dead click states.
2. **Dossier & Operator Archive (`ChapterSelector` & Operator Views)**:
   - Clean, unboxed metadata typography (no pill badge clutter, clean `·` dividers) as mandated by the design constitution.
   - Smooth D3.js force-directed graph with throttled physics calculations on mobile viewports.
3. **Translation Workbench (`TranslationInterface`)**:
   - Split-view editor with synchronized script preview, diff highlights, and explicit validation feedback.
4. **Mobile Experience Governance**:
   - Strict 15% mobile sticky cap for top bar and playback controls.
   - Touch targets $\ge 44\text{px}$ for all playback, auto, skip, log, and settings buttons.

### Aesthetic Theme & Tokens
- **Background**: Deep tactical dark slate (`#0B0E14` / `#111620`).
- **Surfaces**: Tactical frosted panels (`rgba(22, 28, 38, 0.85)` with hairline border `rgba(255, 255, 255, 0.08)`).
- **Accents**: Rhodes Island electric cyan (`#00A8FF` / `#0090E7`) and alert amber (`#FF9F1C`).
- **Typography**: Clean geometric sans-serif for UI, serif/editorial treatment for chapter titles, monospace tabular figures (`font-mono tabular-nums`) for audio timestamps and script counters.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Documentation Structure (Modular `docs/` vs. Monolithic File)
- **Chosen Approach**: Keep operational rules, quick commands, and critical guards in `AGENTS.md` (root, loaded automatically into agent contexts), while placing detailed subsystem breakdowns into `docs/`:
  - `docs/ARCHITECTURE.md` (System topology, state lifecycle, routing)
  - `docs/STORY_ENGINE.md` (Script parser, tags AST, transform box math, camera tweens)
  - `docs/SECURITY.md` (SSRF protections, OAuth2 flows, rate limits, session cookies)
  - `docs/DATA_PIPELINE.md` (Torappu PRTS data layout, JSON schemas, sync scripts)
- **Why**: Keeps context window lightweight during routine tasks while giving agents dedicated reference files they can inspect on demand via `view_file`.
- **Alternatives Considered**: Storing everything in `README.md` (overwhelms human visitors) or a single 2000-line `AGENTS.md` (exceeds prompt efficiency).

### Decision 2: Security Verification & SSRF Defense in `/api/proxy`
- **Chosen Approach**: Strict hostname and prefix allowlisting (`ALLOWED_PREFIXES`) with URL normalization, private IP range blocking (preventing `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254` metadata scraping), and content-type enforcement.
- **Why**: The proxy endpoint accepts external URLs to bypass client-side CORS for game assets; without strict private-range validation, malicious actors could target internal services or Cloud Run metadata endpoints.

### Decision 3: Character Asset & Transform Policy
- **Chosen Approach**: Absolute fidelity to raw script asset names without hardcoded visual overwrites. Clamping pan coordinates within scale boundaries (`((scale - 1) / 2) * 100%`) so images never expose empty voids or fly off-screen.
- **Why**: Preserves developer intent and official game cinematography across all story chapters.

---

## 4. Technical Architecture & Security Strategy

### System Topology Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZOOT ARCHIVE TOPOLOGY                         │
└────────────────────────────────────────────────────────────────────────┘

    Client Browser (React 19 + Vite SPA)
      │
      ├── UI Views: /story/* · /operators/* · /music · /translate/*
      ├── Visual Novel Engine:
      │     ├── storyParser.ts (AST generation)
      │     ├── useStoryReducer.ts (playback state machine)
      │     ├── CssTransformBox.tsx (hardware-accelerated tweens)
      │     └── BackgroundLayer / CharacterLayer / DialogueUI
      └── PRTS Audio Subsystem:
            └── audioManager.ts (Howler.js + IndexedDB CacheService)
      │
      ▼ (HTTP / JSON / Stream)
┌────────────────────────────────────────────────────────────────────────┐
│ Express Server (0.0.0.0:3000 / Vercel Serverless Functions)             │
├────────────────────────────────────────────────────────────────────────┤
│  Security Middlewares:                                                 │
│    • Custom Security Headers (nosniff, XSS protection, Referrer Policy)│
│    • Rate Limiters (Global: 1000/15m, Proxy: 10000/15m, Bug: 10/1h)    │
│    • Cookie-Parser (HttpOnly, Secure, SameSite=Lax/Strict)             │
│                                                                        │
│  API Endpoints:                                                        │
│    ├── /api/proxy?url=...       ──> SSRF-guarded Asset Proxy           │
│    ├── /api/auth/discord/...    ──> OAuth2 flow + session management   │
│    ├── /api/translate           ──> Gemini 2.5 Flash assisted l10n     │
│    ├── /api/bug-report          ──> Discord Webhook payload validator  │
│    └── /api/vote                ──> Local vote storage (votes.json)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Security Audit Checklist & Verification Matrix

| Vulnerability Surface | Threat Vector | Mitigation Strategy | Status / Action |
| :--- | :--- | :--- | :--- |
| **`/api/proxy`** | SSRF & Internal IP access | Strict URL parser, private IP blocking (`127.0.0.1`, `169.254.x.x`), allowed domain prefixes | Audit & harden prefix parser |
| **Discord OAuth2** | CSRF / State tampering | Cryptographically random `state` cookie with verification on callback | Verify state cookie enforcement |
| **Auth Session** | Session hijacking / XSS | `httpOnly: true`, `secure: true`, `sameSite: 'lax'` cookie attributes | Verify cookie options in `server/routes/auth.ts` |
| **Story Typewriter & Logs**| Stored / DOM XSS | Rich-text tags sanitization, character name escapement in React components | Audit `Typewriter.tsx` & `DialogueUI.tsx` |
| **Discord Webhooks** | Webhook flooding / spam | Input validation schema, rate-limiting (`bugLimiter`), payload size caps | Audit `server/routes/bug.ts` |

---

## 5. Execution Steps

### Phase 1: Security & Defensive Hardening
1. Inspect and test `/api/proxy` to ensure no recursive loops, open redirects, or internal IP queries can succeed.
2. Review Discord OAuth2 callback handler in `server/routes/auth.ts` for strict CSRF `state` validation and secure cookie flags.
3. Verify client-side text renderers in `Typewriter.tsx`, `DialogueBox.tsx`, and `LogModal.tsx` to ensure rich-text formatting tags cannot execute arbitrary DOM scripts.

### Phase 2: UI, Accessibility & Design Review
1. Audit `StoryViewer` layout across viewport sizes (375px mobile, 768px tablet, 1440px desktop), verifying top controls and dialogue boxes respect touch target minimums ($\ge 44\text{px}$) and padding rhythm.
2. Verify image scale and pan clamping in `BackgroundLayer.tsx` and `CssTransformBox.tsx` under edge-case camera tweens.
3. Check `OperationRecordsGraph.tsx` for D3 force simulation cleanup on component unmount.

### Phase 3: Comprehensive Documentation Suite Creation
1. Expand root `AGENTS.md` with strict operational directives, coding protocols, and common pitfalls for future AI models.
2. Author `docs/ARCHITECTURE.md` covering full-stack component composition, state management, and lifecycle events.
3. Author `docs/STORY_ENGINE.md` detailing the visual novel AST parser, command specifications (`[Character]`, `[Image]`, `[Blocker]`, `[CameraShake]`, etc.), and coordinate normalizations.
4. Author `docs/SECURITY.md` detailing security architecture, proxy constraints, and authentication lifecycle.
5. Author `docs/DATA_PIPELINE.md` detailing Torappu data structures, operator database mapping, and data validation scripts.

### Phase 4: Final Validation
1. Execute `npm run validate:data` to verify data schemas.
2. Execute `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
3. Execute `npm run build` to verify production compilation.
