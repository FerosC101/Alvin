import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import {
  RECOMMENDATIONS,
  EMERGENCY_STATUS,
  USER_LOCATION,
  EVAC_CENTER,
  comfortColor,
} from '../data/mockData'
import { fetchWeather } from '../services/api'
import { useEmergency } from '../context/EmergencyContext'
import { useRoute, routeColour, routeModeLabel } from '../context/RouteContext'
import Icon from './Icon'
import './BottomPanel.css'

// ---------------------------------------------------------------------------
// Route Decision Engine
//
// Converts live weather data into a concrete backend preference.
// 'smart' navigation mode uses this; manual modes bypass it.
//
// Decision:
//   heat_index_c >= 38  →  'shaded'   (extreme heat)
//   is_raining          →  'covered'  (rain)
//   else                →  'shortest' (neutral)
// ---------------------------------------------------------------------------
function decidePreference(weatherData) {
  if (!weatherData) return 'shortest'
  if (weatherData.is_raining) return 'covered'
  if ((weatherData.heat_index_c ?? 0) >= 38) return 'shaded'
  return 'shortest'
}

// Colour for each navigation mode pill in the selector.
const MODE_COLOURS = {
  shaded:   '#f59e0b',
  covered:  '#38bdf8',
  shortest: '#00d4ff',
}

// ---------------------------------------------------------------------------
// NavigationSelector — compact segmented control pill bar
// Renders above the Best Route card. Writes navigationMode to RouteContext.
// ---------------------------------------------------------------------------

const SELECTOR_MODES = [
  { id: 'smart',    icon: '⭐', label: 'Smart'    },
  { id: 'shaded',   icon: '☀',  label: 'Shaded'   },
  { id: 'covered',  icon: '🌧', label: 'Covered'  },
  { id: 'shortest', icon: '⚡', label: 'Shortest' },
]

export function NavigationSelector() {
  const { navigationMode, setNavigationMode } = useRoute()

  return (
    <div className="nav-selector" role="group" aria-label="Navigation mode">
      <span className="nav-selector__label">Navigation</span>
      <div className="nav-selector__pills">
        {SELECTOR_MODES.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`nav-selector__pill${navigationMode === id ? ' nav-selector__pill--active' : ''}`}
            onClick={() => setNavigationMode(id)}
            aria-pressed={navigationMode === id}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecommendedCard — unchanged
// ---------------------------------------------------------------------------

function RecommendedCard() {
  return (
    <article className="card">
      <span className="card__label">RECOMMENDED FOR YOU</span>
      <div className="reco__list">
        {RECOMMENDATIONS.map((r) => (
          <div
            key={r.id}
            className={`reco__item${r.featured ? ' reco__item--featured' : ''}`}
          >
            <span className="reco__name">{r.name}</span>
            <span className="reco__reason">{r.reason}</span>
            <span
              className="reco__score"
              style={{ background: comfortColor(r.score) }}
            >
              {r.score}%
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// MiniRouteMap — embedded MapLibre preview
// Phase 1: OSRM walking route, Main Building → SM Aura.
// Colour updates via setPaintProperty — no re-init, no re-fetch.
// ---------------------------------------------------------------------------

function haversine([lng1, lat1], [lng2, lat2]) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function getWalkingRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    const r = data.routes?.[0]
    if (r) return { geometry: r.geometry, distance: r.distance, duration: r.duration }
  } catch {
    // fall through
  }
  const distance = haversine(from, to)
  return { geometry: { type: 'LineString', coordinates: [from, to] }, distance, duration: distance / 1.3 }
}

const MINI_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MINI_CENTER = USER_LOCATION.coords
const MINI_BOUNDS = [[121.034, 14.538], [121.063, 14.563]]
const MINI_VIEW   = { center: MINI_CENTER, zoom: 15.2, pitch: 58, bearing: -20 }

function addMiniBuildings(map) {
  const style = map.getStyle()
  const srcId = Object.keys(style.sources).find((id) => style.sources[id].type === 'vector')
  if (!srcId || map.getLayer('mini-3d-buildings')) return
  const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id
  map.addLayer({
    id: 'mini-3d-buildings',
    source: srcId,
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 13,
    paint: {
      'fill-extrusion-color': '#2a3a55',
      'fill-extrusion-opacity': 0.85,
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
    },
  }, firstSymbol)
}

function MiniRouteMap({ colour = '#00d4ff' }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const [routeInfo, setRouteInfo] = useState(null)

  // Init map once — geometry is fixed.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MINI_STYLE,
      ...MINI_VIEW,
      maxBounds: MINI_BOUNDS,
      minZoom: 13.5,
      maxZoom: 19,
      maxPitch: 75,
      interactive: true,
      attributionControl: false,
    })
    map.on('load', () => addMiniBuildings(map))

    // Origin pin
    const originEl = document.createElement('span')
    originEl.className = 'building-marker__pin'
    originEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>
      <path d="M16 8h2a2 2 0 0 1 2 2v11"/>
      <path d="M2 21h20M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01"/>
    </svg>`
    new maplibregl.Marker({ element: originEl, anchor: 'bottom' }).setLngLat(MINI_CENTER).addTo(map)

    // Destination pin — cyan accent, NOT emergency red
    const destEl = document.createElement('div')
    destEl.className = 'nav-dest-marker'
    destEl.innerHTML = `
      <span class="nav-dest-marker__label">${EVAC_CENTER.name}</span>
      <span class="nav-dest-marker__pin">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </span>`
    new maplibregl.Marker({ element: destEl, anchor: 'bottom' }).setLngLat(EVAC_CENTER.coords).addTo(map)

    mapRef.current = map

    let cancelled = false
    const draw = async () => {
      const { geometry, distance, duration } = await getWalkingRoute(USER_LOCATION.coords, EVAC_CENTER.coords)
      if (cancelled || !mapRef.current) return

      map.addSource('mini-route', { type: 'geojson', data: { type: 'Feature', geometry } })
      map.addLayer({ id: 'mini-route-glow', type: 'line', source: 'mini-route',
        paint: { 'line-color': colour, 'line-width': 12, 'line-blur': 8, 'line-opacity': 0.45 } })
      map.addLayer({ id: 'mini-route-line', type: 'line', source: 'mini-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': colour, 'line-width': 4 } })

      map.easeTo({ center: [121.0526, 14.5490], zoom: 14.5, pitch: 45, bearing: -20, duration: 900 })
      if (!cancelled) setRouteInfo({ distance, duration })
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)

    return () => { cancelled = true; map.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate colour change — no re-init needed.
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || !map.getLayer('mini-route-glow')) return
    map.setPaintProperty('mini-route-glow', 'line-color', colour)
    map.setPaintProperty('mini-route-line', 'line-color', colour)
  }, [colour])

  return (
    <div className="route__minimap">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {routeInfo && (
        <div className="route__minimap-meta">
          {(routeInfo.distance / 1000).toFixed(2)} km · ~{Math.round(routeInfo.duration / 60)} min walk
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BestRouteCard — adaptive routing card
//
// Reads navigationMode from context. In 'smart' mode: fetches weather,
// derives the best preference, and shows the ALVIN recommendation banner.
// In manual modes: uses the selection directly, skips weather fetch.
// Writes the resolved preference back to context so MapView reacts.
// ---------------------------------------------------------------------------

function BestRouteCard() {
  const { active: isEmergency } = useEmergency()
  const {
    navigationMode,
    setNavigationPreference,
  } = useRoute()

  const [weatherData, setWeatherData] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  // Fetch weather only when needed: smart mode or on first mount.
  useEffect(() => {
    if (navigationMode !== 'smart' && !isEmergency) return
    let cancelled = false
    setLoadingWeather(true)

    fetchWeather()
      .then((data) => { if (!cancelled && data) setWeatherData(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingWeather(false) })

    return () => { cancelled = true }
  }, [navigationMode, isEmergency])

  // Derive the effective backend preference.
  const effectivePreference = (() => {
    if (isEmergency) return 'emergency'
    if (navigationMode === 'smart') return decidePreference(weatherData)
    return navigationMode  // 'shaded' | 'covered' | 'shortest'
  })()

  // Write resolved preference to context so MapView reacts immediately.
  useEffect(() => {
    setNavigationPreference(effectivePreference)
  }, [effectivePreference, setNavigationPreference])

  const colour = routeColour(effectivePreference)
  const modeLabel = routeModeLabel(effectivePreference)

  // ALVIN recommendation banner text (smart mode only).
  const isSmartMode = navigationMode === 'smart' && !isEmergency
  const recommendedLabel = isSmartMode ? routeModeLabel(decidePreference(weatherData)) : null

  const weatherLine = weatherData
    ? `Heat Index: ${weatherData.heat_index_c?.toFixed(1) ?? '—'}°C · ${weatherData.condition ?? ''}`
    : 'Fetching weather…'

  const cardLabel = isEmergency
    ? 'BEST ROUTE (EMERGENCY)'
    : loadingWeather && isSmartMode
      ? 'BEST ROUTE (…)'
      : `BEST ROUTE (${modeLabel})`

  return (
    <article className="card">
      <span className="card__label">
        {cardLabel}
        <span className="live-dot"> ● LIVE</span>
      </span>

      {/* Smart recommendation banner */}
      {isSmartMode && recommendedLabel && (
        <div className="route__recommendation">
          <span className="route__recommendation-label">Recommended by ALVIN</span>
          <span className="route__recommendation-detail">{weatherLine}</span>
          <span
            className="route__recommendation-mode"
            style={{ color: routeColour(decidePreference(weatherData)) }}
          >
            ✓ {recommendedLabel}
          </span>
        </div>
      )}

      <div className="route__info">
        <span className="route__name">
          <span className="route__mode-dot" style={{ background: colour }} aria-hidden="true" />
          {EVAC_CENTER.name}
        </span>
        <span className="route__via">{isEmergency ? 'Evacuation route' : weatherLine}</span>
        <span className="route__duration" style={{ color: colour }}>{modeLabel}</span>
      </div>

      <MiniRouteMap colour={colour} />
    </article>
  )
}

// ---------------------------------------------------------------------------
// EmergencyCard — unchanged
// ---------------------------------------------------------------------------

function EmergencyCard() {
  const { active, evac } = useEmergency()
  const e = EMERGENCY_STATUS
  const headline = active ? 'Evacuation In Progress' : e.headline
  const subtext = active ? `Proceed to ${evac.name}` : e.subtext

  return (
    <article className={`card${active ? ' card--danger' : ''}`}>
      <span className="card__label">EMERGENCY STATUS</span>
      <div className="emergency__headline">
        <span className={`emergency__badge${active ? ' emergency__badge--active' : ''}`}>
          <Icon name={active ? 'alert' : 'check'} size={20} />
        </span>
        <div>
          <span className="emergency__title">{headline}</span>
          <span className="emergency__sub">{subtext}</span>
        </div>
      </div>
      <dl className="emergency__rows">
        {active ? (
          <>
            <div><dt>Destination</dt><dd>{evac.name}</dd></div>
            <div><dt>Type</dt><dd>{evac.partner}</dd></div>
            <div><dt>Address</dt><dd>{evac.address}</dd></div>
          </>
        ) : (
          <>
            <div><dt>Safe route</dt><dd>{e.safeRoute}</dd></div>
            <div><dt>Nearest exit</dt><dd>{e.nearestExit}</dd></div>
            <div><dt>Assembly area</dt><dd>{e.assemblyArea}</dd></div>
          </>
        )}
      </dl>
    </article>
  )
}

export default function BottomPanel() {
  return (
    <div className="bottom-panel">
      <RecommendedCard />
      <BestRouteCard />
      <EmergencyCard />
    </div>
  )
}
