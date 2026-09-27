import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { priceQuote, quoteExpired } from '../engine/quote'
import { uid } from '../model/presets'
import type { QuoteOption } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, Field, NumInput } from '../ui/components'
import { dateShort, money, pct, ver } from '../ui/format'
import type { JobCtx } from './JobLayout'

export function QuoteTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const { state, dispatch } = useStore()
  const s = state.settings
  const q = job.quote
  const setQ = (patch: Partial<typeof q>) => guard() && update((j) => ({ ...j, quote: { ...j.quote, ...patch } }))
  const priced = priceQuote(job, state)
  const [copied, setCopied] = useState(false)
  const last = job.revisions.at(-1)
  const outdated = q.sentAt && last && q.sentRevisionId !== last.id
  const dirty = last && JSON.stringify([last.units, last.extras, last.quotedPrice]) !== JSON.stringify([job.units, job.extras, job.quotedPrice])
  const link = `${location.origin}${location.pathname}#/q/${job.id}`
  const pendingChange = q.changeRequests.length > 0 && (!q.sentAt || q.changeRequests.at(-1)!.at > q.sentAt)
  const canSend = job.units.length > 0 && q.includedUnitIds.length > 0 && job.status !== 'lost'

  const setOpt = (id: string, patch: Partial<QuoteOption>) => setQ({ options: q.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
  const thick = state.materials.filter((m) => m.thickness > 10)

  return (
    <div className="split">
      <div className="stack">
        {pendingChange && (
          <div className="callout warn">
            <strong>הלקוח ביקש שינוי</strong> <span className="faint num">{dateShort(q.changeRequests.at(-1)!.at)}</span>
            <p style={{ margin: '.3rem 0 0' }}>{q.changeRequests.at(-1)!.text}</p>
            <div className="row" style={{ marginTop: '.5rem' }}><Link className="btn sm" to="../units">עדכן יחידות</Link><Link className="btn sm" to="../pricing">עדכן מחיר</Link></div>
          </div>
        )}
        <Card title="היקף העבודה, מה נכנס להצעה">
          {job.units.length === 0 ? <p className="muted">אין יחידות. <Link to="../units" style={{ color: 'var(--wood)', fontWeight: 600 }}>הוסף יחידות</Link>.</p> : (
            <div className="stack">
              {job.units.map((u) => {
                const on = q.includedUnitIds.includes(u.id)
                return (
                  <div key={u.id} className="row" style={{ alignItems: 'flex-start' }}>
                    <label className="check" style={{ minWidth: 200 }}><input type="checkbox" checked={on} onChange={(e) => setQ({ includedUnitIds: e.target.checked ? [...q.includedUnitIds, u.id] : q.includedUnitIds.filter((x) => x !== u.id) })} /> <strong>{u.name}</strong>{u.qty > 1 && <span className="faint"> × {u.qty}</span>}</label>
                    <input className="input" style={{ flex: 1 }} placeholder={autoDescription(u, state)} value={q.unitDescriptions[u.id] ?? ''} onChange={(e) => setQ({ unitDescriptions: { ...q.unitDescriptions, [u.id]: e.target.value } })} />
                  </div>
                )
              })}
              <p className="faint">התיאור האפור נוצר אוטומטית מהיחידה. הקלד כדי להחליף.</p>
            </div>
          )}
        </Card>

        <Card title="אפשרויות, אותה עבודה בחומרים אחרים" right={<button className="btn sm" onClick={() => guard() && setQ({ options: [...q.options, { id: uid(), name: `אפשרות ${'בגדה'[q.options.length] ?? q.options.length + 2}` }] })}>+ אפשרות</button>}>
          <p className="faint">אפשרות א׳ היא ההצעה הבסיסית. כל אפשרות נוספת מחליפה חומר בכל היחידות הפרמטריות ומתומחרת באותה רווחיות ({pct(priced.margin)}).</p>
          {q.options.map((o, i) => {
            const p = priced.options[i]
            return (
              <div key={o.id} className="card flat" style={{ marginTop: '.6rem' }}>
                <div className="inline">
                  <Field label="שם"><input value={o.name} onChange={(e) => setOpt(o.id, { name: e.target.value })} /></Field>
                  <Field label="חומר דלתות וחזיתות"><select value={o.doorMaterialId ?? ''} onChange={(e) => setOpt(o.id, { doorMaterialId: e.target.value || undefined })}><option value="">כמו הבסיס</option>{thick.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
                  <Field label="חומר גוף"><select value={o.carcassMaterialId ?? ''} onChange={(e) => setOpt(o.id, { carcassMaterialId: e.target.value || undefined })}><option value="">כמו הבסיס</option>{thick.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
                </div>
                <div className="row between" style={{ marginTop: '.5rem' }}>
                  <input className="input" placeholder="תיאור ללקוח (לא חובה)" value={o.description ?? ''} onChange={(e) => setOpt(o.id, { description: e.target.value })} style={{ flex: 1 }} />
                  <strong className="num">{money(p.price)}</strong>
                  <button className="btn sm ghost danger" onClick={() => setQ({ options: q.options.filter((x) => x.id !== o.id) })}>×</button>
                </div>
              </div>
            )
          })}
        </Card>

        <Card title="תנאים">
          <div className="stack">
            <Field label="פתיח (לא חובה)"><textarea rows={2} value={q.intro} onChange={(e) => setQ({ intro: e.target.value })} placeholder="תודה על הפנייה. להלן הצעת מחיר ל…" /></Field>
            <Field label="כלול"><textarea rows={2} value={q.inclusions} onChange={(e) => setQ({ inclusions: e.target.value })} /></Field>
            <Field label="לא כלול"><textarea rows={2} value={q.exclusions} onChange={(e) => setQ({ exclusions: e.target.value })} /></Field>
            <div className="inline">
              <Field label="תנאי תשלום"><input value={q.paymentSchedule} onChange={(e) => setQ({ paymentSchedule: e.target.value })} /></Field>
              <Field label="זמן אספקה" suffix="שבועות"><NumInput value={q.timelineWeeks} min={1} onChange={(v) => setQ({ timelineWeeks: v ?? 4 })} /></Field>
              <Field label="תוקף" suffix="ימים"><NumInput value={q.validityDays} min={1} onChange={(v) => setQ({ validityDays: v ?? 14 })} /></Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="sticky stack">
        <Card title="סיכום">
          <div className="row between"><span className="muted">{q.options.length > 0 ? 'אפשרות א׳ (בסיס)' : 'ההצעה'}</span><strong className="num">{money(priced.base.price)}</strong></div>
          {priced.options.map((p) => <div className="row between" key={p.option!.id}><span className="muted">{p.option!.name}</span><span className="num">{money(p.price)}</span></div>)}
          <div className="row between" style={{ marginTop: '.4rem' }}><span className="muted">מע״מ {pct(s.vat)}</span><span className="num">{money(priced.base.price * s.vat)}</span></div>
          <div className="row between"><span>סה״כ כולל מע״מ</span><strong className="num" style={{ fontSize: '1.2rem' }}>{money(priced.base.price * (1 + s.vat))}</strong></div>
          <div className="row between small" style={{ marginTop: '.4rem' }}><span className="muted">רווחיות</span><span className="num">{pct(priced.margin)}</span></div>
          {job.quotedPrice == null && <div className="callout warn small" style={{ marginTop: '.5rem' }}>לא נקבע מחיר בתמחור, ההצעה משתמשת במחיר המומלץ.</div>}
        </Card>

        <Card title="שליחה">
          {q.sentAt ? (
            <div className="stack small">
              <div className="row between"><span className="muted">נשלחה</span><span className="num">{dateShort(q.sentAt)}</span></div>
              <div className="row between"><span className="muted">גרסה</span><span>{ver(job.revisions.find((r) => r.id === q.sentRevisionId)?.version)}</span></div>
              <div className="row between"><span className="muted">הלקוח פתח</span><span>{q.viewedAt ? <span className="num">{dateShort(q.viewedAt)}</span> : <Badge>עדיין לא</Badge>}</span></div>
              {q.approvedAt && <div className="callout ok">אושר {dateShort(q.approvedAt)}{q.approvedOptionId && ` · ${q.options.find((o) => o.id === q.approvedOptionId)?.name}`}</div>}
              {quoteExpired(q) && !q.approvedAt && <Badge tone="bad">פג תוקף</Badge>}
              {(outdated || dirty) && !q.approvedAt && <div className="callout warn">יש שינויים מאז השליחה. שלח שוב כדי שהלקוח יראה את הגרסה העדכנית.</div>}
            </div>
          ) : <p className="muted small">ההצעה עוד לא נשלחה.</p>}
          <div className="row" style={{ marginTop: '.7rem' }}>
            <button className="btn primary" disabled={!canSend || !!q.approvedAt} onClick={() => { dispatch({ type: 'job/sendQuote', id: job.id }) }}>{q.sentAt ? 'שלח גרסה מעודכנת' : 'שלח הצעה'}</button>
            {q.sentAt && <a className="btn" href={link} target="_blank" rel="noreferrer">פתח כלקוח</a>}
          </div>
          {q.sentAt && (
            <div style={{ marginTop: '.6rem' }}>
              <div className="row nowrap"><input readOnly value={link} className="input num" style={{ flex: 1, fontSize: '.75rem', background: 'var(--surface-2)' }} /><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'הועתק' : 'העתק'}</button></div>
              <p className="faint" style={{ marginTop: '.4rem' }}>בגרסה הזו הקישור עובד רק בדפדפן הזה, אין שרת. כדי לשלוח ללקוח: פתח כלקוח, הדפס לקובץ PDF, שלח בוואטסאפ.</p>
            </div>
          )}
        </Card>

        {q.changeRequests.length > 0 && (
          <Card title="בקשות שינוי">
            <ul className="timeline">{[...q.changeRequests].reverse().map((c, i) => <li key={i}><time className="num">{dateShort(c.at)}</time><span>{c.text}</span></li>)}</ul>
          </Card>
        )}
      </div>
    </div>
  )
}

export function autoDescription(u: import('../model/types').Unit, state: { materials: { id: string; name: string }[] }): string {
  const mat = (id: string) => state.materials.find((m) => m.id === id)?.name ?? ''
  if (u.kind === 'parametric') {
    const bays = u.bays.length
    const shelves = u.bays.filter((b) => b.content === 'shelves').reduce((a, b) => a + b.count, 0)
    const drawers = u.bays.filter((b) => b.content === 'drawers').reduce((a, b) => a + b.count, 0)
    const hanging = u.bays.filter((b) => b.content === 'hanging').length
    const parts = [`${u.width.value ?? '?'}×${u.height.value ?? '?'}×${u.depth.value ?? '?'} מ״מ`, `${bays} תאים`, shelves && `${shelves} מדפים`, hanging && `${hanging} תלייה`, drawers && `${drawers} מגירות`, u.doors.count && `${u.doors.count} דלתות ${u.doors.type === 'sliding' ? 'הזזה' : ''}`.trim(), `גוף ${mat(u.carcassMaterialId)}`, u.doorMaterialId !== u.carcassMaterialId && `חזיתות ${mat(u.doorMaterialId)}`]
    return parts.filter(Boolean).join(' · ')
  }
  if (u.kind === 'area') {
    const a = u.width.value != null && u.height.value != null ? ((u.width.value / 1000) * (u.height.value / 1000)).toFixed(1) : '?'
    return `${u.width.value ?? '?'}×${u.height.value ?? '?'} מ״מ · ${a} מ״ר · ${mat(u.materialId)}`
  }
  return u.description || 'עבודה בהתאמה אישית'
}
