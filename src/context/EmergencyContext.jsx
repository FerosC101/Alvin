import { createContext, useContext, useState } from 'react'
import { EVAC_CENTER, DEFAULT_ORIGIN } from '../data/mockData'

const EmergencyContext = createContext(null)

// Global emergency mode: when active, the map draws an evacuation route from
// the user's live device location to Seda BGC (the partner safe building).
export function EmergencyProvider({ children }) {
  const [active, setActive] = useState(false)
  const [origin, setOrigin] = useState({ name: 'Your location', coords: DEFAULT_ORIGIN })

  const activate = () => {
    setActive(true)
    // Ask the browser for the device's current position for accurate routing.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setOrigin({
            name: 'Your location',
            coords: [pos.coords.longitude, pos.coords.latitude],
          }),
        () => {}, // denied/unavailable — keep the fallback origin
        { enableHighAccuracy: true, timeout: 6000 },
      )
    }
  }

  const value = {
    active,
    origin,
    evac: EVAC_CENTER,
    activate,
    deactivate: () => setActive(false),
  }
  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export function useEmergency() {
  return useContext(EmergencyContext)
}
