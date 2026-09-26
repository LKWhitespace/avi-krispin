import type { AppState, Job, QuoteOption, Revision, Unit } from '../model/types'
import { byId, priceJob, type Breakdown } from './pricing'

export interface OptionPrice {
  option: QuoteOption | null
  breakdown: Breakdown
  /** price before VAT, keeps the job's current margin */
  price: number
}

export function applyOption(units: Unit[], o: QuoteOption | null): Unit[] {
  if (!o) return units
  return units.map((u) => (u.kind === 'parametric' ? { ...u, doorMaterialId: o.doorMaterialId ?? u.doorMaterialId, carcassMaterialId: o.carcassMaterialId ?? u.carcassMaterialId } : u))
}

/** Price the job's quote (included units only), then each option at the same margin. */
export function priceQuote(job: Pick<Job, 'units' | 'extras' | 'quotedPrice' | 'quote'>, state: Pick<AppState, 'materials' | 'hardware' | 'settings'>): { base: OptionPrice; options: OptionPrice[]; margin: number } {
  const included = job.units.filter((u) => job.quote.includedUnitIds.includes(u.id))
  const ctx = { extras: job.extras, materials: byId(state.materials), hardware: byId(state.hardware), settings: state.settings }
  const baseB = priceJob({ ...ctx, units: included, quotedPrice: job.quotedPrice })
  const margin = baseB.margin != null && baseB.margin > 0 && baseB.margin < 0.95 ? baseB.margin : state.settings.targetMargin
  const priceAt = (b: Breakdown) => Math.round(b.totalCost / (1 - margin))
  const base: OptionPrice = { option: null, breakdown: baseB, price: job.quotedPrice ?? priceAt(baseB) }
  const options = job.quote.options.map((o) => {
    const b = priceJob({ ...ctx, units: applyOption(included, o), quotedPrice: null })
    return { option: o, breakdown: b, price: priceAt(b) }
  })
  return { base, options, margin }
}

/** A frozen revision is priced with its own snapshot, never with today's library. */
export function priceQuoteFromRevision(r: Revision, quote: Job['quote']) {
  return priceQuote({ units: r.units, extras: r.extras, quotedPrice: r.quotedPrice, quote }, { materials: Object.values(r.materials), hardware: Object.values(r.hardware), settings: r.settings })
}

export function quoteExpired(quote: Job['quote']): boolean {
  if (!quote.sentAt) return false
  return Date.now() > Date.parse(quote.sentAt) + quote.validityDays * 86400000
}
