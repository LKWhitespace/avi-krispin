import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppState, WorkshopSettings } from '../model/types'
import { exportState, useStore } from '../store/store'
import { Card, Field, NumInput, PctInput } from '../ui/components'

export function SettingsPage() {
  const { state, dispatch } = useStore()
  const s = state.settings
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<WorkshopSettings>) => dispatch({ type: 'settings/update', patch })
  const setLabor = (patch: Partial<WorkshopSettings['labor']>) => set({ labor: { ...s.labor, ...patch } })
  const setDef = (patch: Partial<WorkshopSettings['defaults']>) => set({ defaults: { ...s.defaults, ...patch } })
  const mats = (thin: boolean) => state.materials.filter((m) => (thin ? m.thickness <= 10 : m.thickness > 10))
  const hw = (cat: string) => state.hardware.filter((h) => h.category === cat)

  const download = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `quote-to-build-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const importFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as AppState
      if (!parsed.jobs || !parsed.settings) throw new Error('bad')
      if (confirm('לייבא? זה מחליף את כל הנתונים הנוכחיים.')) dispatch({ type: 'state/replace', state: parsed })
    } catch { alert('הקובץ אינו ייצוא תקין של המערכת.') }
  }

  return (
    <div className="stack">
      <div className="row between"><h1>Settings</h1>{!s.onboarded && <button className="btn primary" onClick={() => { set({ onboarded: true }); nav('/') }}>סיימתי — ל־Jobs</button>}</div>
      <div className="grid two">
        <Card title="1 · הנגרייה">
          <div className="stack">
            <Field label="שם העסק"><input value={s.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="אבי קריספין נגרות" /></Field>
            <div className="inline">
              <Field label="תעריף שעת נגרייה" suffix="₪"><NumInput value={s.laborRate} min={0} onChange={(v) => set({ laborRate: v ?? 0 })} /></Field>
              <Field label="תעריף שעת התקנה" suffix="₪"><NumInput value={s.installRate} min={0} onChange={(v) => set({ installRate: v ?? 0 })} /></Field>
              <Field label="Margin יעד" suffix="%"><PctInput value={s.targetMargin} onChange={(v) => set({ targetMargin: Math.min(0.95, v) })} /></Field>
            </div>
            <div className="inline">
              <Field label="הוצאות קבועות לחודש" suffix="₪ (0 = לא מוגדר)"><NumInput value={s.overheadPerMonth} min={0} onChange={(v) => set({ overheadPerMonth: v ?? 0 })} /></Field>
              <Field label="שעות עבודה בחודש"><NumInput value={s.hoursPerMonth} min={1} onChange={(v) => set({ hoursPerMonth: v ?? 160 })} /></Field>
              <Field label="מע״מ" suffix="%"><PctInput value={s.vat} onChange={(v) => set({ vat: v })} /></Field>
              <Field label="סיכון ברירת מחדל" suffix="%"><PctInput value={s.risk} onChange={(v) => set({ risk: v })} /></Field>
            </div>
            <p className="faint">Overhead מחולק לשעות: ₪{s.overheadPerMonth > 0 ? Math.round(s.overheadPerMonth / s.hoursPerMonth) : 0} לכל שעת עבודה/התקנה.</p>
          </div>
        </Card>

        <Card title="2 · זמני עבודה (דקות)">
          <div className="inline">
            <Field label="חיתוך לחלק"><NumInput value={s.labor.cutPerPart} min={0} onChange={(v) => setLabor({ cutPerPart: v ?? 0 })} /></Field>
            <Field label="קנט למטר"><NumInput value={s.labor.edgePerMeter} min={0} onChange={(v) => setLabor({ edgePerMeter: v ?? 0 })} /></Field>
            <Field label="הרכבה לחלק"><NumInput value={s.labor.assemblyPerPart} min={0} onChange={(v) => setLabor({ assemblyPerPart: v ?? 0 })} /></Field>
            <Field label="לדלת"><NumInput value={s.labor.perDoor} min={0} onChange={(v) => setLabor({ perDoor: v ?? 0 })} /></Field>
            <Field label="למגירה"><NumInput value={s.labor.perDrawer} min={0} onChange={(v) => setLabor({ perDrawer: v ?? 0 })} /></Field>
            <Field label="למ״ר חיפוי"><NumInput value={s.labor.perM2} min={0} onChange={(v) => setLabor({ perM2: v ?? 0 })} /></Field>
            <Field label="קנט — ₪ למטר"><NumInput value={s.edgeCostPerMeter} min={0} step={0.1} onChange={(v) => set({ edgeCostPerMeter: v ?? 0 })} /></Field>
          </div>
          <p className="faint">אלה ברירות מחדל לתמחור. ° יש לכייל מול 2–3 עבודות אמיתיות לפני שסומכים על השעות.</p>
        </Card>

        <Card title="3 · ברירות מחדל ליחידה חדשה">
          <div className="inline">
            <Field label="חומר גוף"><select value={s.defaults.carcassMaterialId} onChange={(e) => setDef({ carcassMaterialId: e.target.value })}>{mats(false).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <Field label="חומר דלתות"><select value={s.defaults.doorMaterialId} onChange={(e) => setDef({ doorMaterialId: e.target.value })}>{mats(false).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <Field label="גב"><select value={s.defaults.backMaterialId} onChange={(e) => setDef({ backMaterialId: e.target.value })}>{mats(true).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <Field label="ציר"><select value={s.defaults.hingeId} onChange={(e) => setDef({ hingeId: e.target.value })}>{hw('hinge').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
            <Field label="מסילה"><select value={s.defaults.runnerId} onChange={(e) => setDef({ runnerId: e.target.value })}>{hw('runner').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
            <Field label="ידית"><select value={s.defaults.handleId} onChange={(e) => setDef({ handleId: e.target.value })}>{hw('handle').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
            <Field label="תומך מדף"><select value={s.defaults.shelfSupportId} onChange={(e) => setDef({ shelfSupportId: e.target.value })}>{hw('shelf_support').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
            <Field label="מוט תלייה"><select value={s.defaults.rodId} onChange={(e) => setDef({ rodId: e.target.value })}>{hw('rod').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
          </div>
        </Card>

        <Card title="נתונים">
          <p className="muted small">הכול נשמר בדפדפן הזה בלבד. ייצא קובץ לגיבוי או להעברה למחשב אחר.</p>
          <div className="row">
            <button className="btn" onClick={download}>ייצוא JSON</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>ייבוא JSON</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <button className="btn danger ghost" onClick={() => confirm('לאפס את כל הנתונים ל־presets? אין שחזור.') && dispatch({ type: 'state/reset' })}>איפוס</button>
          </div>
        </Card>
      </div>
    </div>
  )
}
