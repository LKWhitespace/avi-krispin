const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 })

export const money = (n: number | null | undefined): string => (n == null ? '—' : ils.format(n))
export const signedMoney = (n: number): string => (n > 0 ? '+' : n < 0 ? '−' : '') + ils.format(Math.abs(n))
export const pct = (n: number | null | undefined): string => (n == null ? '—' : `${Math.round(n * 100)}%`)
export const fmt = (n: number | null | undefined): string => (n == null ? '—' : num.format(n))
export const signed = (n: number): string => (n > 0 ? `+${num.format(n)}` : num.format(n))
export const dateShort = (iso: string): string => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const ver = (n: number | undefined | null): string => (n == null ? '' : `גרסה ${n}`)

export const STATUS_LABEL: Record<string, string> = {
  draft: 'טיוטה', quoted: 'הצעה נשלחה', approved: 'אושר', locked: 'בייצור', lost: 'לא נסגר',
}
export const PROJECT_LABEL: Record<string, string> = {
  kitchen: 'מטבח', wardrobe: 'ארון', furniture: 'ריהוט', cladding: 'חיפוי קיר', refurbishment: 'שיקום', other: 'אחר',
}
export const SOURCE_LABEL: Record<string, string> = {
  estimated: 'הערכה', customer: 'מהלקוח', plan: 'מתוכנית', site: 'נמדד בשטח', verified: 'מאומת',
}
export const BAY_LABEL: Record<string, string> = { shelves: 'מדפים', hanging: 'תלייה', drawers: 'מגירות', empty: 'ריק' }
export const KIND_LABEL: Record<string, string> = { parametric: 'פרמטרי', area: 'לפי שטח', freeform: 'חופשי' }
