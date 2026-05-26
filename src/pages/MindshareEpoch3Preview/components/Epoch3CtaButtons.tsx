import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isMindshareSubmissionOpen } from '../../../lib/mindshareEpochSchedule'

type Epoch3CtaButtonsProps = {
  id?: string
}

const Epoch3CtaButtons = ({ id }: Epoch3CtaButtonsProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const submitOpen = isMindshareSubmissionOpen(nowMs)

  return (
    <div className="epoch3-btn-row" id={id}>
      {submitOpen ? (
        <Link to="/mindshare-submit" className="epoch3-btn">
          Submit Your Contribution
        </Link>
      ) : (
        <button type="button" className="epoch3-btn epoch3-btn--disabled" disabled aria-disabled="true">
          Submit Your Contribution
        </button>
      )}
      <Link to="/sr-platform" className="epoch3-btn">
        Join SR Platform Waitlist&nbsp;→
      </Link>
    </div>
  )
}

export default Epoch3CtaButtons
