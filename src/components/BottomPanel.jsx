import { useEffect, useState } from 'react'
import {
  RECOMMENDATIONS,
  BEST_ROUTE,
  EMERGENCY_STATUS,
  NAV_DEFAULTS,
  comfortColor,
} from '../data/mockData'
import { fetchRoute } from '../services/api'
import { useEmergency } from '../context/EmergencyContext'
import Icon from './Icon'
import './BottomPanel.css'

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

function BestRouteCard() {
  const [route, setRoute] = useState(null) // live route, if the backend answers

  useEffect(() => {
    let active = true
    fetchRoute(NAV_DEFAULTS.start, NAV_DEFAULTS.end, NAV_DEFAULTS.preference).then((data) => {
      if (active && data && data.status === 'success') setRoute(data)
    })
    return () => {
      active = false
    }
  }, [])

  const live = Boolean(route)
  const name = live ? route.detailed_path.at(-1)?.name ?? BEST_ROUTE.name : BEST_ROUTE.name
  const via = live
    ? `via ${route.detailed_path.map((n) => n.name).join(' → ')}`
    : BEST_ROUTE.via
  const detail = live ? `${route.total_steps} stops` : BEST_ROUTE.duration

  return (
    <article className="card">
      <span className="card__label">
        BEST ROUTE ({BEST_ROUTE.mode}){live && <span className="live-dot"> ● LIVE</span>}
      </span>
      <div className="route__body">
        <div className="route__info">
          <span className="route__name">{name}</span>
          <span className="route__via">{via}</span>
          <span className="route__duration">{detail}</span>
        </div>
        <div className="route__map" aria-hidden="true">
          <span className="route__map-line" />
        </div>
      </div>
    </article>
  )
}

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
