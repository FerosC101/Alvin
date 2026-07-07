import { useState } from 'react'
import BuildingViewer from '../components/BuildingViewer'
import { ROOMS, comfortColor } from '../data/mockData'
import { modelForRoom, hasDedicatedModel } from '../config/models'
import { useRoute } from '../context/RouteContext'
import './pages.css'

export default function ThreeDTwin() {
  // null = whole building; otherwise the selected room id
  const [selectedId, setSelectedId] = useState(null)
  const selected = ROOMS.find((r) => r.id === selectedId) ?? null
  const modelUrl = modelForRoom(selectedId)
  // Whole building always "has" a model; a room only if it has a dedicated one.
  const hasRoomModel = !selected || hasDedicatedModel(selected.id)
  
  // Read the live route path from context (written by BestRouteCard on map view).
  const { routePath } = useRoute()
  // Only draw the overlay when showing the whole building, not individual rooms.
  const showRoutePath = !selectedId ? routePath : []

  console.log('[ALVIN:ThreeDTwin] routePath from context — length:', routePath.length, '| selectedId:', selectedId, '| showRoutePath length:', showRoutePath.length, showRoutePath)

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page__header">
        <h1 className="page__title">3D Digital Twin</h1>
        <p className="page__subtitle">
          Interactive 3D replica of Main Building — Ground Floor. Select a space to inspect it.
        </p>
      </div>

      <div className="twin__layout">
        <div className="twin__canvas">
          <BuildingViewer key={modelUrl} url={modelUrl} routePath={showRoutePath} />
          {selected && !hasRoomModel && (
            <div className="twin__notice">
              Showing the generic room model — no dedicated model for “{selected.name}” yet.
            </div>
          )}
        </div>

        <aside className="twin__sidebar">
          <button
            className={`twin__room-btn${!selectedId ? ' twin__room-btn--active' : ''}`}
            onClick={() => setSelectedId(null)}
          >
            Whole Building
          </button>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              className={`twin__room-btn${selectedId === room.id ? ' twin__room-btn--active' : ''}`}
              onClick={() => setSelectedId(room.id)}
            >
              <span>{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </button>
          ))}
        </aside>
      </div>

      {selected && (
        <div className="info-card" style={{ marginTop: 16, maxWidth: 420 }}>
          <div className="info-card__head">
            <span className="info-card__name">{selected.name}</span>
            <span className="score-pill" style={{ background: comfortColor(selected.score) }}>
              {selected.score}%
            </span>
          </div>
          <div className="metric-row"><span>Temperature</span><span>{selected.temp}°C</span></div>
          <div className="metric-row"><span>Humidity</span><span>{selected.humidity}%</span></div>
          <div className="metric-row"><span>Airflow</span><span>{selected.airflow} m/s</span></div>
          <div className="metric-row"><span>Occupancy</span><span>{selected.occupancy} people</span></div>
        </div>
      )}
    </div>
  )
}
