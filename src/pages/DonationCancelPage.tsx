import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

export default function DonationCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h2 className="text-2xl font-semibold text-gray-900">Donation canceled</h2>
      <p className="text-gray-600">
        No worries — CampScout.ai is still free to use. You can always come back if you&apos;d like
        to support us later.
      </p>
      <Link
        to="/campgrounds"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <FiArrowLeft aria-hidden="true" />
        Back to campgrounds
      </Link>
    </div>
  )
}
