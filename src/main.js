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

document.getElementById('download').onclick = async () => {
  if (!renderer) return
  await exportPhoto(renderer)
}
