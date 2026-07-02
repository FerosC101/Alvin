// Shared line-icon set. All icons use currentColor so they inherit text color.
const PATHS = {
  cloud: <path d="M17.5 19a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.2 8.5 4 4 0 0 0 6.5 19h11Z" />,
  'cloud-rain': (
    <>
      <path d="M17.5 15a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.2 4.5 4 4 0 0 0 6.5 15" />
      <path d="M8 17v3M12 17v4M16 17v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  fire: (
    <path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.4.6-2.6 1.4-3.6.3 1.8 1.6 2.4 1.6 2.4S9 8 12 2Z" />
  ),
  quake: <path d="M22 12h-4l-3 8L9 4l-3 8H2" />,
  flood: (
    <>
      <path d="M2 7c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
      <path d="M2 13c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
      <path d="M2 19c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />
    </>
  ),
  thermometer: <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />,
  check: (
    <>
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 8h2a2 2 0 0 1 2 2v11" />
      <path d="M2 21h20M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01" />
    </>
  ),
  heatmap: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <path d="M8.1 8.1a5.5 5.5 0 0 0 0 7.8M15.9 15.9a5.5 5.5 0 0 0 0-7.8" />
      <path d="M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 18.7a9.5 9.5 0 0 0 0-13.4" />
    </>
  ),
}

export default function Icon({ name, size = 18, strokeWidth = 1.8, className }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

// Map a weather condition string to an icon name.
export function weatherIcon(condition = '') {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('drizzle')) return 'cloud-rain'
  if (c.includes('cloud')) return 'cloud'
  return 'sun'
}
