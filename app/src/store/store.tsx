import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { initialState, makeSampleJob, makeSnapshot, uid } from '../model/presets'
import type { AppState, Hardware, Job, JobStatus, Material, RevisionTrigger, WorkshopSettings } from '../model/types'

const STORAGE_KEY = 'qtb.state.v1'

export type Action =
  | { type: 'settings/update'; patch: Partial<WorkshopSettings> }
  | { type: 'material/upsert'; material: Material }
  | { type: 'material/delete'; id: string }
  | { type: 'hardware/upsert'; hardware: Hardware }
  | { type: 'hardware/delete'; id: string }
  | { type: 'job/create'; job: Job }
  | { type: 'job/createSample' }
  | { type: 'job/update'; id: string; update: (j: Job) => Job; event?: string }
  | { type: 'job/delete'; id: string }
  | { type: 'job/revision'; id: string; trigger: RevisionTrigger; note?: string }
  | { type: 'job/restore'; id: string; revisionId: string }
  | { type: 'job/status'; id: string; status: JobStatus; event?: string }
  | { type: 'job/lock'; id: string }
  | { type: 'job/openProductionChange'; id: string }
  | { type: 'state/replace'; state: AppState }
  | { type: 'state/reset' }

const now = () => new Date().toISOString()

function touch(j: Job, event?: string): Job {
  return { ...j, updatedAt: now(), events: event ? [...j.events, { at: now(), text: event }] : j.events }
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'settings/update':
      return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'material/upsert': {
      const exists = s.materials.some((m) => m.id === a.material.id)
      return { ...s, materials: exists ? s.materials.map((m) => (m.id === a.material.id ? a.material : m)) : [...s.materials, a.material] }
    }
    case 'material/delete':
      return { ...s, materials: s.materials.filter((m) => m.id !== a.id) }
    case 'hardware/upsert': {
      const exists = s.hardware.some((h) => h.id === a.hardware.id)
      return { ...s, hardware: exists ? s.hardware.map((h) => (h.id === a.hardware.id ? a.hardware : h)) : [...s.hardware, a.hardware] }
    }
    case 'hardware/delete':
      return { ...s, hardware: s.hardware.filter((h) => h.id !== a.id) }
    case 'job/create':
      return { ...s, jobs: [a.job, ...s.jobs], nextJobNumber: Math.max(s.nextJobNumber, a.job.number + 1) }
    case 'job/createSample':
      return { ...s, jobs: [makeSampleJob(s, s.nextJobNumber), ...s.jobs], nextJobNumber: s.nextJobNumber + 1 }
    case 'job/update':
      return { ...s, jobs: s.jobs.map((j) => (j.id === a.id ? touch(a.update(j), a.event) : j)) }
    case 'job/delete':
      return { ...s, jobs: s.jobs.filter((j) => j.id !== a.id) }
    case 'job/revision':
      return {
        ...s,
        jobs: s.jobs.map((j) => {
          if (j.id !== a.id) return j
          const version = (j.revisions.at(-1)?.version ?? 0) + 1
          const isProd = j.status === 'locked' && j.productionChangePending
          const rev = makeSnapshot(j, s, version, isProd ? 'production_change' : a.trigger, a.note, isProd)
          return touch({ ...j, revisions: [...j.revisions, rev], productionChangePending: false, status: j.status === 'draft' ? 'quoted' : j.status },
            isProd ? `Production Revision V${version} נוצרה` : `גרסה V${version} נשמרה`)
        }),
      }
    case 'job/restore':
      return {
        ...s,
        jobs: s.jobs.map((j) => {
          if (j.id !== a.id) return j
          const r = j.revisions.find((x) => x.id === a.revisionId)
          if (!r) return j
          return touch({ ...j, units: structuredClone(r.units), extras: structuredClone(r.extras), quotedPrice: r.quotedPrice }, `שוחזר מ־V${r.version} (לא נשמר עדיין כגרסה)`)
        }),
      }
    case 'job/status':
      return { ...s, jobs: s.jobs.map((j) => (j.id === a.id ? touch({ ...j, status: a.status }, a.event) : j)) }
    case 'job/lock':
      return {
        ...s,
        jobs: s.jobs.map((j) => {
          if (j.id !== a.id) return j
          const last = j.revisions.at(-1)
          const version = (last?.version ?? 0) + 1
          const rev = makeSnapshot(j, s, version, 'manual', 'Production Revision', true)
          return touch({ ...j, status: 'locked', revisions: [...j.revisions, rev], productionChangePending: false }, `Job ננעל לייצור — Production Revision V${version}`)
        }),
      }
    case 'job/openProductionChange':
      return { ...s, jobs: s.jobs.map((j) => (j.id === a.id ? touch({ ...j, productionChangePending: true }, 'Job נפתח לשינוי אחרי נעילה') : j)) }
    case 'state/replace':
      return a.state
    case 'state/reset':
      return initialState()
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.jobs) && parsed.settings) return parsed
    }
  } catch { /* fall through */ }
  return initialState()
}

const Ctx = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* quota / private mode */ }
  }, [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}

export function useJob(id: string | undefined): Job | undefined {
  const { state } = useStore()
  return state.jobs.find((j) => j.id === id)
}

export function newJob(number: number, customer: Job['customer'], projectType: Job['projectType']): Job {
  const t = now()
  return {
    id: uid(), number, customer, projectType, status: 'draft', units: [],
    extras: { installationHours: 0, installationFlat: 0, transport: 0, subcontractors: [], risk: null },
    quotedPrice: null, revisions: [], productionChangePending: false,
    events: [{ at: t, text: 'Job נוצר' }], createdAt: t, updatedAt: t,
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2)
}
