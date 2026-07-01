import React, { useEffect, useState } from 'react'
import { HEADER_SECONDARY_BUTTON_CLASS } from './headerButtonStyles'

const THEME_STORAGE_KEY = 'camp-scout-theme'

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }

  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return 'light'
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => readStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleTheme()
    }
  }

  const label = theme === 'light' ? 'Light Theme' : 'Dark Theme'

  return (
    <button
      type="button"
      className={HEADER_SECONDARY_BUTTON_CLASS}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      aria-label={`Current theme: ${label}. Activate to switch theme.`}
    >
      {label}
    </button>
  )
}
