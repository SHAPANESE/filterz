// tests/presets.test.js
import { describe, it, expect } from 'vitest'
import { PRESETS, getPreset } from '../src/presets.js'

const SLIDER_KEYS = ['intensity', 'grain', 'warmth', 'fade', 'vignette', 'halation']

describe('presets', () => {
  it('exposes exactly the 4 designed presets in order', () => {
    expect(PRESETS.map(p => p.id)).toEqual(['flash', 'teal', 'kodak', 'nostalgico'])
  })

  it('each preset has a human name and all 6 slider defaults in range', () => {
    for (const p of PRESETS) {
      expect(typeof p.name).toBe('string')
      for (const k of SLIDER_KEYS) {
        expect(typeof p.defaults[k]).toBe('number')
      }
      // warmth is -1..1, the rest 0..1
      expect(p.defaults.warmth).toBeGreaterThanOrEqual(-1)
      expect(p.defaults.warmth).toBeLessThanOrEqual(1)
      for (const k of SLIDER_KEYS.filter(k => k !== 'warmth')) {
        expect(p.defaults[k]).toBeGreaterThanOrEqual(0)
        expect(p.defaults[k]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('each preset has character constants for grading', () => {
    for (const p of PRESETS) {
      expect(p.character.shadowTint).toHaveLength(3)
      expect(p.character.highlightTint).toHaveLength(3)
      expect(typeof p.character.contrast).toBe('number')
      expect(typeof p.character.saturation).toBe('number')
      expect(typeof p.character.rolloff).toBe('number')
    }
  })

  it('getPreset returns by id and falls back to the first preset', () => {
    expect(getPreset('teal').id).toBe('teal')
    expect(getPreset('nope').id).toBe('flash')
  })
})
