import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import type { Job, JobStatus, ProjectType } from '../model/types'
import { newJob, useStore } from '../store/store'
import { Badge, Card, Field, Icon, Modal, marginTone } from '../ui/components'
import { PROJECT_LABEL, STATUS_LABEL, money, pct, ver } from '../ui/format'
import { statusTone } from './JobLayout'

export function nextAction(j: Job): string {
  if (j.status === 'lost') return 'סגור'
  if (j.status === 'locked') return j.productionChangePending ? 'שינוי ייצור ממתין לשמירת גרסה' : 'מוכן לייצור'
  if (j.status === 'approved') return 'אמת מידות ונעל לייצור'
  if (j.units.length === 0) return 'הוסף יחידות לתמחור'
  const missing = j.units.some((u) => u.kind !== 'freeform' && (u.width.value == null || u.height.value == null || (u.kind === 'parametric' && u.depth.value == null)))
  if (missing) return 'השלם מידות חסרות'
  if (j.quotedPrice == null) return 'קבע מחיר להצעה'
  if (j.quote.changeRequests.length > 0 && (!j.quote.sentAt || j.quote.changeRequests.at(-1)!.at > j.quote.sentAt)) return 'הלקוח ביקש שינוי, עדכן ושלח שוב'
  if (!j.quote.sentAt) return 'שלח הצעה ללקוח'
  const last = j.revisions.at(-1)
  if (last && j.quote.sentRevisionId !== last.id) return 'יש גרסה חדשה, שלח הצעה מעודכנת'
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
  const counts = useMemo(() => state.jobs.reduce<Record<string, number>>((a, j) => { a[j.status] = (a[j.status] ?? 0) + 1; return a }, {}), [state.jobs])

  const create = () => {
    const job = newJob(state.nextJobNumber, { name: form.name || 'לקוח חדש', phone: form.phone, address: form.address }, form.projectType, state.settings)
    dispatch({ type: 'job/create', job })
    setCreating(false)
    nav(`/jobs/${job.id}/intake`)
  }

  return (
    <div className="stack">
      {!state.settings.onboarded && (
        <div className="onb">
          <div><strong>עוד לא הגדרת את הנגרייה.</strong><div className="muted small">תעריף שעה ויעד רווחיות משפיעים על כל מחיר במערכת. לוקח שתי דקות.</div></div>
          <Link className="btn primary" to="/settings">להגדרות</Link>
        </div>
      )}
      <div className="page-head">
        <div><h1>עבודות</h1><div className="lead">{state.jobs.length === 0 ? 'עדיין אין עבודות' : `${state.jobs.length} עבודות · ${counts.quoted ?? 0} ממתינות ללקוח · ${(counts.approved ?? 0) + (counts.locked ?? 0)} בייצור`}</div></div>
        <div className="row">
          <input className="input" placeholder="חיפוש לקוח או כתובת" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} />
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as JobStatus | 'all')} style={{ width: 'auto' }}>
            <option value="all">כל הסטטוסים</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn primary" onClick={() => setCreating(true)}>+ עבודה חדשה</button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty card">
          <div className="art">🪚</div>
          <h2>{state.jobs.length === 0 ? 'אין עבודות עדיין' : 'אין תוצאות'}</h2>
          <p>צור עבודה ראשונה מהודעת וואטסאפ של לקוח, או טען עבודה לדוגמה.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn primary" onClick={() => setCreating(true)}>+ עבודה חדשה</button>
            <button className="btn" onClick={() => dispatch({ type: 'job/createSample' })}>טען עבודה לדוגמה</button>
          </div>
        </div>
      ) : (
        <div className="grid cards">
          {jobs.map((j) => {
            const b = priceJobLive(j, state.materials, state.hardware, state.settings)
            const price = j.quotedPrice ?? b.recommended
            const last = j.revisions.at(-1)
            return (
              <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)} className="jobcard">
                <div className="top">
                  <div><div className="name">{j.customer.name}</div><div className="faint"><span className="num">{j.number}</span> · {PROJECT_LABEL[j.projectType]} · {j.units.length} יחידות{last ? ` · ${ver(last.version)}` : ''}</div></div>
                  <Badge tone={statusTone(j.status)}>{STATUS_LABEL[j.status]}</Badge>
                </div>
                <div className="row between">
                  <span className="price num">{money(price)}</span>
                  <Badge tone={marginTone(b.margin, state.settings.targetMargin)} plain>רווחיות {pct(b.margin)}</Badge>
                </div>
                <div className="next">{Icon.arrow}{nextAction(j)}</div>
              </Card>
            )
          })}
        </div>
      )}

      {creating && (
        <Modal title="עבודה חדשה" onClose={() => setCreating(false)}>
          <div className="stack">
            <Field label="שם הלקוח"><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="inline">
              <Field label="טלפון"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="כתובת"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
            <Field label="סוג הפרויקט">
              <select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}>
                {Object.entries(PROJECT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="row end">
              <button className="btn" onClick={() => setCreating(false)}>ביטול</button>
              <button className="btn primary" onClick={create}>צור והמשך לקליטה</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
