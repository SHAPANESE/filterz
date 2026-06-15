// src/ui/export.js
export const EXPORT_MIME = 'image/jpeg'
export const EXPORT_QUALITY = 0.92
export const EXPORT_MAX_EDGE = 4096

function pad(n, len = 2) { return String(n).padStart(len, '0') }

export function exportFileName(date = new Date()) {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `carrete-${stamp}.jpg`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportPhoto(renderer) {
  const blob = await renderer.renderToBlob(EXPORT_MIME, EXPORT_QUALITY)
  if (!blob) throw new Error('EXPORT_FAILED')
  downloadBlob(blob, exportFileName())
}
