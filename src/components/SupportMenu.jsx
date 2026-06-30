import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { postDonate } from '../api/donateClient'
import { HEADER_SECONDARY_BUTTON_CLASS } from './headerButtonStyles'

const DONATION_OPTIONS = [
  { amount: 5, emoji: '☕', label: '$5 — Buy me a coffee' },
  { amount: 10, emoji: '🏕️', label: '$10 — Support the project' },
  { amount: 25, emoji: '❤️', label: '$25 — Help CampScout.ai grow' },
]

export default function SupportMenu() {
  const [open, setOpen] = useState(false)
  const [loadingAmount, setLoadingAmount] = useState(null)
  const [error, setError] = useState('')
  const containerRef = useRef(null)
  const menuId = useId()

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const toggleMenu = useCallback(() => {
    setOpen((previous) => !previous)
    setError('')
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeMenu()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closeMenu])

  async function handleDonate(amount) {
    setError('')
    setLoadingAmount(amount)
    closeMenu()

    try {
      const { url } = await postDonate(amount)
      window.location.assign(url)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to start checkout. Please try again.'
      setError(message)
      setLoadingAmount(null)
    }
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleMenu()
    }
  }

  function handleMenuItemKeyDown(event, amount) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDonate(amount)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={HEADER_SECONDARY_BUTTON_CLASS}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={loadingAmount !== null}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
      >
        Support
        <FiChevronDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Support CampScout.ai"
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:w-80"
        >
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Support CampScout.ai
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                CampScout.ai is completely free to use. If CampScout.ai helped you discover a
                campsite, please consider supporting hosting, campground data, and future
                development.
              </p>
            </div>

            <ul className="space-y-1" role="none">
              {DONATION_OPTIONS.map(({ amount, emoji, label }) => (
                <li key={amount} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loadingAmount !== null}
                    onClick={() => handleDonate(amount)}
                    onKeyDown={(event) => handleMenuItemKeyDown(event, amount)}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-gray-800 hover:bg-green-50 focus:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                  >
                    <span aria-hidden="true" className="mr-2">
                      {emoji}
                    </span>
                    {loadingAmount === amount ? 'Redirecting…' : label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="absolute right-0 top-full z-40 mt-1 w-72 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
