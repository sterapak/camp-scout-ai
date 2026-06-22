import React from 'react'
import { FiAlertCircle } from 'react-icons/fi'

export default function AvailabilityNotice({ compact = false }) {
  if (compact) {
    return (
      <p className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        <FiAlertCircle className="flex-shrink-0" />
        Availability not connected
      </p>
    )
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <FiAlertCircle className="mt-0.5 flex-shrink-0 text-amber-600" size={20} />
      <div>
        <p className="font-semibold">Availability not connected</p>
        <p className="mt-1 text-sm text-amber-800">
          Live campsite availability is not connected yet. Use the source and reservation links
          below to check openings on official park websites.
        </p>
      </div>
    </div>
  )
}
