import type { AppState, Hardware, Job, Material, ParametricUnit, Revision, WorkshopSettings } from './types'

const TODAY = new Date().toISOString()

export const PRESET_MATERIALS: Material[] = [
  { id: 'm-egger-w1000', name: 'Egger W1000 לבן 18', type: 'melamine', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 320, supplier: 'Egger', waste: 0.12, updatedAt: TODAY, swatch: '#f4f4f1', approx: true },
  { id: 'm-egger-h1180', name: 'Egger H1180 אלון הליפקס 18', type: 'melamine', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 410, supplier: 'Egger', waste: 0.12, updatedAt: TODAY, swatch: '#c9a877', approx: true },
  { id: 'm-krono-white', name: 'Kronospan לבן 18', type: 'melamine', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 260, supplier: 'Kronospan', waste: 0.12, updatedAt: TODAY, swatch: '#f7f7f5', approx: true },
  { id: 'm-mdf-18', name: 'MDF גולמי 18', type: 'mdf', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 190, waste: 0.1, updatedAt: TODAY, swatch: '#b8946a', approx: true },
  { id: 'm-mdf-painted', name: 'MDF צבוע (כולל צביעה) 18', type: 'mdf', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 900, waste: 0.1, updatedAt: TODAY, swatch: '#dfe3e6', approx: true },
  { id: 'm-oak-veneer', name: 'פורניר אלון על MDF 18', type: 'veneer', thickness: 18, sheetW: 2500, sheetH: 1220, costPerSheet: 780, waste: 0.15, updatedAt: TODAY, swatch: '#b48a5a', approx: true },
  { id: 'm-ply-18', name: 'סנדוויץ׳ 18', type: 'plywood', thickness: 18, sheetW: 2440, sheetH: 1220, costPerSheet: 240, waste: 0.1, updatedAt: TODAY, swatch: '#d9c39a', approx: true },
  { id: 'm-back-hdf-3', name: 'גב HDF 3 לבן', type: 'other', thickness: 3, sheetW: 2800, sheetH: 2070, costPerSheet: 70, waste: 0.08, updatedAt: TODAY, swatch: '#f0f0ec', approx: true },
  { id: 'm-back-mdf-8', name: 'גב MDF 8 מצופה', type: 'mdf', thickness: 8, sheetW: 2800, sheetH: 2070, costPerSheet: 120, waste: 0.08, updatedAt: TODAY, swatch: '#ececea', approx: true },
  { id: 'm-acoustic-panel', name: 'פאנל אקוסטי (לוח)', type: 'other', thickness: 21, sheetW: 2400, sheetH: 600, costPerSheet: 380, waste: 0.05, updatedAt: TODAY, swatch: '#8b6b4e', approx: true },
  { id: 'm-cladding-oak', name: 'חיפוי אלון (לוח)', type: 'veneer', thickness: 12, sheetW: 2400, sheetH: 1200, costPerSheet: 520, waste: 0.1, updatedAt: TODAY, swatch: '#a67c52', approx: true },
]

export const PRESET_HARDWARE: Hardware[] = [
  { id: 'h-blum-cliptop', name: 'Blum Clip Top ציר', category: 'hinge', costPerUnit: 18, supplier: 'Blum', rule: { per: 'door', qty: 2 }, updatedAt: TODAY, approx: true },
  { id: 'h-blum-tandembox', name: 'Blum Tandembox מסילה (זוג)', category: 'runner', costPerUnit: 140, supplier: 'Blum', rule: { per: 'drawer', qty: 1 }, updatedAt: TODAY, approx: true },
  { id: 'h-runner-basic', name: 'מסילה טלסקופית בסיסית (זוג)', category: 'runner', costPerUnit: 35, rule: { per: 'drawer', qty: 1 }, updatedAt: TODAY, approx: true },
  { id: 'h-handle-basic', name: 'ידית אלומיניום', category: 'handle', costPerUnit: 22, rule: { per: 'door_or_drawer', qty: 1 }, updatedAt: TODAY, approx: true },
  { id: 'h-shelf-pin', name: 'פין למדף', category: 'shelf_support', costPerUnit: 0.8, rule: { per: 'shelf', qty: 4 }, updatedAt: TODAY, approx: true },
  { id: 'h-rod', name: 'מוט תלייה + תפסים', category: 'rod', costPerUnit: 45, rule: { per: 'hanging_bay', qty: 1 }, updatedAt: TODAY, approx: true },
]

export const DEFAULT_SETTINGS: WorkshopSettings = {
  businessName: '',
  laborRate: 150,
  installRate: 180,
  targetMargin: 0.3,
  overheadPerMonth: 0,
  hoursPerMonth: 160,
  vat: 0.18,
  risk: 0.05,
  edgeCostPerMeter: 2.5,
  labor: { cutPerPart: 4, edgePerMeter: 3, assemblyPerPart: 6, perDoor: 15, perDrawer: 25, perM2: 45 },
  defaults: {
    carcassMaterialId: 'm-egger-w1000',
    backMaterialId: 'm-back-hdf-3',
    doorMaterialId: 'm-egger-w1000',
    hingeId: 'h-blum-cliptop',
    runnerId: 'h-blum-tandembox',
    handleId: 'h-handle-basic',
    shelfSupportId: 'h-shelf-pin',
    rodId: 'h-rod',
  },
  onboarded: false,
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function newParametricUnit(s: WorkshopSettings, template: ParametricUnit['template'] = 'wardrobe'): ParametricUnit {
  const base = {
    id: uid(), kind: 'parametric' as const, qty: 1, template,
    carcassMaterialId: s.defaults.carcassMaterialId, backMaterialId: s.defaults.backMaterialId, doorMaterialId: s.defaults.doorMaterialId,
    edgeBanding: true, handles: true,
  }
  const dim = (v: number | null) => ({ value: v, source: 'estimated' as const })
  switch (template) {
    case 'wardrobe':
      return { ...base, name: 'ארון', width: dim(2400), height: dim(2600), depth: dim(600), bays: [
        { id: uid(), content: 'shelves', count: 5 }, { id: uid(), content: 'hanging', count: 0 }, { id: uid(), content: 'drawers', count: 3 }, { id: uid(), content: 'hanging', count: 0 },
      ], doors: { count: 4, type: 'hinged' } }
    case 'base_cabinet':
      return { ...base, name: 'ארון תחתון', width: dim(900), height: dim(850), depth: dim(580), bays: [{ id: uid(), content: 'shelves', count: 1 }], doors: { count: 2, type: 'hinged' } }
    case 'bookcase':
      return { ...base, name: 'ספרייה', width: dim(1200), height: dim(2200), depth: dim(350), bays: [{ id: uid(), content: 'shelves', count: 5 }, { id: uid(), content: 'shelves', count: 5 }], doors: { count: 0, type: 'hinged' }, handles: false }
    default:
      return { ...base, name: 'יחידה', width: dim(null), height: dim(null), depth: dim(null), bays: [{ id: uid(), content: 'shelves', count: 2 }], doors: { count: 0, type: 'hinged' } }
  }
}

export function makeSnapshot(job: Pick<Job, 'units' | 'extras' | 'quotedPrice'>, state: Pick<AppState, 'materials' | 'hardware' | 'settings'>, version: number, trigger: Revision['trigger'], note?: string, locked = false): Revision {
  return {
    id: uid(), version, createdAt: new Date().toISOString(), trigger, note, locked,
    units: structuredClone(job.units), extras: structuredClone(job.extras), quotedPrice: job.quotedPrice,
    materials: Object.fromEntries(state.materials.map((m) => [m.id, structuredClone(m)])),
    hardware: Object.fromEntries(state.hardware.map((h) => [h.id, structuredClone(h)])),
    settings: structuredClone(state.settings),
  }
}

export function makeSampleJob(state: Pick<AppState, 'materials' | 'hardware' | 'settings'>, number: number): Job {
  const now = new Date().toISOString()
  const unit = newParametricUnit(state.settings, 'wardrobe')
  unit.name = 'ארון חדר שינה'
  unit.width.source = 'customer'; unit.height.source = 'customer'; unit.depth.source = 'estimated'
  const job: Job = {
    id: uid(), number,
    customer: { name: 'משפחת כהן', phone: '050-0000000', address: 'כרמיאל' },
    projectType: 'wardrobe', status: 'draft',
    units: [unit],
    extras: { installationHours: 4, installationFlat: 0, transport: 300, subcontractors: [], risk: null },
    quotedPrice: null,
    revisions: [], productionChangePending: false,
    events: [{ at: now, text: 'Job לדוגמה נוצר — אפשר למחוק' }],
    createdAt: now, updatedAt: now,
  }
  job.revisions.push(makeSnapshot(job, state, 1, 'initial', 'גרסה ראשונה'))
  return job
}

export function initialState(): AppState {
  const base = { settings: DEFAULT_SETTINGS, materials: PRESET_MATERIALS, hardware: PRESET_HARDWARE }
  return { ...base, jobs: [makeSampleJob(base, 1001)], nextJobNumber: 1002 }
}
