const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const utcFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
  timeZoneName: 'short',
})

export function formatTokenAmount(value: string) {
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [whole = '0', rawFraction] = unsigned.split('.')
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0'
  const grouped = normalizedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = rawFraction?.replace(/0+$/, '')
  const result = fraction ? `${grouped}.${fraction}` : grouped
  return negative && result !== '0' ? `-${result}` : result
}

export function formatCompactTokenAmount(value: string) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return formatTokenAmount(value)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(numericValue)
}

export function formatPercent(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numberFormatter.format(numericValue)}%` : 'Unavailable'
}

export function formatUtcDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : utcFormatter.format(date).replace(',', ',')
}

export function shortenHex(value: string, leading = 6, trailing = 4) {
  if (value.length <= leading + trailing + 3) return value
  return `${value.slice(0, leading)}...${value.slice(-trailing)}`
}
