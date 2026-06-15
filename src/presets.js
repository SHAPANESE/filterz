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
    // Aged/faded look: muted color + strong amber-sepia, distinct from the
    // bright, saturated "Verano Kodak".
    defaults: { intensity: 0.95, grain: 0.55, warmth: 0.58, fade: 0.55, vignette: 0.48, halation: 0.35 },
    character: { shadowTint: [0.08, 0.03, -0.06], highlightTint: [0.07, 0.04, -0.07], contrast: 1.06, saturation: 0.78, rolloff: 0.42 },
  },
]

export function getPreset(id) {
  return PRESETS.find(p => p.id === id) || PRESETS[0]
}
