import { DEVICES } from '../data/mockData'
import './pages.css'

const online = DEVICES.filter((d) => d.status === 'online').length

export default function Devices() {
  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">IoT Devices</h1>
        <p className="page__subtitle">
          ESP32 sensor nodes deployed across the building — {online} of {DEVICES.length} online.
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
            {DEVICES.map((d) => (
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
