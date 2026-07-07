import { createContext, useContext, useState } from 'react'

// ---------------------------------------------------------------------------
// RouteContext — global navigation state
//
// navigationMode     — user's manual selection: 'smart' | 'shaded' | 'covered' | 'shortest'
//                      'smart' means "let ALVIN decide from live weather"
// routePath          — detailed_path array from the last /api/navigate response
// navigationPreference — the resolved backend preference that was actually used
//                        ('shaded' | 'covered' | 'shortest' | 'emergency')
// weatherCondition   — normalised weather string: 'Clear' | 'Rain' | 'Cloudy'
// ---------------------------------------------------------------------------

const RouteContext = createContext(null)

export function RouteProvider({ children }) {
  const [navigationMode, setNavigationMode]           = useState('smart')
  const [routePath, setRoutePath]                     = useState([])
  const [navigationPreference, setNavigationPreference] = useState('shortest')
  const [weatherCondition, setWeatherCondition]       = useState('Cloudy')

  return (
    <RouteContext.Provider value={{
      navigationMode, setNavigationMode,
      routePath, setRoutePath,
      navigationPreference, setNavigationPreference,
      weatherCondition, setWeatherCondition,
    }}>
      {children}
    </RouteContext.Provider>
  )
}

export function useRoute() {
  return useContext(RouteContext)
}

// Colour for each resolved backend preference.
// Used by MapView (main map line) and MiniRouteMap (card line).
export function routeColour(preference) {
  switch (preference) {
    case 'emergency': return '#f2555f'  // red    — evacuation
    case 'covered':   return '#38bdf8'  // blue   — covered walkways
    case 'shaded':    return '#f59e0b'  // amber  — most shaded (spec: #F59E0B)
    default:          return '#00d4ff'  // cyan   — shortest / neutral
  }
}

// Human-readable label for the card title line.
export function routeModeLabel(preference) {
  switch (preference) {
    case 'emergency': return 'EMERGENCY'
    case 'covered':   return 'MOST COVERED'
    case 'shaded':    return 'MOST SHADED'
    default:          return 'SHORTEST'
  }
}
