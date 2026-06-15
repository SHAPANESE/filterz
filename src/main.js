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
