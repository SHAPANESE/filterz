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
