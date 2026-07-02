import { useNavigate } from 'react-router-dom'
import { BUILDINGS, FLOORS } from '../data/mockData'
import { useEmergency } from '../context/EmergencyContext'
import Icon from './Icon'
import './TopBar.css'

const DATE_LABEL = 'May 16, 2025 10:15 AM'

export default function TopBar() {
  const { active, activate, deactivate } = useEmergency()
  const navigate = useNavigate()

  const handleEmergency = () => {
    if (active) {
      deactivate()
    } else {
      activate()
      navigate('/') // show the evacuation route on the map
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__context">
        <span className="topbar__building">{BUILDINGS[0]}</span>
        <span className="topbar__sep">·</span>
        <span className="topbar__floor">{FLOORS[0]}</span>
      </div>

      <div className="topbar__right">
        <button
          className={`topbar__emergency${active ? ' topbar__emergency--active' : ''}`}
          onClick={handleEmergency}
        >
          <Icon name="alert" size={16} />
          {active ? 'End Emergency' : 'Emergency'}
        </button>
        <span className="topbar__date">{DATE_LABEL}</span>
        <button className="topbar__icon-btn" aria-label="Notifications">
          <Icon name="bell" size={18} />
          <span className="topbar__badge">2</span>
        </button>
        <button className="topbar__avatar" aria-label="Account">
          <Icon name="user" size={18} />
        </button>
      </div>
    </header>
  )
}
