// src/ui/load.js
export function computeFitSize(srcW, srcH, maxEdge) {
  const longEdge = Math.max(srcW, srcH)
  if (longEdge <= maxEdge) return { width: srcW, height: srcH }
  const scale = maxEdge / longEdge
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) }
}

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
