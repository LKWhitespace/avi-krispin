import { useState } from 'react'
import { uid } from '../model/presets'
import type { Hardware, HardwareCategory, HardwareRulePer, Material, MaterialType } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, NumInput } from '../ui/components'

const MTYPE: Record<MaterialType, string> = { melamine: 'מלמין', mdf: 'MDF', plywood: 'סנדוויץ׳', veneer: 'פורניר', solid: 'עץ מלא', other: 'אחר' }
const HCAT: Record<HardwareCategory, string> = { hinge: 'ציר', runner: 'מסילה', handle: 'ידית', shelf_support: 'תומך מדף', rod: 'מוט', other: 'אחר' }
const HPER: Record<HardwareRulePer, string> = { door: 'לדלת', drawer: 'למגירה', shelf: 'למדף', hanging_bay: 'לתא תלייה', door_or_drawer: 'לדלת/מגירה', unit: 'ליחידה' }

export function LibraryPage() {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<'materials' | 'hardware'>('materials')
  const usage = (id: string) => state.jobs.filter((j) => j.units.some((u) => (u.kind === 'parametric' && (u.carcassMaterialId === id || u.doorMaterialId === id || u.backMaterialId === id)) || (u.kind === 'area' && u.materialId === id))).length
  const stale = (iso: string) => Date.now() - Date.parse(iso) > 1000 * 60 * 60 * 24 * 30 * 6

  const setM = (m: Material, patch: Partial<Material>) => dispatch({ type: 'material/upsert', material: { ...m, ...patch, updatedAt: 'costPerSheet' in patch ? new Date().toISOString() : m.updatedAt, approx: 'costPerSheet' in patch ? false : m.approx } })
  const setH = (h: Hardware, patch: Partial<Hardware>) => dispatch({ type: 'hardware/upsert', hardware: { ...h, ...patch, updatedAt: 'costPerUnit' in patch ? new Date().toISOString() : h.updatedAt, approx: 'costPerUnit' in patch ? false : h.approx } })

  return (
    <div className="stack">
      <div className="row between">
        <h1>Library</h1>
        <div className="row">
          <button className={`btn ${tab === 'materials' ? 'primary' : ''}`} onClick={() => setTab('materials')}>חומרים</button>
          <button className={`btn ${tab === 'hardware' ? 'primary' : ''}`} onClick={() => setTab('hardware')}>פרזול</button>
        </div>
      </div>
      <div className="callout info small">מחירים עם סימון <Badge tone="warn">הערכה</Badge> הם presets. עדכון מחיר מסיר את הסימון ומאפס את "עודכן". שינוי מחיר לא משפיע על גרסאות שמורות, רק על מצב עבודה נוכחי.</div>

      {tab === 'materials' ? (
        <Card title="חומרים" right={<button className="btn sm" onClick={() => dispatch({ type: 'material/upsert', material: { id: uid(), name: 'חומר חדש', type: 'melamine', thickness: 18, sheetW: 2800, sheetH: 2070, costPerSheet: 0, waste: 0.12, updatedAt: new Date().toISOString(), swatch: '#ddd' } })}>+ חומר</button>}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th></th><th>שם</th><th>סוג</th><th className="num">עובי</th><th className="num">לוח (מ״מ)</th><th className="num">₪ ללוח</th><th className="num">waste %</th><th>ספק</th><th>סטטוס</th><th className="num">בשימוש</th><th></th></tr></thead>
              <tbody>
                {state.materials.map((m) => (
                  <tr key={m.id}>
                    <td><input type="color" value={m.swatch ?? '#dddddd'} onChange={(e) => setM(m, { swatch: e.target.value })} style={{ width: 28, height: 22, padding: 0, border: 0, background: 'none' }} /></td>
                    <td><input value={m.name} onChange={(e) => setM(m, { name: e.target.value })} style={{ minWidth: 180 }} /></td>
                    <td><select value={m.type} onChange={(e) => setM(m, { type: e.target.value as MaterialType })}>{Object.entries(MTYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                    <td className="num" style={{ width: 70 }}><NumInput value={m.thickness} min={1} onChange={(v) => setM(m, { thickness: v ?? 18 })} /></td>
                    <td className="num"><div className="row" style={{ gap: '.2rem', flexWrap: 'nowrap' }}><NumInput value={m.sheetW} onChange={(v) => setM(m, { sheetW: v ?? 0 })} />×<NumInput value={m.sheetH} onChange={(v) => setM(m, { sheetH: v ?? 0 })} /></div></td>
                    <td className="num" style={{ width: 90 }}><NumInput value={m.costPerSheet} min={0} onChange={(v) => setM(m, { costPerSheet: v ?? 0 })} /></td>
                    <td className="num" style={{ width: 70 }}><NumInput value={Math.round(m.waste * 100)} min={0} onChange={(v) => setM(m, { waste: (v ?? 0) / 100 })} /></td>
                    <td><input value={m.supplier ?? ''} onChange={(e) => setM(m, { supplier: e.target.value })} style={{ width: 100 }} /></td>
                    <td>{m.approx ? <Badge tone="warn">הערכה</Badge> : stale(m.updatedAt) ? <Badge tone="warn">ישן</Badge> : <Badge tone="ok">עדכני</Badge>}</td>
                    <td className="num">{usage(m.id)}</td>
                    <td><button className="btn sm ghost danger" disabled={usage(m.id) > 0} onClick={() => dispatch({ type: 'material/delete', id: m.id })}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="פרזול" right={<button className="btn sm" onClick={() => dispatch({ type: 'hardware/upsert', hardware: { id: uid(), name: 'פריט חדש', category: 'other', costPerUnit: 0, rule: { per: 'unit', qty: 1 }, updatedAt: new Date().toISOString() } })}>+ פריט</button>}>
          <div className="callout info small" style={{ marginBottom: '.6rem' }}>הפריטים שבפועל נכנסים ליחידה פרמטרית נבחרים ב־Settings → ברירות מחדל. צירים: כמות לדלת עולה לפי גובה הדלת (2/3/4/5), הכלל כאן הוא מינימום.</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>שם</th><th>קטגוריה</th><th className="num">₪ ליחידה</th><th>כלל</th><th className="num">כמות</th><th>ספק</th><th>סטטוס</th><th></th></tr></thead>
              <tbody>
                {state.hardware.map((h) => {
                  const inUse = Object.values(state.settings.defaults).includes(h.id)
                  return (
                    <tr key={h.id}>
                      <td><input value={h.name} onChange={(e) => setH(h, { name: e.target.value })} style={{ minWidth: 200 }} /></td>
                      <td><select value={h.category} onChange={(e) => setH(h, { category: e.target.value as HardwareCategory })}>{Object.entries(HCAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                      <td className="num" style={{ width: 90 }}><NumInput value={h.costPerUnit} min={0} step={0.1} onChange={(v) => setH(h, { costPerUnit: v ?? 0 })} /></td>
                      <td><select value={h.rule.per} onChange={(e) => setH(h, { rule: { ...h.rule, per: e.target.value as HardwareRulePer } })}>{Object.entries(HPER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                      <td className="num" style={{ width: 70 }}><NumInput value={h.rule.qty} min={0} onChange={(v) => setH(h, { rule: { ...h.rule, qty: v ?? 0 } })} /></td>
                      <td><input value={h.supplier ?? ''} onChange={(e) => setH(h, { supplier: e.target.value })} style={{ width: 100 }} /></td>
                      <td>{h.approx ? <Badge tone="warn">הערכה</Badge> : <Badge tone="ok">עדכני</Badge>}{inUse && <> <Badge tone="accent">ברירת מחדל</Badge></>}</td>
                      <td><button className="btn sm ghost danger" disabled={inUse} onClick={() => dispatch({ type: 'hardware/delete', id: h.id })}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
