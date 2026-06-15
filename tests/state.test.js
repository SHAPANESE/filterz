// tests/state.test.js
import { describe, it, expect } from 'vitest'
import { createState } from '../src/state.js'

describe('state', () => {
  it('starts on the first preset with its defaults applied', () => {
    const s = createState()
    expect(s.presetId).toBe('flash')
    expect(s.sliders.grain).toBeCloseTo(0.70)
  })

  it('applyPreset replaces slider values with that preset defaults', () => {
    const s = createState()
    s.applyPreset('teal')
    expect(s.presetId).toBe('teal')
    expect(s.sliders.halation).toBeCloseTo(0.80)
  })

  it('setSlider clamps 0..1 sliders', () => {
    const s = createState()
    s.setSlider('grain', 5)
    expect(s.sliders.grain).toBe(1)
    s.setSlider('grain', -2)
    expect(s.sliders.grain).toBe(0)
  })

  it('setSlider clamps warmth to -1..1', () => {
    const s = createState()
    s.setSlider('warmth', 9)
    expect(s.sliders.warmth).toBe(1)
    s.setSlider('warmth', -9)
    expect(s.sliders.warmth).toBe(-1)
  })

  it('getRenderParams merges sliders and active character constants', () => {
    const s = createState()
    s.applyPreset('teal')
    const p = s.getRenderParams()
    expect(p.halation).toBeCloseTo(0.80)
    expect(p.contrast).toBeCloseTo(1.05)
    expect(p.shadowTint).toEqual([-0.04, 0.03, 0.05])
  })
})
