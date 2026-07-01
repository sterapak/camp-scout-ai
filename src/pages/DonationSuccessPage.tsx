import React from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'

export default function DonationSuccessPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <FiCheckCircle className="mx-auto text-green-600" size={48} aria-hidden="true" />
      <h2 className="text-2xl font-semibold text-gray-900">Thank you for your support!</h2>
      <p className="text-gray-600">
        Your donation helps keep CampScout.ai running and supports future improvements. We really
        appreciate it.
      </p>
      <Link
        to="/campgrounds"
        className="inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        Back to campgrounds
      </Link>
    </div>
  )
}
