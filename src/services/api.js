// Thin client for the ALVIN FastAPI backend (alvin-backend/main.py).
// Every call fails soft: if the backend is unreachable, callers get null and
// can fall back to mock data, so the UI works offline during development.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get(path) {
  console.log('[ALVIN] GET', path)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.warn('[ALVIN] GET', path, '→ non-OK status', res.status)
      return null
    }
    const data = await res.json()
    console.log('[ALVIN] GET', path, '→ OK', data)
    return data
  } catch (err) {
    // Backend offline / CORS / network error — let the caller fall back.
    console.error('[ALVIN] GET', path, '→ fetch error:', err)
    return null
  }
}

// GET /api/weather/current -> outdoor conditions for Sta. Mesa, Manila
export const fetchWeather = () => get('/api/weather/current')

// GET /api/dashboard/live-sensors -> per-node comfort scores
export const fetchLiveSensors = () => get('/api/dashboard/live-sensors')

// GET /api/dashboard/stats -> system-wide average comfort + alert areas
export const fetchDashboardStats = () => get('/api/dashboard/stats')

// GET /api/navigate?start_node=&end_node=&preference=&weather=
// weather param is only used by the backend when preference is 'auto' or 'emergency'.
export const fetchRoute = (start, end, preference = 'shortest', weather = 'Cloudy') =>
  get(`/api/navigate?start_node=${encodeURIComponent(start)}&end_node=${encodeURIComponent(end)}&preference=${preference}&weather=${encodeURIComponent(weather)}`)

export { BASE_URL }
