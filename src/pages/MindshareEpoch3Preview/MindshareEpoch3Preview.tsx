import Header from '../../components/common/Header/Header'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import { EPOCH_3_START_UTC_LABEL } from '../../lib/mindshareEpochSchedule'
import Epoch3Breakdown from './components/Epoch3Breakdown'
import Epoch3Countdown from './components/Epoch3Countdown'
import Epoch3CtaButtons from './components/Epoch3CtaButtons'
import Epoch3Hero from './components/Epoch3Hero'
import Epoch3Lede from './components/Epoch3Lede'
import Epoch3Topbar from './components/Epoch3Topbar'
import './MindshareEpoch3Preview.css'

const MindshareEpoch3Preview = () => (
  <div className="epoch3-page">
    <PageSEO
      path="/epoch3-preview"
      title="Mindshare Challenge — Epoch 3 | STRIKE ROBOT"
      metaDescription={`Epoch 3 contributor program preview. Epoch 3 begins at ${EPOCH_3_START_UTC_LABEL}.`}
      noIndex
    />
    <Epoch3Topbar />
    <Header showSocialIcons />
    <div className="epoch3-wrap">
      <Epoch3Hero />
      <Epoch3Countdown />
      <Epoch3Lede />
      <Epoch3CtaButtons />
      <Epoch3Breakdown />
      <p className="epoch3-form-note">
        Please submit your contribution and join the SR Platform Waitlist using the form below.
      </p>
      <Epoch3CtaButtons id="leaderboard" />
    </div>
  </div>
)

export default MindshareEpoch3Preview
