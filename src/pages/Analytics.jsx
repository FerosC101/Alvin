import { ROOMS, DEVICES, comfortColor } from '../data/mockData'
import './pages.css'

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export default function Analytics() {
  const avgComfort = Math.round(avg(ROOMS.map((r) => r.score)))
  const alerts = ROOMS.filter((r) => r.score < 70).length
  const activeDevices = DEVICES.filter((d) => d.status === 'online').length
  const occupancy = Math.round(
    (ROOMS.reduce((a, r) => a + r.occupancy, 0) / ROOMS.reduce((a, r) => a + r.capacity, 0)) * 100,
  )

  const stats = [
    { label: 'Avg. Comfort', value: `${avgComfort}%`, tone: comfortColor(avgComfort) },
    { label: 'Comfort Alerts', value: alerts, tone: alerts ? 'var(--alvin-warn)' : 'var(--alvin-accent)' },
    { label: 'Active Devices', value: `${activeDevices}/${DEVICES.length}`, tone: 'var(--alvin-accent-2)' },
    { label: 'Building Occupancy', value: `${occupancy}%`, tone: 'var(--alvin-accent-2)' },
  ]

  const ranked = [...ROOMS].sort((a, b) => b.score - a.score)

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Analytics</h1>
        <p className="page__subtitle">Environmental trends and space-utilization intelligence across the building.</p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__value" style={{ color: s.tone }}>{s.value}</span>
            <span className="stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
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
              const pct = Math.round((r.occupancy / r.capacity) * 100)
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
    </div>
  )
}
