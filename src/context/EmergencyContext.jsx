import { createContext, useContext, useState } from 'react'
import { USER_LOCATION, EVAC_CENTER } from '../data/mockData'

const EmergencyContext = createContext(null)

// Global emergency mode: when active, the map draws an evacuation route from
// the user's location to the partner evacuation center.
export function EmergencyProvider({ children }) {
  const [active, setActive] = useState(false)
  const value = {
    active,
    origin: USER_LOCATION,
    evac: EVAC_CENTER,
    activate: () => setActive(true),
    deactivate: () => setActive(false),
  }
  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export function useEmergency() {
  return useContext(EmergencyContext)
}
