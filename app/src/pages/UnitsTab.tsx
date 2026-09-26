import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { computeImpact, toSnapshot } from '../engine/impact'
import { byId, priceJobLive, priceUnit } from '../engine/pricing'
import { newParametricUnit, uid } from '../model/presets'
import type { AreaUnit, Bay, BayContent, FreeformUnit, ParametricTemplate, ParametricUnit, Unit } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, DimInput, Field, NumInput, marginTone } from '../ui/components'
import { BAY_LABEL, fmt, money, pct, signed, signedMoney } from '../ui/format'
import type { JobCtx } from './JobLayout'

export function UnitsTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const { state } = useStore()
  const [selected, setSelected] = useState<string | null>(job.units[0]?.id ?? null)
  const [adding, setAdding] = useState(false)

  const materials = useMemo(() => byId(state.materials), [state.materials])
  const hardware = useMemo(() => byId(state.hardware), [state.hardware])
  const unit = job.units.find((u) => u.id === selected) ?? null

  const setUnit = (fn: (u: Unit) => Unit) => {
    if (!unit || !guard()) return
    update((j) => ({ ...j, units: j.units.map((u) => (u.id === unit.id ? fn(u) : u)) }))
  }
  const addUnit = (u: Unit) => {
    if (!guard()) return
    update((j) => ({ ...j, units: [...j.units, u] }), `נוספה יחידה: ${u.name}`)
    setSelected(u.id)
    setAdding(false)
  }
  const removeUnit = (id: string) => {
    if (!guard()) return
    update((j) => ({ ...j, units: j.units.filter((u) => u.id !== id) }), 'יחידה הוסרה')
    if (selected === id) setSelected(null)
  }

  return (
    <div className="split">
      <div className="stack">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Units</h2>
          <button className="btn primary" onClick={() => guard() && setAdding(true)}>+ יחידה</button>
        </div>
        {adding && <AddUnitPicker onPick={addUnit} onClose={() => setAdding(false)} />}
        {job.units.length === 0 && !adding && <div className="empty card"><h2>אין יחידות</h2><p>הוסף ארון, חיפוי או עבודה חופשית כדי לקבל מחיר.</p></div>}
        <div className="grid cards">
          {job.units.map((u) => {
            const uc = priceUnit(u, materials, hardware, state.settings)
            const cost = uc.materials + uc.hardware + uc.labor + uc.subcontractors
            return (
              <Card key={u.id} onClick={() => setSelected(u.id)} selected={u.id === selected}>
                <div className="row between"><strong>{u.name}</strong><Badge>{u.kind === 'parametric' ? 'פרמטרי' : u.kind === 'area' ? 'שטח' : 'חופשי'}</Badge></div>
                {u.kind === 'parametric' && <Scheme u={u} />}
                <div className="row between" style={{ marginTop: '.5rem' }}>
                  <span className="num">{uc.incomplete ? <Badge tone="bad">Missing</Badge> : money(cost)}</span>
                  <span className="faint">× {u.qty}</span>
                </div>
              </Card>
            )
          })}
        </div>
        {unit && (
          <Card title={<span>עריכה · {unit.name}</span>} right={<button className="btn sm danger ghost" onClick={() => removeUnit(unit.id)}>הסר</button>}>
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

function Scheme({ u }: { u: ParametricUnit }) {
  return (
    <div className="scheme" title={`${u.bays.length} תאים`}>
      {u.bays.map((b) => (
        <div className="bay" key={b.id}>
          {b.content === 'shelves' && Array.from({ length: Math.min(b.count, 6) }).map((_, i) => <span className="line" key={i} />)}
          {b.content === 'drawers' && Array.from({ length: Math.min(b.count, 5) }).map((_, i) => <span className="box" key={i} />)}
          {b.content === 'hanging' && <span className="rod" />}
          {b.content === 'empty' && <span className="faint">—</span>}
        </div>
      ))}
    </div>
  )
}

function AddUnitPicker({ onPick, onClose }: { onPick: (u: Unit) => void; onClose: () => void }) {
  const { state } = useStore()
  const s = state.settings
  const templates: { t: ParametricTemplate; label: string }[] = [
    { t: 'wardrobe', label: 'ארון' }, { t: 'base_cabinet', label: 'ארון תחתון' }, { t: 'bookcase', label: 'ספרייה' }, { t: 'custom', label: 'פרמטרי אחר' },
  ]
  const area = (): AreaUnit => ({ id: uid(), kind: 'area', name: 'חיפוי קיר', qty: 1, width: { value: 3000, source: 'estimated' }, height: { value: 2500, source: 'estimated' }, materialId: 'm-cladding-oak', laborMinutesPerM2: null, extrasCost: 0 })
  const free = (): FreeformUnit => ({ id: uid(), kind: 'freeform', name: 'עבודה חופשית', qty: 1, description: '', materialLines: [], laborLines: [{ id: uid(), label: 'עבודה', hours: 4 }], subcontractorLines: [] })
  return (
    <Card title="סוג יחידה" right={<button className="btn sm ghost" onClick={onClose}>סגור</button>}>
      <div className="stack">
        <div>
          <div className="faint" style={{ marginBottom: '.3rem' }}>Parametric — המערכת גוזרת חלקים, לוחות, פרזול ושעות</div>
          <div className="row">{templates.map((x) => <button key={x.t} className="btn" onClick={() => onPick(newParametricUnit(s, x.t))}>{x.label}</button>)}</div>
        </div>
        <div>
          <div className="faint" style={{ marginBottom: '.3rem' }}>Area-based — לפי מ״ר: חיפוי, פאנלים, גב מיטה</div>
          <button className="btn" onClick={() => onPick(area())}>חיפוי קיר</button>
        </div>
        <div>
          <div className="faint" style={{ marginBottom: '.3rem' }}>Free-form — שיקום, קונסולה, תיקון: חומרים + שעות ידניים</div>
          <button className="btn" onClick={() => onPick(free())}>עבודה חופשית</button>
        </div>
      </div>
    </Card>
  )
}

function MaterialSelect({ value, onChange, thin }: { value: string; onChange: (id: string) => void; thin?: boolean }) {
  const { state } = useStore()
  const list = state.materials.filter((m) => (thin ? m.thickness <= 10 : m.thickness > 10))
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((m) => <option key={m.id} value={m.id}>{m.name} · ₪{m.costPerSheet}</option>)}
    </select>
  )
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
        <DimInput label="רוחב W" dim={u.width} onChange={(d) => set((x) => ({ ...x, width: d }))} />
        <DimInput label="גובה H" dim={u.height} onChange={(d) => set((x) => ({ ...x, height: d }))} />
        <DimInput label="עומק D" dim={u.depth} onChange={(d) => set((x) => ({ ...x, depth: d }))} />
      </div>
      <div>
        <div className="row between" style={{ marginBottom: '.4rem' }}>
          <strong>תאים ({u.bays.length})</strong>
          <div className="row">
            <button className="btn sm" onClick={() => set((x) => ({ ...x, bays: [...x.bays, { id: uid(), content: 'shelves', count: 4 }] }))}>+ תא</button>
            <button className="btn sm" disabled={u.bays.length <= 1} onClick={() => set((x) => ({ ...x, bays: x.bays.slice(0, -1) }))}>− תא</button>
          </div>
        </div>
        <div className="bays">
          {u.bays.map((b, i) => (
            <div className="bay-row" key={b.id}>
              <span className="faint num">{i + 1}</span>
              <select value={b.content} onChange={(e) => setBay(b.id, { content: e.target.value as BayContent })}>
                {Object.entries(BAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {b.content === 'shelves' || b.content === 'drawers' ? <NumInput value={b.count} min={0} onChange={(v) => setBay(b.id, { count: Math.max(0, v ?? 0) })} /> : <span />}
              <span className="faint">{b.content === 'shelves' ? 'מדפים' : b.content === 'drawers' ? 'מגירות' : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="inline">
        <Field label="דלתות"><NumInput value={u.doors.count} min={0} onChange={(v) => set((x) => ({ ...x, doors: { ...x.doors, count: Math.max(0, v ?? 0) } }))} /></Field>
        <Field label="סוג דלת">
          <select value={u.doors.type} onChange={(e) => set((x) => ({ ...x, doors: { ...x.doors, type: e.target.value as 'hinged' | 'sliding' } }))}>
            <option value="hinged">צירים</option><option value="sliding">הזזה</option>
          </select>
        </Field>
        <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" checked={u.handles} onChange={(e) => set((x) => ({ ...x, handles: e.target.checked }))} /> ידיות</label></div>
        <div className="field"><label>&nbsp;</label><label className="check"><input type="checkbox" checked={u.edgeBanding} onChange={(e) => set((x) => ({ ...x, edgeBanding: e.target.checked }))} /> קנט</label></div>
      </div>
      <div className="inline">
        <Field label="חומר גוף"><MaterialSelect value={u.carcassMaterialId} onChange={(id) => set((x) => ({ ...x, carcassMaterialId: id }))} /></Field>
        <Field label="חומר דלתות/חזיתות"><MaterialSelect value={u.doorMaterialId} onChange={(id) => set((x) => ({ ...x, doorMaterialId: id }))} /></Field>
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
        <Field label="שטח"><div className="num" style={{ padding: '.45rem 0' }}>{area == null ? '—' : `${fmt(area)} מ״ר`}</div></Field>
      </div>
      <div className="inline">
        <Field label="חומר">
          <select value={u.materialId} onChange={(e) => set((x) => ({ ...x, materialId: e.target.value }))}>
            {state.materials.map((m) => <option key={m.id} value={m.id}>{m.name} · ₪{m.costPerSheet}</option>)}
          </select>
        </Field>
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
  return (
    <div className="stack">
      <div className="inline">
        <Field label="שם"><input value={u.name} onChange={(e) => set((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="כמות"><NumInput value={u.qty} min={1} onChange={(v) => set((x) => ({ ...x, qty: Math.max(1, v ?? 1) }))} /></Field>
      </div>
      <Field label="תיאור"><textarea rows={2} value={u.description} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} /></Field>
      <div className="lines">
        <div className="row between"><strong>חומרים</strong><button className="btn sm" onClick={() => set((x) => ({ ...x, materialLines: [...x.materialLines, { id: uid(), label: '', cost: 0 }] }))}>+ שורה</button></div>
        {u.materialLines.map((l) => <div className="line-row" key={l.id}><input placeholder="לכה, עץ, ריפוד…" value={l.label} onChange={(e) => setLine('materialLines', l.id, { label: e.target.value })} /><NumInput value={l.cost} min={0} onChange={(v) => setLine('materialLines', l.id, { cost: v ?? 0 })} /><button className="btn sm ghost" onClick={() => rm('materialLines', l.id)}>×</button></div>)}
      </div>
      <div className="lines">
        <div className="row between"><strong>שעות עבודה</strong><button className="btn sm" onClick={() => set((x) => ({ ...x, laborLines: [...x.laborLines, { id: uid(), label: '', hours: 1 }] }))}>+ שורה</button></div>
        {u.laborLines.map((l) => <div className="line-row" key={l.id}><input placeholder="פירוק, ליטוש, הרכבה…" value={l.label} onChange={(e) => setLine('laborLines', l.id, { label: e.target.value })} /><NumInput value={l.hours} min={0} step={0.5} onChange={(v) => setLine('laborLines', l.id, { hours: v ?? 0 })} /><button className="btn sm ghost" onClick={() => rm('laborLines', l.id)}>×</button></div>)}
      </div>
      <div className="lines">
        <div className="row between"><strong>קבלני משנה</strong><button className="btn sm" onClick={() => set((x) => ({ ...x, subcontractorLines: [...x.subcontractorLines, { id: uid(), label: '', cost: 0 }] }))}>+ שורה</button></div>
        {u.subcontractorLines.map((l) => <div className="line-row" key={l.id}><input placeholder="צבעי, זגג, ריפוד…" value={l.label} onChange={(e) => setLine('subcontractorLines', l.id, { label: e.target.value })} /><NumInput value={l.cost} min={0} onChange={(v) => setLine('subcontractorLines', l.id, { cost: v ?? 0 })} /><button className="btn sm ghost" onClick={() => rm('subcontractorLines', l.id)}>×</button></div>)}
      </div>
    </div>
  )
}

/** Live totals + delta vs last saved revision. This is the killer-moment card. */
export function LiveCard() {
  const { job } = useOutletContext<JobCtx>()
  const { state } = useStore()
  const b = priceJobLive(job, state.materials, state.hardware, state.settings)
  const last = job.revisions.at(-1)
  const impact = useMemo(() => last ? computeImpact(toSnapshot(last), { units: job.units, extras: job.extras, quotedPrice: job.quotedPrice, materials: byId(state.materials), hardware: byId(state.hardware), settings: state.settings }) : null, [job, last, state])
  const changed = impact && (impact.cost !== 0 || impact.sheets.length > 0 || impact.hardware.length > 0 || impact.dimensions.length > 0 || impact.unitsAdded.length > 0 || impact.unitsRemoved.length > 0)
  const price = job.quotedPrice ?? b.recommended
  return (
    <Card title={<span>מחיר חי</span>} right={last && <Badge tone={changed ? 'warn' : 'ok'}>{changed ? `שינויים מול V${last.version}` : `תואם V${last.version}`}</Badge>}>
      <div className="row between"><span className="muted">{job.quotedPrice == null ? 'מומלץ' : 'בהצעה'}</span><strong className="num" style={{ fontSize: '1.3rem' }}>{money(price)}</strong></div>
      <div className="row between"><span className="muted">עלות</span><span className="num">{money(b.totalCost)}</span></div>
      <div className="row between"><span className="muted">margin</span><Badge tone={marginTone(b.margin, state.settings.targetMargin)}>{pct(b.margin ?? (b.recommended > 0 ? (b.recommended - b.totalCost) / b.recommended : null))}</Badge></div>
      <div className="row between"><span className="muted">שעות עבודה</span><span className="num">{fmt(b.laborHours)}</span></div>
      <div className="row between"><span className="muted">לוחות</span><span className="num">{Object.values(b.sheetsByMaterial).reduce((a, n) => a + n, 0)}</span></div>
      {changed && impact && (
        <div style={{ marginTop: '.8rem', borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
          <div className="faint" style={{ marginBottom: '.3rem' }}>מול V{last!.version}</div>
          <div className="row between"><span>מחיר</span><span className={`delta num ${impact.price > 0 ? 'up' : impact.price < 0 ? 'down' : 'zero'}`}>{signedMoney(impact.price)}</span></div>
          <div className="row between"><span>עלות</span><span className={`delta num ${impact.cost > 0 ? 'up' : impact.cost < 0 ? 'down' : 'zero'}`}>{signedMoney(impact.cost)}</span></div>
          {impact.sheets.map((d) => <div className="row between small" key={d.label}><span className="muted">{d.label}</span><span className="num">{d.before} → {d.after} <span className={`delta ${d.diff > 0 ? 'up' : 'down'}`}>({signed(d.diff)} לוחות)</span></span></div>)}
          {impact.hardware.map((d) => <div className="row between small" key={d.label}><span className="muted">{d.label}</span><span className="num">{d.before} → {d.after}</span></div>)}
          {impact.laborHours !== 0 && <div className="row between small"><span className="muted">שעות</span><span className="num">{signed(impact.laborHours)}</span></div>}
          {impact.marginBefore != null && impact.marginAfter != null && impact.marginBefore !== impact.marginAfter && <div className="row between small"><span className="muted">margin</span><span className="num">{pct(impact.marginBefore)} → {pct(impact.marginAfter)}</span></div>}
        </div>
      )}
    </Card>
  )
}

function UnitDetail({ u }: { u: Unit }) {
  const { state } = useStore()
  const materials = byId(state.materials), hardware = byId(state.hardware)
  const uc = priceUnit(u, materials, hardware, state.settings)
  return (
    <Card title="פירוט יחידה">
      <div className="row between"><span className="muted">חומרים</span><span className="num">{money(uc.materials)}</span></div>
      <div className="row between"><span className="muted">פרזול</span><span className="num">{money(uc.hardware)}</span></div>
      <div className="row between"><span className="muted">עבודה ({fmt(uc.laborHours)} ש׳)</span><span className="num">{money(uc.labor)}</span></div>
      {uc.subcontractors > 0 && <div className="row between"><span className="muted">קבלני משנה</span><span className="num">{money(uc.subcontractors)}</span></div>}
      {uc.sheets.length > 0 && <div style={{ marginTop: '.5rem' }}><div className="faint">לוחות</div>{uc.sheets.map((s) => <div className="row between small" key={s.materialId}><span>{materials[s.materialId]?.name}</span><span className="num">{s.sheets} ({fmt(s.areaM2)} מ״ר)</span></div>)}</div>}
      {uc.hardwareNeeds.length > 0 && <div style={{ marginTop: '.5rem' }}><div className="faint">פרזול</div>{uc.hardwareNeeds.map((n) => <div className="row between small" key={n.hardwareId}><span>{hardware[n.hardwareId]?.name}</span><span className="num">{n.qty}</span></div>)}</div>}
      {uc.derived && (
        <details style={{ marginTop: '.5rem' }}>
          <summary className="faint">חלקים ({uc.derived.parts.reduce((a, p) => a + p.qty, 0)}) · קנט {fmt(uc.edgeMeters)} מ׳</summary>
          <table style={{ marginTop: '.3rem' }}><tbody>{uc.derived.parts.map((p, i) => <tr key={i}><td>{p.label}</td><td className="num">{p.qty}</td><td className="num">{Math.round(p.w)}×{Math.round(p.h)}</td></tr>)}</tbody></table>
        </details>
      )}
      {uc.warnings.length > 0 && <div className="callout warn small" style={{ marginTop: '.5rem' }}><ul style={{ margin: 0 }}>{uc.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
    </Card>
  )
}
