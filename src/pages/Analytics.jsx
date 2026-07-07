import { comfortColor, HOURLY_TELEMETRY } from '../data/mockData'
import { useRooms, useDevices } from '../hooks/useLiveData'
import LineChart from '../components/LineChart'
import './pages.css'

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export default function Analytics() {
  const { rooms: ROOMS, live: roomsLive } = useRooms()
  const { devices: DEVICES, live: devicesLive } = useDevices()

  const avgComfort = Math.round(avg(ROOMS.map((r) => r.score)))
  const alerts = ROOMS.filter((r) => r.score < 70).length
  const activeDevices = DEVICES.filter((d) => d.status === 'online').length
  const totalCap = ROOMS.reduce((a, r) => a + r.capacity, 0)
  const occupancy = totalCap
    ? Math.round((ROOMS.reduce((a, r) => a + r.occupancy, 0) / totalCap) * 100)
    : 0

  const stats = [
    { label: 'Avg. Comfort', value: `${avgComfort}%`, tone: comfortColor(avgComfort) },
    { label: 'Comfort Alerts', value: alerts, tone: alerts ? 'var(--alvin-warn)' : 'var(--alvin-accent)' },
    { label: 'Active Devices', value: `${activeDevices}/${DEVICES.length}`, tone: 'var(--alvin-accent-2)' },
    { label: 'Occupancy', value: `${occupancy}%`, tone: 'var(--alvin-accent-2)' },
  ]

  const ranked = [...ROOMS].sort((a, b) => b.score - a.score)
  const live = roomsLive || devicesLive

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          Analytics{live && <span className="live-badge">● LIVE</span>}
        </h1>
        <p className="page__subtitle">
          Environmental readings, trends, and device health across Seda BGC.
        </p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__value" style={{ color: s.tone }}>{s.value}</span>
            <span className="stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Hourly streams */}
      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <div className="panel">
          <span className="panel__label">TEMPERATURE STREAM · HOURLY</span>
          <LineChart data={HOURLY_TELEMETRY} valueKey="temp" unit="°" color="var(--alvin-warn)" />
        </div>
        <div className="panel">
          <span className="panel__label">HUMIDITY STREAM · HOURLY</span>
          <LineChart data={HOURLY_TELEMETRY} valueKey="humidity" unit="%" color="var(--alvin-accent-2)" />
        </div>
      </div>

      {/* Bar charts */}
      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <div className="panel">
          <span className="panel__label">COMFORT BY SPACE</span>
          <div className="barchart">
            {ranked.map((r) => (
              <div key={r.id} className="barchart__row">
                <span className="barchart__label">{r.name}</span>
                <div className="barchart__track">
                  <div className="barchart__fill" style={{ width: `${r.score}%`, background: comfortColor(r.score) }} />
                </div>
                <span className="barchart__value">{r.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <span className="panel__label">OCCUPANCY BY SPACE</span>
          <div className="barchart">
            {ROOMS.map((r) => {
              const pct = r.capacity ? Math.round((r.occupancy / r.capacity) * 100) : 0
              return (
                <div key={r.id} className="barchart__row">
                  <span className="barchart__label">{r.name}</span>
                  <div className="barchart__track">
                    <div className="barchart__fill" style={{ width: `${pct}%`, background: 'var(--alvin-accent-2)' }} />
                  </div>
                  <span className="barchart__value">{r.occupancy}/{r.capacity}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Environmental readings */}
      <h2 className="section-title">Environmental Monitoring</h2>
      <div className="grid grid--rooms">
        {ROOMS.map((room) => (
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
            <div className="metric-row"><span>Occupancy</span><span>{room.occupancy} / {room.capacity}</span></div>
          </div>
        ))}
      </div>

      {/* Devices */}
      <h2 className="section-title">IoT Devices</h2>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Device ID</th><th>Location</th><th>Sensors</th><th>Battery</th><th>Last Seen</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {DEVICES.map((d) => (
              <tr key={d.id}>
                <td style={{ fontFamily: 'monospace' }}>{d.id}</td>
                <td>{d.room}</td>
                <td>{d.sensors.join(', ')}</td>
                <td>{d.battery}%</td>
                <td>{d.lastSeen}</td>
                <td>
                  <span className={`status-tag status-tag--${d.status}`}>● {d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
