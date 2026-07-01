import React, { useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import { postDonate } from '../api/donateClient'

const DONATION_OPTIONS = [
  { amount: 5, label: '$5' },
  { amount: 10, label: '$10' },
  { amount: 25, label: '$25' },
]

export default function DonationCard() {
  const [loadingAmount, setLoadingAmount] = useState(null)
  const [error, setError] = useState('')

  async function handleDonate(amount) {
    setError('')
    setLoadingAmount(amount)

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

  return (
    <section
      aria-labelledby="donation-heading"
      className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white px-6 py-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <FiHeart className="mt-1 flex-shrink-0 text-green-600" size={22} aria-hidden="true" />
        <div className="flex-1 space-y-3">
          <div>
            <h2 id="donation-heading" className="text-lg font-semibold text-gray-900">
              Support CampScout.ai
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              CampScout.ai is free to use. If it helped you find a campsite, consider supporting
              hosting and future development.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {DONATION_OPTIONS.map(({ amount, label }) => (
              <button
                key={amount}
                type="button"
                disabled={loadingAmount !== null}
                onClick={() => handleDonate(amount)}
                className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border border-green-600 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAmount === amount ? 'Redirecting…' : label}
              </button>
            ))}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
