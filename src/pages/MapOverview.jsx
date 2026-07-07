import { useState } from 'react'
import MapView from '../components/MapView'
import BuildingPanel from '../components/BuildingPanel'
import BottomPanel from '../components/BottomPanel'
import { NavigationSelector } from '../components/BottomPanel'
import './MapOverview.css'

export default function MapOverview() {
  const [open, setOpen] = useState(true)

  return (
    <div className="map-overview">
      <div className="map-overview__stage">
        <MapView onBuildingClick={() => setOpen(true)} />
        {open ? (
          <div className="map-overview__aside">
            <BuildingPanel onClose={() => setOpen(false)} />
          </div>
        ) : (
          <button className="map-overview__reopen" onClick={() => setOpen(true)}>
            Building details
          </button>
        )}
      </div>
      <NavigationSelector />
      <BottomPanel />
    </div>
  )
}
