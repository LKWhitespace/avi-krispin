import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { newParametricUnit, uid } from '../model/presets'
import type { Dimension, ParametricTemplate } from '../model/types'
import { useStore } from '../store/store'
import { Badge, Card, Field, NumInput } from '../ui/components'
import { fileToDataUrl } from '../ui/image'
import type { JobCtx } from './JobLayout'

const TEMPLATES: { t: ParametricTemplate; label: string }[] = [{ t: 'wardrobe', label: 'ארון' }, { t: 'base_cabinet', label: 'ארון תחתון' }, { t: 'bookcase', label: 'ספרייה' }, { t: 'custom', label: 'אחר' }]

/** Rule: nothing the customer did not say gets a value. Every field starts empty. */
export function IntakeTab() {
  const { job, guard, update } = useOutletContext<JobCtx>()
  const { state } = useStore()
  const nav = useNavigate()
  const [draft, setDraft] = useState({ template: 'wardrobe' as ParametricTemplate, name: '', w: null as number | null, h: null as number | null, d: null as number | null, doors: null as number | null, drawers: null as number | null, finish: '', notes: '' })
  const [busy, setBusy] = useState(false)

  const setText = (t: string) => guard() && update((j) => ({ ...j, intakeText: t }))
  const addFiles = async (files: FileList | null) => {
    if (!files || !guard()) return
    setBusy(true)
    for (const f of Array.from(files)) {
      try {
        const dataUrl = await fileToDataUrl(f)
        update((j) => ({ ...j, attachments: [...j.attachments, { id: uid(), name: f.name, dataUrl, addedAt: new Date().toISOString() }] }))
      } catch { alert(`לא ניתן לקרוא את ${f.name}`) }
    }
    setBusy(false)
  }

  const missing = [draft.w == null && 'רוחב', draft.h == null && 'גובה', draft.d == null && 'עומק'].filter(Boolean) as string[]
  const createUnit = () => {
    if (!guard()) return
    const u = newParametricUnit(state.settings, draft.template)
    const dim = (v: number | null): Dimension => ({ value: v, source: 'customer' })
    u.name = draft.name || u.name
    u.width = dim(draft.w); u.height = dim(draft.h); u.depth = dim(draft.d)
    if (draft.doors != null) u.doors.count = draft.doors
    if (draft.drawers != null) {
      const drawerBay = u.bays.find((b) => b.content === 'drawers')
      if (drawerBay) drawerBay.count = draft.drawers
      else if (draft.drawers > 0) u.bays.push({ id: uid(), content: 'drawers', count: draft.drawers })
    }
    u.notes = [draft.finish && `גימור: ${draft.finish}`, draft.notes].filter(Boolean).join(' · ') || undefined
    update((j) => ({ ...j, units: [...j.units, u], quote: { ...j.quote, includedUnitIds: [...j.quote.includedUnitIds, u.id] } }), `יחידה נוצרה מקליטה: ${u.name}`)
    nav('../units')
  }

  return (
    <div className="grid two">
      <div className="stack">
        <Card title="מה הלקוח שלח">
          <Field label="הודעה (הדבק מוואטסאפ)">
            <textarea rows={7} value={job.intakeText} onChange={(e) => setText(e.target.value)} placeholder="״אני צריך ארון 2.4 מטר, גובה 2.6, ארבע דלתות, לבן, שתי מגירות״" />
          </Field>
          <div className="row" style={{ marginTop: '.6rem' }}>
            <label className="btn">{busy ? 'טוען…' : '+ תמונות או תוכנית'}<input type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} /></label>
            <span className="faint">תמונות נשמרות מוקטנות בדפדפן.</span>
          </div>
          {job.attachments.length > 0 && (
            <div className="grid cards" style={{ marginTop: '.8rem', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {job.attachments.map((a) => (
                <div key={a.id} style={{ position: 'relative' }}>
                  <img src={a.dataUrl} alt={a.name} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                  <button className="btn sm ghost" style={{ position: 'absolute', top: 4, insetInlineEnd: 4, background: 'var(--surface)' }} onClick={() => guard() && update((j) => ({ ...j, attachments: j.attachments.filter((x) => x.id !== a.id), measurements: j.measurements.map((m) => (m.photoId === a.id ? { ...m, photoId: undefined, line: undefined } : m)) }))}>×</button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="callout info small">זיהוי אוטומטי של ההודעה יגיע בגרסה מאוחרת. כרגע ממלאים את הטופס ידנית מהטקסט. שדה שהלקוח לא ציין נשאר "חסר" ולא מקבל ברירת מחדל.</div>
      </div>

      <Card title="טיוטת יחידה" right={<Badge tone="warn">מקור המידות: הלקוח</Badge>}>
        <div className="stack">
          <div className="inline">
            <Field label="סוג"><select value={draft.template} onChange={(e) => setDraft({ ...draft, template: e.target.value as ParametricTemplate })}>{TEMPLATES.map((t) => <option key={t.t} value={t.t}>{t.label}</option>)}</select></Field>
            <Field label="שם"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ארון חדר שינה" /></Field>
          </div>
          <div className="inline">
            <Field label="רוחב" suffix="מ״מ"><NumInput value={draft.w} allowEmpty placeholder="חסר" onChange={(v) => setDraft({ ...draft, w: v })} /></Field>
            <Field label="גובה" suffix="מ״מ"><NumInput value={draft.h} allowEmpty placeholder="חסר" onChange={(v) => setDraft({ ...draft, h: v })} /></Field>
            <Field label="עומק" suffix="מ״מ"><NumInput value={draft.d} allowEmpty placeholder="חסר" onChange={(v) => setDraft({ ...draft, d: v })} /></Field>
          </div>
          <div className="inline">
            <Field label="דלתות"><NumInput value={draft.doors} allowEmpty placeholder="חסר" min={0} onChange={(v) => setDraft({ ...draft, doors: v })} /></Field>
            <Field label="מגירות"><NumInput value={draft.drawers} allowEmpty placeholder="חסר" min={0} onChange={(v) => setDraft({ ...draft, drawers: v })} /></Field>
            <Field label="גימור / צבע"><input value={draft.finish} onChange={(e) => setDraft({ ...draft, finish: e.target.value })} placeholder="לבן" /></Field>
          </div>
          <Field label="הערות"><textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          {missing.length > 0 && <div className="callout warn small">חסר: {missing.join(', ')}. היחידה תיווצר אבל לא תתומחר עד שהמידות יושלמו, ביחידות או במדידות.</div>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={createUnit}>צור יחידה מהטיוטה</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
