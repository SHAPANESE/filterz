// tests/export.test.js
import { describe, it, expect } from 'vitest'
import { exportFileName, EXPORT_MIME, EXPORT_QUALITY, EXPORT_MAX_EDGE } from '../src/ui/export.js'

describe('export helpers', () => {
  it('builds a timestamped jpg filename from a given date', () => {
    const d = new Date(Date.UTC(1998, 4, 24, 9, 8, 7)) // 1998-05-24 09:08:07
    // uses local time parts; assert the shape, not the timezone
    expect(exportFileName(d)).toMatch(/^carrete-\d{8}-\d{6}\.jpg$/)
  })

  it('exports jpeg at high quality', () => {
    expect(EXPORT_MIME).toBe('image/jpeg')
    expect(EXPORT_QUALITY).toBeGreaterThan(0.8)
    expect(EXPORT_QUALITY).toBeLessThanOrEqual(1)
  })

  it('caps export resolution to protect mobile memory', () => {
    expect(EXPORT_MAX_EDGE).toBeGreaterThanOrEqual(2048)
    expect(EXPORT_MAX_EDGE).toBeLessThanOrEqual(4096)
  })
})
