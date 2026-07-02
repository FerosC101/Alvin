import BuildingViewer from './BuildingViewer'
import ComfortGauge from './ComfortGauge'
import Icon from './Icon'
import { BUILDINGS, FLOORS } from '../data/mockData'
import { useRooms, useDevices } from '../hooks/useLiveData'
import { BUILDING_MODEL } from '../config/models'
import './BuildingPanel.css'

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export default function BuildingPanel({ onClose }) {
  const { rooms: ROOMS } = useRooms()
  const { devices: DEVICES } = useDevices()

  const avgComfort = Math.round(avg(ROOMS.map((r) => r.score)))
  const totalOcc = ROOMS.reduce((a, r) => a + r.occupancy, 0)
  const totalCap = ROOMS.reduce((a, r) => a + r.capacity, 0)
  const avgTemp = (avg(ROOMS.map((r) => r.temp))).toFixed(1)
  const avgHum = Math.round(avg(ROOMS.map((r) => r.humidity)))
  const activeDevices = DEVICES.filter((d) => d.status === 'online').length
  const alerts = ROOMS.filter((r) => r.score < 70).length

  const metrics = [
    ['Spaces monitored', ROOMS.length],
    ['Total occupancy', `${totalOcc} / ${totalCap}`],
    ['Avg. temperature', `${avgTemp}°C`],
    ['Avg. humidity', `${avgHum}%`],
    ['Active devices', `${activeDevices} / ${DEVICES.length}`],
    ['Comfort alerts', alerts],
  ]

  return (
    <aside className="building-panel">
      <div className="building-panel__head">
        <div>
          <span className="building-panel__wing">{FLOORS[0].toUpperCase()} · BGC, TAGUIG</span>
          <h3 className="building-panel__name">{BUILDINGS[0]}</h3>
          <span className="building-panel__room">Digital Twin</span>
        </div>
        {onClose && (
          <button className="building-panel__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="building-panel__viewer">
        <BuildingViewer url={BUILDING_MODEL} />
      </div>

      <ComfortGauge score={avgComfort} caption="Avg. Comfort" size={116} />

      <div className="building-panel__metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="building-panel__metric">
            <span>{label}</span>
            <span className="building-panel__metric-value">{value}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
