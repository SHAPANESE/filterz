# Carrete — Editor de fotos estilo analógico (35mm)

**Fecha:** 2026-06-14
**Estado:** Diseño aprobado — listo para plan de implementación
**Nombre provisional:** Carrete

---

## 1. Resumen

App web **mobile-first** que aplica a las fotos un look de **película analógica de 35mm**.
Ofrece **4 filtros (presets)** como punto de partida y **6 sliders** para ajuste fino.
Corre **100% en el navegador** usando **WebGL** (GPU). Las fotos **no salen del dispositivo**:
no hay backend ni subida a servidores.

Inspiración (referencias del usuario): foto con flash + heladera, túnel nocturno teal,
metro con halación, sillas frente al mar (verano Kodak), Monte Fuji desde el tren.

### Objetivo de éxito (v1)
- El usuario abre una foto desde galería o cámara del celular.
- Toca un preset y ve el look aplicado en vivo.
- Ajusta con sliders y descarga el resultado en alta resolución como JPG.
- Se siente fluido en un teléfono (sliders en tiempo real, sin trabarse).

---

## 2. Los 4 filtros (presets)

Cada preset define: (a) valores por defecto de los **sliders** y (b) constantes de
**"carácter"** del color que no se exponen como slider pero le dan identidad al look.

| Preset | Carácter de color | Grano | Halación | Viñeta |
|--------|-------------------|-------|----------|--------|
| **Flash** | Ámbar cálido, sombras verdosas, highlights quemados (roll-off suave) | Alto | Baja | Leve |
| **Noche teal** | Verde-azulado, contraste medio, sombras frías | Medio | **Fuerte** | Media |
| **Verano Kodak** | Cálido suave, pasteles, negros levantados (fade) | Bajo | Baja | Muy leve |
| **Cálido nostálgico** | Sombras cálidas, fade, saturación moderada | Medio | Media | Media |

### Modelo de datos de un preset
```
Preset = {
  id, nombre,
  // valores por defecto de los sliders (0..1, salvo warmth: -1..1)
  defaults: { intensity, grain, warmth, fade, vignette, halation },
  // constantes de carácter (no editables por slider en v1)
  character: {
    shadowTint:    [r,g,b],   // viraje de sombras
    highlightTint: [r,g,b],   // viraje de luces
    contrast,                  // 0..2 (1 = neutro)
    saturation,                // 0..2 (1 = neutro)
    highlightRolloff           // compresión de luces (look "quemado")
  }
}
```

---

## 3. Sliders (ajuste fino)

Al tocar un preset, los sliders se posicionan en `preset.defaults`; el usuario ajusta desde ahí.

| Slider | Rango | Efecto |
|--------|-------|--------|
| **Intensidad** | 0–100% | Mezcla entre la foto original y el look completo |
| **Grano** | 0–100% | Cantidad de grano de película |
| **Calidez** | frío ↔ cálido | Desplazamiento de temperatura de color |
| **Desvanecido** | 0–100% | Negros levantados (fade analógico) |
| **Viñeta** | 0–100% | Oscurecimiento de las esquinas |
| **Halación** | 0–100% | Brillo/glow alrededor de las luces |

---

## 4. UI (mobile-first)

```
┌─────────────────────┐
│                     │
│     FOTO (preview)  │  ← canvas WebGL, se actualiza en vivo
│                     │
├─────────────────────┤
│ [Flash][Teal][Kodak]│  ← presets, scroll horizontal
├─────────────────────┤
│ Ajustes  ▸          │  ← despliega los sliders
│  Grano    ▭▭▭▭○▭     │
│  Calidez  ▭▭○▭▭▭     │
├─────────────────────┤
│ [ Subir ]  [Descargar]│
└─────────────────────┘
```

- **Estado inicial:** botón grande "Subir foto" (abre galería o cámara — `<input capture>`).
- **Comparar:** mantener presionada la foto muestra el **original** (antes/después).
- **Ajustes:** panel de sliders colapsable para no saturar la pantalla.
- Botones grandes, pensados para el pulgar.

---

## 5. Arquitectura técnica

Módulos chicos, una responsabilidad cada uno, comunicados por interfaces claras.

```
D:\carrete\
  index.html
  styles.css
  vite.config.js
  package.json
  src/
    main.js              # bootstrap: conecta UI ↔ estado ↔ renderer
    state.js             # imagen actual + parámetros actuales (fuente de verdad)
    presets.js           # los 4 presets (datos puros)
    gl/
      renderer.js        # orquesta el pipeline WebGL (FBOs, pasadas)
      glUtils.js         # compilar/linkear shaders, crear FBOs y texturas
      shaders/
        quad.vert
        grade.frag       # color grade: warmth, contraste, saturación, tints, fade, curva
        brightpass.frag  # extrae luces (pesadas hacia rojo/naranja)
        blur.frag        # gaussian separable (H y V) para la halación
        composite.frag   # base + halación (screen) + grano + viñeta
    ui/
      controls.js        # tira de presets + panel de sliders
      load.js            # input de archivo, decodificar, reducir a tamaño de preview
      export.js          # render full-res + descarga JPG
  tests/
    presets.test.js
    resize.test.js
    export.test.js
```

### Pipeline WebGL (multi-pasada)
1. **Grade** — textura de entrada → balance/calidez, contraste, saturación, tint de
   sombras/luces, fade (levantar negros), roll-off de luces → **FBO-A**.
2. **Halación** — desde FBO-A: bright-pass (umbral, peso hacia rojo/naranja) →
   blur gaussiano separable (horizontal → FBO-B, vertical → **FBO-C**).
3. **Composición** — FBO-A + halación (FBO-C, modo *screen*) + grano (ruido procedural
   modulado por luminancia) + viñeta → **pantalla** (o FBO de exportación).

### Flujo de datos
1. Cargar foto → decodificar → **reducir** a tamaño de preview (lado largo ~1280px) → textura.
2. Tocar preset → setear sliders a `preset.defaults` → re-render del preview.
3. Mover slider → actualizar *uniform* → re-render (rápido, GPU).
4. Descargar → re-correr el pipeline a **resolución completa** en FBO offscreen →
   `canvas.toBlob('image/jpeg')` → descarga.

### Rendimiento
- **Preview:** textura reducida (lado largo ~1280px) para sliders fluidos.
- **Exportación:** resolución original, con **tope** (lado largo ~4096px) para no agotar
  la memoria del celular.

---

## 6. Manejo de errores

- **Sin WebGL** → mensaje claro ("Tu navegador no soporta WebGL").
- **Archivo no válido / no es imagen** → aviso, no romper.
- **Imagen enorme** → reducir según el tope de exportación; si falla la lectura de píxeles,
  avisar en vez de crashear.
- **Fallo de compilación de shader** → log claro en consola (modo dev).

---

## 7. Testing

- **Shaders / look:** validación visual con las imágenes de referencia del usuario.
- **Automático (Vitest):**
  - `presets.test.js` — forma y rangos válidos de los 4 presets.
  - `resize.test.js` — cálculo de redimensionado (mantener proporción, respetar topes).
  - `export.test.js` — nombre de archivo, tipo MIME, lógica de tope de resolución.
  - Mapeo slider → parámetro (rangos y clamping).
- (Opcional, futuro) Test de regresión de pixeles con una imagen 4×4 conocida vía
  WebGL headless.

---

## 8. Stack

- **Vite** (dev server + build)
- **JavaScript** (sin framework pesado)
- **WebGL** con shaders propios
- **Vitest** para tests
- Hosting estático (Netlify / Vercel / GitHub Pages) — sin backend.

---

## 9. Fuera de alcance (YAGNI para v1)

- Procesamiento por lotes (varias fotos a la vez).
- Overlays extra: borde de película, light leak, date stamp, polvo/rayas.
- LUTs de película (color procedural alcanza para v1).
- Recortar / rotar / enderezar.
- Historial / deshacer-rehacer.
- Cuentas de usuario, nube, compartir en redes.
- Layout optimizado para escritorio (responsive básico, pero foco en celular).

---

## 10. Decisiones tomadas (resumen)

| Tema | Decisión |
|------|----------|
| Filtros v1 | 4: Flash, Noche teal, Verano Kodak, Cálido nostálgico |
| Modo de filtros | Presets + sliders (opción B) |
| Overlays extra | Ninguno; halación y viñeta integradas en los presets |
| Plataforma | Mobile-first |
| Motor de render | WebGL (shaders) |
| Backend | Ninguno (todo en el navegador) |
| Ubicación | `D:\carrete\` |
