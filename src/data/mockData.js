// Mock data for the ALVIN dashboard. This stands in for the live feeds
// (Firebase Realtime DB for indoor sensors, Open-Meteo/PAGASA for weather)
// until the data layer is wired up.

// --- Seda BGC (the monitored hotel) ---
// Seda Bonifacio Global City — 30th St cor 11th Ave, BGC, Taguig.
export const SEDA_BGC = {
  name: 'Seda BGC',
  partner: 'Partner Safe Building',
  address: '30th St cor 11th Ave, BGC, Taguig',
  coords: [121.0505, 14.5527], // [lng, lat]
}

// The building marker location on the map.
export const USER_LOCATION = {
  name: 'Seda BGC',
  coords: SEDA_BGC.coords,
}

// Evacuation destination during an emergency — Seda BGC itself is the partner
// safe building. The origin is the user's live device location (see context).
export const EVAC_CENTER = SEDA_BGC

// Fallback origin for routing when device geolocation is denied/unavailable
// (a nearby BGC point so the walking route is still meaningful).
export const DEFAULT_ORIGIN = [121.0455, 14.547]

export const BUILDINGS = ['Seda BGC', 'Seda Vertis North', 'Seda Ayala Center']
export const FLOORS = ['Ground Floor', '5th Floor', '6th Floor']

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

// Seda BGC spaces — mostly hotel room numbers, plus a few amenities.
export const ROOMS = [
  { id: 'r610', name: 'Room 610', wing: 'Premier Suite · 6F', room: '610', score: 95, temp: 24.3, humidity: 52, airflow: 0.6, noise: 30, occupancy: 2, capacity: 2 },
  { id: 'r501', name: 'Room 501', wing: 'Deluxe Room · 5F', room: '501', score: 92, temp: 24.1, humidity: 54, airflow: 0.5, noise: 32, occupancy: 2, capacity: 2 },
  { id: 'r803', name: 'Room 803', wing: 'Corner Suite · 8F', room: '803', score: 82, temp: 25.2, humidity: 55, airflow: 0.5, noise: 34, occupancy: 1, capacity: 3 },
  { id: 'r712', name: 'Room 712', wing: 'Deluxe Room · 7F', room: '712', score: 75, temp: 25.8, humidity: 60, airflow: 0.4, noise: 38, occupancy: 2, capacity: 2 },
  { id: 'r502', name: 'Room 502', wing: 'Deluxe Room · 5F', room: '502', score: 70, temp: 26.9, humidity: 58, airflow: 0.3, noise: 40, occupancy: 0, capacity: 2 },
  { id: 'pool', name: 'Pool Deck', wing: 'Amenities · 5F', room: 'PD', score: 64, temp: 27.8, humidity: 63, airflow: 0.4, noise: 55, occupancy: 12, capacity: 40 },
  { id: 'restaurant', name: 'Straight Up', wing: 'Dining · 11F', room: '11F', score: 58, temp: 28.6, humidity: 66, airflow: 0.7, noise: 60, occupancy: 34, capacity: 90 },
  { id: 'function', name: 'Function Room', wing: 'Events · 2F', room: '2F', score: 50, temp: 29.7, humidity: 68, airflow: 0.8, noise: 52, occupancy: 40, capacity: 120 },
  { id: 'lobby', name: 'Lobby', wing: 'Ground Floor', room: 'GF', score: 40, temp: 31.1, humidity: 70, airflow: 0.2, noise: 58, occupancy: 25, capacity: 80 },
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

// Hourly building-average telemetry for the temperature/humidity stream chart.
export const HOURLY_TELEMETRY = [
  { hour: '8AM', temp: 25.4, humidity: 68 },
  { hour: '9AM', temp: 26.1, humidity: 66 },
  { hour: '10AM', temp: 26.9, humidity: 64 },
  { hour: '11AM', temp: 27.6, humidity: 61 },
  { hour: '12PM', temp: 28.3, humidity: 59 },
  { hour: '1PM', temp: 28.9, humidity: 57 },
  { hour: '2PM', temp: 29.2, humidity: 56 },
  { hour: '3PM', temp: 28.7, humidity: 58 },
  { hour: '4PM', temp: 28.0, humidity: 60 },
  { hour: '5PM', temp: 27.2, humidity: 63 },
  { hour: '6PM', temp: 26.5, humidity: 65 },
  { hour: '7PM', temp: 25.9, humidity: 67 },
]

// IoT sensor nodes (ESP32) deployed around Seda BGC.
export const DEVICES = [
  { id: 'esp32-01', room: 'Room 610', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 92, status: 'online', lastSeen: '10s ago' },
  { id: 'esp32-02', room: 'Room 501', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 88, status: 'online', lastSeen: '8s ago' },
  { id: 'esp32-03', room: 'Room 712', sensors: ['Temp', 'Humidity'], battery: 74, status: 'online', lastSeen: '12s ago' },
  { id: 'esp32-04', room: 'Straight Up', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 61, status: 'online', lastSeen: '5s ago' },
  { id: 'esp32-05', room: 'Lobby', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 45, status: 'degraded', lastSeen: '2m ago' },
  { id: 'esp32-06', room: 'Function Room', sensors: ['Temp', 'Humidity'], battery: 0, status: 'offline', lastSeen: '3h ago' },
]

// Emergency scenarios ALVIN adapts to (from the concept table).
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
  { id: 'r610', name: 'Room 610', reason: 'Best-rated suite', score: 95 },
  { id: 'r501', name: 'Room 501', reason: 'Quiet, well-ventilated', score: 92 },
  { id: 'r803', name: 'Room 803', reason: 'Comfortable corner suite', score: 82, featured: true },
]

// Default start/end nodes for the live navigation query.
export const NAV_DEFAULTS = {
  start: 'node_lobby',
  end: 'node_r610',
  preference: 'covered',
}

export const EMERGENCY_STATUS = {
  active: false,
  headline: 'No Active Emergency',
  subtext: 'All systems normal',
  safeRoute: 'Seda BGC',
  nearestExit: 'Main Lobby',
  assemblyArea: 'Seda BGC Lobby',
}
