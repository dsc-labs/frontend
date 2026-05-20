import { MindshareChallengeView } from '../MindshareChallenge/MindshareChallenge'
import '../MindshareChallenge/MindshareChallenge.css'

/** Epoch 3 gap UI (same as live challenge page after Epoch 2 ends). Always reachable at this URL. */
const MindshareEpoch3Preview = () => (
  <MindshareChallengeView phase="epoch3_countdown" seoPath="/epoch3-preview" preview />
)

export default MindshareEpoch3Preview
