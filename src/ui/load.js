// src/ui/load.js
export function computeFitSize(srcW, srcH, maxEdge) {
  const longEdge = Math.max(srcW, srcH)
  if (longEdge <= maxEdge) return { width: srcW, height: srcH }
  const scale = maxEdge / longEdge
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) }
}
