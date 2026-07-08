import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, NAV_ICONS } from '../config/nav'
import './BottomNav.css'

// Mobile-only bottom tab bar (shown in place of the sidebar on phones).
export default function BottomNav() {
  return (
    <nav className="bottomnav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottomnav__link${isActive ? ' bottomnav__link--active' : ''}`}
        >
          <span className="bottomnav__icon">{NAV_ICONS[item.key]}</span>
          <span className="bottomnav__label">{item.short}</span>
        </NavLink>
      ))}
    </nav>
  )
}
