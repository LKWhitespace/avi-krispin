import { Link, useOutletContext } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import { PRODUCTION_SAFE_SOURCES } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, sourceTone } from '../ui/components'
import { SOURCE_LABEL, dateShort, money } from '../ui/format'
import type { JobCtx } from './JobLayout'
import { nextAction } from './JobsPage'

export function OverviewTab() {
  const { job } = useOutletContext<JobCtx>()
  const { state, dispatch } = useStore()
  const b = priceJobLive(job, state.materials, state.hardware, state.settings)

  const dims = job.units.flatMap((u) => u.kind === 'freeform' ? [] : [u.width, u.height, ...(u.kind === 'parametric' ? [u.depth] : [])])
  const bySource = dims.reduce<Record<string, number>>((acc, d) => { acc[d.source] = (acc[d.source] ?? 0) + 1; return acc }, {})
  const unverifiedParametric = job.units.filter((u) => u.kind === 'parametric').flatMap((u) => [u.width, u.height, u.depth]).filter((d) => !PRODUCTION_SAFE_SOURCES.includes(d.source)).length
  const last = job.revisions.at(-1)

  return (
    <div className="split">
      <div className="stack">
        <Card title="הצעד הבא">
          <div className="row between">
            <strong>{nextAction(job)}</strong>
            <div className="row">
              {job.status === 'draft' && job.units.length > 0 && <Link className="btn primary" to="../pricing">לתמחור</Link>}
              {job.status === 'quoted' && (
                <button className="btn primary" onClick={() => dispatch({ type: 'job/status', id: job.id, status: 'approved', event: 'הלקוח אישר את ההצעה' })}>סמן: הלקוח אישר</button>
              )}
              {job.status === 'approved' && (
                <button className="btn primary" disabled={unverifiedParametric > 0} title={unverifiedParametric > 0 ? `${unverifiedParametric} מידות טרם נמדדו בשטח` : ''} onClick={() => dispatch({ type: 'job/lock', id: job.id })}>נעל לייצור</button>
              )}
              {(job.status === 'draft' || job.status === 'quoted') && (
                <button className="btn" onClick={() => dispatch({ type: 'job/status', id: job.id, status: 'lost', event: 'סומן כלא נסגר' })}>לא נסגר</button>
              )}
            </div>
          </div>
          {job.status === 'approved' && unverifiedParametric > 0 && (
            <div className="callout bad" style={{ marginTop: '.7rem' }}>{unverifiedParametric} מידות של יחידות פרמטריות אינן "נמדד"/"מאומת". נעילה לייצור חסומה עד שהן יסומנו כך ב־Units.</div>
          )}
          {job.status === 'locked' && !job.productionChangePending && <div className="callout ok" style={{ marginTop: '.7rem' }}>מוכן לייצור. Production Revision V{last?.version}. BOM ו־cut list — בגרסה הבאה.</div>}
        </Card>

        <Card title="יחידות" right={<Link className="btn sm" to="../units">עריכה</Link>}>
          {job.units.length === 0 ? <p className="muted">אין יחידות עדיין.</p> : (
            <table>
              <thead><tr><th>יחידה</th><th>סוג</th><th>מידות</th><th className="num">עלות ליחידה</th><th className="num">כמות</th></tr></thead>
              <tbody>
                {b.units.map((uc, i) => {
                  const u = job.units[i]
                  const d = u.kind === 'freeform' ? '—' : u.kind === 'parametric' ? `${u.width.value ?? '?'}×${u.height.value ?? '?'}×${u.depth.value ?? '?'}` : `${u.width.value ?? '?'}×${u.height.value ?? '?'}`
                  return (
                    <tr key={u.id}>
                      <td>{u.name}{uc.incomplete && <> <Badge tone="bad">Missing</Badge></>}</td>
                      <td className="muted">{u.kind === 'parametric' ? 'פרמטרי' : u.kind === 'area' ? 'שטח' : 'חופשי'}</td>
                      <td className="num">{d}</td>
                      <td className="num">{money(uc.materials + uc.hardware + uc.labor + uc.subcontractors)}</td>
                      <td className="num">{u.qty}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        {b.warnings.length > 0 && (
          <div className="callout warn"><strong>אזהרות</strong><ul>{b.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
        )}
      </div>

      <div className="stack">
        <Card title="מידות · ביטחון">
          {dims.length === 0 ? <p className="muted">אין מידות.</p> : (
            <div className="row">{Object.entries(bySource).map(([s, n]) => <Badge key={s} tone={sourceTone(s as never)}>{n} {SOURCE_LABEL[s]}</Badge>)}</div>
          )}
          <p className="faint" style={{ marginTop: '.5rem' }}>מידות "הערכה" ו"לקוח" מותרות לתמחור, לא לייצור.</p>
        </Card>
        <Card title="לקוח">
          <div>{job.customer.name}</div>
          <div className="muted small num">{job.customer.phone}</div>
          <div className="muted small">{job.customer.address}</div>
        </Card>
        <Card title="ציר זמן">
          <ul className="timeline">
            {[...job.events].reverse().slice(0, 12).map((e, i) => <li key={i}><time className="num">{dateShort(e.at)}</time><span>{e.text}</span></li>)}
          </ul>
        </Card>
        <button className="btn ghost danger sm" onClick={() => { if (confirm('למחוק את ה־Job? אין שחזור.')) { dispatch({ type: 'job/delete', id: job.id }); location.hash = '#/' } }}>מחק Job</button>
      </div>
    </div>
  )
}
