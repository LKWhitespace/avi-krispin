import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { computeImpact, toSnapshot } from '../engine/impact'
import { byId, priceJobLive, priceUnit } from '../engine/pricing'
import { newParametricUnit, uid } from '../model/presets'
import type { AreaUnit, Bay, BayContent, FreeformUnit, ParametricTemplate, ParametricUnit, Unit } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, DimInput, Elevation, Field, NumInput, marginTone } from '../ui/components'
import { BAY_LABEL, KIND_LABEL, fmt, money, pct, signed, signedMoney, ver } from '../ui/format'
import type { JobCtx } from './JobLayout'

export function UnitsTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const { state } = useStore()
  const [selected, setSelected] = useState<string | null>(job.units[0]?.id ?? null)
  const [adding, setAdding] = useState(false)
  const materials = useMemo(() => byId(state.materials), [state.materials])
  const hardware = useMemo(() => byId(state.hardware), [state.hardware])
  const unit = job.units.find((u) => u.id === selected) ?? null

  const setUnit = (fn: (u: Unit) => Unit) => { if (!unit || !guard()) return; update((j) => ({ ...j, units: j.units.map((u) => (u.id === unit.id ? fn(u) : u)) })) }
  const addUnit = (u: Unit) => { if (!guard()) return; update((j) => ({ ...j, units: [...j.units, u], quote: { ...j.quote, includedUnitIds: [...j.quote.includedUnitIds, u.id] } }), `נוספה יחידה: ${u.name}`); setSelected(u.id); setAdding(false) }
  const removeUnit = (id: string) => { if (!guard()) return; update((j) => ({ ...j, units: j.units.filter((u) => u.id !== id) }), 'יחידה הוסרה'); if (selected === id) setSelected(null) }

  return (
    <div className="split">
      <div className="stack">
        <div className="row between">
          <h2>יחידות</h2>
          <button className="btn primary" onClick={() => guard() && setAdding(true)}>+ יחידה</button>
        </div>
        {adding && <AddUnitPicker onPick={addUnit} onClose={() => setAdding(false)} />}
        {job.units.length === 0 && !adding && <div className="empty card"><div className="art">🪵</div><h2>אין יחידות</h2><p>הוסף ארון, חיפוי או עבודה חופשית כדי לקבל מחיר.</p></div>}
        <div className="grid cards">
          {job.units.map((u) => {
            const uc = priceUnit(u, materials, hardware, state.settings)
            const cost = uc.materials + uc.hardware + uc.labor + uc.subcontractors
            return (
              <Card key={u.id} onClick={() => setSelected(u.id)} selected={u.id === selected}>
                <div className="row between" style={{ marginBottom: '.5rem' }}><strong>{u.name}</strong><Badge plain>{KIND_LABEL[u.kind]}</Badge></div>
                {u.kind === 'parametric' ? <Elevation u={u} height={110} /> : <div className="faint" style={{ height: 110, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 10 }}>{u.kind === 'area' ? `${u.width.value ?? '?'} × ${u.height.value ?? '?'} מ״מ` : u.description || 'עבודה חופשית'}</div>}
                <div className="row between" style={{ marginTop: '.6rem' }}>
                  <span className="num" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{uc.incomplete ? <Badge tone="bad">חסרה מידה</Badge> : money(cost)}</span>
                  <span className="faint">× {u.qty}</span>
                </div>
              </Card>
            )
          })}
        </div>
        {unit && (
          <Card title={<span>עריכה · {unit.name}</span>} right={<button className="btn sm danger ghost" onClick={() => removeUnit(unit.id)}>הסר יחידה</button>}>
            {unit.kind === 'parametric' && <ParametricEditor u={unit} set={(fn) => setUnit((x) => fn(x as ParametricUnit))} />}
            {unit.kind === 'area' && <AreaEditor u={unit} set={(fn) => setUnit((x) => fn(x as AreaUnit))} />}
            {unit.kind === 'freeform' && <FreeformEditor u={unit} set={(fn) => setUnit((x) => fn(x as FreeformUnit))} />}
          </Card>
        )}
      </div>
      <div className="sticky stack">
        <LiveCard />
        {unit && <UnitDetail u={unit} />}
      </div>
    </div>
  )
}

function AddUnitPicker({ onPick, onClose }: { onPick: (u: Unit) => void; onClose: () => void }) {
  const { state } = useStore()
  const s = state.settings
  const area = (): AreaUnit => ({ id: uid(), kind: 'area', name: 'חיפוי קיר', qty: 1, width: { value: 3000, source: 'estimated' }, height: { value: 2500, source: 'estimated' }, materialId: 'm-cladding-oak', laborMinutesPerM2: null, extrasCost: 0 })
  const free = (): FreeformUnit => ({ id: uid(), kind: 'freeform', name: 'עבודה חופשית', qty: 1, description: '', materialLines: [], laborLines: [{ id: uid(), label: 'עבודה', hours: 4 }], subcontractorLines: [] })
  const T = (t: ParametricTemplate, label: string, sub: string) => <button key={t} onClick={() => onPick(newParametricUnit(s, t))}><strong>{label}</strong><span>{sub}</span></button>
  return (
    <Card title="איזו יחידה להוסיף?" right={<button className="btn sm ghost" onClick={onClose}>סגור</button>}>
      <div className="stack">
        <div>
          <div className="section-lbl">פרמטרי · המערכת גוזרת חלקים, לוחות, פרזול ושעות מהמידות</div>
          <div className="pick">
            {T('wardrobe', 'ארון', 'תאים, דלתות, מגירות')}
            {T('base_cabinet', 'ארון תחתון', 'מטבח, אמבטיה')}
            {T('bookcase', 'ספרייה', 'מדפים פתוחים')}
            {T('custom', 'פרמטרי אחר', 'מתחילים ממידות ריקות')}
          </div>
        </div>
        <div>
          <div className="section-lbl">לפי שטח · מ״ר כפול חומר וזמן</div>
          <div className="pick"><button onClick={() => onPick(area())}><strong>חיפוי קיר</strong><span>פאנלים, גב מיטה, אקוסטי</span></button></div>
        </div>
        <div>
          <div className="section-lbl">חופשי · שורות חומרים ושעות ידניות</div>
          <div className="pick"><button onClick={() => onPick(free())}><strong>עבודה חופשית</strong><span>שיקום, קונסולה, תיקון</span></button></div>
        </div>
      </div>
    </Card>
  )
}

function MaterialSelect({ value, onChange, thin }: { value: string; onChange: (id: string) => void; thin?: boolean }) {
  const { state } = useStore()
  const list = state.materials.filter((m) => (thin ? m.thickness <= 10 : m.thickness > 10))
  return <select value={value} onChange={(e) => onChange(e.target.value)}>{list.map((m) => <option key={m.id} value={m.id}>{m.name} · ₪{m.costPerSheet}</option>)}</select>
}

function ParametricEditor({ u, set }: { u: ParametricUnit; set: (fn: (u: ParametricUnit) => ParametricUnit) => void }) {
  const setBay = (id: string, patch: Partial<Bay>) => set((x) => ({ ...x, bays: x.bays.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  return (
    <div className="stack">
      <div className="inline">
        <Field label="שם"><input value={u.name} onChange={(e) => set((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="כמות"><NumInput value={u.qty} min={1} onChange={(v) => set((x) => ({ ...x, qty: Math.max(1, v ?? 1) }))} /></Field>
      </div>
      <div className="inline">
        <DimInput label="רוחב" dim={u.width} onChange={(d) => set((x) => ({ ...x, width: d }))} />
        <DimInput label="גובה" dim={u.height} onChange={(d) => set((x) => ({ ...x, height: d }))} />
        <DimInput label="עומק" dim={u.depth} onChange={(d) => set((x) => ({ ...x, depth: d }))} />
      </div>
      <div>
        <div className="row between" style={{ marginBottom: '.5rem' }}>
          <strong>תאים <span className="faint num">{u.bays.length}</span></strong>
          <div className="row">
            <button className="btn sm" onClick={() => set((x) => ({ ...x, bays: [...x.bays, { id: uid(), content: 'shelves', count: 4 }] }))}>+ תא</button>
            <button className="btn sm" disabled={u.bays.length <= 1} onClick={() => set((x) => ({ ...x, bays: x.bays.slice(0, -1) }))}>− תא</button>
          </div>
        </div>
        <div className="bays">
          {u.bays.map((b, i) => (
            <div className="bay-row" key={b.id}>
              <span className="faint num">{i + 1}</span>
              <select className="input" value={b.content} onChange={(e) => setBay(b.id, { content: e.target.value as BayContent })}>{Object.entries(BAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              {b.content === 'shelves' || b.content === 'drawers' ? <div className="field"><NumInput value={b.count} min={0} onChange={(v) => setBay(b.id, { count: Math.max(0, v ?? 0) })} /></div> : <span />}
              <span className="faint">{b.content === 'shelves' ? 'מדפים' : b.content === 'drawers' ? 'מגירות' : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="inline">
        <Field label="דלתות"><NumInput value={u.doors.count} min={0} onChange={(v) => set((x) => ({ ...x, doors: { ...x.doors, count: Math.max(0, v ?? 0) } }))} /></Field>
        <Field label="סוג דלת"><select value={u.doors.type} onChange={(e) => set((x) => ({ ...x, doors: { ...x.doors, type: e.target.value as 'hinged' | 'sliding' } }))}><option value="hinged">צירים</option><option value="sliding">הזזה</option></select></Field>
        <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" checked={u.handles} onChange={(e) => set((x) => ({ ...x, handles: e.target.checked }))} /> ידיות</label></div>
        <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" checked={u.edgeBanding} onChange={(e) => set((x) => ({ ...x, edgeBanding: e.target.checked }))} /> קנט</label></div>
      </div>
      <div className="inline">
        <Field label="חומר גוף"><MaterialSelect value={u.carcassMaterialId} onChange={(id) => set((x) => ({ ...x, carcassMaterialId: id }))} /></Field>
        <Field label="חומר דלתות וחזיתות"><MaterialSelect value={u.doorMaterialId} onChange={(id) => set((x) => ({ ...x, doorMaterialId: id }))} /></Field>
        <Field label="גב"><MaterialSelect thin value={u.backMaterialId} onChange={(id) => set((x) => ({ ...x, backMaterialId: id }))} /></Field>
      </div>
      <Field label="הערות"><textarea rows={2} value={u.notes ?? ''} onChange={(e) => set((x) => ({ ...x, notes: e.target.value }))} /></Field>
    </div>
  )
}

function AreaEditor({ u, set }: { u: AreaUnit; set: (fn: (u: AreaUnit) => AreaUnit) => void }) {
  const { state } = useStore()
  const area = u.width.value != null && u.height.value != null ? (u.width.value / 1000) * (u.height.value / 1000) : null
  return (
    <div className="stack">
      <div className="inline">
        <Field label="שם"><input value={u.name} onChange={(e) => set((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="כמות"><NumInput value={u.qty} min={1} onChange={(v) => set((x) => ({ ...x, qty: Math.max(1, v ?? 1) }))} /></Field>
      </div>
      <div className="inline">
        <DimInput label="רוחב" dim={u.width} onChange={(d) => set((x) => ({ ...x, width: d }))} />
        <DimInput label="גובה" dim={u.height} onChange={(d) => set((x) => ({ ...x, height: d }))} />
        <Field label="שטח"><div className="num" style={{ padding: '.5rem 0', fontWeight: 700 }}>{area == null ? '—' : `${fmt(area)} מ״ר`}</div></Field>
      </div>
      <div className="inline">
        <Field label="חומר"><select value={u.materialId} onChange={(e) => set((x) => ({ ...x, materialId: e.target.value }))}>{state.materials.map((m) => <option key={m.id} value={m.id}>{m.name} · ₪{m.costPerSheet}</option>)}</select></Field>
        <Field label="דקות עבודה למ״ר" suffix={`ברירת מחדל ${state.settings.labor.perM2}`}><NumInput value={u.laborMinutesPerM2} allowEmpty placeholder={String(state.settings.labor.perM2)} onChange={(v) => set((x) => ({ ...x, laborMinutesPerM2: v }))} /></Field>
        <Field label="תוספות (פרופילים, דבק)" suffix="₪"><NumInput value={u.extrasCost} min={0} onChange={(v) => set((x) => ({ ...x, extrasCost: v ?? 0 }))} /></Field>
      </div>
    </div>
  )
}

function FreeformEditor({ u, set }: { u: FreeformUnit; set: (fn: (u: FreeformUnit) => FreeformUnit) => void }) {
  type K = 'materialLines' | 'laborLines' | 'subcontractorLines'
  const setLine = (k: K, id: string, patch: Record<string, unknown>) => set((x) => ({ ...x, [k]: (x[k] as { id: string }[]).map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const rm = (k: K, id: string) => set((x) => ({ ...x, [k]: (x[k] as { id: string }[]).filter((l) => l.id !== id) }))
  const Lines = ({ k, title, ph, field, step }: { k: K; title: string; ph: string; field: 'cost' | 'hours'; step?: number }) => (
    <div className="lines">
      <div className="row between" style={{ marginBottom: '.4rem' }}><strong>{title}</strong><button className="btn sm" onClick={() => set((x) => ({ ...x, [k]: [...(x[k] as object[]), field === 'cost' ? { id: uid(), label: '', cost: 0 } : { id: uid(), label: '', hours: 1 }] }))}>+ שורה</button></div>
      {(u[k] as unknown as ({ id: string; label: string } & Record<string, unknown>)[]).map((l) => <div className="line-row" key={l.id}><input className="input" placeholder={ph} value={l.label} onChange={(e) => setLine(k, l.id, { label: e.target.value })} /><div className="field"><NumInput value={l[field] as number} min={0} step={step} onChange={(v) => setLine(k, l.id, { [field]: v ?? 0 })} /></div><button className="btn sm ghost" onClick={() => rm(k, l.id)}>×</button></div>)}
    </div>
  )
  return (
    <div className="stack">
      <div className="inline">
        <Field label="שם"><input value={u.name} onChange={(e) => set((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="כמות"><NumInput value={u.qty} min={1} onChange={(v) => set((x) => ({ ...x, qty: Math.max(1, v ?? 1) }))} /></Field>
      </div>
      <Field label="תיאור"><textarea rows={2} value={u.description} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} /></Field>
      <Lines k="materialLines" title="חומרים (₪)" ph="לכה, עץ, ריפוד…" field="cost" />
      <Lines k="laborLines" title="שעות עבודה" ph="פירוק, ליטוש, הרכבה…" field="hours" step={0.5} />
      <Lines k="subcontractorLines" title="קבלני משנה (₪)" ph="צבעי, זגג, ריפוד…" field="cost" />
    </div>
  )
}

/** Live totals and the delta against the last saved revision. */
export function LiveCard() {
  const { job } = useOutletContext<JobCtx>()
  const { state } = useStore()
  const b = priceJobLive(job, state.materials, state.hardware, state.settings)
  const last = job.revisions.at(-1)
  const impact = useMemo(() => last ? computeImpact(toSnapshot(last), { units: job.units, extras: job.extras, quotedPrice: job.quotedPrice, materials: byId(state.materials), hardware: byId(state.hardware), settings: state.settings }) : null, [job, last, state])
  const changed = impact && (impact.cost !== 0 || impact.sheets.length > 0 || impact.hardware.length > 0 || impact.dimensions.length > 0 || impact.unitsAdded.length > 0 || impact.unitsRemoved.length > 0)
  const price = job.quotedPrice ?? b.recommended
  const margin = b.margin ?? (b.recommended > 0 ? (b.recommended - b.totalCost) / b.recommended : null)
  return (
    <div className="hero-card">
      <div className="row between"><span className="lbl">{job.quotedPrice == null ? 'מחיר מומלץ' : 'מחיר בהצעה'}</span>{last && <Badge tone={changed ? 'warn' : 'ok'}>{changed ? `שינויים מול ${ver(last.version)}` : `תואם ${ver(last.version)}`}</Badge>}</div>
      <div className="price num">{money(price)}</div>
      <div className="sep" />
      <div className="row between"><span className="k">עלות</span><span className="num">{money(b.totalCost)}</span></div>
      <div className="row between"><span className="k">רווחיות</span><Badge tone={marginTone(margin, state.settings.targetMargin)}>{pct(margin)}</Badge></div>
      <div className="row between"><span className="k">שעות עבודה</span><span className="num">{fmt(b.laborHours)}</span></div>
      <div className="row between"><span className="k">לוחות</span><span className="num">{Object.values(b.sheetsByMaterial).reduce((a, n) => a + n, 0)}</span></div>
      {changed && impact && (
        <>
          <div className="sep" />
          <div className="lbl" style={{ marginBottom: '.3rem' }}>מה השתנה מול {ver(last!.version)}</div>
          <div className="row between"><span className="k">מחיר</span><span className={`delta num ${impact.price > 0 ? 'up' : impact.price < 0 ? 'down' : 'zero'}`} style={{ color: impact.price > 0 ? '#f6a89f' : impact.price < 0 ? '#8fd6a8' : undefined }}>{signedMoney(impact.price)}</span></div>
          <div className="row between"><span className="k">עלות</span><span className="num" style={{ color: impact.cost > 0 ? '#f6a89f' : impact.cost < 0 ? '#8fd6a8' : undefined, fontWeight: 700 }}>{signedMoney(impact.cost)}</span></div>
          {impact.sheets.map((d) => <div className="row between small" key={d.label}><span className="k">{d.label}</span><span className="num">{d.before} → {d.after} <span style={{ color: d.diff > 0 ? '#f6a89f' : '#8fd6a8' }}>({signed(d.diff)} לוחות)</span></span></div>)}
          {impact.hardware.map((d) => <div className="row between small" key={d.label}><span className="k">{d.label}</span><span className="num">{d.before} → {d.after}</span></div>)}
          {impact.laborHours !== 0 && <div className="row between small"><span className="k">שעות</span><span className="num">{signed(impact.laborHours)}</span></div>}
          {impact.marginBefore != null && impact.marginAfter != null && impact.marginBefore !== impact.marginAfter && <div className="row between small"><span className="k">רווחיות</span><span className="num">{pct(impact.marginBefore)} → {pct(impact.marginAfter)}</span></div>}
        </>
      )}
    </div>
  )
}

function UnitDetail({ u }: { u: Unit }) {
  const { state } = useStore()
  const materials = byId(state.materials), hardware = byId(state.hardware)
  const uc = priceUnit(u, materials, hardware, state.settings)
  return (
    <Card title="פירוט היחידה">
      <div className="stack tight">
        <div className="row between"><span className="muted">חומרים</span><span className="num">{money(uc.materials)}</span></div>
        <div className="row between"><span className="muted">פרזול</span><span className="num">{money(uc.hardware)}</span></div>
        <div className="row between"><span className="muted">עבודה ({fmt(uc.laborHours)} ש׳)</span><span className="num">{money(uc.labor)}</span></div>
        {uc.subcontractors > 0 && <div className="row between"><span className="muted">קבלני משנה</span><span className="num">{money(uc.subcontractors)}</span></div>}
      </div>
      {uc.sheets.length > 0 && <div style={{ marginTop: '.7rem' }}><div className="section-lbl">לוחות</div>{uc.sheets.map((s) => <div className="row between small" key={s.materialId}><span>{materials[s.materialId]?.name}</span><span className="num">{s.sheets} ({fmt(s.areaM2)} מ״ר)</span></div>)}</div>}
      {uc.hardwareNeeds.length > 0 && <div style={{ marginTop: '.7rem' }}><div className="section-lbl">פרזול</div>{uc.hardwareNeeds.map((n) => <div className="row between small" key={n.hardwareId}><span>{hardware[n.hardwareId]?.name}</span><span className="num">{n.qty}</span></div>)}</div>}
      {uc.derived && (
        <details style={{ marginTop: '.7rem' }}>
          <summary className="faint" style={{ cursor: 'pointer' }}>חלקים ({uc.derived.parts.reduce((a, p) => a + p.qty, 0)}) · קנט {fmt(uc.edgeMeters)} מ׳</summary>
          <table style={{ marginTop: '.3rem' }}><tbody>{uc.derived.parts.map((p, i) => <tr key={i}><td>{p.label}</td><td className="num">{p.qty}</td><td className="num">{Math.round(p.w)}×{Math.round(p.h)}</td></tr>)}</tbody></table>
        </details>
      )}
      {uc.warnings.length > 0 && <div className="callout warn small" style={{ marginTop: '.7rem' }}><ul style={{ margin: 0 }}>{uc.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
    </Card>
  )
}
