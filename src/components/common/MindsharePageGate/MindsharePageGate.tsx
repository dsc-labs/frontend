import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isMindsharePagesOpen } from '../../../lib/mindshareEpochSchedule'

/** Renders children while Epoch 3 is live; redirects home at `EPOCH_3_END_MS`. */
export function MindsharePageGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => isMindsharePagesOpen())

  useEffect(() => {
    const id = window.setInterval(() => setOpen(isMindsharePagesOpen()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!open) return <Navigate to="/" replace />
  return <>{children}</>
}
