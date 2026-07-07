import { useState } from 'react'
import MapView from '../components/MapView'
import BuildingPanel from '../components/BuildingPanel'
import BottomPanel, { NavigationSelector } from '../components/BottomPanel'
import './MapOverview.css'

export default function MapOverview() {
  // Building details are a click-only pop-up over the map (closed by default).
  const [open, setOpen] = useState(false)

  return (
    <div className="map-overview">
      <div className="map-overview__stage">
        <MapView onBuildingClick={() => setOpen((o) => !o)} />
        {open && (
          <div className="map-overview__pop">
            <BuildingPanel onClose={() => setOpen(false)} />
          </div>
        )}
      </div>

      <div className="map-overview__bottom">
        <NavigationSelector />
        <BottomPanel />
      </div>
    </div>
  )
}
