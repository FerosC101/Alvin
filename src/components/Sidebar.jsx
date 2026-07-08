import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { OUTDOOR_WEATHER } from '../data/mockData'
import { fetchWeather } from '../services/api'
import { NAV_ITEMS, NAV_ICONS as ICONS } from '../config/nav'
import Icon, { weatherIcon } from './Icon'
import './Sidebar.css'

export default function Sidebar({ open = false, onClose }) {
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
    <>
      <div
        className={`sidebar__backdrop${open ? ' sidebar__backdrop--show' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
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
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{ICONS[item.key]}</span>
            <span className="sidebar__label">{item.label}</span>
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
    </>
  )
}
