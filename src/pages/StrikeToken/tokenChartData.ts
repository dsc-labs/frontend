import type { BurnEvent, BurnType } from './tokenTypes'

type Timestamped = { readonly timestamp: string }

export function filterBurnEvents(events: readonly BurnEvent[], type: 'all' | BurnType): BurnEvent[] {
  return type === 'all' ? [...events] : events.filter((event) => event.type === type)
}

// Preview windows follow the latest fixture point, not today's date.
export function historyWithinDays<T extends Timestamped>(points: readonly T[], days: number): T[] {
  if (!points.length) return []
  const latest = Date.parse(points[points.length - 1].timestamp)
  const earliest = latest - days * 24 * 60 * 60 * 1000
  return points.filter((point) => Date.parse(point.timestamp) >= earliest && Date.parse(point.timestamp) <= latest)
}

export function historyWithinYear<T extends Timestamped>(points: readonly T[]): T[] {
  if (!points.length) return []
  const latest = new Date(points[points.length - 1].timestamp)
  const earliest = new Date(latest)
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 1)
  return points.filter((point) => {
    const date = Date.parse(point.timestamp)
    return date >= earliest.getTime() && date <= latest.getTime()
  })
}

export function chartScaleMax(values: readonly string[]): number {
  const peak = Math.max(0, ...values.map(Number).filter(Number.isFinite))
  if (peak === 0) return 1
  const step = 10 ** Math.floor(Math.log10(peak)) / 2
  return Math.ceil(peak / step) * step
}
