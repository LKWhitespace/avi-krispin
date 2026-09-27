import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import type { Job } from '../model/types'
import { useJob, useStore } from '../store/store'
import { Badge, Modal, marginTone } from '../ui/components'
import { PROJECT_LABEL, STATUS_LABEL, money, pct, ver } from '../ui/format'

export interface JobCtx {
  job: Job
  editable: boolean
  guard: () => boolean
  update: (fn: (j: Job) => Job, event?: string) => void
}

const STEPS: { key: Job['status'] | 'production'; label: string }[] = [
  { key: 'draft', label: 'טיוטה' }, { key: 'quoted', label: 'הצעה' }, { key: 'approved', label: 'אישור' }, { key: 'locked', label: 'ייצור' },
]

export function statusTone(s: Job['status']): '' | 'ok' | 'warn' | 'bad' | 'accent' {
  return s === 'locked' ? 'accent' : s === 'lost' ? 'bad' : s === 'draft' ? '' : 'ok'
}

export function JobLayout() {
  const { id } = useParams()
  const job = useJob(id)
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const [askUnlock, setAskUnlock] = useState(false)

  if (!job) return <div className="empty"><h2>העבודה לא נמצאה</h2><button className="btn" onClick={() => nav('/')}>חזרה לעבודות</button></div>

  const b = priceJobLive(job, state.materials, state.hardware, state.settings)
  const editable = job.status !== 'locked' || job.productionChangePending
  const guard = () => { if (editable) return true; setAskUnlock(true); return false }
  const update: JobCtx['update'] = (fn, event) => dispatch({ type: 'job/update', id: job.id, update: fn, event })
  const ctx: JobCtx = { job, editable, guard, update }
  const last = job.revisions.at(-1)
  const idx = STEPS.findIndex((s) => s.key === job.status)
  const pendingChange = job.quote.changeRequests.length > 0 && job.quote.sentAt && job.quote.changeRequests.at(-1)!.at > job.quote.sentAt
  const wa = `https://wa.me/972${job.customer.phone.replace(/\D/g, '').replace(/^0/, '')}`

  return (
    <div>
      <div className="job-hero">
        <div>
          <div className="row" style={{ gap: '.6rem' }}>
            <h1><span className="num-tag num">{job.number}</span> {job.customer.name}</h1>
            <Badge tone={statusTone(job.status)}>{STATUS_LABEL[job.status]}</Badge>
            {last && <Badge plain>{ver(last.version)}</Badge>}
            {job.productionChangePending && <Badge tone="warn">שינוי ייצור פתוח</Badge>}
          </div>
          <div className="muted small" style={{ marginTop: '.2rem' }}>
            {PROJECT_LABEL[job.projectType]} · {job.customer.address || 'ללא כתובת'} · <a href={wa} target="_blank" rel="noreferrer" className="num" style={{ color: 'var(--wood)', fontWeight: 600 }}>{job.customer.phone}</a>
          </div>
          <div className="stepper">
            {job.status === 'lost' ? <span className="step lost"><i>×</i>לא נסגר</span> : STEPS.map((s, i) => (
              <span key={s.key} className={`step ${i < idx ? 'done' : i === idx ? 'current' : ''}`}><i>{i < idx ? '✓' : i + 1}</i>{s.label}</span>
            ))}
          </div>
        </div>
        <div className="kpis">
          <div className="kpi"><div className="v num">{money(job.quotedPrice ?? b.recommended)}</div><div className="l">{job.quotedPrice == null ? 'מחיר מומלץ' : 'מחיר בהצעה'}</div></div>
          <div className="kpi"><div className="v num">{money(b.totalCost)}</div><div className="l">עלות לנגרייה</div></div>
          <div className={`kpi tone-${marginTone(b.margin, state.settings.targetMargin) || 'neutral'}`}><div className="v num">{pct(b.margin)}</div><div className="l">רווחיות</div></div>
        </div>
      </div>

      <nav className="tabs">
        <NavLink to="" end>סקירה</NavLink>
        <NavLink to="intake">קליטה</NavLink>
        <NavLink to="measurements">מדידות{job.measurements.length > 0 && <span className="faint num">{job.measurements.length}</span>}</NavLink>
        <NavLink to="units">יחידות{job.units.length > 0 && <span className="faint num">{job.units.length}</span>}</NavLink>
        <NavLink to="pricing">תמחור</NavLink>
        <NavLink to="quote">הצעת מחיר{pendingChange && <Badge tone="warn">בקשת שינוי</Badge>}</NavLink>
        <NavLink to="revisions">גרסאות{job.revisions.length > 0 && <span className="faint num">{job.revisions.length}</span>}</NavLink>
      </nav>

      <Outlet context={ctx} />

      {askUnlock && (
        <Modal title="העבודה נעולה לייצור" onClose={() => setAskUnlock(false)}>
          <p>גרסת הייצור {last?.version} קפואה. שינוי עכשיו ייצור <strong>גרסת ייצור {(last?.version ?? 0) + 1}</strong> וידרוש עדכון של הייצור בפועל.</p>
          <div className="row end" style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={() => setAskUnlock(false)}>ביטול</button>
            <button className="btn primary" onClick={() => { dispatch({ type: 'job/openProductionChange', id: job.id }); setAskUnlock(false) }}>פתח לשינוי</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
