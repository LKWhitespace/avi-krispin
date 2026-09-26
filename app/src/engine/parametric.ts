import type { Hardware, Material, ParametricUnit, WorkshopSettings } from '../model/types'

export type PartRole =
  | 'side' | 'top' | 'bottom' | 'divider' | 'back' | 'shelf'
  | 'door' | 'drawer_front' | 'drawer_side' | 'drawer_end' | 'drawer_bottom'

export interface Part {
  role: PartRole
  label: string
  qty: number
  materialId: string
  /** mm */
  w: number
  /** mm */
  h: number
  /** metres of edge banding per part */
  edgeM: number
}

export interface Derived {
  parts: Part[]
  bayWidth: number
  doorWidth: number
  doorHeight: number
  shelves: number
  drawers: number
  hangingBays: number
  warnings: string[]
}

const DRAWER_BOX_H = 150
const DRAWER_FRONT_H = 200
const SHELF_SETBACK = 20

export function dimValue(d: { value: number | null }): number | null {
  return d.value
}

/** Derive cut parts from a parametric unit. Returns null when a dimension is missing. */
export function deriveParts(
  u: ParametricUnit,
  materials: Record<string, Material>,
  _settings: WorkshopSettings,
): Derived | null {
  const W = u.width.value, H = u.height.value, D = u.depth.value
  if (W == null || H == null || D == null) return null
  const t = materials[u.carcassMaterialId]?.thickness ?? 18
  const bays = Math.max(1, u.bays.length)
  const warnings: string[] = []

  const innerW = W - 2 * t - (bays - 1) * t
  const bayWidth = innerW / bays
  const innerH = H - 2 * t
  const shelfD = D - SHELF_SETBACK

  const parts: Part[] = []
  const push = (p: Omit<Part, 'edgeM'> & { edgeM?: number }) =>
    parts.push({ edgeM: 0, ...p })

  const edge = u.edgeBanding
  const mm = (n: number) => n / 1000

  push({ role: 'side', label: 'דופן', qty: 2, materialId: u.carcassMaterialId, w: D, h: H, edgeM: edge ? mm(H) : 0 })
  push({ role: 'top', label: 'גג', qty: 1, materialId: u.carcassMaterialId, w: W - 2 * t, h: D, edgeM: edge ? mm(W - 2 * t) : 0 })
  push({ role: 'bottom', label: 'תחתית', qty: 1, materialId: u.carcassMaterialId, w: W - 2 * t, h: D, edgeM: edge ? mm(W - 2 * t) : 0 })
  if (bays > 1) {
    push({ role: 'divider', label: 'מחיצה', qty: bays - 1, materialId: u.carcassMaterialId, w: D, h: innerH, edgeM: edge ? mm(innerH) : 0 })
  }
  // back panel: one piece when it fits the sheet, otherwise one piece per bay (common practice)
  {
    const bm = materials[u.backMaterialId]
    const fitsWhole = !bm || (W <= bm.sheetW && H <= bm.sheetH) || (H <= bm.sheetW && W <= bm.sheetH)
    if (fitsWhole || bays === 1) push({ role: 'back', label: 'גב', qty: 1, materialId: u.backMaterialId, w: W, h: H })
    else push({ role: 'back', label: 'גב (לפי תא)', qty: bays, materialId: u.backMaterialId, w: bayWidth + t, h: H })
  }

  let shelves = 0, drawers = 0, hangingBays = 0
  for (const bay of u.bays) {
    if (bay.content === 'shelves') shelves += Math.max(0, bay.count)
    if (bay.content === 'drawers') drawers += Math.max(0, bay.count)
    if (bay.content === 'hanging') hangingBays += 1
  }
  if (shelves > 0) {
    push({ role: 'shelf', label: 'מדף', qty: shelves, materialId: u.carcassMaterialId, w: bayWidth, h: shelfD, edgeM: edge ? mm(bayWidth) : 0 })
  }
  if (drawers > 0) {
    const frontW = bayWidth + t - 4 // overlay front with 2mm gaps
    push({ role: 'drawer_front', label: 'חזית מגירה', qty: drawers, materialId: u.doorMaterialId, w: frontW, h: DRAWER_FRONT_H, edgeM: edge ? 2 * mm(frontW + DRAWER_FRONT_H) : 0 })
    const boxD = D - 50
    push({ role: 'drawer_side', label: 'דופן מגירה', qty: drawers * 2, materialId: u.carcassMaterialId, w: boxD, h: DRAWER_BOX_H, edgeM: edge ? mm(boxD) : 0 })
    push({ role: 'drawer_end', label: 'חזית/גב פנימי', qty: drawers * 2, materialId: u.carcassMaterialId, w: bayWidth - 80, h: DRAWER_BOX_H, edgeM: edge ? mm(bayWidth - 80) : 0 })
    push({ role: 'drawer_bottom', label: 'תחתית מגירה', qty: drawers, materialId: u.backMaterialId, w: bayWidth - 60, h: boxD })
  }

  let doorWidth = 0, doorHeight = 0
  const doorCount = Math.max(0, u.doors.count)
  if (doorCount > 0) {
    doorWidth = u.doors.type === 'sliding' ? W / doorCount + 30 : W / doorCount - 3
    doorHeight = H - 3
    push({ role: 'door', label: 'דלת', qty: doorCount, materialId: u.doorMaterialId, w: doorWidth, h: doorHeight, edgeM: edge ? 2 * mm(doorWidth + doorHeight) : 0 })
    if (u.doors.type === 'hinged' && doorWidth > 600) warnings.push(`רוחב דלת ${Math.round(doorWidth)} מ״מ — מעל 600. שקול ${doorCount + 1} דלתות.`)
  }

  // sheet-fit check
  for (const p of parts) {
    const m = materials[p.materialId]
    if (!m) continue
    const fits = (p.w <= m.sheetW && p.h <= m.sheetH) || (p.h <= m.sheetW && p.w <= m.sheetH)
    if (!fits) warnings.push(`${p.label} ${Math.round(p.w)}×${Math.round(p.h)} חורג מלוח ${m.name} (${m.sheetW}×${m.sheetH})`)
  }
  if (bayWidth < 250) warnings.push(`רוחב תא ${Math.round(bayWidth)} מ״מ — צר מאוד.`)

  return { parts, bayWidth, doorWidth, doorHeight, shelves, drawers, hangingBays, warnings }
}

export function hingesPerDoor(doorHeight: number, base: number): number {
  const byHeight = doorHeight <= 900 ? 2 : doorHeight <= 1500 ? 3 : doorHeight <= 2000 ? 4 : 5
  return Math.max(base, byHeight)
}

export interface HardwareNeed {
  hardwareId: string
  qty: number
}

export function deriveHardware(
  u: ParametricUnit,
  d: Derived,
  hardware: Record<string, Hardware>,
  settings: WorkshopSettings,
): HardwareNeed[] {
  const out: HardwareNeed[] = []
  const add = (id: string, qty: number) => {
    if (!hardware[id] || qty <= 0) return
    out.push({ hardwareId: id, qty })
  }
  const def = settings.defaults
  const doors = Math.max(0, u.doors.count)
  if (doors > 0 && u.doors.type === 'hinged') {
    const hinge = hardware[def.hingeId]
    if (hinge) add(def.hingeId, doors * hingesPerDoor(d.doorHeight, hinge.rule.qty))
  }
  if (d.drawers > 0) {
    const r = hardware[def.runnerId]
    if (r) add(def.runnerId, d.drawers * r.rule.qty)
  }
  if (u.handles) {
    const h = hardware[def.handleId]
    if (h) add(def.handleId, (doors + d.drawers) * h.rule.qty)
  }
  if (d.shelves > 0) {
    const s = hardware[def.shelfSupportId]
    if (s) add(def.shelfSupportId, d.shelves * s.rule.qty)
  }
  if (d.hangingBays > 0) {
    const rod = hardware[def.rodId]
    if (rod) add(def.rodId, d.hangingBays * rod.rule.qty)
  }
  return out
}
