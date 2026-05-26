import { useEffect, useState } from 'react'
import { EPOCH_3_END_MS, EPOCH_3_START_MS } from '../../../lib/mindshareEpochSchedule'

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

function getRemaining(endMs: number, nowMs: number) {
  const diffSec = Math.floor((endMs - nowMs) / 1000)
  const diff = Math.max(0, diffSec)
  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
    expired: diffSec <= 0,
  }
}

const Epoch3Countdown = () => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Before start: countdown to Epoch 3 start.
  // After start and before end: countdown to Epoch 3 end.
  const targetMs = nowMs < EPOCH_3_START_MS ? EPOCH_3_START_MS : EPOCH_3_END_MS
  const { days, hours, minutes, seconds, expired } = getRemaining(targetMs, nowMs)

  if (expired) {
    return (
      <p className="epoch3-countdown-expired" role="status">
        Epoch 3 is over.
      </p>
    )
  }

  const units = [
    { label: 'Days', value: pad2(days) },
    { label: 'Hours', value: pad2(hours) },
    { label: 'Minutes', value: pad2(minutes) },
    { label: 'Seconds', value: pad2(seconds) },
  ]

  return (
    <div className="epoch3-countdown" aria-live="polite" role="timer">
      {units.map((u) => (
        <div key={u.label} className="epoch3-cd-unit">
          <div className="epoch3-cd-num">{u.value}</div>
          <div className="epoch3-cd-label">{u.label}</div>
        </div>
      ))}
    </div>
  )
}

export default Epoch3Countdown
