import { EMERGENCY_SCENARIOS, EMERGENCY_STATUS } from '../data/mockData'
import Icon from '../components/Icon'
import './pages.css'

export default function Emergency() {
  const e = EMERGENCY_STATUS
  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Emergency Awareness</h1>
        <p className="page__subtitle">
          ALVIN adapts recommendations to prioritize safety and guides occupants to the nearest safe route.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="emergency__headline">
          <span className={`emergency__badge${e.active ? ' emergency__badge--active' : ''}`}>
            <Icon name={e.active ? 'alert' : 'check'} size={20} />
          </span>
          <div>
            <span className="emergency__title">{e.headline}</span>
            <span className="emergency__sub">{e.subtext}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, marginTop: 14, flexWrap: 'wrap' }}>
          <div><div className="panel__label">SAFE ROUTE</div><div>{e.safeRoute}</div></div>
          <div><div className="panel__label">NEAREST EXIT</div><div>{e.nearestExit}</div></div>
          <div><div className="panel__label">ASSEMBLY AREA</div><div>{e.assemblyArea}</div></div>
        </div>
      </div>

      <span className="panel__label">SYSTEM RESPONSE BY SCENARIO</span>
      <div className="grid grid--rooms" style={{ marginTop: 10 }}>
        {EMERGENCY_SCENARIOS.map((s) => (
          <div key={s.id} className="info-card">
            <div className="info-card__head">
              <span className="info-card__name info-card__name--icon">
                <Icon name={s.icon} size={18} />{s.name}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--alvin-text-dim)' }}>{s.response}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
