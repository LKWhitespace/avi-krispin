import { Link, useOutletContext } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import { PRODUCTION_SAFE_SOURCES } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, Elevation, sourceTone } from '../ui/components'
import { KIND_LABEL, SOURCE_LABEL, dateShort, money } from '../ui/format'
import type { JobCtx } from './JobLayout'
import { nextAction } from './JobsPage'

export function OverviewTab() {
  const { job } = useOutletContext<JobCtx>()
  const { state, dispatch } = useStore()
  const b = priceJobLive(job, state.materials, state.hardware, state.settings)

  const dims = job.units.flatMap((u) => u.kind === 'freeform' ? [] : [u.width, u.height, ...(u.kind === 'parametric' ? [u.depth] : [])])
  const bySource = dims.reduce<Record<string, number>>((acc, d) => { acc[d.source] = (acc[d.source] ?? 0) + 1; return acc }, {})
  const unverified = job.units.filter((u) => u.kind === 'parametric').flatMap((u) => [u.width, u.height, u.depth]).filter((d) => !PRODUCTION_SAFE_SOURCES.includes(d.source)).length
  const last = job.revisions.at(-1)

  return (
    <div className="split">
      <div className="stack">
        <Card title="הצעד הבא">
          <div className="row between">
            <strong style={{ fontSize: '1.1rem' }}>{nextAction(job)}</strong>
            <div className="row">
              {job.status === 'draft' && job.units.length > 0 && <Link className="btn primary" to="../pricing">לתמחור</Link>}
              {job.status === 'quoted' && !job.quote.sentAt && <Link className="btn primary" to="../quote">להצעת המחיר</Link>}
              {job.status === 'quoted' && job.quote.sentAt && <button className="btn primary" onClick={() => dispatch({ type: 'job/approve', id: job.id })}>סמן: הלקוח אישר</button>}
              {job.status === 'approved' && <button className="btn primary" disabled={unverified > 0} title={unverified > 0 ? `${unverified} מידות טרם נמדדו בשטח` : ''} onClick={() => dispatch({ type: 'job/lock', id: job.id })}>נעל לייצור</button>}
              {(job.status === 'draft' || job.status === 'quoted') && <button className="btn" onClick={() => dispatch({ type: 'job/status', id: job.id, status: 'lost', event: 'סומן כלא נסגר' })}>לא נסגר</button>}
            </div>
          </div>
          {job.status === 'approved' && unverified > 0 && <div className="callout bad" style={{ marginTop: '.8rem' }}>{unverified} מידות של יחידות פרמטריות עדיין לא "נמדד בשטח" או "מאומת". <Link to="../measurements" style={{ textDecoration: 'underline' }}>קשר מדידות</Link> או שנה את המקור ביחידות. עד אז הנעילה חסומה.</div>}
          {job.status === 'locked' && !job.productionChangePending && <div className="callout ok" style={{ marginTop: '.8rem' }}>מוכן לייצור לפי גרסת ייצור {last?.version}. רשימת חומרים ורשימת חיתוך יתווספו בגרסה הבאה של המערכת.</div>}
        </Card>

        <Card title="יחידות" right={<Link className="btn sm" to="../units">עריכה</Link>}>
          {job.units.length === 0 ? <p className="muted">אין יחידות עדיין. <Link to="../intake" style={{ color: 'var(--wood)', fontWeight: 600 }}>התחל מקליטה</Link> או <Link to="../units" style={{ color: 'var(--wood)', fontWeight: 600 }}>הוסף יחידה</Link>.</p> : (
            <div className="grid cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {b.units.map((uc, i) => {
                const u = job.units[i]
                return (
                  <div key={u.id} className="card flat" style={{ padding: '.9rem' }}>
                    {u.kind === 'parametric' ? <Elevation u={u} height={90} /> : <div className="faint" style={{ height: 90, display: 'grid', placeItems: 'center' }}>{KIND_LABEL[u.kind]}</div>}
                    <div className="row between" style={{ marginTop: '.5rem' }}>
                      <strong>{u.name}</strong>
                      {uc.incomplete ? <Badge tone="bad">חסרה מידה</Badge> : <span className="num" style={{ fontWeight: 700 }}>{money(uc.materials + uc.hardware + uc.labor + uc.subcontractors)}</span>}
                    </div>
                    {u.qty > 1 && <div className="faint">× {u.qty}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {b.warnings.length > 0 && <div className="callout warn"><strong>שים לב</strong><ul>{b.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
      </div>

      <div className="stack">
        <Card title="ביטחון במידות">
          {dims.length === 0 ? <p className="muted">אין מידות.</p> : <div className="row">{Object.entries(bySource).map(([s, n]) => <Badge key={s} tone={sourceTone(s as never)}>{n} {SOURCE_LABEL[s]}</Badge>)}</div>}
          <p className="faint" style={{ marginTop: '.6rem' }}>מידות "הערכה" ו"מהלקוח" מספיקות להצעת מחיר, לא לייצור.</p>
        </Card>
        <Card title="לקוח">
          <div style={{ fontWeight: 700 }}>{job.customer.name}</div>
          <div className="muted small num">{job.customer.phone}</div>
          <div className="muted small">{job.customer.address}</div>
        </Card>
        <Card title="ציר זמן">
          <ul className="timeline">{[...job.events].reverse().slice(0, 12).map((e, i) => <li key={i}><time className="num">{dateShort(e.at)}</time><span>{e.text}</span></li>)}</ul>
        </Card>
        <button className="btn ghost danger sm" onClick={() => { if (confirm('למחוק את העבודה? אין שחזור.')) { dispatch({ type: 'job/delete', id: job.id }); location.hash = '#/' } }}>מחק עבודה</button>
      </div>
    </div>
  )
}
