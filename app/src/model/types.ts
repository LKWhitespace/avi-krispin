// ---------- Dimensions ----------
export type DimensionSource = 'estimated' | 'customer' | 'plan' | 'site' | 'verified'

export interface Dimension {
  /** millimetres; null = Missing */
  value: number | null
  source: DimensionSource
}

export const PRODUCTION_SAFE_SOURCES: DimensionSource[] = ['site', 'verified']

// ---------- Library ----------
export type MaterialType = 'melamine' | 'mdf' | 'plywood' | 'veneer' | 'solid' | 'other'

export interface Material {
  id: string
  name: string
  type: MaterialType
  /** mm */
  thickness: number
  /** mm */
  sheetW: number
  /** mm */
  sheetH: number
  costPerSheet: number
  supplier?: string
  /** 0..1 */
  waste: number
  /** ISO date */
  updatedAt: string
  /** CSS colour for swatch */
  swatch?: string
  /** price is a preset guess, not confirmed by the workshop */
  approx?: boolean
}

export type HardwareCategory = 'hinge' | 'runner' | 'handle' | 'shelf_support' | 'rod' | 'other'
export type HardwareRulePer = 'door' | 'drawer' | 'shelf' | 'hanging_bay' | 'door_or_drawer' | 'unit'

export interface Hardware {
  id: string
  name: string
  category: HardwareCategory
  costPerUnit: number
  supplier?: string
  /** how many per target. Hinges additionally scale with door height. */
  rule: { per: HardwareRulePer; qty: number }
  updatedAt: string
  approx?: boolean
}

// ---------- Settings ----------
export interface LaborDefaults {
  /** minutes per cut part */
  cutPerPart: number
  /** minutes per metre of edge banding */
  edgePerMeter: number
  /** minutes per carcass component assembled */
  assemblyPerPart: number
  /** minutes per door hung & adjusted */
  perDoor: number
  /** minutes per drawer box built & fitted */
  perDrawer: number
  /** minutes per m² for area-based units */
  perM2: number
}

export interface WorkshopSettings {
  businessName: string
  /** ₪ per hour, workshop labor */
  laborRate: number
  /** ₪ per hour, installation */
  installRate: number
  /** 0..1 */
  targetMargin: number
  /** ₪ per month fixed costs; 0 = not set */
  overheadPerMonth: number
  /** productive hours per month, used to spread overhead */
  hoursPerMonth: number
  /** 0..1 */
  vat: number
  /** 0..1 default risk allowance on direct cost */
  risk: number
  /** ₪ per metre of edge banding material */
  edgeCostPerMeter: number
  labor: LaborDefaults
  defaults: {
    carcassMaterialId: string
    backMaterialId: string
    doorMaterialId: string
    hingeId: string
    runnerId: string
    handleId: string
    shelfSupportId: string
    rodId: string
  }
  quote: QuoteDefaults
  onboarded: boolean
}

export interface QuoteDefaults {
  phone: string
  email: string
  address: string
  /** data URL */
  logo?: string
  inclusions: string
  exclusions: string
  paymentSchedule: string
  validityDays: number
  timelineWeeks: number
}

// ---------- Units ----------
export type BayContent = 'shelves' | 'hanging' | 'drawers' | 'empty'

export interface Bay {
  id: string
  content: BayContent
  /** shelves count or drawers count; ignored for hanging/empty */
  count: number
}

export type ParametricTemplate = 'wardrobe' | 'base_cabinet' | 'bookcase' | 'custom'

export interface ParametricUnit {
  id: string
  kind: 'parametric'
  name: string
  template: ParametricTemplate
  qty: number
  width: Dimension
  height: Dimension
  depth: Dimension
  bays: Bay[]
  doors: { count: number; type: 'hinged' | 'sliding' }
  carcassMaterialId: string
  backMaterialId: string
  doorMaterialId: string
  edgeBanding: boolean
  handles: boolean
  notes?: string
}

export interface AreaUnit {
  id: string
  kind: 'area'
  name: string
  qty: number
  width: Dimension
  height: Dimension
  materialId: string
  /** hours per m²; falls back to settings.labor.perM2 when null */
  laborMinutesPerM2: number | null
  /** ₪ flat extras (profiles, adhesive) */
  extrasCost: number
  notes?: string
}

export interface CostLine {
  id: string
  label: string
  cost: number
}
export interface HoursLine {
  id: string
  label: string
  hours: number
}

export interface FreeformUnit {
  id: string
  kind: 'freeform'
  name: string
  qty: number
  description: string
  materialLines: CostLine[]
  laborLines: HoursLine[]
  subcontractorLines: CostLine[]
  notes?: string
}

export type Unit = ParametricUnit | AreaUnit | FreeformUnit

// ---------- Job ----------
export type JobStatus = 'draft' | 'quoted' | 'approved' | 'locked' | 'lost'
export type ProjectType = 'kitchen' | 'wardrobe' | 'furniture' | 'cladding' | 'refurbishment' | 'other'

export interface JobExtras {
  installationHours: number
  installationFlat: number
  transport: number
  subcontractors: CostLine[]
  /** 0..1, overrides settings.risk when not null */
  risk: number | null
}

export type RevisionTrigger = 'manual' | 'client_request' | 'production_change' | 'restore' | 'initial'

export interface Revision {
  id: string
  version: number
  createdAt: string
  trigger: RevisionTrigger
  note?: string
  /** full snapshot */
  units: Unit[]
  extras: JobExtras
  quotedPrice: number | null
  materials: Record<string, Material>
  hardware: Record<string, Hardware>
  settings: WorkshopSettings
  /** frozen production revision */
  locked: boolean
}

export interface Attachment {
  id: string
  name: string
  /** data URL, downscaled */
  dataUrl: string
  addedAt: string
}

export type MeasurementLabel = 'wall_width' | 'height' | 'depth' | 'socket' | 'pipe' | 'skirting' | 'window' | 'ac' | 'floor_dev' | 'custom'

export interface Measurement {
  id: string
  label: MeasurementLabel
  customLabel?: string
  /** mm */
  value: number
  note?: string
  /** attachment id */
  photoId?: string
  /** normalized 0..1 line on the photo */
  line?: { x1: number; y1: number; x2: number; y2: number }
  at: string
  linkedTo?: { unitId: string; dim: 'width' | 'height' | 'depth' }
}

export interface QuoteOption {
  id: string
  name: string
  /** applied to all parametric units */
  doorMaterialId?: string
  carcassMaterialId?: string
  /** free text shown to client */
  description?: string
}

export interface ChangeRequest {
  at: string
  text: string
}

export interface QuoteConfig {
  includedUnitIds: string[]
  unitDescriptions: Record<string, string>
  intro: string
  inclusions: string
  exclusions: string
  paymentSchedule: string
  validityDays: number
  timelineWeeks: number
  options: QuoteOption[]
  /** set when sent */
  sentAt?: string
  sentRevisionId?: string
  viewedAt?: string
  approvedAt?: string
  approvedOptionId?: string
  changeRequests: ChangeRequest[]
}

export interface JobEvent {
  at: string
  text: string
}

export interface Job {
  id: string
  number: number
  customer: { name: string; phone: string; address: string }
  projectType: ProjectType
  status: JobStatus
  units: Unit[]
  extras: JobExtras
  quotedPrice: number | null
  revisions: Revision[]
  /** locked job was opened for a production change; next revision is a production revision */
  productionChangePending: boolean
  intakeText: string
  attachments: Attachment[]
  measurements: Measurement[]
  quote: QuoteConfig
  events: JobEvent[]
  createdAt: string
  updatedAt: string
}

export interface AppState {
  settings: WorkshopSettings
  materials: Material[]
  hardware: Hardware[]
  jobs: Job[]
  nextJobNumber: number
}
