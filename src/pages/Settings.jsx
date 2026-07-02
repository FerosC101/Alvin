import { useState } from 'react'
import { BASE_URL } from '../services/api'
import './pages.css'

function Toggle({ checked, onChange }) {
  return (
    <button
      className={`toggle${checked ? ' toggle--on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  )
}

export default function Settings() {
  const [units, setUnits] = useState('celsius')
  const [heatAlerts, setHeatAlerts] = useState(true)
  const [rainAlerts, setRainAlerts] = useState(true)
  const [emergencyPush, setEmergencyPush] = useState(true)
  const [autorotate, setAutorotate] = useState(true)

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Settings</h1>
        <p className="page__subtitle">Preferences for units, alerts, and data sources.</p>
      </div>

      <div className="settings">
        <div className="panel">
          <span className="panel__label">DISPLAY</span>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Temperature units</div>
              <div className="setting-row__desc">Unit used across the dashboard.</div>
            </div>
            <select value={units} onChange={(e) => setUnits(e.target.value)} className="setting-select">
              <option value="celsius">Celsius (°C)</option>
              <option value="fahrenheit">Fahrenheit (°F)</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">3D auto-rotate</div>
              <div className="setting-row__desc">Slowly rotate the model on the 3D Twin page.</div>
            </div>
            <Toggle checked={autorotate} onChange={setAutorotate} />
          </div>
        </div>

        <div className="panel">
          <span className="panel__label">ALERTS</span>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Extreme heat warnings</div>
              <div className="setting-row__desc">Notify when the heat index is dangerous.</div>
            </div>
            <Toggle checked={heatAlerts} onChange={setHeatAlerts} />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Heavy rain warnings</div>
              <div className="setting-row__desc">Notify on flooding-risk rainfall.</div>
            </div>
            <Toggle checked={rainAlerts} onChange={setRainAlerts} />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Emergency push</div>
              <div className="setting-row__desc">Critical evacuation and safety alerts.</div>
            </div>
            <Toggle checked={emergencyPush} onChange={setEmergencyPush} />
          </div>
        </div>

        <div className="panel">
          <span className="panel__label">DATA SOURCE</span>
          <div className="setting-row">
            <div>
              <div className="setting-row__title">Backend API</div>
              <div className="setting-row__desc">Configured via VITE_API_URL.</div>
            </div>
            <code className="setting-code">{BASE_URL}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
