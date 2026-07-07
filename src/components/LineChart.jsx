import './LineChart.css'

// Minimal dependency-free SVG line chart (single series) for hourly streams.
export default function LineChart({
  data,
  valueKey,
  labelKey = 'hour',
  color = 'var(--alvin-accent)',
  unit = '',
  height = 150,
}) {
  const W = 320
  const H = height
  const padL = 34
  const padR = 10
  const padT = 12
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const values = data.map((d) => d[valueKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = span * 0.15
  const lo = min - pad
  const hi = max + pad
  const range = hi - lo

  const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1))
  const y = (v) => padT + (1 - (v - lo) / range) * innerH

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[valueKey])}`).join(' ')
  const area = `${line} L ${x(data.length - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`
  const gid = `lc-${valueKey}`

  // Show ~4 x-axis labels evenly.
  const step = Math.ceil(data.length / 4)

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines + y labels (min / mid / max) */}
      {[hi, (hi + lo) / 2, lo].map((v, i) => {
        const gy = padT + (i * innerH) / 2
        return (
          <g key={i}>
            <line className="linechart__grid" x1={padL} y1={gy} x2={W - padR} y2={gy} />
            <text className="linechart__ylabel" x={padL - 6} y={gy + 3} textAnchor="end">
              {Math.round(v)}{unit}
            </text>
          </g>
        )
      })}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d[valueKey])} r="2.4" fill={color} />
      ))}

      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <text key={i} className="linechart__xlabel" x={x(i)} y={H - 6} textAnchor="middle">
            {d[labelKey]}
          </text>
        ) : null,
      )}
    </svg>
  )
}
