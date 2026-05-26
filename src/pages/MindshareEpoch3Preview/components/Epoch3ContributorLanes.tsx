import { EPOCH_3_LANES } from '../epoch3PreviewContent'
import Epoch3Lane from './Epoch3Lane'

const Epoch3ContributorLanes = () => (
  <>
    <h3 className="epoch3-sub-title">Contributor Lanes</h3>
    <div className="epoch3-lanes">
      {EPOCH_3_LANES.map((lane) => (
        <Epoch3Lane key={lane.name} lane={lane} />
      ))}
    </div>
  </>
)

export default Epoch3ContributorLanes
