import { comfortColor } from '../data/mockData'
import { useRooms } from '../hooks/useLiveData'
import './pages.css'

const ACTIVITY_LABELS = [
  'Best Place to Study',
  'Best Waiting Area',
  'Best Rest Area',
  'Best Meeting Spot',
]

export default function Recommendations() {
  const { rooms, live } = useRooms()
  const ranked = [...rooms].sort((a, b) => b.score - a.score)
  const activities = ACTIVITY_LABELS.map((activity, i) => ({ activity, room: ranked[i] })).filter(
    (a) => a.room,
  )

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          Smart Recommendations{live && <span className="live-badge">● LIVE</span>}
        </h1>
        <p className="page__subtitle">
          ALVIN continuously suggests the safest, coolest, and most comfortable spaces based on current conditions.
        </p>
      </div>

      <div className="grid grid--rooms" style={{ marginBottom: 24 }}>
        {activities.map(({ activity, room }) => (
          <div key={activity} className="info-card">
            <span className="panel__label">{activity.toUpperCase()}</span>
            <div className="info-card__head">
              <span className="info-card__name">{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </div>
            <div className="metric-row"><span>Temperature</span><span>{room.temp ?? '—'}°C</span></div>
            <div className="metric-row"><span>Humidity</span><span>{room.humidity ?? '—'}%</span></div>
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
                <td>{room.temp ?? '—'}°C</td>
                <td>{room.humidity ?? '—'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
