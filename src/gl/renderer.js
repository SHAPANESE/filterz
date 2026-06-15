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
