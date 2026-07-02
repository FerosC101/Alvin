import { useDevices } from '../hooks/useLiveData'
import './pages.css'

export default function Devices() {
  const { devices, live } = useDevices()
  const online = devices.filter((d) => d.status === 'online').length

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">IoT Devices</h1>
        <p className="page__subtitle">
          ESP32 sensor nodes deployed across the building — {online} of {devices.length} online.
          {live && <span className="live-badge">● LIVE</span>}
        </p>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Device ID</th><th>Location</th><th>Sensors</th><th>Battery</th><th>Last Seen</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td style={{ fontFamily: 'monospace' }}>{d.id}</td>
                <td>{d.room}</td>
                <td>{d.sensors.join(', ')}</td>
                <td>{d.battery}%</td>
                <td>{d.lastSeen}</td>
                <td>
                  <span className={`status-tag status-tag--${d.status}`}>
                    ● {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
