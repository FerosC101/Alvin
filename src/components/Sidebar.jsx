import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { OUTDOOR_WEATHER } from '../data/mockData'
import { fetchWeather } from '../services/api'
import Icon, { weatherIcon } from './Icon'
import './Sidebar.css'

// Minimal line icons (stroke uses currentColor so they follow link state).
const icon = (paths) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
)
const ICONS = {
  twin: icon(<><path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" /><path d="M3.3 7 12 12l8.7-5M12 12v10" /></>),
  map: icon(<><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>),
  environmental: icon(<path d="M12 3s6 5 6 10a6 6 0 1 1-12 0c0-5 6-10 6-10Z" />),
  recommendations: icon(<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.2l5.9-.9L12 3Z" />),
  emergency: icon(<><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>),
  devices: icon(<><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></>),
  analytics: icon(<><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 4-6" /></>),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
}

const NAV_ITEMS = [
  { to: '/3d-twin', label: '3D Twin', key: 'twin' },
  { to: '/', label: 'Map Overview', key: 'map', end: true },
  { to: '/environmental', label: 'Environmental', key: 'environmental' },
  { to: '/recommendations', label: 'Recommendations', key: 'recommendations' },
  { to: '/emergency', label: 'Emergency', key: 'emergency' },
  { to: '/devices', label: 'Devices', key: 'devices' },
  { to: '/analytics', label: 'Analytics', key: 'analytics' },
  { to: '/settings', label: 'Settings', key: 'settings' },
]

export default function Sidebar() {
  const [w, setW] = useState(OUTDOOR_WEATHER)

  useEffect(() => {
    let active = true
    fetchWeather().then((data) => {
      if (active && data && data.status === 'success') {
        setW((prev) => ({
          ...prev,
          city: data.location ?? prev.city,
          temperature: Math.round(data.temperature_c ?? prev.temperature),
          heatIndex: `${Math.round(data.heat_index_c ?? 0)} C`,
          condition: data.is_raining ? 'Rain detected' : data.condition ?? prev.condition,
          source: 'Live · ALVIN backend',
        }))
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img className="sidebar__logo" src="/alvin-logo.png" alt="ALVIN logo" />
        <div className="sidebar__title">
          <span className="sidebar__name">ALVIN</span>
          <span className="sidebar__tagline">Adaptive Living Virtual Intelligence Network</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{ICONS[item.key]}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__weather">
        <span className="sidebar__section-label">OUTDOOR WEATHER</span>
        <span className="sidebar__city">{w.city}</span>

        <div className="sidebar__temp-row">
          <span className="sidebar__weather-icon" aria-hidden="true">
            <Icon name={weatherIcon(w.condition)} size={34} strokeWidth={1.5} />
          </span>
          <div>
            <span className="sidebar__temp">
              {w.temperature}<span className="sidebar__temp-unit">c</span>
            </span>
            <span className="sidebar__condition">{w.condition}</span>
          </div>
        </div>

        <dl className="sidebar__metrics">
          <div><dt>Humidity</dt><dd>{w.humidity}%</dd></div>
          <div><dt>Rain Intensity</dt><dd>{w.rainIntensity}</dd></div>
          <div><dt>Wind</dt><dd>{w.wind}</dd></div>
          <div><dt>Heat Index</dt><dd>{w.heatIndex}</dd></div>
        </dl>

        <div className="sidebar__source">
          <span>Source: {w.source}</span>
          <span>Updated: {w.updatedAt}</span>
        </div>
      </div>
    </aside>
  )
}
