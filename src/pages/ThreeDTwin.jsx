import { useState } from 'react'
import BuildingViewer from '../components/BuildingViewer'
import ComfortGauge from '../components/ComfortGauge'
import { comfortColor, airflowLabel, noiseLabel } from '../data/mockData'
import { modelForRoom, hasDedicatedModel } from '../config/models'
import { useRoute } from '../context/RouteContext'
import { useRooms, useDevices } from '../hooks/useLiveData'
import './pages.css'

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

export default function DigitalTwin() {
  const { rooms } = useRooms()
  const { devices } = useDevices()
  const [selectedId, setSelectedId] = useState(null)
  const selected = rooms.find((r) => r.id === selectedId) ?? null
  const modelUrl = modelForRoom(selectedId)
  const hasRoomModel = !selected || hasDedicatedModel(selected.id)

  const { routePath } = useRoute()
  const showRoutePath = !selectedId ? routePath : []

  // Whole-building aggregates.
  const avgComfort = Math.round(avg(rooms.map((r) => r.score)))
  const totalOcc = rooms.reduce((a, r) => a + r.occupancy, 0)
  const totalCap = rooms.reduce((a, r) => a + r.capacity, 0)
  const avgTemp = avg(rooms.map((r) => r.temp)).toFixed(1)
  const avgHum = Math.round(avg(rooms.map((r) => r.humidity)))
  const activeDevices = devices.filter((d) => d.status === 'online').length
  const alerts = rooms.filter((r) => r.score < 70).length

  const gaugeScore = selected ? selected.score : avgComfort
  const metrics = selected
    ? [
        ['Temperature', `${selected.temp}°C`],
        ['Humidity', `${selected.humidity}%`],
        ['Airflow', airflowLabel(selected.airflow)],
        ['Noise', noiseLabel(selected.noise)],
        ['Occupancy', `${selected.occupancy} / ${selected.capacity}`],
      ]
    : [
        ['Spaces monitored', rooms.length],
        ['Occupancy', `${totalOcc} / ${totalCap}`],
        ['Avg. temperature', `${avgTemp}°C`],
        ['Avg. humidity', `${avgHum}%`],
        ['Active devices', `${activeDevices} / ${devices.length}`],
        ['Comfort alerts', alerts],
      ]

  return (
    <div className="page page--twin">
      <div className="twin__layout">
        <div className="twin__canvas">
          <BuildingViewer key={modelUrl} url={modelUrl} routePath={showRoutePath} />
          <div className="twin__overlay-title">
            <span className="twin__overlay-kicker">DIGITAL TWIN</span>
            <span className="twin__overlay-name">{selected ? selected.name : 'Seda BGC'}</span>
          </div>
          {selected && !hasRoomModel && (
            <div className="twin__notice">
              Showing the generic room model — no dedicated model for “{selected.name}” yet.
            </div>
          )}
        </div>

        <aside className="twin__panel">
          <div className="twin__spaces">
            <button
              className={`twin__chip${!selectedId ? ' twin__chip--active' : ''}`}
              onClick={() => setSelectedId(null)}
            >
              <span>Whole Building</span>
            </button>
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`twin__chip${selectedId === room.id ? ' twin__chip--active' : ''}`}
                onClick={() => setSelectedId(room.id)}
              >
                <span>{room.name}</span>
                <span className="twin__chip-dot" style={{ background: comfortColor(room.score) }} />
              </button>
            ))}
          </div>

          <div className="twin__status">
            <div className="twin__status-head">
              <span className="twin__status-wing">
                {selected ? selected.wing : 'SEDA BGC · BGC, TAGUIG'}
              </span>
              <h3 className="twin__status-name">{selected ? selected.name : 'Building Status'}</h3>
              <span className="twin__status-sub">
                {selected ? `Room ${selected.room}` : 'Live overview'}
              </span>
            </div>

            <ComfortGauge score={gaugeScore} caption={selected ? 'Comfort Score' : 'Avg. Comfort'} size={118} />

            <div className="twin__metrics">
              {metrics.map(([label, value]) => (
                <div key={label} className="twin__metric">
                  <span>{label}</span>
                  <span className="twin__metric-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
