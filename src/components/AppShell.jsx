import React from 'react'
import { NavLink } from 'react-router-dom'
import { FiBookOpen, FiCompass, FiMenu, FiSettings } from 'react-icons/fi'

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
            to="/knowledge"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 rounded-lg transition ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`
            }
          >
            <FiBookOpen className="mr-3" />
            Knowledge Library
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

      <div className="flex-1 flex flex-col bg-gray-50">
        <header className="h-16 border-b bg-white px-6 flex items-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">Camp Scout AI</h1>
        </header>
        <main className="p-8 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
