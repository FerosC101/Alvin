import { comfortColor } from '../data/mockData'
import { useRooms } from '../hooks/useLiveData'
import './pages.css'

export default function Environmental() {
  const { rooms, live } = useRooms()

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Environmental Monitoring</h1>
        <p className="page__subtitle">
          Live indoor readings from IoT sensor nodes — temperature, humidity, airflow, and comfort score.
          {live && <span className="live-badge">● LIVE</span>}
        </p>
      </div>

      <div className="grid grid--rooms">
        {rooms.map((room) => (
          <div key={room.id} className="info-card">
            <div className="info-card__head">
              <span className="info-card__name">{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </div>
            <div className="metric-row"><span>Temperature</span><span>{room.temp ?? '—'}°C</span></div>
            <div className="metric-row"><span>Humidity</span><span>{room.humidity ?? '—'}%</span></div>
            <div className="metric-row"><span>Airflow</span><span>{room.airflow ?? '—'} m/s</span></div>
            <div className="metric-row"><span>Occupancy</span><span>{room.occupancy}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
