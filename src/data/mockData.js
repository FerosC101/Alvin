// Mock data for the ALVIN dashboard. This stands in for the live feeds
// (Firebase Realtime DB for indoor sensors, Open-Meteo/PAGASA for weather)
// until the data layer is wired up.

// Building geo-anchor (placeholder — Manila). Rooms are scattered around it
// so the OpenStreetMap view has spatial context for each smart space.
export const BUILDING_CENTER = [14.5995, 120.9842]

// The ALVIN building location on the BGC map. MapLibre order: [lng, lat].
export const USER_LOCATION = {
  name: 'Main Building',
  coords: [121.0489, 14.5509],
}

// Partner evacuation center the user is routed to during an emergency.
export const EVAC_CENTER = {
  name: 'SM Aura Premier',
  partner: 'Partner Evacuation Center',
  address: 'McKinley Pkwy, BGC, Taguig',
  coords: [121.0563, 14.5472],
}

export const BUILDINGS = ['Main Building', 'Annex Building', 'Science Hall']
export const FLOORS = ['Ground Floor', '2nd Floor', '3rd Floor']

// Comfort score (0-100) -> color band, matching the legend in the design.
export const COMFORT_BANDS = [
  { label: 'Excellent (90-100)', min: 90, color: '#22c55e' },
  { label: 'Good (70-89)', min: 70, color: '#4ade80' },
  { label: 'Moderate (50-69)', min: 50, color: '#fbbf24' },
  { label: 'Poor (30-49)', min: 30, color: '#fb923c' },
  { label: 'Very Poor (0-29)', min: 0, color: '#ef4444' },
]

export function comfortColor(score) {
  const band = COMFORT_BANDS.find((b) => score >= b.min)
  return band ? band.color : '#ef4444'
}

// Rooms with comfort scores, sensor readings, and coordinates.
export const ROOMS = [
  { id: 'lecture-1', name: 'Lecture Room 1', wing: 'Academic Wing', room: 'Room 201', score: 75, lat: 14.6002, lng: 120.9852, temp: 25.8, humidity: 60, airflow: 0.4, noise: 40, occupancy: 18, capacity: 40 },
  { id: 'library', name: 'Library', wing: 'Library Wing', room: 'Room 101', score: 95, lat: 14.5998, lng: 120.9838, temp: 24.3, humidity: 58, airflow: 0.6, noise: 32, occupancy: 23, capacity: 60 },
  { id: 'study-1', name: 'Study Area 1', wing: 'Library Wing', room: 'Room 102', score: 92, lat: 14.5993, lng: 120.9833, temp: 24.1, humidity: 54, airflow: 0.5, noise: 35, occupancy: 12, capacity: 30 },
  { id: 'admin', name: 'Admin Office', wing: 'Admin Wing', room: 'Room 010', score: 70, lat: 14.5991, lng: 120.9841, temp: 26.9, humidity: 58, airflow: 0.3, noise: 45, occupancy: 6, capacity: 15 },
  { id: 'hallway', name: 'Hallway', wing: 'Main Building', room: 'Corridor A', score: 58, lat: 14.5995, lng: 120.9845, temp: 28.6, humidity: 66, airflow: 0.7, noise: 55, occupancy: 9, capacity: 40 },
  { id: 'lounge', name: 'Lounge', wing: 'Student Wing', room: 'Room 120', score: 82, lat: 14.6000, lng: 120.9858, temp: 25.2, humidity: 55, airflow: 0.5, noise: 48, occupancy: 14, capacity: 25 },
  { id: 'cafeteria', name: 'Cafeteria', wing: 'Student Wing', room: 'Room 130', score: 64, lat: 14.5989, lng: 120.9853, temp: 27.8, humidity: 63, airflow: 0.4, noise: 62, occupancy: 31, capacity: 80 },
  { id: 'entrance', name: 'Entrance Lobby', wing: 'Main Building', room: 'Ground', score: 50, lat: 14.5990, lng: 120.9848, temp: 29.7, humidity: 68, airflow: 0.8, noise: 58, occupancy: 20, capacity: 50 },
  { id: 'storage', name: 'Storage', wing: 'Service Wing', room: 'Room 005', score: 40, lat: 14.5987, lng: 120.9836, temp: 31.1, humidity: 70, airflow: 0.2, noise: 30, occupancy: 1, capacity: 5 },
]

// Qualitative label for an airflow reading (m/s).
export function airflowLabel(v) {
  if (v >= 0.6) return 'Good'
  if (v >= 0.4) return 'Moderate'
  return 'Low'
}

// Qualitative label for a noise reading (dB).
export function noiseLabel(db) {
  if (db <= 40) return `Low (${db} dB)`
  if (db <= 55) return `Moderate (${db} dB)`
  return `High (${db} dB)`
}

// IoT sensor nodes (ESP32) deployed around the building.
export const DEVICES = [
  { id: 'esp32-01', room: 'Library', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 92, status: 'online', lastSeen: '10s ago' },
  { id: 'esp32-02', room: 'Study Area 1', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 88, status: 'online', lastSeen: '8s ago' },
  { id: 'esp32-03', room: 'Lecture Room 1', sensors: ['Temp', 'Humidity'], battery: 74, status: 'online', lastSeen: '12s ago' },
  { id: 'esp32-04', room: 'Cafeteria', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 61, status: 'online', lastSeen: '5s ago' },
  { id: 'esp32-05', room: 'Entrance Lobby', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 45, status: 'degraded', lastSeen: '2m ago' },
  { id: 'esp32-06', room: 'Storage', sensors: ['Temp', 'Humidity'], battery: 0, status: 'offline', lastSeen: '3h ago' },
]

// Emergency scenarios ALVIN adapts to (from the concept table).
// `icon` refers to an icon name in components/Icon.jsx.
export const EMERGENCY_SCENARIOS = [
  { id: 'fire', name: 'Fire', response: 'Safest evacuation exits', icon: 'fire' },
  { id: 'earthquake', name: 'Earthquake', response: 'Safe waiting areas', icon: 'quake' },
  { id: 'flood', name: 'Flood', response: 'Avoid flooded entrances', icon: 'flood' },
  { id: 'rain', name: 'Heavy Rain', response: 'Covered walkways', icon: 'cloud-rain' },
  { id: 'heat', name: 'Extreme Heat', response: 'Cooling zones', icon: 'thermometer' },
]

export const OUTDOOR_WEATHER = {
  city: 'Manila City',
  temperature: 26,
  condition: 'Cloudy',
  humidity: 93,
  rainIntensity: '0.0 mm/h',
  wind: '7 km/h',
  heatIndex: '31 C',
  source: 'Live Open-Meteo',
  updatedAt: '5:45 AM',
}

export const RECOMMENDATIONS = [
  { id: 'library', name: 'Library', reason: 'Best for studying', score: 95 },
  { id: 'study-1', name: 'Study Area 1', reason: 'Quiet collaborative work', score: 92 },
  { id: 'lounge', name: 'Lounge', reason: 'Good for relaxation', score: 82, featured: true },
]

export const BEST_ROUTE = {
  mode: 'RAINY',
  name: 'Covered Path',
  via: 'via Hallway A',
  duration: '4 min walk',
}

// Default start/end nodes for the live navigation query. Update these to real
// Firestore node ids once the graph is populated (see /api/navigate).
export const NAV_DEFAULTS = {
  start: 'node_entrance',
  end: 'node_library',
  preference: 'covered', // 'shortest' | 'covered' | 'comfortable'
}

export const EMERGENCY_STATUS = {
  active: false,
  headline: 'No Active Emergency',
  subtext: 'All systems normal',
  safeRoute: 'Hallway A',
  nearestExit: 'Front Lobby',
  assemblyArea: 'Covered court',
}
