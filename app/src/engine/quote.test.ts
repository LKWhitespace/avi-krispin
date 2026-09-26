import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, PRESET_HARDWARE, PRESET_MATERIALS, defaultQuote, newParametricUnit } from '../model/presets'
import { priceQuote, quoteExpired } from './quote'

const state = { materials: PRESET_MATERIALS, hardware: PRESET_HARDWARE, settings: DEFAULT_SETTINGS }
const extras = { installationHours: 0, installationFlat: 0, transport: 0, subcontractors: [], risk: null }

describe('priceQuote', () => {
  it('prices options at the same margin as the base quote', () => {
    const u = newParametricUnit(DEFAULT_SETTINGS, 'wardrobe')
    const quote = { ...defaultQuote(DEFAULT_SETTINGS, [u.id]), options: [{ id: 'o1', name: 'MDF צבוע', doorMaterialId: 'm-mdf-painted' }] }
    const r = priceQuote({ units: [u], extras, quotedPrice: 10000, quote }, state)
    expect(r.base.price).toBe(10000)
    expect(r.margin).toBeCloseTo((10000 - r.base.breakdown.totalCost) / 10000, 6)
    const o = r.options[0]
    expect(o.breakdown.totalCost).toBeGreaterThan(r.base.breakdown.totalCost)
    expect(o.price).toBe(Math.round(o.breakdown.totalCost / (1 - r.margin)))
  })
  it('falls back to target margin when no quoted price', () => {
    const u = newParametricUnit(DEFAULT_SETTINGS, 'wardrobe')
    const r = priceQuote({ units: [u], extras, quotedPrice: null, quote: defaultQuote(DEFAULT_SETTINGS, [u.id]) }, state)
    expect(r.margin).toBe(DEFAULT_SETTINGS.targetMargin)
    expect(r.base.price).toBe(r.base.breakdown.recommended)
  })
  it('excludes units not in includedUnitIds', () => {
    const a = newParametricUnit(DEFAULT_SETTINGS, 'wardrobe'), b = newParametricUnit(DEFAULT_SETTINGS, 'bookcase')
    const both = priceQuote({ units: [a, b], extras, quotedPrice: null, quote: defaultQuote(DEFAULT_SETTINGS, [a.id, b.id]) }, state)
    const one = priceQuote({ units: [a, b], extras, quotedPrice: null, quote: defaultQuote(DEFAULT_SETTINGS, [a.id]) }, state)
    expect(one.base.breakdown.totalCost).toBeLessThan(both.base.breakdown.totalCost)
  })
})

describe('quoteExpired', () => {
  it('respects validity days', () => {
    const q = defaultQuote(DEFAULT_SETTINGS)
    expect(quoteExpired(q)).toBe(false)
    expect(quoteExpired({ ...q, sentAt: new Date(Date.now() - 20 * 86400000).toISOString(), validityDays: 14 })).toBe(true)
    expect(quoteExpired({ ...q, sentAt: new Date().toISOString(), validityDays: 14 })).toBe(false)
  })
})
