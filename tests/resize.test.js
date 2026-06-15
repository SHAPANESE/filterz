// tests/resize.test.js
import { describe, it, expect } from 'vitest'
import { computeFitSize } from '../src/ui/load.js'

describe('computeFitSize', () => {
  it('downscales a landscape image to the max long edge, keeping aspect', () => {
    expect(computeFitSize(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
  })

  it('downscales a portrait image by its long (height) edge', () => {
    expect(computeFitSize(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 })
  })

  it('leaves images smaller than the max edge untouched', () => {
    expect(computeFitSize(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })

  it('returns integer dimensions', () => {
    const r = computeFitSize(1999, 1001, 1280)
    expect(Number.isInteger(r.width)).toBe(true)
    expect(Number.isInteger(r.height)).toBe(true)
  })
})
