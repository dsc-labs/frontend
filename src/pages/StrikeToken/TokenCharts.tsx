import { motion, useReducedMotion } from 'framer-motion'
import type {
  BurnActivityPoint,
  BurnRange,
  TokenRange,
  TokenSupplyPoint,
} from './tokenTypes'
import { formatCompactTokenAmount, formatTokenAmount } from './tokenFormat'
import { chartScaleMax } from './tokenChartData'

const WIDTH = 960
const HEIGHT = 300
const PADDING_X = 28
const PADDING_TOP = 24
const PADDING_BOTTOM = 42

function linePath(values: readonly number[], maxValue: number) {
  const plotWidth = WIDTH - PADDING_X * 2
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  return values
    .map((value, index) => {
      const x = PADDING_X + (index / Math.max(values.length - 1, 1)) * plotWidth
      const y = PADDING_TOP + (1 - value / maxValue) * plotHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function pointPosition(index: number, count: number, value: number, maxValue: number) {
  const plotWidth = WIDTH - PADDING_X * 2
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  return {
    x: PADDING_X + (index / Math.max(count - 1, 1)) * plotWidth,
    y: PADDING_TOP + (1 - value / maxValue) * plotHeight,
  }
}

const TOKEN_RANGE_LABELS: readonly { value: TokenRange; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

const BURN_RANGE_LABELS: readonly { value: BurnRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

function RangeControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="strike-token__range" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'is-active' : undefined}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ChartGrid({ maxValue }: { maxValue: number }) {
  return (
    <g className="strike-token__chart-grid" aria-hidden="true">
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = PADDING_TOP + fraction * (HEIGHT - PADDING_TOP - PADDING_BOTTOM)
        const value = maxValue * (1 - fraction)
        return (
          <g key={fraction}>
            <line x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} />
            <text x={PADDING_X} y={Math.max(12, y - 7)}>
              {formatCompactTokenAmount(String(Math.round(value)))} SR
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function SupplyHistoryChart({
  points,
  range,
  onRangeChange,
}: {
  points: readonly TokenSupplyPoint[]
  range: TokenRange
  onRangeChange: (range: TokenRange) => void
}) {
  const reduceMotion = useReducedMotion()
  const series = [
    {
      id: 'current',
      label: 'Current supply',
      values: points.map((point) => Number(point.currentSupply)),
    },
    {
      id: 'circulating',
      label: 'Circulating supply',
      values: points.map((point) => Number(point.circulatingSupply)),
    },
    {
      id: 'burned',
      label: 'Burned supply',
      values: points.map((point) => Number(point.burnedSupply)),
    },
  ] as const
  const maxValue = chartScaleMax(points.flatMap((point) => [
    point.currentSupply, point.circulatingSupply, point.burnedSupply,
  ]))

  return (
    <div className="strike-token__chart-card">
      <div className="strike-token__chart-toolbar">
        <div className="strike-token__legend" aria-label="Chart legend">
          {series.map((item) => (
            <span className={`is-${item.id}`} key={item.id}>
              {item.label}
            </span>
          ))}
        </div>
        <RangeControl
          value={range}
          options={TOKEN_RANGE_LABELS}
          onChange={onRangeChange}
          label="Supply history range"
        />
      </div>
      <div className="strike-token__chart-scroll">
        <svg
          className="strike-token__chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby="supply-chart-title supply-chart-description"
        >
          <title id="supply-chart-title">SR token supply over time</title>
          <desc id="supply-chart-description">
            Preview comparison of current, circulating, and burned token supply.
          </desc>
          <ChartGrid maxValue={maxValue} />
          {series.map((item) => (
            <motion.path
              key={item.id}
              className={`strike-token__chart-line is-${item.id}`}
              d={linePath(item.values, maxValue)}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              whileInView={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ))}
          {points.map((point, index) => {
            const position = pointPosition(index, points.length, Number(point.burnedSupply), maxValue)
            return (
              <g key={point.timestamp} className="strike-token__chart-point">
                <circle cx={position.x} cy={position.y} r="4" />
                <text x={position.x} y={HEIGHT - 13} textAnchor="middle">
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <table className="strike-token__sr-only-table">
        <caption>SR token supply preview values</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Current supply</th>
            <th>Circulating supply</th>
            <th>Burned supply</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.timestamp}>
              <th>{point.label}</th>
              <td>{formatTokenAmount(point.currentSupply)}</td>
              <td>{formatTokenAmount(point.circulatingSupply)}</td>
              <td>{formatTokenAmount(point.burnedSupply)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BurnActivityChart({
  points,
  range,
  onRangeChange,
}: {
  points: readonly BurnActivityPoint[]
  range: BurnRange
  onRangeChange: (range: BurnRange) => void
}) {
  const reduceMotion = useReducedMotion()
  const maxValue = chartScaleMax(points.map((point) => point.cumulativeBurned))
  const maxPeriodBurn = chartScaleMax(points.map((point) => point.amountBurned))
  const cumulativeValues = points.map((point) => Number(point.cumulativeBurned))

  return (
    <div className="strike-token__chart-card strike-token__chart-card--burn">
      <div className="strike-token__chart-toolbar">
        <div className="strike-token__legend" aria-label="Burn activity chart legend">
          <span className="is-burn-volume">Period burns (independent scale)</span>
          <span className="is-burn-total">Cumulative (left scale)</span>
        </div>
        <RangeControl
          value={range}
          options={BURN_RANGE_LABELS}
          onChange={onRangeChange}
          label="Burn activity range"
        />
      </div>
      <div className="strike-token__chart-scroll">
        <svg
          className="strike-token__chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby="burn-chart-title burn-chart-description"
        >
          <title id="burn-chart-title">Cumulative SR token burn activity</title>
          <desc id="burn-chart-description">
            Preview period burn amounts shown as bars with a separate scale, and cumulative supply removed shown as a line.
          </desc>
          <ChartGrid maxValue={maxValue} />
          {points.map((point, index) => {
            const position = pointPosition(index, points.length, Number(point.amountBurned), maxPeriodBurn)
            const baseline = HEIGHT - PADDING_BOTTOM
            return (
              <g key={point.timestamp} className="strike-token__burn-bar">
                <title>{`${point.label}: ${formatTokenAmount(point.amountBurned)} SR burned in period`}</title>
                <motion.line
                  x1={position.x}
                  x2={position.x}
                  y1={baseline}
                  y2={position.y}
                  initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                  whileInView={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.06 }}
                />
                <text x={position.x} y={HEIGHT - 13} textAnchor="middle">
                  {point.label}
                </text>
              </g>
            )
          })}
          <motion.path
            className="strike-token__chart-line is-burn-total"
            d={linePath(cumulativeValues, maxValue)}
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            whileInView={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <table className="strike-token__sr-only-table">
        <caption>Cumulative SR burn preview values</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Burned in period</th>
            <th>Cumulative burned</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.timestamp}>
              <th>{point.label}</th>
              <td>{formatTokenAmount(point.amountBurned)}</td>
              <td>{formatTokenAmount(point.cumulativeBurned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
