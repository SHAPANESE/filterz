# Carrete — Analog Photo Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app that applies 35mm analog film looks to a photo — 4 presets plus 6 adjustment sliders — rendered with WebGL, fully client-side, with full-resolution JPG download.

**Architecture:** Vanilla JS + Vite. Pure-logic modules (presets, params/state, resize, export helpers) are unit-tested with Vitest (TDD). WebGL rendering (a multi-pass pipeline: color grade → halation blur → composite with grain + vignette) lives in focused modules verified by running the app against the user's reference images. No backend; photos never leave the device.

**Tech Stack:** Vite, JavaScript (ES modules), WebGL 1 (GLSL ES 1.00), Vitest.

---

## File Structure

```
D:\carrete\
  index.html               # app shell + initial "upload" screen
  styles.css               # mobile-first styles
  vite.config.js           # Vite + Vitest config
  package.json
  src/
    main.js                # bootstrap: wires load → state → renderer → UI
    state.js               # current params (sliders), clamping, applyPreset, getRenderParams
    presets.js             # the 4 presets (pure data) + lookup helper
    gl/
      glUtils.js           # compile/link shaders, create textures & framebuffers
      shaders.js           # all GLSL sources as exported string constants
      renderer.js          # WebGL pipeline orchestration (FBOs, passes, draw)
    ui/
      load.js              # file input → decode → fit-size → ImageBitmap/canvas
      controls.js          # preset strip + slider panel, emits param changes
      export.js            # full-res render + JPG download
  tests/
    presets.test.js
    state.test.js
    resize.test.js
    export.test.js
```

> **Refinement vs spec:** shaders are stored as exported string constants in `src/gl/shaders.js` (instead of separate `.frag` files) so Vite needs no GLSL import plugin. The resize helper lives in `src/ui/load.js` (exported `computeFitSize`) and is imported by both load and export. Everything else matches the spec.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `styles.css`
- Create: `src/main.js` (temporary placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "carrete",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Carrete</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main id="app">
      <canvas id="preview" hidden></canvas>

      <section id="start" class="start">
        <h1>Carrete</h1>
        <p>Fotos con alma analógica</p>
        <button id="pick-start" class="btn btn-primary">Subir foto</button>
      </section>

      <section id="editor" class="editor" hidden>
        <div id="presets" class="presets"></div>
        <details id="adjust" class="adjust">
          <summary>Ajustes</summary>
          <div id="sliders" class="sliders"></div>
        </details>
        <div class="actions">
          <button id="pick" class="btn">Cambiar</button>
          <button id="download" class="btn btn-primary">Descargar</button>
        </div>
      </section>

      <input id="file" type="file" accept="image/*" hidden />
    </main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `styles.css`**

```css
:root { --bg: #111; --fg: #f4f4f4; --muted: #999; --accent: #e8b84b; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--fg);
  font-family: system-ui, -apple-system, sans-serif; overscroll-behavior: none; }
#app { display: flex; flex-direction: column; height: 100dvh; }

#preview { width: 100%; flex: 1 1 auto; object-fit: contain; min-height: 0;
  background: #000; touch-action: none; }

.start { flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; text-align: center; }
.start h1 { font-size: 2.2rem; margin: 0; letter-spacing: 2px; }
.start p { color: var(--muted); margin: 0; }

.editor { display: flex; flex-direction: column; gap: 10px; padding: 10px; }
.presets { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.preset { flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; border: 1px solid #333;
  background: #1c1c1c; color: var(--fg); font-size: 0.9rem; white-space: nowrap; }
.preset.active { border-color: var(--accent); color: var(--accent); }

.adjust summary { cursor: pointer; color: var(--muted); padding: 4px 0; }
.sliders { display: flex; flex-direction: column; gap: 10px; padding-top: 6px; }
.slider-row { display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 10px; }
.slider-row label { font-size: 0.85rem; color: var(--muted); }
.slider-row input[type=range] { width: 100%; accent-color: var(--accent); }

.actions { display: flex; gap: 10px; }
.btn { flex: 1; padding: 14px; border-radius: 12px; border: 1px solid #333;
  background: #1c1c1c; color: var(--fg); font-size: 1rem; }
.btn-primary { background: var(--accent); color: #111; border-color: var(--accent); font-weight: 600; }
[hidden] { display: none !important; }
```

- [ ] **Step 5: Create placeholder `src/main.js`**

```js
// Wired up in later tasks.
console.log('Carrete booting…')
```

- [ ] **Step 6: Install dependencies**

Run: `cd /d/carrete && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify dev server starts**

Run: `cd /d/carrete && npm run dev`
Expected: Vite prints a `localhost` URL. Open it; you see the "Carrete / Subir foto" start screen on a dark background. Stop the server (Ctrl-C).

- [ ] **Step 8: Verify the test runner runs (no tests yet)**

Run: `cd /d/carrete && npm test`
Expected: Vitest reports "No test files found" (exit is fine) — confirms Vitest is installed.

- [ ] **Step 9: Commit**

```bash
cd /d/carrete && git add -A && git commit -m "chore: scaffold Vite + Vitest project shell"
```

---

## Task 2: Presets module (TDD)

**Files:**
- Create: `src/presets.js`
- Test: `tests/presets.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/presets.test.js
import { describe, it, expect } from 'vitest'
import { PRESETS, getPreset } from '../src/presets.js'

const SLIDER_KEYS = ['intensity', 'grain', 'warmth', 'fade', 'vignette', 'halation']

describe('presets', () => {
  it('exposes exactly the 4 designed presets in order', () => {
    expect(PRESETS.map(p => p.id)).toEqual(['flash', 'teal', 'kodak', 'nostalgico'])
  })

  it('each preset has a human name and all 6 slider defaults in range', () => {
    for (const p of PRESETS) {
      expect(typeof p.name).toBe('string')
      for (const k of SLIDER_KEYS) {
        expect(typeof p.defaults[k]).toBe('number')
      }
      // warmth is -1..1, the rest 0..1
      expect(p.defaults.warmth).toBeGreaterThanOrEqual(-1)
      expect(p.defaults.warmth).toBeLessThanOrEqual(1)
      for (const k of SLIDER_KEYS.filter(k => k !== 'warmth')) {
        expect(p.defaults[k]).toBeGreaterThanOrEqual(0)
        expect(p.defaults[k]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('each preset has character constants for grading', () => {
    for (const p of PRESETS) {
      expect(p.character.shadowTint).toHaveLength(3)
      expect(p.character.highlightTint).toHaveLength(3)
      expect(typeof p.character.contrast).toBe('number')
      expect(typeof p.character.saturation).toBe('number')
      expect(typeof p.character.rolloff).toBe('number')
    }
  })

  it('getPreset returns by id and falls back to the first preset', () => {
    expect(getPreset('teal').id).toBe('teal')
    expect(getPreset('nope').id).toBe('flash')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/carrete && npx vitest run tests/presets.test.js`
Expected: FAIL — "Cannot find module '../src/presets.js'".

- [ ] **Step 3: Write minimal implementation**

```js
// src/presets.js
export const PRESETS = [
  {
    id: 'flash', name: 'Flash',
    defaults: { intensity: 0.95, grain: 0.70, warmth: 0.50, fade: 0.25, vignette: 0.30, halation: 0.25 },
    character: { shadowTint: [-0.02, 0.04, -0.01], highlightTint: [0.06, 0.03, -0.04], contrast: 1.12, saturation: 1.10, rolloff: 0.50 },
  },
  {
    id: 'teal', name: 'Noche teal',
    defaults: { intensity: 1.00, grain: 0.50, warmth: -0.30, fade: 0.35, vignette: 0.45, halation: 0.80 },
    character: { shadowTint: [-0.04, 0.03, 0.05], highlightTint: [-0.03, 0.02, 0.02], contrast: 1.05, saturation: 0.95, rolloff: 0.30 },
  },
  {
    id: 'kodak', name: 'Verano Kodak',
    defaults: { intensity: 0.90, grain: 0.25, warmth: 0.35, fade: 0.40, vignette: 0.15, halation: 0.20 },
    character: { shadowTint: [0.03, 0.01, -0.02], highlightTint: [0.05, 0.03, -0.03], contrast: 0.95, saturation: 1.05, rolloff: 0.35 },
  },
  {
    id: 'nostalgico', name: 'Cálido nostálgico',
    defaults: { intensity: 0.92, grain: 0.50, warmth: 0.40, fade: 0.45, vignette: 0.40, halation: 0.40 },
    character: { shadowTint: [0.05, 0.02, -0.02], highlightTint: [0.04, 0.02, -0.03], contrast: 1.00, saturation: 1.00, rolloff: 0.40 },
  },
]

export function getPreset(id) {
  return PRESETS.find(p => p.id === id) || PRESETS[0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/carrete && npx vitest run tests/presets.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/carrete && git add src/presets.js tests/presets.test.js && git commit -m "feat: add 4 film presets with slider defaults and character constants"
```

---

## Task 3: Params/state model (TDD)

**Files:**
- Create: `src/state.js`
- Test: `tests/state.test.js`

State holds the current slider values and the active preset id. `applyPreset` copies a preset's defaults into the sliders. `setSlider` clamps. `getRenderParams` merges slider values with the active preset's character constants into the flat object the renderer consumes.

- [ ] **Step 1: Write the failing test**

```js
// tests/state.test.js
import { describe, it, expect } from 'vitest'
import { createState } from '../src/state.js'

describe('state', () => {
  it('starts on the first preset with its defaults applied', () => {
    const s = createState()
    expect(s.presetId).toBe('flash')
    expect(s.sliders.grain).toBeCloseTo(0.70)
  })

  it('applyPreset replaces slider values with that preset defaults', () => {
    const s = createState()
    s.applyPreset('teal')
    expect(s.presetId).toBe('teal')
    expect(s.sliders.halation).toBeCloseTo(0.80)
  })

  it('setSlider clamps 0..1 sliders', () => {
    const s = createState()
    s.setSlider('grain', 5)
    expect(s.sliders.grain).toBe(1)
    s.setSlider('grain', -2)
    expect(s.sliders.grain).toBe(0)
  })

  it('setSlider clamps warmth to -1..1', () => {
    const s = createState()
    s.setSlider('warmth', 9)
    expect(s.sliders.warmth).toBe(1)
    s.setSlider('warmth', -9)
    expect(s.sliders.warmth).toBe(-1)
  })

  it('getRenderParams merges sliders and active character constants', () => {
    const s = createState()
    s.applyPreset('teal')
    const p = s.getRenderParams()
    expect(p.halation).toBeCloseTo(0.80)
    expect(p.contrast).toBeCloseTo(1.05)
    expect(p.shadowTint).toEqual([-0.04, 0.03, 0.05])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/carrete && npx vitest run tests/state.test.js`
Expected: FAIL — "Cannot find module '../src/state.js'".

- [ ] **Step 3: Write minimal implementation**

```js
// src/state.js
import { getPreset, PRESETS } from './presets.js'

const RANGES = {
  intensity: [0, 1], grain: [0, 1], warmth: [-1, 1],
  fade: [0, 1], vignette: [0, 1], halation: [0, 1],
}

function clamp(name, v) {
  const [lo, hi] = RANGES[name]
  return Math.min(hi, Math.max(lo, v))
}

export function createState() {
  const state = {
    presetId: PRESETS[0].id,
    sliders: { ...PRESETS[0].defaults },

    applyPreset(id) {
      const preset = getPreset(id)
      state.presetId = preset.id
      state.sliders = { ...preset.defaults }
    },

    setSlider(name, value) {
      if (!(name in RANGES)) return
      state.sliders[name] = clamp(name, value)
    },

    getRenderParams() {
      const { character } = getPreset(state.presetId)
      return { ...state.sliders, ...character }
    },
  }
  return state
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/carrete && npx vitest run tests/state.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/carrete && git add src/state.js tests/state.test.js && git commit -m "feat: add param state with clamping and preset/character merge"
```

---

## Task 4: Resize utility (TDD)

**Files:**
- Create: `src/ui/load.js` (only `computeFitSize` for now)
- Test: `tests/resize.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/resize.test.js
import { describe, it, expect } from 'vitest'
import { computeFitSize } from '../src/ui/load.js'

describe('computeFitSize', () => {
  it('downscales a landscape image to the max long edge, keeping aspect', () => {
    expect(computeFitSize(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
  })

  it('downscales a portrait image by its long (height) edge', () => {
    expect(computeFitSize(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 })
  })

  it('leaves images smaller than the max edge untouched', () => {
    expect(computeFitSize(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })

  it('returns integer dimensions', () => {
    const r = computeFitSize(1999, 1001, 1280)
    expect(Number.isInteger(r.width)).toBe(true)
    expect(Number.isInteger(r.height)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/carrete && npx vitest run tests/resize.test.js`
Expected: FAIL — "Cannot find module '../src/ui/load.js'".

- [ ] **Step 3: Write minimal implementation**

```js
// src/ui/load.js
export function computeFitSize(srcW, srcH, maxEdge) {
  const longEdge = Math.max(srcW, srcH)
  if (longEdge <= maxEdge) return { width: srcW, height: srcH }
  const scale = maxEdge / longEdge
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/carrete && npx vitest run tests/resize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/carrete && git add src/ui/load.js tests/resize.test.js && git commit -m "feat: add aspect-preserving fit-size helper"
```

---

## Task 5: Export helpers (TDD)

**Files:**
- Create: `src/ui/export.js` (pure helpers only for now)
- Test: `tests/export.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/export.test.js
import { describe, it, expect } from 'vitest'
import { exportFileName, EXPORT_MIME, EXPORT_QUALITY, EXPORT_MAX_EDGE } from '../src/ui/export.js'

describe('export helpers', () => {
  it('builds a timestamped jpg filename from a given date', () => {
    const d = new Date(Date.UTC(1998, 4, 24, 9, 8, 7)) // 1998-05-24 09:08:07
    // uses local time parts; assert the shape, not the timezone
    expect(exportFileName(d)).toMatch(/^carrete-\d{8}-\d{6}\.jpg$/)
  })

  it('exports jpeg at high quality', () => {
    expect(EXPORT_MIME).toBe('image/jpeg')
    expect(EXPORT_QUALITY).toBeGreaterThan(0.8)
    expect(EXPORT_QUALITY).toBeLessThanOrEqual(1)
  })

  it('caps export resolution to protect mobile memory', () => {
    expect(EXPORT_MAX_EDGE).toBeGreaterThanOrEqual(2048)
    expect(EXPORT_MAX_EDGE).toBeLessThanOrEqual(4096)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/carrete && npx vitest run tests/export.test.js`
Expected: FAIL — "Cannot find module '../src/ui/export.js'".

- [ ] **Step 3: Write minimal implementation**

```js
// src/ui/export.js
export const EXPORT_MIME = 'image/jpeg'
export const EXPORT_QUALITY = 0.92
export const EXPORT_MAX_EDGE = 4096

function pad(n, len = 2) { return String(n).padStart(len, '0') }

export function exportFileName(date = new Date()) {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `carrete-${stamp}.jpg`
}
```

> The DOM-side `downloadBlob`/`exportPhoto` functions are added in Task 12; this task ships only the pure, tested helpers.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/carrete && npx vitest run tests/export.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd /d/carrete && npm test`
Expected: PASS — all 4 test files green (presets, state, resize, export).

- [ ] **Step 6: Commit**

```bash
cd /d/carrete && git add src/ui/export.js tests/export.test.js && git commit -m "feat: add export filename and output constants"
```

---

## Task 6: GLSL shader sources

**Files:**
- Create: `src/gl/shaders.js`

These are verified indirectly when the renderer runs (Task 8). All shaders are WebGL 1 / GLSL ES 1.00. Convention: the source image is uploaded with `UNPACK_FLIP_Y_WEBGL = true`, so all textures share WebGL's Y-up orientation and a single quad with texcoords `[0,1]` is used for every pass.

- [ ] **Step 1: Create `src/gl/shaders.js`**

```js
// src/gl/shaders.js — WebGL1 / GLSL ES 1.00

export const QUAD_VERT = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_uv;
void main() {
  v_uv = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

// Pass 1 — color grade. Source -> graded color (FBO-A).
export const GRADE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_warmth;        // -1..1
uniform float u_fade;          // 0..1
uniform float u_contrast;      // ~0.9..1.2
uniform float u_saturation;    // ~0.9..1.1
uniform vec3  u_shadowTint;
uniform vec3  u_highlightTint;
uniform float u_rolloff;       // 0..1

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 sat(vec3 c, float s) {
  float l = dot(c, LUMA);
  return mix(vec3(l), c, s);
}

void main() {
  vec3 c = texture2D(u_image, v_uv).rgb;

  // warmth: warm pushes red up, blue down
  c.r += u_warmth * 0.12;
  c.b -= u_warmth * 0.12;

  // contrast around mid grey
  c = (c - 0.5) * u_contrast + 0.5;

  // saturation
  c = sat(c, u_saturation);

  // highlight roll-off (soft "blown" film highlights)
  vec3 soft = 1.0 - (1.0 - clamp(c, 0.0, 1.0)) * (1.0 - clamp(c, 0.0, 1.0));
  c = mix(c, soft, u_rolloff);

  // split-tone by luminance
  float l = clamp(dot(c, LUMA), 0.0, 1.0);
  c += u_shadowTint * (1.0 - l);
  c += u_highlightTint * l;

  // fade: lift the blacks (affects darks more than brights)
  c += u_fade * 0.12 * (1.0 - c);

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

// Pass 2a — bright pass, weighted toward red/orange for halation glow.
export const BRIGHT_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;     // graded (FBO-A)
uniform float u_threshold;     // ~0.6
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 c = texture2D(u_image, v_uv).rgb;
  float l = dot(c, LUMA);
  float b = max(l - u_threshold, 0.0) / max(1.0 - u_threshold, 0.0001);
  vec3 glow = c * b;
  glow.g *= 0.6;
  glow.b *= 0.35;
  gl_FragColor = vec4(glow, 1.0);
}`

// Pass 2b — separable 9-tap gaussian blur. u_dir already includes texel + spread.
export const BLUR_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_dir;            // (texelX*spread, 0) or (0, texelY*spread)
void main() {
  vec3 sum = vec3(0.0);
  sum += texture2D(u_image, v_uv).rgb * 0.227027;
  sum += texture2D(u_image, v_uv + u_dir * 1.3846).rgb * 0.316216;
  sum += texture2D(u_image, v_uv - u_dir * 1.3846).rgb * 0.316216;
  sum += texture2D(u_image, v_uv + u_dir * 3.2308).rgb * 0.070270;
  sum += texture2D(u_image, v_uv - u_dir * 3.2308).rgb * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}`

// Pass 3 — composite: graded + halation(screen) + grain + vignette, then intensity mix.
export const COMPOSITE_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_graded;    // FBO-A
uniform sampler2D u_halation;  // FBO-C
uniform sampler2D u_source;    // original (for intensity mix)
uniform float u_halationAmt;   // 0..1
uniform float u_grain;         // 0..1
uniform float u_vignette;      // 0..1
uniform float u_intensity;     // 0..1
uniform vec2  u_resolution;
uniform float u_seed;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 graded = texture2D(u_graded, v_uv).rgb;
  vec3 glow = texture2D(u_halation, v_uv).rgb;

  // screen-blend the halation glow
  vec3 col = 1.0 - (1.0 - graded) * (1.0 - glow * u_halationAmt);

  // film grain, strongest in midtones
  float l = dot(col, LUMA);
  float n = hash(v_uv * u_resolution + u_seed) - 0.5;
  float midMask = 1.0 - abs(l - 0.5) * 2.0;
  col += n * u_grain * 0.18 * mix(0.5, 1.0, midMask);

  // vignette
  float dist = length(v_uv - 0.5);
  float vig = smoothstep(0.85, 0.25, dist * 1.4);
  col *= mix(1.0, vig, u_vignette);

  col = clamp(col, 0.0, 1.0);

  // intensity: blend original <-> processed
  vec3 orig = texture2D(u_source, v_uv).rgb;
  gl_FragColor = vec4(mix(orig, col, u_intensity), 1.0);
}`
```

- [ ] **Step 2: Commit**

```bash
cd /d/carrete && git add src/gl/shaders.js && git commit -m "feat: add GLSL shaders for grade, halation, and composite passes"
```

---

## Task 7: WebGL utilities

**Files:**
- Create: `src/gl/glUtils.js`

Small helpers for compiling programs and creating textures/framebuffers. Verified when the renderer runs (Task 8).

- [ ] **Step 1: Create `src/gl/glUtils.js`**

```js
// src/gl/glUtils.js

export function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error('Program link failed: ' + info)
  }
  return program
}

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error('Shader compile failed: ' + info)
  }
  return shader
}

// Empty RGBA texture for use as a framebuffer color target.
export function createTargetTexture(gl, width, height) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// A framebuffer with a fresh color texture. Returns { fbo, tex, width, height }.
export function createFramebuffer(gl, width, height) {
  const tex = createTargetTexture(gl, width, height)
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fbo, tex, width, height }
}

// Upload an image source (ImageBitmap/Canvas/Image) into a texture, Y-flipped.
export function createImageTexture(gl, source) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// Full-screen quad: positions in clip space, matching texCoords. Returns a VBO setup fn.
export function createQuad(gl) {
  const buffer = gl.createBuffer()
  // x, y, u, v
  const data = new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
    -1,  1, 0, 1,
     1, -1, 1, 0,
     1,  1, 1, 1,
  ])
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return function bind(program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const pos = gl.getAttribLocation(program, 'a_position')
    const uv = gl.getAttribLocation(program, 'a_texCoord')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(uv)
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8)
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/carrete && git add src/gl/glUtils.js && git commit -m "feat: add WebGL program/texture/framebuffer/quad helpers"
```

---

## Task 8: Renderer pipeline

**Files:**
- Create: `src/gl/renderer.js`
- Modify: `src/main.js` (temporary smoke harness, removed in Task 11)

The renderer owns the GL context. `setImage(source, w, h)` uploads the full-res source, then sizes the canvas + FBOs to a small **preview** resolution for smooth sliders. `setParams(params)` stores uniforms. `render()` runs the 5 passes and draws to the canvas. `renderToBlob(...)` re-renders at the **full** source resolution for export, then restores the preview.

- [ ] **Step 1: Create `src/gl/renderer.js`**

```js
// src/gl/renderer.js
import { QUAD_VERT, GRADE_FRAG, BRIGHT_FRAG, BLUR_FRAG, COMPOSITE_FRAG } from './shaders.js'
import { createProgram, createImageTexture, createFramebuffer, createQuad } from './glUtils.js'
import { computeFitSize } from '../ui/load.js'

const PREVIEW_MAX_EDGE = 1440  // live preview stays small for smooth sliders on mobile

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
  if (!gl) throw new Error('WEBGL_UNSUPPORTED')

  const programs = {
    grade: createProgram(gl, QUAD_VERT, GRADE_FRAG),
    bright: createProgram(gl, QUAD_VERT, BRIGHT_FRAG),
    blur: createProgram(gl, QUAD_VERT, BLUR_FRAG),
    composite: createProgram(gl, QUAD_VERT, COMPOSITE_FRAG),
  }
  const bindQuad = createQuad(gl)

  let sourceTex = null
  let natural = { width: 0, height: 0 }   // full-res source size (for export)
  let preview = { width: 0, height: 0 }   // downscaled size (for live preview)
  let width = 0, height = 0               // current render size
  let fboA, fboB, fboC
  let params = {}
  let seed = 1.0

  function freeFbos() {
    for (const f of [fboA, fboB, fboC]) {
      if (!f) continue
      gl.deleteFramebuffer(f.fbo)
      gl.deleteTexture(f.tex)
    }
    fboA = fboB = fboC = null
  }

  // Resize the canvas + reallocate all FBOs to a new render size.
  function setRenderSize(w, h) {
    width = w
    height = h
    canvas.width = w
    canvas.height = h
    freeFbos()
    fboA = createFramebuffer(gl, w, h)
    fboB = createFramebuffer(gl, w, h)
    fboC = createFramebuffer(gl, w, h)
  }

  function setImage(source, w, h) {
    if (sourceTex) gl.deleteTexture(sourceTex)
    sourceTex = createImageTexture(gl, source)   // full-res source kept on the GPU
    natural = { width: w, height: h }
    preview = computeFitSize(w, h, PREVIEW_MAX_EDGE)
    setRenderSize(preview.width, preview.height) // render the live preview small
  }

  function setParams(p) { params = p }
  function setSeed(s) { seed = s }

  function drawTo(target, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null)
    gl.viewport(0, 0, w, h)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  function u(program, name) { return gl.getUniformLocation(program, name) }

  function render() {
    if (!sourceTex) return

    // --- Pass 1: grade (source -> fboA) ---
    let prog = programs.grade
    gl.useProgram(prog)
    bindQuad(prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sourceTex)
    gl.uniform1i(u(prog, 'u_image'), 0)
    gl.uniform1f(u(prog, 'u_warmth'), params.warmth)
    gl.uniform1f(u(prog, 'u_fade'), params.fade)
    gl.uniform1f(u(prog, 'u_contrast'), params.contrast)
    gl.uniform1f(u(prog, 'u_saturation'), params.saturation)
    gl.uniform3fv(u(prog, 'u_shadowTint'), params.shadowTint)
    gl.uniform3fv(u(prog, 'u_highlightTint'), params.highlightTint)
    gl.uniform1f(u(prog, 'u_rolloff'), params.rolloff)
    drawTo(fboA, width, height)

    // --- Pass 2a: bright pass (fboA -> fboB) ---
    prog = programs.bright
    gl.useProgram(prog)
    bindQuad(prog)
    gl.bindTexture(gl.TEXTURE_2D, fboA.tex)
    gl.uniform1i(u(prog, 'u_image'), 0)
    gl.uniform1f(u(prog, 'u_threshold'), 0.6)
    drawTo(fboB, width, height)

    // --- Pass 2b: blur H (fboB -> fboC) ---
    const spread = 2.0
    prog = programs.blur
    gl.useProgram(prog)
    bindQuad(prog)
    gl.bindTexture(gl.TEXTURE_2D, fboB.tex)
    gl.uniform1i(u(prog, 'u_image'), 0)
    gl.uniform2f(u(prog, 'u_dir'), spread / width, 0)
    drawTo(fboC, width, height)

    // --- Pass 2c: blur V (fboC -> fboB) ---
    gl.bindTexture(gl.TEXTURE_2D, fboC.tex)
    gl.uniform2f(u(prog, 'u_dir'), 0, spread / height)
    drawTo(fboB, width, height)
    // halation result is now in fboB

    // --- Pass 3: composite (fboA + fboB + source -> canvas) ---
    prog = programs.composite
    gl.useProgram(prog)
    bindQuad(prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, fboA.tex)
    gl.uniform1i(u(prog, 'u_graded'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, fboB.tex)
    gl.uniform1i(u(prog, 'u_halation'), 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, sourceTex)
    gl.uniform1i(u(prog, 'u_source'), 2)
    gl.uniform1f(u(prog, 'u_halationAmt'), params.halation)
    gl.uniform1f(u(prog, 'u_grain'), params.grain)
    gl.uniform1f(u(prog, 'u_vignette'), params.vignette)
    gl.uniform1f(u(prog, 'u_intensity'), params.intensity)
    gl.uniform2f(u(prog, 'u_resolution'), width, height)
    gl.uniform1f(u(prog, 'u_seed'), seed)
    drawTo(null, width, height)
    gl.activeTexture(gl.TEXTURE0)
  }

  // Render at FULL resolution and read back a JPG, then restore the preview size.
  async function renderToBlob(mime, quality) {
    setRenderSize(natural.width, natural.height)
    render()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
    setRenderSize(preview.width, preview.height)
    render() // restore the on-screen preview
    return blob
  }

  return { gl, canvas, setImage, setParams, setSeed, render, renderToBlob,
    get size() { return { width, height } } }
}
```

> The renderer keeps the **full-res source** on the GPU but renders the live preview at `PREVIEW_MAX_EDGE` (1440) for smooth sliders; `renderToBlob` temporarily switches to the natural size for export.

- [ ] **Step 2: Add a temporary smoke harness to `src/main.js`**

Replace the contents of `src/main.js` with:

```js
import { createRenderer } from './gl/renderer.js'
import { createState } from './state.js'

const canvas = document.getElementById('preview')
canvas.hidden = false
const renderer = createRenderer(canvas)
const state = createState()

// Temporary: load a hard test image from a file picker on click.
const file = document.getElementById('file')
document.getElementById('pick-start').onclick = () => file.click()
file.onchange = async () => {
  const bitmap = await createImageBitmap(file.files[0])
  renderer.setImage(bitmap, bitmap.width, bitmap.height)
  renderer.setParams(state.getRenderParams())
  renderer.render()
}
```

- [ ] **Step 3: Verify the pipeline renders (manual)**

Run: `cd /d/carrete && npm run dev`
Open the URL on the desktop browser. Click "Subir foto", choose one of the user's reference images (e.g. `image 4` beach chairs).
Expected: the photo appears in the canvas with the **Flash** look applied — visibly warmer, slightly faded, with grain and a soft vignette. The image is **right-side up** (not flipped). If it is upside down, confirm `UNPACK_FLIP_Y_WEBGL` is set in `createImageTexture`.

- [ ] **Step 4: Commit**

```bash
cd /d/carrete && git add src/gl/renderer.js src/main.js && git commit -m "feat: add WebGL multi-pass renderer and smoke harness"
```

---

## Task 9: Image loading

**Files:**
- Modify: `src/ui/load.js` (add `loadImageFile`)

`loadImageFile` decodes a `File`, fits it under a max edge (reusing `computeFitSize`), and returns a drawable source plus its dimensions. Capping here keeps the source texture within mobile `MAX_TEXTURE_SIZE`.

- [ ] **Step 1: Add `loadImageFile` to `src/ui/load.js`**

Append to `src/ui/load.js`:

```js
import { EXPORT_MAX_EDGE } from './export.js'

// Decode a File and downscale it (if needed) onto a canvas. Returns
// { source, width, height } where source is drawable into a WebGL texture.
export async function loadImageFile(file, maxEdge = EXPORT_MAX_EDGE) {
  const bitmap = await createImageBitmap(file)
  const fit = computeFitSize(bitmap.width, bitmap.height, maxEdge)
  if (fit.width === bitmap.width && fit.height === bitmap.height) {
    return { source: bitmap, width: bitmap.width, height: bitmap.height }
  }
  const canvas = document.createElement('canvas')
  canvas.width = fit.width
  canvas.height = fit.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, fit.width, fit.height)
  bitmap.close?.()
  return { source: canvas, width: fit.width, height: fit.height }
}
```

- [ ] **Step 2: Verify resize tests still pass**

Run: `cd /d/carrete && npx vitest run tests/resize.test.js`
Expected: PASS — adding `loadImageFile` did not break `computeFitSize`.

- [ ] **Step 3: Commit**

```bash
cd /d/carrete && git add src/ui/load.js && git commit -m "feat: add image file loader with fit-to-max-edge downscaling"
```

---

## Task 10: UI controls

**Files:**
- Create: `src/ui/controls.js`

Builds the preset chips and slider rows, and calls back when anything changes. Pure DOM wiring; verified in Task 11.

- [ ] **Step 1: Create `src/ui/controls.js`**

```js
// src/ui/controls.js
import { PRESETS } from '../presets.js'

const SLIDERS = [
  { key: 'intensity', label: 'Intensidad', min: 0, max: 1 },
  { key: 'grain', label: 'Grano', min: 0, max: 1 },
  { key: 'warmth', label: 'Calidez', min: -1, max: 1 },
  { key: 'fade', label: 'Desvanecido', min: 0, max: 1 },
  { key: 'vignette', label: 'Viñeta', min: 0, max: 1 },
  { key: 'halation', label: 'Halación', min: 0, max: 1 },
]

// onPreset(id): called when a chip is tapped.
// onSlider(key, value): called when a slider moves.
export function mountControls({ presetsEl, slidersEl, state, onPreset, onSlider }) {
  const chipEls = new Map()
  const inputEls = new Map()

  for (const preset of PRESETS) {
    const chip = document.createElement('button')
    chip.className = 'preset'
    chip.textContent = preset.name
    chip.onclick = () => onPreset(preset.id)
    presetsEl.appendChild(chip)
    chipEls.set(preset.id, chip)
  }

  for (const s of SLIDERS) {
    const row = document.createElement('div')
    row.className = 'slider-row'
    const label = document.createElement('label')
    label.textContent = s.label
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(s.min)
    input.max = String(s.max)
    input.step = '0.01'
    input.oninput = () => onSlider(s.key, parseFloat(input.value))
    row.append(label, input)
    slidersEl.appendChild(row)
    inputEls.set(s.key, input)
  }

  // Reflect current state into the UI (active chip + slider positions).
  function sync() {
    for (const [id, chip] of chipEls) chip.classList.toggle('active', id === state.presetId)
    for (const [key, input] of inputEls) input.value = String(state.sliders[key])
  }

  sync()
  return { sync }
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/carrete && git add src/ui/controls.js && git commit -m "feat: add preset chips and slider controls"
```

---

## Task 11: Wire the app together

**Files:**
- Modify: `src/main.js` (replace smoke harness with the real wiring)

- [ ] **Step 1: Replace `src/main.js` with the full bootstrap**

```js
// src/main.js
import { createState } from './state.js'
import { createRenderer } from './gl/renderer.js'
import { loadImageFile } from './ui/load.js'
import { mountControls } from './ui/controls.js'

const startEl = document.getElementById('start')
const editorEl = document.getElementById('editor')
const canvas = document.getElementById('preview')
const fileInput = document.getElementById('file')

const state = createState()
let renderer = null

function rerender() {
  renderer.setParams(state.getRenderParams())
  renderer.render()
}

const controls = mountControls({
  presetsEl: document.getElementById('presets'),
  slidersEl: document.getElementById('sliders'),
  state,
  onPreset(id) { state.applyPreset(id); controls.sync(); rerender() },
  onSlider(key, value) { state.setSlider(key, value); rerender() },
})

async function openFile(file) {
  if (!file) return
  const { source, width, height } = await loadImageFile(file)
  if (!renderer) renderer = createRenderer(canvas)
  renderer.setImage(source, width, height)
  canvas.hidden = false
  startEl.hidden = true
  editorEl.hidden = false
  rerender()
}

document.getElementById('pick-start').onclick = () => fileInput.click()
document.getElementById('pick').onclick = () => fileInput.click()
fileInput.onchange = () => openFile(fileInput.files[0])
```

- [ ] **Step 2: Verify the full editor flow (manual)**

Run: `cd /d/carrete && npm run dev`
- Click "Subir foto", pick a reference image → editor appears with the photo rendered.
- Tap each preset chip (**Flash, Noche teal, Verano Kodak, Cálido nostálgico**) → the look changes and the active chip highlights. "Noche teal" should show a clear green-teal cast with visible glow around bright spots.
- Open **Ajustes**, drag **Grano**, **Calidez**, **Halación**, **Viñeta** → the preview updates live and smoothly.
Expected: all interactions update the canvas without lag.

- [ ] **Step 3: Commit**

```bash
cd /d/carrete && git add src/main.js && git commit -m "feat: wire load, state, renderer, and controls into the app"
```

---

## Task 12: Export / download

**Files:**
- Modify: `src/ui/export.js` (add DOM export functions)
- Modify: `src/main.js` (wire the Download button)

`renderer.renderToBlob` (added in Task 8) renders the current params at **full resolution** and returns a JPG blob, then restores the small preview. This task adds the DOM glue to trigger a download.

- [ ] **Step 1: Add DOM export helpers to `src/ui/export.js`**

Append to `src/ui/export.js`:

```js
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportPhoto(renderer) {
  const blob = await renderer.renderToBlob(EXPORT_MIME, EXPORT_QUALITY)
  if (!blob) throw new Error('EXPORT_FAILED')
  downloadBlob(blob, exportFileName())
}
```

- [ ] **Step 2: Wire the Download button in `src/main.js`**

Add the import at the top of `src/main.js`:

```js
import { exportPhoto } from './ui/export.js'
```

Add at the bottom of `src/main.js`:

```js
document.getElementById('download').onclick = async () => {
  if (!renderer) return
  await exportPhoto(renderer)
}
```

- [ ] **Step 3: Verify export tests still pass**

Run: `cd /d/carrete && npx vitest run tests/export.test.js`
Expected: PASS — pure helpers unchanged.

- [ ] **Step 4: Verify download works (manual)**

Run: `cd /d/carrete && npm run dev`
Load an image, pick a look, tap **Descargar**.
Expected: a `carrete-YYYYMMDD-HHmmss.jpg` file downloads, and opening it shows the same look as the preview at full (capped) resolution.

- [ ] **Step 5: Commit**

```bash
cd /d/carrete && git add src/ui/export.js src/main.js && git commit -m "feat: add full-resolution JPG export and download"
```

---

## Task 13: Error handling & compare-to-original

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Handle no-WebGL and invalid files; add press-and-hold compare**

In `src/main.js`, replace the body of `openFile` with the guarded version and add the compare handlers. Replace the existing `openFile` function with:

```js
async function openFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Elegí un archivo de imagen.')
    return
  }
  let loaded
  try {
    loaded = await loadImageFile(file)
  } catch {
    alert('No pude abrir esa imagen. Probá con otra.')
    return
  }
  if (!renderer) {
    try {
      renderer = createRenderer(canvas)
    } catch {
      alert('Tu navegador no soporta WebGL, necesario para los filtros.')
      return
    }
  }
  renderer.setImage(loaded.source, loaded.width, loaded.height)
  canvas.hidden = false
  startEl.hidden = true
  editorEl.hidden = false
  rerender()
}
```

Add the compare-to-original handlers at the bottom of `src/main.js`:

```js
// Press-and-hold the photo to peek at the original.
function showOriginal(on) {
  if (!renderer) return
  const saved = state.sliders.intensity
  renderer.setParams({ ...state.getRenderParams(), intensity: on ? 0 : saved })
  renderer.render()
}
canvas.addEventListener('pointerdown', () => showOriginal(true))
canvas.addEventListener('pointerup', () => showOriginal(false))
canvas.addEventListener('pointercancel', () => showOriginal(false))
canvas.addEventListener('pointerleave', () => showOriginal(false))
```

- [ ] **Step 2: Verify error paths and compare (manual)**

Run: `cd /d/carrete && npm run dev`
- Press and hold on the photo → it shows the **original**; release → the look returns.
- (Optional) Temporarily rename `getContext('webgl', …)` to `getContext('webgl2-broken')` to confirm the WebGL alert fires, then revert.
Expected: graceful alerts, no crashes; compare works.

- [ ] **Step 3: Commit**

```bash
cd /d/carrete && git add src/main.js && git commit -m "feat: guard WebGL/file errors and add press-to-compare"
```

---

## Task 14: Visual QA & preset tuning

**Files:**
- Modify: `src/presets.js` (tune numbers only, if needed)

- [ ] **Step 1: Compare each preset against the matching reference**

Run: `cd /d/carrete && npm run dev`. For each reference image, load it and pick the matching preset:
- Beach chairs / Fuji → **Verano Kodak** / **Cálido nostálgico**: warm, soft, faded — not oversaturated.
- Tunnel / subway → **Noche teal**: green-teal cast, visible halation glow on lights.
- Fridge/ramen → **Flash**: warm with slightly blown highlights and grain.

- [ ] **Step 2: Tune preset numbers if a look is off**

Adjust only the `defaults`/`character` values in `src/presets.js` (e.g. raise `teal` `halation`, soften `flash` `contrast`). Re-check in the browser. Keep all slider defaults within their ranges (warmth -1..1, others 0..1).

- [ ] **Step 3: Run the full test suite**

Run: `cd /d/carrete && npm test`
Expected: PASS — all 4 test files green (presets, state, resize, export).

- [ ] **Step 4: Commit**

```bash
cd /d/carrete && git add src/presets.js && git commit -m "chore: tune preset looks against reference images"
```

---

## Definition of Done

- `npm test` passes (presets, state, resize, export).
- On a phone-sized browser: upload a photo, switch between the 4 presets, adjust all 6 sliders live, press-and-hold to compare, and download a full-resolution JPG.
- The 4 looks visibly match the spirit of the reference images.
- No backend; the photo never leaves the browser.
