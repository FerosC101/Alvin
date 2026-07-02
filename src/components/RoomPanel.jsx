import { airflowLabel, noiseLabel } from '../data/mockData'
import Icon from './Icon'
import ComfortGauge from './ComfortGauge'
import './RoomPanel.css'

export default function RoomPanel({ room, onClose }) {
  if (!room) return null

  const devices = [
    { name: `ALVIN Sensor ${(room.room || '').replace(/\D/g, '') || '101'}`, status: 'online' },
    { name: 'ALVIN Airflow Node', status: room.airflow > 0 ? 'online' : 'offline' },
    { name: 'ALVIN Occupancy Cam', status: room.score >= 40 ? 'online' : 'offline' },
  ]
  const active = devices.filter((d) => d.status === 'online').length

  const metrics = [
    ['Temperature', `${room.temp}°C`],
    ['Humidity', `${room.humidity}%`],
    ['Airflow', airflowLabel(room.airflow)],
    ['Noise Level', noiseLabel(room.noise)],
    ['Occupancy', `${room.occupancy} / ${room.capacity}`],
  ]

  return (
    <aside className="room-panel">
      <div className="room-panel__head">
        <div>
          <span className="room-panel__wing">{room.wing?.toUpperCase()}</span>
          <h3 className="room-panel__name">{room.name}</h3>
          <span className="room-panel__room">{room.room}</span>
        </div>
        {onClose && (
          <button className="room-panel__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <ComfortGauge score={room.score} />

      <div className="room-panel__metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="room-panel__metric">
            <span>{label}</span>
            <span className="room-panel__metric-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="room-panel__devices">
        <div className="room-panel__devices-head">
          <span>IoT Devices</span>
          <span className="room-panel__active">{active} Active</span>
        </div>
        {devices.map((d) => (
          <div key={d.name} className="room-panel__device">
            <span>{d.name}</span>
            <span className={`room-panel__status room-panel__status--${d.status}`}>
              {d.status === 'online' ? 'Online' : 'Offline'} ●
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
