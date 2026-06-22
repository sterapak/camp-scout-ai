import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiExternalLink, FiMapPin } from 'react-icons/fi'
import AvailabilityNotice from '../components/AvailabilityNotice'
import { getCampgroundById } from '../data/campgroundData'

export default function CampgroundDetailPage() {
  const { id } = useParams()
  const campground = getCampgroundById(id)

  if (!campground) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/campgrounds" className="inline-flex items-center text-sm text-green-700 hover:text-green-900">
          <FiArrowLeft className="mr-1" />
          Back to campgrounds
        </Link>
        <p className="text-gray-600">Campground not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/campgrounds" className="inline-flex items-center text-sm text-green-700 hover:text-green-900">
        <FiArrowLeft className="mr-1" />
        Back to campgrounds
      </Link>

      <header className="space-y-2">
        <h2 className="text-3xl font-semibold text-gray-900">{campground.name}</h2>
        <p className="inline-flex items-center text-gray-600">
          <FiMapPin className="mr-1" />
          {campground.region}
        </p>
      </header>

      <AvailabilityNotice />

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">About</h3>
        <p className="text-gray-700">{campground.notes}</p>
        <p className="text-xs text-gray-500">
          Last verified: {campground.lastVerifiedAt}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Official Sources</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={campground.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            View official info
            <FiExternalLink size={14} />
          </a>
          <a
            href={campground.reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Reservation portal
            <FiExternalLink size={14} />
          </a>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Amenities</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {campground.amenities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Rules</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {campground.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Dog Policy</h3>
        <p className="text-gray-700">{campground.dogPolicy}</p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {campground.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
