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
