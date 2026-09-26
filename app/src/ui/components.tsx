import { useEffect, useState, type ReactNode } from 'react'
import type { Dimension, DimensionSource } from '../model/types'
import { SOURCE_LABEL } from './format'

export function Card({ title, children, className = '', right, onClick, selected }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode; onClick?: () => void; selected?: boolean }) {
  return (
    <div className={`card ${className} ${onClick ? 'clickable' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}>
      {title != null && <div className="title"><span>{title}</span>{right}</div>}
      {children}
    </div>
  )
}

export function Field({ label, children, suffix }: { label: string; children: ReactNode; suffix?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {suffix ? <div className="suffix">{children}<span>{suffix}</span></div> : children}
    </div>
  )
}

/** Numeric input that keeps local text state so typing feels natural; commits on change. */
export function NumInput({ value, onChange, min, step, placeholder, allowEmpty }: { value: number | null; onChange: (v: number | null) => void; min?: number; step?: number; placeholder?: string; allowEmpty?: boolean }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => { setText(value == null ? '' : String(value)) }, [value])
  return (
    <input
      type="number" inputMode="decimal" value={text} min={min} step={step ?? 1} placeholder={placeholder}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        if (t === '') { if (allowEmpty) onChange(null); return }
        const n = Number(t)
        if (!Number.isNaN(n)) onChange(n)
      }}
    />
  )
}

export function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <NumInput value={Math.round(value * 100)} onChange={(v) => onChange((v ?? 0) / 100)} min={0} step={1} />
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: '' | 'ok' | 'warn' | 'bad' | 'accent' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function sourceTone(s: DimensionSource): '' | 'ok' | 'warn' | 'bad' {
  return s === 'site' || s === 'verified' ? 'ok' : s === 'plan' ? '' : 'warn'
}

export function DimInput({ label, dim, onChange, disabled }: { label: string; dim: Dimension; onChange: (d: Dimension) => void; disabled?: boolean }) {
  return (
    <div className="field">
      <label>{label} <span className="faint">מ״מ</span></label>
      <div className="suffix">
        <NumInput value={dim.value} allowEmpty placeholder="Missing" onChange={(v) => !disabled && onChange({ ...dim, value: v })} />
        <select value={dim.source} disabled={disabled} onChange={(e) => onChange({ ...dim, source: e.target.value as DimensionSource })} style={{ width: 'auto' }}>
          {(Object.keys(SOURCE_LABEL) as DimensionSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
      </div>
      {dim.value == null && <span className="faint" style={{ color: 'var(--bad)' }}>Missing — לא מתומחר</span>}
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Delta({ n, kind = 'money', fmtFn }: { n: number; kind?: 'money' | 'count' | 'hours'; fmtFn: (n: number) => string }) {
  const cls = n > 0 ? 'up' : n < 0 ? 'down' : 'zero'
  void kind
  return <span className={`delta ${cls} num`}>{fmtFn(n)}</span>
}

export function MarginBar({ margin, target }: { margin: number | null; target: number }) {
  if (margin == null) return <div className="margin-bar"><i style={{ width: 0 }} /></div>
  const tone = margin >= target ? '' : margin >= target - 0.1 ? 'warn' : 'bad'
  const w = Math.max(0, Math.min(100, margin * 100 * 2))
  return <div className={`margin-bar ${tone}`}><i style={{ width: `${w}%` }} /></div>
}

export function marginTone(margin: number | null, target: number): '' | 'ok' | 'warn' | 'bad' {
  if (margin == null) return ''
  return margin >= target ? 'ok' : margin >= target - 0.1 ? 'warn' : 'bad'
}
