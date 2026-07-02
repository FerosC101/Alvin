import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useEmergency } from '../context/EmergencyContext'
import { fetchNearestEvac } from '../services/api'
import Icon from './Icon'
import './MapView.css'

// Bonifacio Global City, Taguig. MapLibre uses [lng, lat].
const BGC_CENTER = [121.0489, 14.5509]
const BGC_BOUNDS = [
  [121.034, 14.538], // south-west
  [121.063, 14.563], // north-east
]
const INITIAL_VIEW = { center: BGC_CENTER, zoom: 15.2, pitch: 58, bearing: -20 }

// Free dark vector basemap (OpenMapTiles schema → has a `building` layer).
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Add 3D building extrusions using the basemap's vector building layer.
function addBuildings(map) {
  const style = map.getStyle()
  const vectorSourceId = Object.keys(style.sources).find(
    (id) => style.sources[id].type === 'vector',
  )
  if (!vectorSourceId || map.getLayer('alvin-3d-buildings')) return
  const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id
  map.addLayer(
    {
      id: 'alvin-3d-buildings',
      source: vectorSourceId,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': '#2a3a55',
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      },
    },
    firstSymbol,
  )
}

// Generate a simulated heat field of weighted points around a center, so the
// heatmap layer has a distribution to render (hotter toward the middle).
function makeHeatPoints([lng, lat], n = 60, spread = 0.004) {
  const features = []
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * spread
    const dLng = (Math.cos(angle) * r) / Math.cos((lat * Math.PI) / 180)
    const dLat = Math.sin(angle) * r
    const mag = Math.max(0, 1 - r / spread) * (0.4 + Math.random() * 0.6)
    features.push({
      type: 'Feature',
      properties: { mag },
      geometry: { type: 'Point', coordinates: [lng + dLng, lat + dLat] },
    })
  }
  return { type: 'FeatureCollection', features }
}

// Great-circle distance in metres (fallback when routing is unavailable).
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

// Fetch a walking route (OSRM public server), falling back to a straight line.
async function getRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    const r = data.routes?.[0]
    if (r) return { geometry: r.geometry, distance: r.distance, duration: r.duration }
  } catch {
    // ignore — fall back below
  }
  const distance = haversine(from, to)
  return {
    geometry: { type: 'LineString', coordinates: [from, to] },
    distance,
    duration: distance / 1.3, // ~1.3 m/s walking
  }
}

export default function MapView({ onBuildingClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const clickRef = useRef(onBuildingClick)
  clickRef.current = onBuildingClick
  const evacMarkerRef = useRef(null)
  const heatRafRef = useRef(0)
  const { active, origin, evac } = useEmergency()
  const [now, setNow] = useState(() => new Date())
  const [routeInfo, setRouteInfo] = useState(null)
  const [target, setTarget] = useState(evac) // resolved evacuation destination
  const [heatmap, setHeatmap] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      ...INITIAL_VIEW,
      maxBounds: BGC_BOUNDS,
      minZoom: 13.5,
      maxZoom: 19,
      maxPitch: 75,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.on('load', () => addBuildings(map))

    // Clickable "Main Building" marker → opens the building panel.
    const el = document.createElement('button')
    el.className = 'building-marker'
    el.type = 'button'
    el.innerHTML = `
      <span class="building-marker__label">Main Building</span>
      <span class="building-marker__pin">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 8h2a2 2 0 0 1 2 2v11"/><path d="M2 21h20M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01"/>
        </svg>
      </span>`
    el.addEventListener('click', () => clickRef.current?.())
    new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(BGC_CENTER).addTo(map)

    mapRef.current = map
    return () => map.remove()
  }, [])

  // Draw / clear the evacuation route when emergency mode toggles.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const clear = () => {
      for (const id of ['evac-route-line', 'evac-route-glow']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('evac-route')) map.removeSource('evac-route')
      evacMarkerRef.current?.remove()
      evacMarkerRef.current = null
    }

    if (!active) {
      clear()
      setRouteInfo(null)
      map.easeTo({ ...INITIAL_VIEW, duration: 800 })
      return
    }

    let cancelled = false
    const draw = async () => {
      // Resolve the nearest partner evacuation center (fallback to default).
      let dest = evac
      const near = await fetchNearestEvac(origin.coords[1], origin.coords[0])
      if (near?.status === 'success' && near.nearest) {
        const n = near.nearest
        dest = { name: n.name, partner: n.partner, address: n.address, coords: [n.lng, n.lat] }
      }
      if (cancelled || !mapRef.current) return
      setTarget(dest)

      const { geometry, distance, duration } = await getRoute(origin.coords, dest.coords)
      if (cancelled || !mapRef.current) return
      const data = { type: 'Feature', geometry }

      if (map.getSource('evac-route')) {
        map.getSource('evac-route').setData(data)
      } else {
        map.addSource('evac-route', { type: 'geojson', data })
        map.addLayer({
          id: 'evac-route-glow',
          type: 'line',
          source: 'evac-route',
          paint: { 'line-color': '#f2555f', 'line-width': 12, 'line-blur': 8, 'line-opacity': 0.45 },
        })
        map.addLayer({
          id: 'evac-route-line',
          type: 'line',
          source: 'evac-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#f2555f', 'line-width': 4 },
        })
      }

      // Evacuation-center marker.
      evacMarkerRef.current?.remove()
      const el = document.createElement('div')
      el.className = 'evac-marker'
      el.innerHTML = `
        <span class="evac-marker__label">${dest.name}</span>
        <span class="evac-marker__pin">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>
          </svg>
        </span>`
      evacMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(dest.coords)
        .addTo(map)

      // Frame the whole route.
      const coords = geometry.coordinates
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      )
      map.fitBounds(bounds, { padding: 90, duration: 1000, maxZoom: 16, pitch: 45 })

      setRouteInfo({ distance, duration })
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)

    return () => {
      cancelled = true
    }
  }, [active, origin, evac])

  // Simulated 2D heatmap + expanding "wave" ring, toggled by the button.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const remove = () => {
      cancelAnimationFrame(heatRafRef.current)
      for (const id of ['heat-wave-ring', 'heat-layer']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      for (const s of ['heat-ring-src', 'heat-src']) {
        if (map.getSource(s)) map.removeSource(s)
      }
    }

    const add = () => {
      if (map.getLayer('heat-layer')) return
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id

      map.addSource('heat-src', { type: 'geojson', data: makeHeatPoints(BGC_CENTER) })
      map.addLayer(
        {
          id: 'heat-layer',
          type: 'heatmap',
          source: 'heat-src',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 1, 1],
            'heatmap-intensity': 1,
            'heatmap-radius': 30,
            'heatmap-opacity': 0.75,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, '#2dd4bf',
              0.4, '#22c55e',
              0.6, '#fbbf24',
              0.8, '#fb923c',
              1, '#ef4444',
            ],
          },
        },
        firstSymbol,
      )

      map.addSource('heat-ring-src', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: BGC_CENTER } },
      })
      map.addLayer(
        {
          id: 'heat-wave-ring',
          type: 'circle',
          source: 'heat-ring-src',
          paint: {
            'circle-radius': 0,
            'circle-color': 'rgba(239,68,68,0.12)',
            'circle-stroke-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.6,
          },
        },
        firstSymbol,
      )

      const t0 = performance.now()
      const animate = (t) => {
        if (!map.getLayer('heat-layer')) return
        const s = (t - t0) / 1000
        const pulse = 0.5 + 0.5 * Math.sin(s * 1.6)
        map.setPaintProperty('heat-layer', 'heatmap-radius', 26 + pulse * 24)
        map.setPaintProperty('heat-layer', 'heatmap-intensity', 0.7 + pulse * 0.7)
        const ring = (s % 3) / 3
        map.setPaintProperty('heat-wave-ring', 'circle-radius', ring * 100)
        map.setPaintProperty('heat-wave-ring', 'circle-stroke-opacity', 0.7 * (1 - ring))
        heatRafRef.current = requestAnimationFrame(animate)
      }
      heatRafRef.current = requestAnimationFrame(animate)
    }

    if (heatmap) {
      if (map.isStyleLoaded()) add()
      else map.once('load', add)
    } else if (map.isStyleLoaded()) {
      remove()
    }

    return () => {
      cancelAnimationFrame(heatRafRef.current)
      if (map.isStyleLoaded()) remove()
    }
  }, [heatmap])

  const resetView = () => mapRef.current?.easeTo({ ...INITIAL_VIEW, duration: 800 })

  const hour = now.getHours()
  const isDay = hour >= 6 && hour < 18
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${origin.coords[1]},${origin.coords[0]}&destination=${target.coords[1]},${target.coords[0]}&travelmode=walking`

  return (
    <section className="mapview">
      <div ref={containerRef} className="mapview__map" />

      <div className="mapview__clock">
        <span className="mapview__time-icon" aria-hidden="true">
          <Icon name={isDay ? 'sun' : 'moon'} size={16} />
        </span>
        <div className="mapview__clock-text">
          <span className="mapview__clock-time">{timeStr}</span>
          <span className="mapview__clock-date">{dateStr}</span>
        </div>
      </div>

      {active && (
        <div className="mapview__evac">
          <div className="mapview__evac-head">
            <Icon name="alert" size={18} />
            Emergency — proceed to evacuation
          </div>
          <div className="mapview__evac-name">{target.name}</div>
          <div className="mapview__evac-sub">{target.partner} · {target.address}</div>
          {routeInfo && (
            <div className="mapview__evac-meta">
              {(routeInfo.distance / 1000).toFixed(2)} km · ~{Math.round(routeInfo.duration / 60)} min walk
            </div>
          )}
          <a className="mapview__evac-go" href={gmaps} target="_blank" rel="noreferrer">
            Open GPS directions
          </a>
        </div>
      )}

      <div className="mapview__tools">
        <button
          className={`mapview__tool${heatmap ? ' mapview__tool--on' : ''}`}
          onClick={() => setHeatmap((v) => !v)}
        >
          <Icon name="heatmap" size={15} /> Heatmap
        </button>
        <button className="mapview__tool" onClick={resetView}>
          Reset view
        </button>
      </div>
    </section>
  )
}
