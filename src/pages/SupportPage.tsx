import React from 'react'
import DonationCard from '../components/DonationCard'

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Support</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          CampScout.ai is free for everyone. Your support helps cover hosting, campground data, and
          future improvements.
        </p>
      </div>

      <DonationCard />
    </div>
  )
}
