import React from 'react'
import { FiLogOut } from 'react-icons/fi'
import { signOut, useAuth } from '../contexts/AuthContext'

/**
 * Header user chip: avatar (or initial) + a Sign out action. Uses a native
 * <details> disclosure so there's no click-outside bookkeeping.
 */
export default function UserMenu() {
  const { user } = useAuth()
  if (!user) return null

  const label = user.name || user.email
  const initial = (label || '?').trim().charAt(0).toUpperCase()

  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        aria-label="Account menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-sm font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-sm text-gray-700 dark:text-gray-200 sm:inline">
          {label}
        </span>
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          {user.name && (
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
              {user.name}
            </p>
          )}
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void signOut()
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <FiLogOut />
          Sign out
        </button>
      </div>
    </details>
  )
}
