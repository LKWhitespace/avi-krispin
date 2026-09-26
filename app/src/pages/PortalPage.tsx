import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { priceQuoteFromRevision, quoteExpired } from '../engine/quote'
import { useJob, useStore } from '../store/store'
import { money, pct } from '../ui/format'
import { autoDescription } from './QuoteTab'

/** What the client sees. No login: the link is the credential. Rendered from the SENT revision, never live state. */
export function PortalPage() {
  const { id } = useParams()
  const job = useJob(id)
  const { state, dispatch } = useStore()
  const [asking, setAsking] = useState(false)
  const [text, setText] = useState('')
  const [chosen, setChosen] = useState<string | undefined>(undefined)
  const [thanks, setThanks] = useState<'approved' | 'requested' | null>(null)

  useEffect(() => { if (job?.quote.sentAt) dispatch({ type: 'job/portalViewed', id: job.id }) }, [job?.id, job?.quote.sentAt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!job || !job.quote.sentAt || !job.quote.sentRevisionId) return <div className="empty"><h2>ההצעה לא נמצאה</h2></div>
  const rev = job.revisions.find((r) => r.id === job.quote.sentRevisionId)
  if (!rev) return <div className="empty"><h2>ההצעה לא נמצאה</h2></div>
  const q = job.quote
  const sentAt = job.quote.sentAt as string
  const s = rev.settings
  const priced = priceQuoteFromRevision(rev, q)
  const expired = quoteExpired(q) && !q.approvedAt
  const approved = !!q.approvedAt
  const units = rev.units.filter((u) => q.includedUnitIds.includes(u.id))
  const mats = Object.values(rev.materials)
  const optionRows = [{ id: undefined as string | undefined, name: q.options.length > 0 ? 'אופציה A' : 'הצעה', description: '', price: priced.base.price }, ...priced.options.map((p) => ({ id: p.option!.id, name: p.option!.name, description: p.option!.description ?? '', price: p.price }))]
  const selected = optionRows.find((o) => o.id === chosen) ?? optionRows[0]
  const withVat = (n: number) => n * (1 + s.vat)

  return (
    <div className="portal">
      <style>{`
        .portal { max-width: 760px; margin: 0 auto; padding: 1.2rem 1rem 4rem; }
        .portal header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-bottom: 1rem; border-bottom: 2px solid var(--accent); margin-bottom: 1.2rem; }
        .portal .unit { display: grid; grid-template-columns: 1fr auto; gap: .6rem; padding: .8rem 0; border-bottom: 1px solid var(--line); }
        .portal .opt { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .8rem 1rem; border: 2px solid var(--line); border-radius: 12px; cursor: pointer; margin-bottom: .5rem; background: var(--surface); }
        .portal .opt.on { border-color: var(--accent); }
        .portal .total { display: flex; justify-content: space-between; align-items: baseline; font-size: 1.35rem; font-weight: 700; margin-top: 1rem; padding-top: .8rem; border-top: 2px solid var(--line); }
        .portal .actions { display: flex; gap: .7rem; flex-wrap: wrap; margin-top: 1.4rem; }
        .portal .actions .btn { padding: .8rem 1.4rem; font-size: 1.05rem; }
        .portal h2 { font-size: 1rem; color: var(--ink-2); margin: 1.2rem 0 .4rem; }
        @media print { .portal .actions, .portal .noprint { display: none !important; } body { background: #fff; } .portal { padding: 0; } }
      `}</style>
      <header>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{s.businessName || 'הצעת מחיר'}</div>
          <div className="faint">{[s.quote.phone, s.quote.email, s.quote.address].filter(Boolean).join(' · ')}</div>
        </div>
        {s.quote.logo && <img src={s.quote.logo} alt="" style={{ height: 52 }} />}
      </header>

      <div className="row between">
        <div>
          <h1 style={{ marginBottom: 0 }}>הצעת מחיר · {job.customer.name}</h1>
          <div className="muted">#{job.number} · גרסה V{rev.version} · {new Date(sentAt).toLocaleDateString('he-IL')} · בתוקף {q.validityDays} ימים</div>
        </div>
        <div className="noprint">{approved ? <span className="badge ok">אושר</span> : expired ? <span className="badge bad">פג תוקף</span> : null}</div>
      </div>

      {q.intro && <p style={{ marginTop: '1rem' }}>{q.intro}</p>}

      <h2>מה כלול בעבודה</h2>
      {units.map((u) => (
        <div className="unit" key={u.id}>
          <div>
            <strong>{u.name}</strong>{u.qty > 1 && <span className="muted"> × {u.qty}</span>}
            <div className="muted small">{q.unitDescriptions[u.id] || autoDescription(u, { materials: mats })}</div>
          </div>
          {u.kind === 'parametric' && (
            <div className="row" style={{ gap: '.3rem' }}>
              {[u.carcassMaterialId, u.doorMaterialId].filter((v, i, a) => a.indexOf(v) === i).map((mid) => <span key={mid} className="swatch" title={rev.materials[mid]?.name} style={{ background: rev.materials[mid]?.swatch ?? '#ddd', width: 22, height: 22 }} />)}
            </div>
          )}
        </div>
      ))}

      {optionRows.length > 1 && <h2>אפשרויות</h2>}
      {optionRows.length > 1 && optionRows.map((o) => (
        <div key={o.id ?? 'base'} className={`opt ${selected.id === o.id ? 'on' : ''}`} onClick={() => !approved && setChosen(o.id)}>
          <div><strong>{o.name}</strong>{o.description && <div className="muted small">{o.description}</div>}</div>
          <div className="num" style={{ fontWeight: 700 }}>{money(withVat(o.price))}</div>
        </div>
      ))}

      <div className="total"><span>סה״כ כולל מע״מ ({pct(s.vat)})</span><span className="num">{money(withVat(selected.price))}</span></div>
      <div className="faint" style={{ textAlign: 'end' }}>לפני מע״מ {money(selected.price)}</div>

      <div className="grid two" style={{ marginTop: '1rem' }}>
        <div><h2>כלול</h2><p className="small">{q.inclusions}</p></div>
        <div><h2>לא כלול</h2><p className="small">{q.exclusions}</p></div>
        <div><h2>זמן אספקה</h2><p className="small">כ־{q.timelineWeeks} שבועות מאישור ההצעה ומדידה סופית.</p></div>
        <div><h2>תשלום</h2><p className="small">{q.paymentSchedule}</p></div>
      </div>

      {thanks === 'approved' && <div className="callout ok" style={{ marginTop: '1.2rem' }}>תודה! ההצעה אושרה. ניצור קשר לתיאום מדידה סופית.</div>}
      {thanks === 'requested' && <div className="callout info" style={{ marginTop: '1.2rem' }}>הבקשה התקבלה. נחזור אליך עם הצעה מעודכנת.</div>}

      {!approved && !thanks && (
        <div className="actions">
          <button className="btn primary" disabled={expired} onClick={() => { dispatch({ type: 'job/approve', id: job.id, optionId: selected.id }); setThanks('approved') }}>אישור ההצעה{optionRows.length > 1 ? ` · ${selected.name}` : ''}</button>
          <button className="btn" onClick={() => setAsking(true)}>בקשת שינוי</button>
          <button className="btn ghost" onClick={() => window.print()}>הדפסה / PDF</button>
        </div>
      )}
      {(approved || thanks) && <div className="actions"><button className="btn ghost" onClick={() => window.print()}>הדפסה / PDF</button></div>}
      {expired && !approved && <p className="faint noprint">ההצעה פגה. פנה אלינו לקבלת הצעה מעודכנת.</p>}

      {asking && (
        <div className="modal-bg noprint" onClick={() => setAsking(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 .5rem', fontSize: '1.15rem', color: 'var(--ink)' }}>מה תרצו לשנות?</h2>
            <textarea rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: אפשר שהמגירות יהיו 80 במקום 60?" style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '.5rem' }} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.6rem' }}>
              <button className="btn" onClick={() => setAsking(false)}>ביטול</button>
              <button className="btn primary" disabled={!text.trim()} onClick={() => { dispatch({ type: 'job/changeRequest', id: job.id, text: text.trim() }); setAsking(false); setThanks('requested') }}>שלח</button>
            </div>
          </div>
        </div>
      )}
      <p className="faint noprint" style={{ marginTop: '2rem' }}>הצעה זו נוצרה ב־Quote-to-Build{state.settings.businessName ? ` עבור ${state.settings.businessName}` : ''}.</p>
    </div>
  )
}
