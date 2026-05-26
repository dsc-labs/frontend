import {
  EPOCH_3_CONTRIBUTOR_BENEFITS,
  EPOCH_3_CONTRIBUTOR_PATHS,
  EPOCH_3_DURATION,
  EPOCH_3_SUBMISSION_REQUIREMENTS,
} from '../epoch3PreviewContent'
import Epoch3ContributorLanes from './Epoch3ContributorLanes'

const Epoch3Breakdown = () => (
  <>
    <h2 className="epoch3-section-title">EPOCH 3 BREAKDOWN</h2>

    <h3 className="epoch3-sub-title">Duration</h3>
    <div className="epoch3-infobox">{EPOCH_3_DURATION}</div>

    <h3 className="epoch3-sub-title">Reward Pool</h3>
    <ul className="epoch3-reward-list">
      <li>
        Total pool: <strong>$15,000</strong> — paid in market-bought <strong>$SR</strong>
      </li>
      <li>Distributed immediately after contributor selection</li>
      <li>
        Only <strong>50 contributors</strong> will be selected — at any point during the campaign once
        they meet the required standards
      </li>
    </ul>

    <Epoch3ContributorLanes />

    <h3 className="epoch3-sub-title">Submission Requirements</h3>
    <ul className="epoch3-crit">
      <li>
        Hold at least <strong>10,000 $SR</strong>
      </li>
      {EPOCH_3_SUBMISSION_REQUIREMENTS.slice(1).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>

    <h3 className="epoch3-sub-title">Selected Contributors Receive</h3>
    <ul className="epoch3-crit">
      {EPOCH_3_CONTRIBUTOR_BENEFITS.map((item) => (
        <li key={item}>{item}</li>
      ))}
      <li>
        Opportunities to become:
        <ul>
          {EPOCH_3_CONTRIBUTOR_PATHS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </li>
    </ul>
  </>
)

export default Epoch3Breakdown
