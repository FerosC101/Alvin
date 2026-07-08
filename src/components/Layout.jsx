import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app__content">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <Outlet />
      </div>
    </div>
  )
}
