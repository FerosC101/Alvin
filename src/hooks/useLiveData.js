import { useEffect, useState } from 'react'
import { ROOMS, DEVICES } from '../data/mockData'
import { fetchRooms, fetchDevices } from '../services/api'

// Map a backend room payload to the shape the UI components expect.
function mapRoom(r) {
  return {
    id: r.id,
    name: r.name,
    wing: r.wing,
    room: r.room_no,
    score: Math.round(r.comfort_score ?? 0),
    temp: r.temperature,
    humidity: r.humidity,
    airflow: r.airflow,
    noise: r.noise,
    occupancy: r.occupancy ?? 0,
    capacity: r.capacity ?? 0,
  }
}

// Live rooms from /api/rooms, falling back to mock data when offline.
export function useRooms() {
  const [rooms, setRooms] = useState(ROOMS)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let active = true
    fetchRooms().then((d) => {
      if (active && d && d.status === 'success' && d.rooms?.length) {
        setRooms(d.rooms.map(mapRoom))
        setLive(true)
      }
    })
    return () => {
      active = false
    }
  }, [])
  return { rooms, live }
}

// Live devices from /api/devices, falling back to mock data when offline.
export function useDevices() {
  const [devices, setDevices] = useState(DEVICES)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let active = true
    fetchDevices().then((d) => {
      if (active && d && d.status === 'success' && d.devices?.length) {
        setDevices(d.devices.map((x) => ({ ...x, lastSeen: x.last_seen ?? x.lastSeen })))
        setLive(true)
      }
    })
    return () => {
      active = false
    }
  }, [])
  return { devices, live }
}
