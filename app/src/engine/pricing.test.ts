import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, PRESET_HARDWARE, PRESET_MATERIALS, newParametricUnit } from '../model/presets'
import { computeImpact } from './impact'
import { deriveParts, hingesPerDoor } from './parametric'
import { byId, priceJob, sheetsFor } from './pricing'
import type { AreaUnit, FreeformUnit, JobExtras, ParametricUnit } from '../model/types'

const materials = byId(PRESET_MATERIALS)
const hardware = byId(PRESET_HARDWARE)
const settings = { ...DEFAULT_SETTINGS, overheadPerMonth: 8000, hoursPerMonth: 160 }
const extras: JobExtras = { installationHours: 4, installationFlat: 0, transport: 300, subcontractors: [], risk: null }

function wardrobe(w = 2400): ParametricUnit {
  const u = newParametricUnit(settings, 'wardrobe')
  u.width.value = w
  return u
}

describe('sheetsFor', () => {
  it('rounds up with waste', () => {
    const m = materials['m-egger-w1000'] // 2800×2070 = 5.796 m², waste 12%
    expect(sheetsFor(5.0, m)).toBe(1) // 5.6 < 5.796
    expect(sheetsFor(5.3, m)).toBe(2) // 5.936 > 5.796
    expect(sheetsFor(0, m)).toBe(0)
  })
})

describe('hingesPerDoor', () => {
  it('scales with height, never below base', () => {
    expect(hingesPerDoor(700, 2)).toBe(2)
    expect(hingesPerDoor(1200, 2)).toBe(3)
    expect(hingesPerDoor(1800, 2)).toBe(4)
    expect(hingesPerDoor(2597, 2)).toBe(5)
    expect(hingesPerDoor(700, 3)).toBe(3)
  })
})

describe('deriveParts', () => {
  it('returns null when a dimension is missing', () => {
    const u = wardrobe(); u.depth.value = null
    expect(deriveParts(u, materials, settings)).toBeNull()
  })
  it('derives carcass, dividers, shelves, drawers and doors', () => {
    const d = deriveParts(wardrobe(), materials, settings)!
    const roles = Object.fromEntries(d.parts.map((p) => [p.role, p]))
    expect(roles.side.qty).toBe(2)
    expect(roles.divider.qty).toBe(3)
    expect(d.shelves).toBe(5)
    expect(d.drawers).toBe(3)
    expect(d.hangingBays).toBe(2)
    expect(roles.door.qty).toBe(4)
    // inner width = 2400 - 2*18 - 3*18 = 2310 → bay 577.5
    expect(d.bayWidth).toBeCloseTo(577.5)
  })
  it('warns when a door is wider than 600', () => {
    const u = wardrobe(2700)
    const d = deriveParts(u, materials, settings)!
    expect(d.doorWidth).toBeGreaterThan(600)
    expect(d.warnings.some((w) => w.includes('600'))).toBe(true)
  })
  it('warns when a part exceeds the sheet', () => {
    const u = wardrobe(); u.height.value = 3000
    const d = deriveParts(u, materials, settings)!
    expect(d.warnings.some((w) => w.includes('חורג'))).toBe(true)
  })
})

describe('priceJob', () => {
  it('builds a breakdown with overhead, risk and recommended price', () => {
    const b = priceJob({ units: [wardrobe()], extras, quotedPrice: null, materials, hardware, settings })
    expect(b.units[0].incomplete).toBe(false)
    expect(b.materials).toBeGreaterThan(0)
    expect(b.hardware).toBeGreaterThan(0)
    expect(b.labor).toBeGreaterThan(0)
    expect(b.installation).toBe(4 * settings.installRate)
    expect(b.directCost).toBeCloseTo(b.materials + b.hardware + b.labor + b.installation + b.transport + b.subcontractors, 1)
    expect(b.overhead).toBeCloseTo((b.laborHours + 4) * 50, 1)
    expect(b.risk).toBeCloseTo(b.directCost * 0.05, 1)
    expect(b.recommended).toBe(Math.round(b.totalCost / 0.7))
    expect(b.margin).toBeNull()
  })
  it('computes margin from quoted price and warns below target', () => {
    const b = priceJob({ units: [wardrobe()], extras, quotedPrice: 10000, materials, hardware, settings })
    expect(b.profit).toBeCloseTo(10000 - b.totalCost, 1)
    expect(b.margin).toBeCloseTo((10000 - b.totalCost) / 10000, 4)
    if (b.margin! < 0.3) expect(b.warnings.some((w) => w.startsWith('Margin'))).toBe(true)
  })
  it('hinges: 4 doors × 5 hinges (2597mm tall doors)', () => {
    const b = priceJob({ units: [wardrobe()], extras, quotedPrice: null, materials, hardware, settings })
    expect(b.hardwareByItem['h-blum-cliptop']).toBe(20)
    expect(b.hardwareByItem['h-blum-tandembox']).toBe(3)
    expect(b.hardwareByItem['h-handle-basic']).toBe(7)
    expect(b.hardwareByItem['h-shelf-pin']).toBe(20)
    expect(b.hardwareByItem['h-rod']).toBe(2)
  })
  it('multiplies by unit qty', () => {
    const u = wardrobe(); u.qty = 2
    const one = priceJob({ units: [wardrobe()], extras, quotedPrice: null, materials, hardware, settings })
    const two = priceJob({ units: [u], extras, quotedPrice: null, materials, hardware, settings })
    expect(two.materials).toBeCloseTo(one.materials * 2, 1)
    expect(two.hardwareByItem['h-blum-cliptop']).toBe(40)
  })
  it('prices area and freeform units', () => {
    const area: AreaUnit = { id: 'a', kind: 'area', name: 'חיפוי', qty: 1, width: { value: 3000, source: 'site' }, height: { value: 2500, source: 'site' }, materialId: 'm-cladding-oak', laborMinutesPerM2: null, extrasCost: 200 }
    const ff: FreeformUnit = { id: 'f', kind: 'freeform', name: 'שיקום שידה', qty: 1, description: '', materialLines: [{ id: '1', label: 'לכה', cost: 180 }], laborLines: [{ id: '2', label: 'ליטוש', hours: 6 }], subcontractorLines: [{ id: '3', label: 'ריפוד', cost: 400 }] }
    const b = priceJob({ units: [area, ff], extras: { ...extras, installationHours: 0, transport: 0 }, quotedPrice: null, materials, hardware, settings })
    // area 7.5 m² × 1.1 waste = 8.25 / (2.4×1.2=2.88) → 3 sheets × 520 + 200
    expect(b.units[0].materials).toBe(3 * 520 + 200)
    expect(b.units[0].laborHours).toBeCloseTo((7.5 * 45) / 60, 2)
    expect(b.units[1].materials).toBe(180)
    expect(b.units[1].labor).toBe(6 * settings.laborRate)
    expect(b.subcontractors).toBe(400)
  })
  it('marks a unit incomplete instead of guessing a missing dimension', () => {
    const u = wardrobe(); u.width.value = null
    const b = priceJob({ units: [u], extras, quotedPrice: null, materials, hardware, settings })
    expect(b.units[0].incomplete).toBe(true)
    expect(b.materials).toBe(0)
  })
})

describe('killer moment: 2400 → 2700', () => {
  it('reports price, sheets, hardware, labor and margin deltas', () => {
    const a = { units: [wardrobe(2400)], extras, quotedPrice: 20000, materials, hardware, settings }
    const b = { ...a, units: [{ ...a.units[0], width: { value: 2700, source: 'customer' as const } }] }
    const imp = computeImpact(a, b)
    expect(imp.cost).toBeGreaterThan(0)
    expect(imp.laborHours).toBeGreaterThanOrEqual(0)
    expect(imp.dimensions.some((d) => d.label.endsWith('W') && d.before === '2400' && d.after === '2700')).toBe(true)
    expect(imp.marginAfter!).toBeLessThan(imp.marginBefore!)
    expect(imp.after.warnings.some((w) => w.includes('600'))).toBe(true)
  })
  it('material swap shows in dimensions/text deltas and in cost', () => {
    const a = { units: [wardrobe()], extras, quotedPrice: null, materials, hardware, settings }
    const b = { ...a, units: [{ ...a.units[0], doorMaterialId: 'm-mdf-painted' }] }
    const imp = computeImpact(a, b)
    expect(imp.cost).toBeGreaterThan(0)
    expect(imp.dimensions.some((d) => d.kind === 'text')).toBe(true)
    expect(imp.sheets.length).toBeGreaterThan(0)
  })
})

describe('back panel', () => {
  it('splits per bay when the whole back exceeds the sheet', () => {
    const d = deriveParts(wardrobe(), materials, settings)!
    const back = d.parts.find((p) => p.role === 'back')!
    expect(back.qty).toBe(4)
    expect(d.warnings.some((w) => w.includes('גב'))).toBe(false)
  })
  it('keeps one piece when it fits', () => {
    const u = newParametricUnit(settings, 'base_cabinet')
    const d = deriveParts(u, materials, settings)!
    expect(d.parts.find((p) => p.role === 'back')!.qty).toBe(1)
  })
})
