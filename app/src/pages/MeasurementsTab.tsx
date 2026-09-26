import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { uid } from '../model/presets'
import type { Attachment, Measurement, MeasurementLabel } from '../model/types'
import { Badge, Card, Field, Modal, NumInput } from '../ui/components'
import { dateShort } from '../ui/format'
import { fileToDataUrl } from '../ui/image'
import type { JobCtx } from './JobLayout'

export const MLABEL: Record<MeasurementLabel, string> = { wall_width: 'רוחב קיר', height: 'גובה עד תקרה', depth: 'עומק זמין', socket: 'שקע', pipe: 'צינור', skirting: 'פנל', window: 'חלון', ac: 'מזגן', floor_dev: 'סטיית רצפה', custom: 'אחר' }
const DIM_LABEL = { width: 'רוחב', height: 'גובה', depth: 'עומק' } as const

export function MeasurementsTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const [adding, setAdding] = useState(false)
  const [markup, setMarkup] = useState<{ photo: Attachment; measurement?: Measurement } | null>(null)
  const photos = Object.fromEntries(job.attachments.map((a) => [a.id, a]))

  const add = (m: Measurement) => update((j) => ({ ...j, measurements: [...j.measurements, m] }), `מידה נוספה: ${labelOf(m)} ${m.value} מ״מ`)
  const patch = (id: string, p: Partial<Measurement>) => update((j) => ({ ...j, measurements: j.measurements.map((m) => (m.id === id ? { ...m, ...p } : m)) }))
  const remove = (id: string) => update((j) => ({ ...j, measurements: j.measurements.filter((m) => m.id !== id) }))

  /** Site measurement overrides the unit dimension and raises its source to 'site'. Never the other way round. */
  const link = (m: Measurement, unitId: string, dim: 'width' | 'height' | 'depth') => {
    if (!guard()) return
    const target = job.units.find((u) => u.id === unitId)
    const prev = target && target.kind !== 'freeform' ? (dim === 'depth' ? (target.kind === 'parametric' ? target.depth.value : null) : target[dim].value) : null
    const gap = prev != null ? m.value - prev : null
    update((j) => ({
      ...j,
      measurements: j.measurements.map((x) => (x.id === m.id ? { ...x, linkedTo: { unitId, dim } } : x)),
      units: j.units.map((u) => (u.id === unitId && u.kind !== 'freeform' && (dim !== 'depth' || u.kind === 'parametric') ? { ...u, [dim]: { value: m.value, source: 'site' } } : u)),
    }), `מידה ${m.value} מ״מ קושרה ל־${target?.name} · ${DIM_LABEL[dim]}${gap ? ` (פער ${gap > 0 ? '+' : ''}${gap} מ״מ מול הערך הקודם)` : ''}`)
  }
  const unlink = (m: Measurement) => guard() && patch(m.id, { linkedTo: undefined })

  const dimUnits = job.units.filter((u) => u.kind !== 'freeform')

  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Measurements <span className="faint">{job.measurements.length}</span></h2>
        <button className="btn primary" onClick={() => guard() && setAdding(true)}>+ מידה</button>
      </div>
      <div className="callout info small">מידה שנמדדה בשטח וקושרה ליחידה דורסת את מה שהלקוח שלח ומעלה את הביטחון ל־"נמדד". נעילה לייצור דורשת שכל מידות היחידות הפרמטריות יהיו "נמדד" או "מאומת".</div>

      {job.measurements.length === 0 && !adding && <div className="empty card"><h2>אין מידות</h2><p>בבית הלקוח: צלם קיר, סמן קו, הקלד מ״מ. או הקלדה מהירה בלי תמונה.</p></div>}

      <div className="grid cards">
        {job.measurements.map((m) => {
          const linkedUnit = m.linkedTo ? job.units.find((u) => u.id === m.linkedTo!.unitId) : null
          return (
            <Card key={m.id}>
              {m.photoId && photos[m.photoId] && (
                <div style={{ position: 'relative', marginBottom: '.5rem', cursor: 'pointer' }} onClick={() => setMarkup({ photo: photos[m.photoId!], measurement: m })}>
                  <img src={photos[m.photoId].dataUrl} alt="" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                  {m.line && <LineOverlay line={m.line} value={m.value} />}
                </div>
              )}
              <div className="row between">
                <strong>{labelOf(m)}</strong>
                <span className="num" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{m.value} <span className="faint">מ״מ</span></span>
              </div>
              {m.note && <div className="muted small">{m.note}</div>}
              <div className="faint num">{dateShort(m.at)}</div>
              <div className="row" style={{ marginTop: '.6rem' }}>
                {m.linkedTo && linkedUnit ? (
                  <>
                    <Badge tone="ok">→ {linkedUnit.name} · {DIM_LABEL[m.linkedTo.dim]}</Badge>
                    <button className="btn sm ghost" onClick={() => unlink(m)}>נתק</button>
                  </>
                ) : dimUnits.length > 0 ? (
                  <select defaultValue="" onChange={(e) => { const [uid_, dim] = e.target.value.split('|'); if (uid_) link(m, uid_, dim as 'width' | 'height' | 'depth'); e.target.value = '' }} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '.3rem .5rem', background: 'var(--surface)', fontSize: '.85rem' }}>
                    <option value="">קשר ליחידה…</option>
                    {dimUnits.map((u) => (['width', 'height', ...(u.kind === 'parametric' ? ['depth' as const] : [])] as ('width' | 'height' | 'depth')[]).map((d) => <option key={u.id + d} value={`${u.id}|${d}`}>{u.name} · {DIM_LABEL[d]}</option>))}
                  </select>
                ) : <span className="faint">אין יחידות לקישור</span>}
                <span style={{ flex: 1 }} />
                <button className="btn sm ghost danger" onClick={() => guard() && remove(m.id)}>×</button>
              </div>
            </Card>
          )
        })}
      </div>

      {adding && <AddMeasurement photos={job.attachments} onAdd={(m) => { add(m); setAdding(false) }} onClose={() => setAdding(false)} onAttach={(a) => update((j) => ({ ...j, attachments: [...j.attachments, a] }))} onMarkup={(photo) => { setAdding(false); setMarkup({ photo }) }} />}
      {markup && <PhotoMarkup photo={markup.photo} initial={markup.measurement} onClose={() => setMarkup(null)} onSave={(m) => { if (markup.measurement) patch(m.id, m); else add(m); setMarkup(null) }} />}
    </div>
  )
}

function labelOf(m: Measurement) { return m.label === 'custom' ? (m.customLabel || 'אחר') : MLABEL[m.label] }

function LineOverlay({ line, value }: { line: NonNullable<Measurement['line']>; value: number }) {
  const mx = (line.x1 + line.x2) / 2, my = (line.y1 + line.y2) / 2
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <line x1={line.x1 * 100} y1={line.y1 * 100} x2={line.x2 * 100} y2={line.y2 * 100} stroke="#ff3b30" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <circle cx={line.x1 * 100} cy={line.y1 * 100} r="1.2" fill="#ff3b30" /><circle cx={line.x2 * 100} cy={line.y2 * 100} r="1.2" fill="#ff3b30" />
      <text x={mx * 100} y={my * 100 - 2} fontSize="5" fill="#fff" stroke="#000" strokeWidth="0.6" paintOrder="stroke" textAnchor="middle" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{value}</text>
    </svg>
  )
}

function AddMeasurement({ photos, onAdd, onClose, onAttach, onMarkup }: { photos: Attachment[]; onAdd: (m: Measurement) => void; onClose: () => void; onAttach: (a: Attachment) => void; onMarkup: (photo: Attachment) => void }) {
  const [label, setLabel] = useState<MeasurementLabel>('wall_width')
  const [custom, setCustom] = useState('')
  const [value, setValue] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const takePhoto = async (f: File | undefined) => {
    if (!f) return
    const a: Attachment = { id: uid(), name: f.name, dataUrl: await fileToDataUrl(f), addedAt: new Date().toISOString() }
    onAttach(a)
    onMarkup(a)
  }
  return (
    <Modal title="מידה חדשה" onClose={onClose}>
      <div className="stack">
        <div className="row">
          <button className="btn primary" onClick={() => camRef.current?.click()}>📷 צלם וסמן על התמונה</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => takePhoto(e.target.files?.[0])} />
          {photos.length > 0 && <span className="faint">או סמן על תמונה קיימת:</span>}
        </div>
        {photos.length > 0 && <div className="row">{photos.map((p) => <img key={p.id} src={p.dataUrl} alt="" style={{ height: 56, borderRadius: 6, cursor: 'pointer' }} onClick={() => onMarkup(p)} />)}</div>}
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
        <div className="faint">הקלדה מהירה בלי תמונה</div>
        <div className="inline">
          <Field label="מה נמדד"><select value={label} onChange={(e) => setLabel(e.target.value as MeasurementLabel)}>{Object.entries(MLABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          {label === 'custom' && <Field label="תיאור"><input value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>}
          <Field label="ערך" suffix="מ״מ"><NumInput value={value} allowEmpty onChange={setValue} /></Field>
        </div>
        <Field label="הערה"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="שקע בגובה 30 ס״מ מימין" /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" disabled={value == null} onClick={() => onAdd({ id: uid(), label, customLabel: custom || undefined, value: value!, note: note || undefined, at: new Date().toISOString() })}>הוסף</button>
        </div>
      </div>
    </Modal>
  )
}

/** Tap two points on the photo, then type the value. */
function PhotoMarkup({ photo, initial, onSave, onClose }: { photo: Attachment; initial?: Measurement; onSave: (m: Measurement) => void; onClose: () => void }) {
  const [pts, setPts] = useState<{ x: number; y: number }[]>(initial?.line ? [{ x: initial.line.x1, y: initial.line.y1 }, { x: initial.line.x2, y: initial.line.y2 }] : [])
  const [label, setLabel] = useState<MeasurementLabel>(initial?.label ?? 'wall_width')
  const [custom, setCustom] = useState(initial?.customLabel ?? '')
  const [value, setValue] = useState<number | null>(initial?.value ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const click = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    setPts(pts.length >= 2 ? [p] : [...pts, p])
  }
  const line = pts.length === 2 ? { x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y } : undefined
  return (
    <Modal title="סמן מידה על התמונה" onClose={onClose}>
      <div className="stack">
        <div className="faint">{pts.length < 2 ? `לחץ על ${pts.length === 0 ? 'נקודת ההתחלה' : 'נקודת הסיום'}` : 'לחיצה נוספת מתחילה קו חדש'}</div>
        <div style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none' }} onClick={click}>
          <img src={photo.dataUrl} alt="" style={{ width: '100%', borderRadius: 8, display: 'block' }} draggable={false} />
          {line && <LineOverlay line={line} value={value ?? 0} />}
          {pts.length === 1 && <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}><circle cx={pts[0].x * 100} cy={pts[0].y * 100} r="1.2" fill="#ff3b30" /></svg>}
        </div>
        <div className="inline">
          <Field label="מה נמדד"><select value={label} onChange={(e) => setLabel(e.target.value as MeasurementLabel)}>{Object.entries(MLABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          {label === 'custom' && <Field label="תיאור"><input value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>}
          <Field label="ערך" suffix="מ״מ"><NumInput value={value} allowEmpty onChange={setValue} /></Field>
        </div>
        <Field label="הערה"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" disabled={value == null} onClick={() => onSave({ id: initial?.id ?? uid(), label, customLabel: custom || undefined, value: value!, note: note || undefined, photoId: photo.id, line, at: initial?.at ?? new Date().toISOString(), linkedTo: initial?.linkedTo })}>שמור</button>
        </div>
      </div>
    </Modal>
  )
}
