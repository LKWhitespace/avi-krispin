import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import type { Job } from '../model/types'
import { useJob, useStore } from '../store/store'
import { Badge, Modal, marginTone } from '../ui/components'
import { PROJECT_LABEL, STATUS_LABEL, money, pct } from '../ui/format'

export interface JobCtx {
  job: Job
  /** true when edits are allowed without a lock prompt */
  editable: boolean
  /** call before any edit; returns true if the edit may proceed */
  guard: () => boolean
  update: (fn: (j: Job) => Job, event?: string) => void
}

export function JobLayout() {
  const { id } = useParams()
  const job = useJob(id)
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const [askUnlock, setAskUnlock] = useState(false)

  if (!job) return <div className="empty"><h2>Job לא נמצא</h2><button className="btn" onClick={() => nav('/')}>חזרה</button></div>

  const b = priceJobLive(job, state.materials, state.hardware, state.settings)
  const editable = job.status !== 'locked' || job.productionChangePending
  const guard = () => {
    if (editable) return true
    setAskUnlock(true)
    return false
  }
  const update: JobCtx['update'] = (fn, event) => dispatch({ type: 'job/update', id: job.id, update: fn, event })
  const ctx: JobCtx = { job, editable, guard, update }
  const last = job.revisions.at(-1)

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <div className="row" style={{ gap: '.5rem' }}>
            <h1 style={{ margin: 0 }}>#{job.number} · {job.customer.name}</h1>
            <Badge tone={job.status === 'locked' ? 'accent' : job.status === 'lost' ? 'bad' : job.status === 'draft' ? '' : 'ok'}>{STATUS_LABEL[job.status]}</Badge>
            {last && <Badge>V{last.version}</Badge>}
            {job.productionChangePending && <Badge tone="warn">שינוי ייצור פתוח → V{(last?.version ?? 0) + 1}</Badge>}
          </div>
          <div className="muted small">{PROJECT_LABEL[job.projectType]} · {job.customer.address} · <a className="num" href={`https://wa.me/972${job.customer.phone.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer">{job.customer.phone}</a></div>
        </div>
        <div className="row" style={{ gap: '1.2rem' }}>
          <div className="kpi"><span className="v num">{money(job.quotedPrice ?? b.recommended)}</span><span className="l">{job.quotedPrice == null ? 'מחיר מומלץ' : 'מחיר בהצעה'}</span></div>
          <div className="kpi"><span className="v num">{money(b.totalCost)}</span><span className="l">עלות</span></div>
          <div className="kpi"><span className="v"><Badge tone={marginTone(b.margin, state.settings.targetMargin)}>{pct(b.margin)}</Badge></span><span className="l">margin</span></div>
        </div>
      </div>

      <nav className="tabs">
        <NavLink to="" end>Overview</NavLink>
        <NavLink to="units">Units</NavLink>
        <NavLink to="pricing">Pricing</NavLink>
        <NavLink to="revisions">Revisions</NavLink>
        <a className="disabled" title="בגרסה הבאה">Intake</a>
        <a className="disabled" title="בגרסה הבאה">Measurements</a>
        <a className="disabled" title="בגרסה הבאה">Quote</a>
      </nav>

      <Outlet context={ctx} />

      {askUnlock && (
        <Modal title="Job נעול לייצור" onClose={() => setAskUnlock(false)}>
          <p>Production Revision V{last?.version} קפואה. שינוי עכשיו ייצור <strong>Production Revision V{(last?.version ?? 0) + 1}</strong> וידרוש עדכון של הייצור.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setAskUnlock(false)}>ביטול</button>
            <button className="btn primary" onClick={() => { dispatch({ type: 'job/openProductionChange', id: job.id }); setAskUnlock(false) }}>פתח לשינוי</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
