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
