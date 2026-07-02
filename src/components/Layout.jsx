import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app__content">
        <TopBar />
        <Outlet />
      </div>
    </div>
  )
}
