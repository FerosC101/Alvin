import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MapOverview from './pages/MapOverview'
import ThreeDTwin from './pages/ThreeDTwin'
import Environmental from './pages/Environmental'
import Recommendations from './pages/Recommendations'
import Emergency from './pages/Emergency'
import Devices from './pages/Devices'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { EmergencyProvider } from './context/EmergencyContext'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <EmergencyProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapOverview />} />
          <Route path="3d-twin" element={<ThreeDTwin />} />
          <Route path="environmental" element={<Environmental />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="devices" element={<Devices />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      </EmergencyProvider>
    </BrowserRouter>
  )
}
