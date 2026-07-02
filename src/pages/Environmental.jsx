import { useEffect, useState } from 'react'
import { ROOMS, comfortColor } from '../data/mockData'
import { fetchLiveSensors } from '../services/api'
import './pages.css'

export default function Environmental() {
  const [rooms, setRooms] = useState(ROOMS)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let active = true
    fetchLiveSensors().then((data) => {
      if (!active || !data || data.status !== 'success') return
      // Overlay live comfort scores onto the mock rooms, matched by name.
      const byName = new Map(
        data.nodes.map((n) => [String(n.name).toLowerCase(), n.comfort_score]),
      )
      let matched = false
      const merged = ROOMS.map((r) => {
        const score = byName.get(r.name.toLowerCase())
        if (score == null) return r
        matched = true
        return { ...r, score: Math.round(score) }
      })
      if (matched) {
        setRooms(merged)
        setLive(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Environmental Monitoring</h1>
        <p className="page__subtitle">
          Live indoor readings from IoT sensor nodes — temperature, humidity, airflow, and comfort score.
          {live && <span className="live-badge">● LIVE</span>}
        </p>
      </div>

      <div className="grid grid--rooms">
        {rooms.map((room) => (
          <div key={room.id} className="info-card">
            <div className="info-card__head">
              <span className="info-card__name">{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </div>
            <div className="metric-row"><span>Temperature</span><span>{room.temp}°C</span></div>
            <div className="metric-row"><span>Humidity</span><span>{room.humidity}%</span></div>
            <div className="metric-row"><span>Airflow</span><span>{room.airflow} m/s</span></div>
            <div className="metric-row"><span>Occupancy</span><span>{room.occupancy}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
