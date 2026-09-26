import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { computeImpact, toSnapshot } from '../engine/impact'
import { byId, priceJob } from '../engine/pricing'
import type { Revision } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card } from '../ui/components'
import { dateShort, money, pct, signed, signedMoney } from '../ui/format'
import type { JobCtx } from './JobLayout'

const TRIGGER: Record<Revision['trigger'], string> = { initial: 'ראשונה', manual: 'ידני', client_request: 'בקשת לקוח', production_change: 'שינוי ייצור', restore: 'שחזור' }

export function RevisionsTab() {
  const { job, guard } = useOutletContext<JobCtx>()
  const { state, dispatch } = useStore()
  const revs = job.revisions
  const [a, setA] = useState<string | null>(revs.at(-2)?.id ?? null)
  const [b, setB] = useState<string | 'live'>(revs.at(-1)?.id ?? 'live')

  const live = useMemo(() => ({ units: job.units, extras: job.extras, quotedPrice: job.quotedPrice, materials: byId(state.materials), hardware: byId(state.hardware), settings: state.settings }), [job, state])
  const snapA = revs.find((r) => r.id === a)
  const snapB = b === 'live' ? live : (() => { const r = revs.find((r) => r.id === b); return r ? toSnapshot(r) : undefined })()
  const impact = snapA && snapB ? computeImpact(toSnapshot(snapA), snapB) : null

  if (revs.length === 0) return <div className="empty card"><h2>אין גרסאות עדיין</h2><p>שמור גרסה ראשונה מטאב Pricing. מכאן והלאה כל שינוי יושווה אליה.</p></div>

  return (
    <div className="stack">
      <Card title="גרסאות">
        <table>
          <thead><tr><th>גרסה</th><th>תאריך</th><th>טריגר</th><th>הערה</th><th className="num">מחיר</th><th className="num">margin</th><th></th></tr></thead>
          <tbody>
            {revs.map((r) => {
              const br = priceJob(toSnapshot(r))
              return (
                <tr key={r.id}>
                  <td><strong>V{r.version}</strong> {r.locked && <Badge tone="accent">Production</Badge>}</td>
                  <td className="num small">{dateShort(r.createdAt)}</td>
                  <td className="muted">{TRIGGER[r.trigger]}</td>
                  <td className="muted small">{r.note ?? ''}</td>
                  <td className="num">{money(r.quotedPrice ?? br.recommended)}{r.quotedPrice == null && <span className="faint"> (מומלץ)</span>}</td>
                  <td className="num">{pct(br.margin)}</td>
                  <td className="row" style={{ gap: '.3rem' }}>
                    <button className={`btn sm ${a === r.id ? 'primary' : ''}`} onClick={() => setA(r.id)}>לפני</button>
                    <button className={`btn sm ${b === r.id ? 'primary' : ''}`} onClick={() => setB(r.id)}>אחרי</button>
                    <button className="btn sm ghost" title="טוען את הגרסה למצב העבודה; שמור אחר כך כגרסה חדשה" onClick={() => guard() && dispatch({ type: 'job/restore', id: job.id, revisionId: r.id })}>שחזר</button>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td><strong>מצב נוכחי</strong> <Badge tone="warn">לא שמור</Badge></td><td /><td /><td />
              <td className="num">{money(job.quotedPrice ?? priceJob(live).recommended)}</td>
              <td className="num">{pct(priceJob(live).margin)}</td>
              <td><button className={`btn sm ${b === 'live' ? 'primary' : ''}`} onClick={() => setB('live')}>אחרי</button></td>
            </tr>
          </tbody>
        </table>
      </Card>

      {impact && snapA && (
        <Card title={`Change Impact · V${snapA.version} → ${b === 'live' ? 'מצב נוכחי' : `V${revs.find((r) => r.id === b)?.version}`}`}>
          <div className="impact">
            <div className="cell"><div className="l">מחיר</div><div className={`v num delta ${impact.price > 0 ? 'up' : impact.price < 0 ? 'down' : 'zero'}`}>{signedMoney(impact.price)}</div></div>
            <div className="cell"><div className="l">עלות</div><div className={`v num delta ${impact.cost > 0 ? 'up' : impact.cost < 0 ? 'down' : 'zero'}`}>{signedMoney(impact.cost)}</div></div>
            <div className="cell"><div className="l">margin</div><div className="v num">{pct(impact.marginBefore)} → {pct(impact.marginAfter)}</div></div>
            <div className="cell"><div className="l">שעות עבודה</div><div className="v num">{signed(impact.laborHours)}</div></div>
          </div>
          <div className="grid two" style={{ marginTop: '.9rem' }}>
            <div>
              <h3>חומרים ופרזול</h3>
              {impact.sheets.length === 0 && impact.hardware.length === 0 ? <p className="muted">ללא שינוי</p> : (
                <table><tbody>
                  {impact.sheets.map((d) => <tr key={'s' + d.label}><td>{d.label}</td><td className="num">{d.before} → {d.after}</td><td className={`num delta ${d.diff > 0 ? 'up' : 'down'}`}>{signed(d.diff)} לוחות</td></tr>)}
                  {impact.hardware.map((d) => <tr key={'h' + d.label}><td>{d.label}</td><td className="num">{d.before} → {d.after}</td><td className={`num delta ${d.diff > 0 ? 'up' : 'down'}`}>{signed(d.diff)}</td></tr>)}
                </tbody></table>
              )}
            </div>
            <div>
              <h3>תכנון</h3>
              {impact.dimensions.length === 0 && impact.unitsAdded.length === 0 && impact.unitsRemoved.length === 0 ? <p className="muted">ללא שינוי</p> : (
                <table><tbody>
                  {impact.unitsAdded.map((n) => <tr key={'a' + n}><td>נוספה יחידה</td><td colSpan={2}>{n}</td></tr>)}
                  {impact.unitsRemoved.map((n) => <tr key={'r' + n}><td>הוסרה יחידה</td><td colSpan={2}>{n}</td></tr>)}
                  {impact.dimensions.map((d, i) => <tr key={i}><td>{d.label}</td><td className="num" colSpan={2}>{d.before} → {d.after}</td></tr>)}
                </tbody></table>
              )}
            </div>
          </div>
          {impact.after.warnings.length > 0 && <div className="callout warn small" style={{ marginTop: '.8rem' }}><ul style={{ margin: 0 }}>{impact.after.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        </Card>
      )}
    </div>
  )
}
