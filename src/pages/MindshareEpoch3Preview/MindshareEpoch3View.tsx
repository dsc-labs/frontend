import Header from '../../components/common/Header/Header'
import { DefaultPageSEO, PageSEO } from '../../components/common/PageSEO/PageSEO'
import { EPOCH_3_START_UTC_LABEL } from '../../lib/mindshareEpochSchedule'
import Epoch3Breakdown from './components/Epoch3Breakdown'
import Epoch3Countdown from './components/Epoch3Countdown'
import Epoch3CtaButtons from './components/Epoch3CtaButtons'
import Epoch3Hero from './components/Epoch3Hero'
import Epoch3Lede from './components/Epoch3Lede'
import './MindshareEpoch3Preview.css'

export type MindshareEpoch3ViewProps = {
  seoPath?: string
  preview?: boolean
}

export function MindshareEpoch3View({ seoPath = '/epoch3-preview', preview = false }: MindshareEpoch3ViewProps) {
  return (
    <div className="epoch3-page">
      {preview ? (
        <PageSEO
          path={seoPath}
          title="Mindshare Challenge — Epoch 3 | STRIKE ROBOT"
          metaDescription={`Epoch 3 contributor program preview. Epoch 3 begins at ${EPOCH_3_START_UTC_LABEL}.`}
          noIndex
        />
      ) : (
        <DefaultPageSEO path={seoPath} />
      )}
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
}
