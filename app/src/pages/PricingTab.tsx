import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { priceJobLive } from '../engine/pricing'
import { uid } from '../model/presets'
import { useStore } from '../store/store'
import { Badge, Card, Field, MarginBar, NumInput, PctInput, marginTone } from '../ui/components'
import { fmt, money, pct, ver } from '../ui/format'
import type { JobCtx } from './JobLayout'

export function PricingTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const { state, dispatch } = useStore()
  const s = state.settings
  const b = priceJobLive(job, state.materials, state.hardware, s)
  const [withVat, setWithVat] = useState(false)
  const [note, setNote] = useState('')
  const vat = (n: number | null) => (n == null ? null : withVat ? n * (1 + s.vat) : n)
  const setExtras = (patch: Partial<typeof job.extras>) => guard() && update((j) => ({ ...j, extras: { ...j.extras, ...patch } }))
  const setQuoted = (v: number | null) => guard() && update((j) => ({ ...j, quotedPrice: v }))
  const last = job.revisions.at(-1)
  const nextV = (last?.version ?? 0) + 1
  const shownMargin = job.quotedPrice == null ? s.targetMargin : b.margin

  return (
    <div className="split">
      <div className="stack">
        <Card title="פירוט העלויות">
          <table>
            <tbody>
              <tr><td>חומרים</td><td className="num">{money(b.materials)}</td></tr>
              {b.units.filter((u) => u.materials > 0).map((u) => <tr className="sub" key={u.unitId}><td>{u.name}{u.qty > 1 ? ` × ${u.qty}` : ''}</td><td className="num">{money(u.materials * u.qty)}</td></tr>)}
              <tr><td>פרזול</td><td className="num">{money(b.hardware)}</td></tr>
              <tr><td>עבודה בנגרייה <span className="faint num">{fmt(b.laborHours)} ש׳ × ₪{s.laborRate}</span></td><td className="num">{money(b.labor)}</td></tr>
              <tr><td>התקנה <span className="faint num">{fmt(b.installationHours)} ש׳ × ₪{s.installRate}{job.extras.installationFlat ? ` + ₪${job.extras.installationFlat}` : ''}</span></td><td className="num">{money(b.installation)}</td></tr>
              <tr><td>הובלה</td><td className="num">{money(b.transport)}</td></tr>
              <tr><td>קבלני משנה</td><td className="num">{money(b.subcontractors)}</td></tr>
              <tr className="total"><td>עלות ישירה</td><td className="num">{money(b.directCost)}</td></tr>
              <tr><td>הוצאות קבועות <span className="faint">{s.overheadPerMonth > 0 ? `₪${Math.round(s.overheadPerMonth / s.hoursPerMonth)} לשעה × ${fmt(b.laborHours + b.installationHours)} ש׳` : 'לא הוגדרו'}</span></td><td className="num">{money(b.overhead)}</td></tr>
              <tr><td>סיכון <span className="faint">{pct(job.extras.risk ?? s.risk)}</span></td><td className="num">{money(b.risk)}</td></tr>
              <tr className="total"><td>עלות כוללת</td><td className="num">{money(b.totalCost)}</td></tr>
              <tr><td>מחיר מומלץ <span className="faint">ברווחיות {pct(s.targetMargin)}</span></td><td className="num"><strong>{money(vat(b.recommended))}</strong>{withVat && <span className="faint"> כולל מע״מ</span>}</td></tr>
            </tbody>
          </table>
        </Card>

        <Card title="הוצאות ברמת העבודה">
          <div className="inline">
            <Field label="שעות התקנה"><NumInput value={job.extras.installationHours} min={0} step={0.5} onChange={(v) => setExtras({ installationHours: v ?? 0 })} /></Field>
            <Field label="התקנה, סכום קבוע" suffix="₪"><NumInput value={job.extras.installationFlat} min={0} onChange={(v) => setExtras({ installationFlat: v ?? 0 })} /></Field>
            <Field label="הובלה" suffix="₪"><NumInput value={job.extras.transport} min={0} onChange={(v) => setExtras({ transport: v ?? 0 })} /></Field>
            <Field label="סיכון" suffix={`% (ברירת מחדל ${pct(s.risk)})`}><PctInput value={job.extras.risk ?? s.risk} onChange={(v) => setExtras({ risk: v })} /></Field>
          </div>
          <div className="lines" style={{ marginTop: '1rem' }}>
            <div className="row between" style={{ marginBottom: '.4rem' }}><strong>קבלני משנה</strong><button className="btn sm" onClick={() => setExtras({ subcontractors: [...job.extras.subcontractors, { id: uid(), label: '', cost: 0 }] })}>+ שורה</button></div>
            {job.extras.subcontractors.map((l) => (
              <div className="line-row" key={l.id}>
                <input className="input" placeholder="צבעי, זגג, חיתוך ממוחשב…" value={l.label} onChange={(e) => setExtras({ subcontractors: job.extras.subcontractors.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)) })} />
                <div className="field"><NumInput value={l.cost} min={0} onChange={(v) => setExtras({ subcontractors: job.extras.subcontractors.map((x) => (x.id === l.id ? { ...x, cost: v ?? 0 } : x)) })} /></div>
                <button className="btn sm ghost" onClick={() => setExtras({ subcontractors: job.extras.subcontractors.filter((x) => x.id !== l.id) })}>×</button>
              </div>
            ))}
          </div>
        </Card>

        {b.warnings.length > 0 && <div className="callout warn"><strong>שים לב</strong><ul>{b.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
      </div>

      <div className="sticky stack">
        <div className="hero-card">
          <div className="lbl">מחיר להצעה, לפני מע״מ</div>
          <div className="field" style={{ marginTop: '.4rem' }}>
            <div className="suffix">
              <NumInput value={job.quotedPrice} allowEmpty placeholder={String(b.recommended)} min={0} step={100} onChange={setQuoted} />
              <span style={{ color: '#a89f90' }}>₪</span>
            </div>
          </div>
          <div className="row" style={{ marginTop: '.5rem' }}>
            <button className="btn sm" style={{ background: 'transparent', color: '#f3ede2', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setQuoted(b.recommended)}>השתמש במומלץ</button>
            <label className="check small" style={{ color: '#cfc6b6' }}><input type="checkbox" checked={withVat} onChange={(e) => setWithVat(e.target.checked)} /> הצג כולל מע״מ</label>
          </div>
          <div className="sep" />
          <div className="lbl">{withVat ? 'מחיר כולל מע״מ' : 'מחיר'}</div>
          <div className="price num">{money(vat(job.quotedPrice ?? b.recommended))}</div>
          <div className="sep" />
          <div className="row between"><span className="k">עלות</span><span className="num">{money(b.totalCost)}</span></div>
          <div className="row between"><span className="k">רווח</span><span className="num">{money(job.quotedPrice == null ? b.recommended - b.totalCost : b.profit)}</span></div>
          <div className="row between"><span className="k">רווחיות</span><Badge tone={marginTone(shownMargin, s.targetMargin)}>{pct(shownMargin)}</Badge></div>
          <div style={{ marginTop: '.5rem' }}><MarginBar margin={shownMargin} target={s.targetMargin} /></div>
          <div className="row between small" style={{ marginTop: '.25rem' }}><span className="k">יעד הנגרייה</span><span className="num" style={{ color: '#cfc6b6' }}>{pct(s.targetMargin)}</span></div>
          {b.margin != null && b.margin < s.targetMargin && <div className="callout bad small" style={{ marginTop: '.7rem' }}>רווחיות {pct(b.margin)} מתחת ליעד ({pct(s.targetMargin)}). זו החלטה שלך, רק שתהיה מודעת.</div>}
        </div>

        <Card title={`שמור ${ver(nextV)}`}>
          <Field label="הערה (לא חובה)"><input value={note} placeholder="למשל: אחרי בקשת הלקוח להוסיף מגירות" onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="row" style={{ marginTop: '.7rem' }}>
            <button className="btn primary" disabled={job.units.length === 0} onClick={() => { dispatch({ type: 'job/revision', id: job.id, trigger: last ? 'client_request' : 'initial', note: note || undefined }); setNote('') }}>
              {job.status === 'locked' && job.productionChangePending ? `צור גרסת ייצור ${nextV}` : `שמור ${ver(nextV)}`}
            </button>
          </div>
          <p className="faint" style={{ marginTop: '.6rem' }}>הגרסה מקפיאה את היחידות, מחירי החומרים והתעריפים. שליחה ללקוח נעשית מלשונית הצעת המחיר.</p>
        </Card>
      </div>
    </div>
  )
}
