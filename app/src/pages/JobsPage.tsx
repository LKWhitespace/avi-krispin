import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import type { Job, JobStatus, ProjectType } from '../model/types'
import { newJob, useStore } from '../store/store'
import { Badge, Card, Field, Modal, marginTone } from '../ui/components'
import { PROJECT_LABEL, STATUS_LABEL, money, pct } from '../ui/format'

export function nextAction(j: Job): string {
  if (j.status === 'lost') return 'סגור'
  if (j.status === 'locked') return j.productionChangePending ? 'שינוי ייצור ממתין לגרסה' : 'מוכן לייצור'
  if (j.status === 'approved') return 'נעל לייצור אחרי אימות מידות'
  if (j.units.length === 0) return 'הוסף יחידות לתמחור'
  const missing = j.units.some((u) => u.kind !== 'freeform' && (u.width.value == null || u.height.value == null || (u.kind === 'parametric' && u.depth.value == null)))
  if (missing) return 'השלם מידות חסרות'
  if (j.quotedPrice == null) return 'קבע מחיר להצעה'
  if (j.quote.changeRequests.length > 0 && (!j.quote.sentAt || j.quote.changeRequests.at(-1)!.at > j.quote.sentAt)) return 'הלקוח ביקש שינוי — עדכן ושלח שוב'
  if (!j.quote.sentAt) return 'שלח הצעה ללקוח'
  const last = j.revisions.at(-1)
  if (last && j.quote.sentRevisionId !== last.id) return 'יש גרסה חדשה — שלח הצעה מעודכנת'
  return 'ממתין ללקוח'
}

export function JobsPage() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', projectType: 'wardrobe' as ProjectType })

  const jobs = useMemo(() => state.jobs.filter((j) => (filter === 'all' || j.status === filter) && (q === '' || `${j.customer.name} ${j.customer.address} ${j.number}`.includes(q))), [state.jobs, filter, q])

  const create = () => {
    const job = newJob(state.nextJobNumber, { name: form.name || 'לקוח חדש', phone: form.phone, address: form.address }, form.projectType, state.settings)
    dispatch({ type: 'job/create', job })
    setCreating(false)
    nav(`/jobs/${job.id}/intake`)
  }

  return (
    <div className="stack">
      {!state.settings.onboarded && (
        <div className="callout warn row between">
          <span>הגדרות הנגרייה עדיין לא הושלמו — תעריף שעה ו־margin יעד משפיעים על כל מחיר.</span>
          <Link className="btn sm" to="/settings">להגדרות</Link>
        </div>
      )}
      <div className="row between">
        <h1>Jobs</h1>
        <div className="row">
          <input placeholder="חיפוש לקוח / כתובת" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '.45rem .6rem', background: 'var(--surface)' }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value as JobStatus | 'all')} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '.45rem .6rem', background: 'var(--surface)' }}>
            <option value="all">הכול</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn primary" onClick={() => setCreating(true)}>+ Job חדש</button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty card">
          <h2>אין Jobs עדיין</h2>
          <p>צור Job ראשון מהודעת וואטסאפ של לקוח, או טען Job לדוגמה.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => setCreating(true)}>+ Job חדש</button>
            <button className="btn" onClick={() => dispatch({ type: 'job/createSample' })}>טען Job לדוגמה</button>
          </div>
        </div>
      ) : (
        <div className="grid cards">
          {jobs.map((j) => {
            const b = priceJobLive(j, state.materials, state.hardware, state.settings)
            const price = j.quotedPrice ?? b.recommended
            const last = j.revisions.at(-1)
            return (
              <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
                <div className="row between" style={{ marginBottom: '.4rem' }}>
                  <strong>#{j.number} · {j.customer.name}</strong>
                  <Badge tone={j.status === 'locked' ? 'accent' : j.status === 'lost' ? 'bad' : j.status === 'draft' ? '' : 'ok'}>{STATUS_LABEL[j.status]}</Badge>
                </div>
                <div className="muted small">{PROJECT_LABEL[j.projectType]} · {j.units.length} יחידות{last ? ` · V${last.version}` : ''}</div>
                <div className="row between" style={{ marginTop: '.7rem' }}>
                  <span className="num" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{money(price)}</span>
                  <Badge tone={marginTone(b.margin, state.settings.targetMargin)}>margin {pct(b.margin)}</Badge>
                </div>
                <div className="faint" style={{ marginTop: '.5rem' }}>→ {nextAction(j)}</div>
              </Card>
            )
          })}
        </div>
      )}

      {creating && (
        <Modal title="Job חדש" onClose={() => setCreating(false)}>
          <div className="stack">
            <Field label="שם לקוח"><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="inline">
              <Field label="טלפון"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="כתובת"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
            <Field label="סוג פרויקט">
              <select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}>
                {Object.entries(PROJECT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setCreating(false)}>ביטול</button>
              <button className="btn primary" onClick={create}>צור והמשך ליחידות</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
