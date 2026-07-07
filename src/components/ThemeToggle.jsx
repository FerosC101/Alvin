import { useEffect, useState } from 'react'
import Icon from './Icon'

// Reads the saved theme (applied early in main.jsx) and toggles it.
function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('alvin-theme', theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  return (
    <button
      className="topbar__icon-btn"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title="Toggle theme"
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
    </button>
  )
}
