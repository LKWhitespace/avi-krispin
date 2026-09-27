import type { AreaUnit, FreeformUnit, Hardware, Job, JobExtras, Material, ParametricUnit, Unit, WorkshopSettings } from '../model/types'
import { deriveHardware, deriveParts, type Derived, type HardwareNeed } from './parametric'

export interface SheetNeed {
  materialId: string
  /** m² of parts before waste */
  areaM2: number
  sheets: number
}

export interface UnitCost {
  unitId: string
  name: string
  kind: Unit['kind']
  qty: number
  /** all figures are for ONE unit; multiply by qty for job totals */
  materials: number
  hardware: number
  laborHours: number
  labor: number
  subcontractors: number
  sheets: SheetNeed[]
  hardwareNeeds: HardwareNeed[]
  edgeMeters: number
  derived: Derived | null
  warnings: string[]
  /** unit cannot be priced (missing dimension) */
  incomplete: boolean
}

export interface Breakdown {
  units: UnitCost[]
  materials: number
  hardware: number
  labor: number
  laborHours: number
  installation: number
  installationHours: number
  transport: number
  subcontractors: number
  directCost: number
  overhead: number
  risk: number
  totalCost: number
  recommended: number
  quoted: number | null
  profit: number | null
  margin: number | null
  /** aggregated across units × qty */
  sheetsByMaterial: Record<string, number>
  hardwareByItem: Record<string, number>
  warnings: string[]
}

export const byId = <T extends { id: string }>(xs: T[]): Record<string, T> =>
  Object.fromEntries(xs.map((x) => [x.id, x]))

const round2 = (n: number) => Math.round(n * 100) / 100

export function sheetsFor(areaM2: number, m: Material): number {
  const sheetArea = (m.sheetW / 1000) * (m.sheetH / 1000)
  if (sheetArea <= 0 || areaM2 <= 0) return 0
  return Math.ceil((areaM2 * (1 + m.waste)) / sheetArea - 1e-9)
}

function priceParametric(u: ParametricUnit, materials: Record<string, Material>, hardware: Record<string, Hardware>, s: WorkshopSettings): UnitCost {
  const base: UnitCost = {
    unitId: u.id, name: u.name, kind: 'parametric', qty: u.qty,
    materials: 0, hardware: 0, laborHours: 0, labor: 0, subcontractors: 0,
    sheets: [], hardwareNeeds: [], edgeMeters: 0, derived: null, warnings: [], incomplete: false,
  }
  const d = deriveParts(u, materials, s)
  if (!d) {
    base.incomplete = true
    base.warnings.push('חסרה מידה, היחידה לא מתומחרת')
    return base
  }
  base.derived = d
  base.warnings.push(...d.warnings)

  // materials
  const areaByMat: Record<string, number> = {}
  let partCount = 0
  let edgeM = 0
  for (const p of d.parts) {
    areaByMat[p.materialId] = (areaByMat[p.materialId] ?? 0) + (p.w / 1000) * (p.h / 1000) * p.qty
    partCount += p.qty
    edgeM += p.edgeM * p.qty
  }
  let matCost = 0
  for (const [mid, area] of Object.entries(areaByMat)) {
    const m = materials[mid]
    if (!m) { base.warnings.push('חומר חסר בספרייה'); continue }
    const sheets = sheetsFor(area, m)
    base.sheets.push({ materialId: mid, areaM2: round2(area), sheets })
    matCost += sheets * m.costPerSheet
  }
  base.edgeMeters = round2(edgeM)
  matCost += edgeM * s.edgeCostPerMeter
  base.materials = round2(matCost)

  // hardware
  base.hardwareNeeds = deriveHardware(u, d, hardware, s)
  base.hardware = round2(base.hardwareNeeds.reduce((acc, n) => acc + n.qty * (hardware[n.hardwareId]?.costPerUnit ?? 0), 0))

  // labor
  const L = s.labor
  const minutes =
    partCount * L.cutPerPart +
    edgeM * L.edgePerMeter +
    partCount * L.assemblyPerPart +
    Math.max(0, u.doors.count) * L.perDoor +
    d.drawers * L.perDrawer
  base.laborHours = round2(minutes / 60)
  base.labor = round2(base.laborHours * s.laborRate)
  return base
}

function priceArea(u: AreaUnit, materials: Record<string, Material>, s: WorkshopSettings): UnitCost {
  const base: UnitCost = {
    unitId: u.id, name: u.name, kind: 'area', qty: u.qty,
    materials: 0, hardware: 0, laborHours: 0, labor: 0, subcontractors: 0,
    sheets: [], hardwareNeeds: [], edgeMeters: 0, derived: null, warnings: [], incomplete: false,
  }
  const W = u.width.value, H = u.height.value
  if (W == null || H == null) { base.incomplete = true; base.warnings.push('חסרה מידה, היחידה לא מתומחרת'); return base }
  const area = (W / 1000) * (H / 1000)
  const m = materials[u.materialId]
  if (!m) { base.warnings.push('חומר חסר בספרייה') }
  else {
    const sheets = sheetsFor(area, m)
    base.sheets.push({ materialId: m.id, areaM2: round2(area), sheets })
    base.materials = round2(sheets * m.costPerSheet + u.extrasCost)
  }
  const perM2 = u.laborMinutesPerM2 ?? s.labor.perM2
  base.laborHours = round2((area * perM2) / 60)
  base.labor = round2(base.laborHours * s.laborRate)
  return base
}

function priceFreeform(u: FreeformUnit, s: WorkshopSettings): UnitCost {
  const hours = u.laborLines.reduce((a, l) => a + l.hours, 0)
  return {
    unitId: u.id, name: u.name, kind: 'freeform', qty: u.qty,
    materials: round2(u.materialLines.reduce((a, l) => a + l.cost, 0)),
    hardware: 0,
    laborHours: round2(hours),
    labor: round2(hours * s.laborRate),
    subcontractors: round2(u.subcontractorLines.reduce((a, l) => a + l.cost, 0)),
    sheets: [], hardwareNeeds: [], edgeMeters: 0, derived: null, warnings: [], incomplete: false,
  }
}

export function priceUnit(u: Unit, materials: Record<string, Material>, hardware: Record<string, Hardware>, s: WorkshopSettings): UnitCost {
  switch (u.kind) {
    case 'parametric': return priceParametric(u, materials, hardware, s)
    case 'area': return priceArea(u, materials, s)
    case 'freeform': return priceFreeform(u, s)
  }
}

export interface PriceInput {
  units: Unit[]
  extras: JobExtras
  quotedPrice: number | null
  materials: Record<string, Material>
  hardware: Record<string, Hardware>
  settings: WorkshopSettings
}

export function priceJob(inp: PriceInput): Breakdown {
  const { units, extras, settings: s } = inp
  const ucs = units.map((u) => priceUnit(u, inp.materials, inp.hardware, s))
  const sum = (f: (c: UnitCost) => number) => round2(ucs.reduce((a, c) => a + f(c) * c.qty, 0))

  const materials = sum((c) => c.materials)
  const hardware = sum((c) => c.hardware)
  const laborHours = sum((c) => c.laborHours)
  const labor = sum((c) => c.labor)
  const unitSubs = sum((c) => c.subcontractors)
  const jobSubs = round2(extras.subcontractors.reduce((a, l) => a + l.cost, 0))
  const subcontractors = round2(unitSubs + jobSubs)
  const installationHours = extras.installationHours
  const installation = round2(installationHours * s.installRate + extras.installationFlat)
  const transport = extras.transport
  const directCost = round2(materials + hardware + labor + installation + transport + subcontractors)

  const overheadRate = s.overheadPerMonth > 0 && s.hoursPerMonth > 0 ? s.overheadPerMonth / s.hoursPerMonth : 0
  const overhead = round2((laborHours + installationHours) * overheadRate)
  const riskPct = extras.risk ?? s.risk
  const risk = round2(directCost * riskPct)
  const totalCost = round2(directCost + overhead + risk)
  const recommended = s.targetMargin < 1 ? Math.round(totalCost / (1 - s.targetMargin)) : totalCost

  const quoted = inp.quotedPrice
  const profit = quoted == null ? null : round2(quoted - totalCost)
  const margin = quoted == null || quoted === 0 ? null : (quoted - totalCost) / quoted

  const sheetsByMaterial: Record<string, number> = {}
  const hardwareByItem: Record<string, number> = {}
  for (const c of ucs) {
    for (const sh of c.sheets) sheetsByMaterial[sh.materialId] = (sheetsByMaterial[sh.materialId] ?? 0) + sh.sheets * c.qty
    for (const n of c.hardwareNeeds) hardwareByItem[n.hardwareId] = (hardwareByItem[n.hardwareId] ?? 0) + n.qty * c.qty
  }

  const warnings: string[] = []
  if (s.overheadPerMonth <= 0) warnings.push('הוצאות קבועות לא הוגדרו, המחיר מחושב בלעדיהן.')
  if (margin != null && margin < s.targetMargin) warnings.push(`רווחיות ${(margin * 100).toFixed(0)}% מתחת ליעד ${(s.targetMargin * 100).toFixed(0)}%.`)
  const unverified = units.flatMap((u) => u.kind === 'freeform' ? [] : [u.width, u.height, ...(u.kind === 'parametric' ? [u.depth] : [])])
    .filter((d) => d.value != null && (d.source === 'estimated' || d.source === 'customer')).length
  if (unverified > 0) warnings.push(`${unverified} מידות הן הערכה או מהלקוח, העלות עשויה להשתנות אחרי מדידה.`)
  const staleMs = 1000 * 60 * 60 * 24 * 30 * 6
  const now = Date.now()
  const usedMats = new Set(ucs.flatMap((c) => c.sheets.map((x) => x.materialId)))
  for (const mid of usedMats) {
    const m = inp.materials[mid]
    if (!m) continue
    if (m.approx) warnings.push(`מחיר ${m.name} הוא הערכה, עדכן אותו בספרייה.`)
    else if (now - Date.parse(m.updatedAt) > staleMs) warnings.push(`מחיר ${m.name} עודכן לפני יותר משישה חודשים.`)
  }
  for (const c of ucs) for (const w of c.warnings) warnings.push(`${c.name}: ${w}`)

  return {
    units: ucs, materials, hardware, labor, laborHours, installation, installationHours, transport, subcontractors,
    directCost, overhead, risk, totalCost, recommended, quoted, profit, margin, sheetsByMaterial, hardwareByItem, warnings,
  }
}

export function priceJobLive(job: Job, materials: Material[], hardware: Hardware[], settings: WorkshopSettings): Breakdown {
  return priceJob({
    units: job.units, extras: job.extras, quotedPrice: job.quotedPrice,
    materials: byId(materials), hardware: byId(hardware), settings,
  })
}
