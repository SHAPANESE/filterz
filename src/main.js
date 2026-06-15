// src/main.js
import { createState } from './state.js'
import { createRenderer } from './gl/renderer.js'
import { loadImageFile } from './ui/load.js'
import { mountControls } from './ui/controls.js'
import { exportPhoto } from './ui/export.js'

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

document.getElementById('pick-start').onclick = () => fileInput.click()
document.getElementById('pick').onclick = () => fileInput.click()
fileInput.onchange = () => openFile(fileInput.files[0])

document.getElementById('download').onclick = async () => {
  if (!renderer) return
  await exportPhoto(renderer)
}

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
