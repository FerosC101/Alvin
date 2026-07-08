import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app__content">
        <TopBar />
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
