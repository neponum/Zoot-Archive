# 🎬 Zoot Archive — Visual Novel & Story Engine Specification

This document details the mechanics, coordinate math, parsing rules, and rendering pipeline of the in-browser visual novel engine that reproduces Arknights story scenarios.

---

## 1. Engine Component Hierarchy

```
StoryViewerRoute (`/story/*`)
  └── StoryViewer.tsx (Orchestrator)
        ├── CssTransformBox.tsx (Camera Viewport Transform)
        │     └── Stage Container (aspect-video max-w-[177.78dvh])
        │           ├── BackgroundLayer.tsx (Static & Animated Backgrounds/CGs)
        │           ├── CharacterLayer.tsx (Left / Center / Right Operator Sprites)
        │           ├── CharacterCutinLayer.tsx (Cinematic Cut-in Portraits)
        │           ├── CinematicEffectsLayer.tsx (Weather, screen flashes & shakes)
        │           └── StickerLayer.tsx (Scenario comic stickers & popups)
        │
        ├── Dialogue UI Layer:
        │     ├── DialogueUI.tsx (Speaker box, nameplate & typography)
        │     ├── DialogueBox.tsx (Outer container & scrim gradient)
        │     └── Typewriter.tsx (Animated text printing & tag preservation)
        │
        ├── Interactive Overlays:
        │     ├── DecisionOverlay.tsx (Branching player choices)
        │     ├── ControlsOverlay.tsx (Top bar: settings, log, read status, auto, skip)
        │     └── SkipControls.tsx (Fast-forward mode banner)
        │
        └── Modals:
              ├── LogModal.tsx (History backlog & jump-to-line)
              ├── SettingsModal.tsx (Text speed, audio volumes, Doctor nickname)
              └── BugReportModal.tsx (Direct Discord webhook bug dispatcher)
```

---

## 2. Script Parser (`src/services/story/storyParser.ts`)

Arknights scripts are stored in plain text files containing commands enclosed in square brackets `[...]` interspersed with character dialogue lines.

### Supported Command Syntax Reference

| Command Tag | Core Attributes | Description & Behavior |
| :--- | :--- | :--- |
| `[name="..."] text` | None | Emits a dialogue line. Text following the tag is spoken by the character named in `name`. |
| `[Character(...)]` | `name`, `name2`, `focus`, `fadetime` | Places character sprites on stage. `focus=1` highlights the primary character, `focus=2` highlights the secondary. |
| `[Background(...)]`| `image`, `fadetime`, `screenadapt` | Sets or transitions the background scene. `screenadapt="coverall"` ensures 16:9 full cover. |
| `[Image(...)]` | `image`, `x`, `y`, `xScale`, `yScale` | Renders a full-screen or positioned CG illustration. |
| `[ImageTween(...)]`| `xTo`, `yTo`, `xScaleTo`, `duration` | Smoothly tweens an image's position and scale over `duration` seconds. |
| `[CameraShake(...)]`| `duration`, `xstrength`, `vibrato` | Triggers hardware-accelerated screen shake. |
| `[Blocker(...)]` | `a`, `r`, `g`, `b`, `fadetime` | Fades the screen to a solid color overlay (e.g. `a=1, r=0, g=0, b=0` for black fade). |
| `[PlayMusic(...)]` | `key`, `intro`, `volume`, `crossfade`| Plays background music with smooth volume crossfading. |
| `[PlaySound(...)]` | `key`, `volume` | Plays a one-shot sound effect. |
| `[Decision(...)]` | `options`, `values` | Prompts the reader with interactive choices separated by semicolons (`;`). |
| `[Predicate(...)]` | `references` | Evaluates which choice branch to display based on the previous `[Decision]`. |
| `[Delay(...)]` | `time` | Pauses script execution for `time` seconds. |

---

## 3. Coordinate System & Transform Math (`BackgroundLayer.tsx`)

Arknights was built in Unity AVG where:
1. The virtual canvas size is **1920 × 1080**.
2. Center is coordinate `(0, 0)`.
3. Positive Y ($+Y$) is **up** in Unity, whereas in CSS `translateY` positive Y ($+Y$) is **down**.
4. Positive X ($+X$) is **right** in both Unity and CSS.

### Coordinate Normalization Equations

```typescript
export const normalizeCoordX = (x?: number, scaleX: number = 1): number => {
  if (x === undefined || isNaN(x)) return 0;
  const rawPercent = (x / 1920) * 100;
  if (scaleX > 1) {
    // When zoomed in, maximum pan is the overflow margin
    const maxBound = ((scaleX - 1) / 2) * 100;
    return Math.max(-maxBound, Math.min(maxBound, rawPercent));
  }
  return Math.max(-35, Math.min(35, rawPercent));
};

export const normalizeCoordY = (y?: number, scaleY: number = 1): number => {
  if (y === undefined || isNaN(y)) return 0;
  // Invert Y because in Arknights Unity AVG +Y is up, in CSS translateY +Y is down
  const rawPercent = (-y / 1080) * 100;
  if (scaleY > 1) {
    // When zoomed in, maximum pan is the overflow margin
    const maxBound = ((scaleY - 1) / 2) * 100;
    return Math.max(-maxBound, Math.min(maxBound, rawPercent));
  }
  return Math.max(-35, Math.min(35, rawPercent));
};
```

### Scale-Aware Boundary Clamping (Crucial Invariant)

When an image is scaled to $S > 1$ (e.g. $S = 1.2$ or $S = 2.0$):
- The allowable pan margin before exposing empty black space is exactly:
  $$\text{maxBound} = \frac{(S - 1)}{2} \times 100\%$$
- **The 04-02 Bug Case Study**: In chapter `level_main_04-02_end`, the script specifies `[ImageTween(image="avg_31_1", xScaleTo=1.2, yScaleTo=1.2, yTO=600)]`.
  - Without clamping, shifting by $y=600$ moves the image vertically by $\frac{-600}{1080} \times 100\% = -55.55\%$, completely pushing the characters off the top of the screen and leaving half the viewport black.
  - With scale-aware clamping, at scale $1.2$, the maximum allowable shift is $\frac{(1.2 - 1)}{2} \times 100\% = 10\%$. The image smoothly focuses on the characters without leaving the screen.

---

## 4. Character Sprite Resolution (`storyAssetService.ts`)

### Base Sprites & Modular Face Overlays
Arknights characters use two distinct rendering modes depending on the era of the asset:
1. **Full-Body Static Sprites (`group: -1`)**: The asset is a standalone complete image (e.g. `char_010_chen_1/char_010_chen_1.png`).
2. **Modular Face Overlays (`face_overlay`)**:
   - `base`: Base body image without facial features (e.g. `avg_017_huang_1/avg_017_huang_1$1.png`).
   - `face`: Face expression cutout (e.g. `avg_017_huang_1/4$1.png`).
   - `faceRect`: Coordinate rectangle `{ x, y, w, h }` defining the exact position and dimensions to layer the face on top of the base body.

### Strict Script Asset Name Invariant
**NEVER overwrite or substitute character IDs with other costumes or aliases.**
- If the script requests `char_017_homura_3#4`, it must resolve against the canonical asset tables without forcing alternate event skins (such as summer swimsuits or alternate class alts).
- If the script requests `char_308_swire_1#5`, it must display Swire in her default L.G.D. uniform, preserving the scenario's authentic narrative context.

---

## 5. Rich Text & Typewriter Engine (`src/lib/textUtils.ts` & `Typewriter.tsx`)

Dialogue scripts contain Unity rich-text markup tags:
- `<color=#HEX>text</color>`: Color highlights (Hex code, RGB, or CSS named colors).
- `<b>text</b>`: Bold emphasis.
- `<i>text</i>`: Italic emphasis.
- `<u>text</u>`: Underlined text.
- `<size=N>text</size>`: Text font size adjustment.

### Security Sanitization Policy
To prevent style injection or DOM layout breaking:
1. `color` is validated via regular expression against strict Hex (`^#[0-9a-fA-F]{3,8}$`), RGB/RGBA, or basic alphanumeric color names.
2. `size` is validated to allow only numeric values with optional units (`px`, `pt`, `rem`, `em`, `%`).
3. Text is rendered as plain React child text nodes, eliminating DOM XSS attack vectors.
