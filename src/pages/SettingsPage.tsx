import React from 'react'

import { isApiAvailable } from '../api/apiAuth.js'
import NotifySettings from '../components/NotifySettings.js'

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
      <p className="text-gray-600">Configure your Camp Scout AI preferences.</p>
      {isApiAvailable() && <NotifySettings />}
    </div>
  )
}
