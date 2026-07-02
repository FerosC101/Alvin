import { ROOMS, comfortColor } from '../data/mockData'
import './pages.css'

// Rank rooms by comfort score and map activities to the best spaces.
const ranked = [...ROOMS].sort((a, b) => b.score - a.score)

const ACTIVITIES = [
  { activity: 'Best Place to Study', room: ranked[0] },
  { activity: 'Best Waiting Area', room: ranked[1] },
  { activity: 'Best Rest Area', room: ranked[2] },
  { activity: 'Best Meeting Spot', room: ranked[3] },
]

export default function Recommendations() {
  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Smart Recommendations</h1>
        <p className="page__subtitle">
          ALVIN continuously suggests the safest, coolest, and most comfortable spaces based on current conditions.
        </p>
      </div>

      <div className="grid grid--rooms" style={{ marginBottom: 24 }}>
        {ACTIVITIES.map(({ activity, room }) => (
          <div key={activity} className="info-card">
            <span className="panel__label">{activity.toUpperCase()}</span>
            <div className="info-card__head">
              <span className="info-card__name">{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </div>
            <div className="metric-row"><span>Temperature</span><span>{room.temp}°C</span></div>
            <div className="metric-row"><span>Humidity</span><span>{room.humidity}%</span></div>
          </div>
        ))}
      </div>

      <div className="panel">
        <span className="panel__label">ALL SPACES — RANKED BY COMFORT</span>
        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>#</th><th>Space</th><th>Comfort</th><th>Temp</th><th>Humidity</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((room, i) => (
              <tr key={room.id}>
                <td>{i + 1}</td>
                <td>{room.name}</td>
                <td>
                  <span className="status-tag" style={{ color: comfortColor(room.score) }}>
                    ● {room.score}%
                  </span>
                </td>
                <td>{room.temp}°C</td>
                <td>{room.humidity}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
