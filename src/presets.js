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
