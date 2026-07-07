import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MapOverview from './pages/MapOverview'
import DigitalTwin from './pages/ThreeDTwin'
import Emergency from './pages/Emergency'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { EmergencyProvider } from './context/EmergencyContext'
import { RouteProvider } from './context/RouteContext'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <EmergencyProvider>
        <RouteProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<MapOverview />} />
              <Route path="digital-twin" element={<DigitalTwin />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </RouteProvider>
      </EmergencyProvider>
    </BrowserRouter>
  )
}
