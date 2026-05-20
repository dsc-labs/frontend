import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { MindshareChallengeView } from '../MindshareChallenge/MindshareChallenge'
import { isEpoch3PreviewPublic } from '../../lib/mindshareEpochSchedule'
import '../MindshareChallenge/MindshareChallenge.css'

/** Epoch 3 gap UI; public only after Epoch 2 ends (midnight GMT+7). */
const MindshareEpoch3Preview = () => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!isEpoch3PreviewPublic(nowMs)) {
    return <Navigate to="/mindshare-challenge" replace />
  }

  return <MindshareChallengeView phase="epoch3_countdown" seoPath="/epoch3-preview" preview />
}

export default MindshareEpoch3Preview
