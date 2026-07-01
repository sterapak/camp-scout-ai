import React from 'react'
import { NavLink } from 'react-router-dom'
import { FiBookOpen, FiCompass, FiMenu, FiSettings } from 'react-icons/fi'
import SupportMenu from './SupportMenu'
import ThemeToggle from './ThemeToggle'
import DonationAcknowledgment from './DonationAcknowledgment'
import { HEADER_SECONDARY_BUTTON_CLASS } from './headerButtonStyles'

export default function AppShell({ children }) {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 flex-shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FiCompass className="text-green-400" size={28} />
            <div>
              <p className="text-lg font-bold leading-tight">Camp Scout AI</p>
              <p className="text-xs text-gray-400">NorCal campground guide</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          <NavLink
            to="/campgrounds"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 rounded-lg transition ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`
            }
          >
            <FiCompass className="mr-3" />
            Browse Campgrounds
          </NavLink>
          <NavLink
            to="/retrieval"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 rounded-lg transition ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`
            }
          >
            <FiBookOpen className="mr-3" />
            Knowledge Retrieval
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 rounded-lg transition ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`
            }
          >
            <FiSettings className="mr-3" />
            Settings
          </NavLink>
        </nav>

        <div className="px-4 py-3 md:hidden">
          <FiMenu size={24} className="text-gray-400 hover:text-white cursor-pointer" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        <header className="flex h-16 items-center border-b bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div className="flex w-full items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Camp Scout AI</h1>
            <nav
              aria-label="Application controls"
              className="flex shrink-0 items-center gap-1.5 sm:gap-2"
            >
              <DonationAcknowledgment />
              <ThemeToggle />
              <SupportMenu />
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `${HEADER_SECONDARY_BUTTON_CLASS}${
                    isActive
                      ? ' border-gray-300 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
                      : ''
                  }`
                }
              >
                Settings
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="p-4 flex-1 overflow-auto sm:p-8">{children}</main>
      </div>
    </div>
  )
}
