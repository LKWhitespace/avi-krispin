import { useEffect, useState, type ReactNode } from 'react'
import type { Dimension, DimensionSource, ParametricUnit } from '../model/types'
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

export function Badge({ children, tone = '', plain }: { children: ReactNode; tone?: '' | 'ok' | 'warn' | 'bad' | 'accent'; plain?: boolean }) {
  return <span className={`badge ${tone} ${plain ? 'plain' : ''}`}>{children}</span>
}

export function sourceTone(s: DimensionSource): '' | 'ok' | 'warn' | 'bad' {
  return s === 'site' || s === 'verified' ? 'ok' : s === 'plan' ? '' : 'warn'
}

export function DimInput({ label, dim, onChange, disabled }: { label: string; dim: Dimension; onChange: (d: Dimension) => void; disabled?: boolean }) {
  return (
    <div className="field">
      <label>{label} <span className="faint">מ״מ</span></label>
      <div className="suffix">
        <NumInput value={dim.value} allowEmpty placeholder="חסר" onChange={(v) => !disabled && onChange({ ...dim, value: v })} />
        <select value={dim.source} disabled={disabled} onChange={(e) => onChange({ ...dim, source: e.target.value as DimensionSource })} style={{ width: 'auto' }}>
          {(Object.keys(SOURCE_LABEL) as DimensionSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
      </div>
      {dim.value == null && <span className="faint" style={{ color: 'var(--bad)' }}>חסר — היחידה לא מתומחרת</span>}
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

export function MarginBar({ margin, target }: { margin: number | null; target: number }) {
  const tone = margin == null ? '' : margin >= target ? '' : margin >= target - 0.1 ? 'warn' : 'bad'
  const w = margin == null ? 0 : Math.max(0, Math.min(100, margin * 100 * 1.6))
  return <div className={`margin-bar ${tone}`}><i style={{ width: `${w}%` }} /><span className="target" style={{ insetInlineStart: `${Math.min(100, target * 100 * 1.6)}%` }} /></div>
}

export function marginTone(margin: number | null, target: number): '' | 'ok' | 'warn' | 'bad' {
  if (margin == null) return ''
  return margin >= target ? 'ok' : margin >= target - 0.1 ? 'warn' : 'bad'
}

/** Front elevation of a parametric unit, drawn to proportion. */
export function Elevation({ u, height = 120 }: { u: ParametricUnit; height?: number }) {
  const W = u.width.value ?? 1000, H = u.height.value ?? 1000
  const vw = 200, vh = Math.max(60, Math.min(220, (vw * H) / W))
  const t = 4
  const bays = Math.max(1, u.bays.length)
  const bw = (vw - t * 2 - (bays - 1) * t) / bays
  const doors = u.doors.count
  const dw = doors > 0 ? (vw - t * 2) / doors : 0
  return (
    <svg className="elev" viewBox={`0 0 ${vw} ${vh + 14}`} style={{ height }} preserveAspectRatio="xMidYMid meet">
      <rect className="frame" x={1} y={1} width={vw - 2} height={vh - 2} rx={2} />
      {u.bays.map((b, i) => {
        const x = t + i * (bw + t), y = t, h = vh - t * 2
        const els = []
        if (b.content === 'shelves') for (let k = 1; k <= Math.min(b.count, 8); k++) els.push(<line key={k} className="shelf" x1={x + 2} x2={x + bw - 2} y1={y + (h * k) / (Math.min(b.count, 8) + 1)} y2={y + (h * k) / (Math.min(b.count, 8) + 1)} />)
        if (b.content === 'drawers') { const n = Math.min(b.count, 6); for (let k = 0; k < n; k++) els.push(<rect key={k} className="drawer" x={x + 3} y={y + 3 + (h / n) * k} width={bw - 6} height={h / n - 5} rx={1.5} />) }
        if (b.content === 'hanging') els.push(<line key="r" className="rod" x1={x + 4} x2={x + bw - 4} y1={y + h * 0.18} y2={y + h * 0.18} />)
        return <g key={b.id}><rect className="bay" x={x} y={y} width={bw} height={h} />{els}</g>
      })}
      {doors > 0 && doors <= 12 && Array.from({ length: doors }).map((_, i) => <rect key={i} className="door" x={t + i * dw + 1} y={t + 1} width={dw - 2} height={vh - t * 2 - 2} rx={1} style={{ opacity: .55 }} />)}
      <text className="dim" x={vw / 2} y={vh + 11} textAnchor="middle">{u.width.value ?? '?'} × {u.height.value ?? '?'} × {u.depth.value ?? '?'}</text>
    </svg>
  )
}

export const Icon = {
  jobs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 10h18M9 4v6" /></svg>,
  library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h5v16H4zM10 4h5v16h-5zM16.5 5l4 1-3.5 14-4-1z" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  arrow: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
}
