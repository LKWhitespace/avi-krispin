import type { Hardware, Material, Revision, Unit } from '../model/types'
import { priceJob, type Breakdown } from './pricing'

export interface Snapshot {
  units: Unit[]
  extras: Revision['extras']
  quotedPrice: number | null
  materials: Record<string, Material>
  hardware: Record<string, Hardware>
  settings: Revision['settings']
}

export interface Delta { label: string; before: string; after: string; diff: number; kind: 'money' | 'count' | 'hours' | 'pct' | 'text' }

export interface Impact {
  price: number
  cost: number
  marginBefore: number | null
  marginAfter: number | null
  sheets: Delta[]
  hardware: Delta[]
  laborHours: number
  dimensions: Delta[]
  unitsAdded: string[]
  unitsRemoved: string[]
  before: Breakdown
  after: Breakdown
}

export function toSnapshot(r: Revision): Snapshot {
  return { units: r.units, extras: r.extras, quotedPrice: r.quotedPrice, materials: r.materials, hardware: r.hardware, settings: r.settings }
}

function dimsOf(u: Unit): Record<string, number | null> {
  if (u.kind === 'freeform') return {}
  const out: Record<string, number | null> = { W: u.width.value, H: u.height.value }
  if (u.kind === 'parametric') out.D = u.depth.value
  return out
}

export function computeImpact(a: Snapshot, b: Snapshot): Impact {
  const before = priceJob(a)
  const after = priceJob(b)
  const names = { ...Object.fromEntries(Object.values(a.materials).map((m) => [m.id, m.name])), ...Object.fromEntries(Object.values(b.materials).map((m) => [m.id, m.name])) }
  const hnames = { ...Object.fromEntries(Object.values(a.hardware).map((h) => [h.id, h.name])), ...Object.fromEntries(Object.values(b.hardware).map((h) => [h.id, h.name])) }

  const sheets: Delta[] = []
  for (const id of new Set([...Object.keys(before.sheetsByMaterial), ...Object.keys(after.sheetsByMaterial)])) {
    const x = before.sheetsByMaterial[id] ?? 0, y = after.sheetsByMaterial[id] ?? 0
    if (x !== y) sheets.push({ label: names[id] ?? id, before: String(x), after: String(y), diff: y - x, kind: 'count' })
  }
  const hardware: Delta[] = []
  for (const id of new Set([...Object.keys(before.hardwareByItem), ...Object.keys(after.hardwareByItem)])) {
    const x = before.hardwareByItem[id] ?? 0, y = after.hardwareByItem[id] ?? 0
    if (x !== y) hardware.push({ label: hnames[id] ?? id, before: String(x), after: String(y), diff: y - x, kind: 'count' })
  }

  const dimensions: Delta[] = []
  const aUnits = new Map(a.units.map((u) => [u.id, u]))
  const bUnits = new Map(b.units.map((u) => [u.id, u]))
  for (const [id, ub] of bUnits) {
    const ua = aUnits.get(id)
    if (!ua) continue
    const da = dimsOf(ua), db = dimsOf(ub)
    for (const k of Object.keys(db)) {
      if (da[k] !== db[k]) dimensions.push({ label: `${ub.name} · ${k}`, before: da[k] == null ? '—' : String(da[k]), after: db[k] == null ? '—' : String(db[k]), diff: (db[k] ?? 0) - (da[k] ?? 0), kind: 'count' })
    }
    if (ua.kind === 'parametric' && ub.kind === 'parametric') {
      if (ua.doorMaterialId !== ub.doorMaterialId) dimensions.push({ label: `${ub.name} · חומר דלתות`, before: names[ua.doorMaterialId] ?? '—', after: names[ub.doorMaterialId] ?? '—', diff: 0, kind: 'text' })
      if (ua.carcassMaterialId !== ub.carcassMaterialId) dimensions.push({ label: `${ub.name} · חומר גוף`, before: names[ua.carcassMaterialId] ?? '—', after: names[ub.carcassMaterialId] ?? '—', diff: 0, kind: 'text' })
      if (ua.doors.count !== ub.doors.count) dimensions.push({ label: `${ub.name} · דלתות`, before: String(ua.doors.count), after: String(ub.doors.count), diff: ub.doors.count - ua.doors.count, kind: 'count' })
      if (ua.bays.length !== ub.bays.length) dimensions.push({ label: `${ub.name} · תאים`, before: String(ua.bays.length), after: String(ub.bays.length), diff: ub.bays.length - ua.bays.length, kind: 'count' })
    }
    if (ua.qty !== ub.qty) dimensions.push({ label: `${ub.name} · כמות`, before: String(ua.qty), after: String(ub.qty), diff: ub.qty - ua.qty, kind: 'count' })
  }

  const priceA = before.quoted ?? before.recommended
  const priceB = after.quoted ?? after.recommended
  return {
    price: priceB - priceA,
    cost: after.totalCost - before.totalCost,
    marginBefore: before.margin,
    marginAfter: after.margin,
    sheets, hardware,
    laborHours: Math.round((after.laborHours - before.laborHours) * 10) / 10,
    dimensions,
    unitsAdded: b.units.filter((u) => !aUnits.has(u.id)).map((u) => u.name),
    unitsRemoved: a.units.filter((u) => !bUnits.has(u.id)).map((u) => u.name),
    before, after,
  }
}
