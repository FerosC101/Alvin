import { COMFORT_BANDS, comfortColor } from '../data/mockData'
import './ComfortGauge.css'

function bandName(score) {
  const band = COMFORT_BANDS.find((b) => score >= b.min)
  return band ? band.label.split(' (')[0] : 'Unknown'
}

// Circular comfort gauge (SVG progress ring), reusable across panels.
export default function ComfortGauge({ score, caption = 'Comfort Score', size = 128 }) {
  const c = size / 2
  const r = size * 0.36
  const circ = 2 * Math.PI * r
  const color = comfortColor(score)
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--alvin-surface-2)" strokeWidth="10" />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div className="gauge__center">
        <span className="gauge__value">{score}<span className="gauge__unit">%</span></span>
        <span className="gauge__caption">{caption}</span>
        <span className="gauge__band" style={{ color }}>{bandName(score)}</span>
      </div>
    </div>
  )
}
