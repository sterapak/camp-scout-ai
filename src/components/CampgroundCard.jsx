import React from 'react'
import { Link } from 'react-router-dom'
import { FiExternalLink, FiMapPin } from 'react-icons/fi'
import AvailabilityNotice from './AvailabilityNotice'

/** @param {{ campground: import('../data/campgroundSchema.js').Campground }} props */
export default function CampgroundCard({ campground }) {
  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col flex-1 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{campground.name}</h3>
            <p className="mt-1 inline-flex items-center text-sm text-gray-600">
              <FiMapPin className="mr-1 flex-shrink-0" />
              {campground.region}
            </p>
          </div>
          <AvailabilityNotice compact />
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{campground.notes}</p>

        <div className="flex flex-wrap gap-1.5">
          {campground.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-lg">
        <a
          href={campground.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
        >
          Official source
          <FiExternalLink className="ml-1" size={14} />
        </a>
        <Link
          to={`/campgrounds/${campground.id}`}
          className="text-sm font-medium text-gray-800 hover:text-green-700"
        >
          View details →
        </Link>
      </div>
    </article>
  )
}
