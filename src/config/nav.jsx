// Shared navigation items + icons, used by the desktop sidebar and the mobile
// bottom nav so they never drift apart.

const icon = (paths) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
)

export const NAV_ICONS = {
  twin: icon(<><path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" /><path d="M3.3 7 12 12l8.7-5M12 12v10" /></>),
  map: icon(<><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>),
  analytics: icon(<><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 4-6" /></>),
  emergency: icon(<><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
}

export const NAV_ITEMS = [
  { to: '/digital-twin', label: 'Digital Twin', short: 'Twin', key: 'twin' },
  { to: '/', label: 'Map Overview', short: 'Map', key: 'map', end: true },
  { to: '/analytics', label: 'Analytics', short: 'Data', key: 'analytics' },
  { to: '/emergency', label: 'Emergency', short: 'Alert', key: 'emergency' },
  { to: '/settings', label: 'Settings', short: 'Settings', key: 'settings' },
]
