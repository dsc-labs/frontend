import type { Epoch3LaneContent } from '../epoch3PreviewContent'

type Epoch3LaneProps = {
  lane: Epoch3LaneContent
}

const Epoch3Lane = ({ lane }: Epoch3LaneProps) => (
  <div className="epoch3-lane">
    <div className="epoch3-lane-head">
      <span className="epoch3-lane-name">{lane.name}</span>
      <span className="epoch3-lane-pct">{lane.allocation}</span>
    </div>
    <div className="epoch3-lane-label">For</div>
    <ul>
      {lane.forItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
    <div className="epoch3-lane-label">How to compete</div>
    <ul>
      {lane.howItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
    <div className="epoch3-lane-label">Scoring</div>
    <ul>
      {lane.scoringItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
    <div className="epoch3-lane-note">{lane.note}</div>
  </div>
)

export default Epoch3Lane
