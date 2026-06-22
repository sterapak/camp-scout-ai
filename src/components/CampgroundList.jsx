import React from 'react'
import CampgroundCard from './CampgroundCard'

/** @param {{ campgrounds: import('../data/campgroundSchema.js').Campground[] }} props */
export default function CampgroundList({ campgrounds }) {
  if (campgrounds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-600">
        No campgrounds match your search. Try adjusting your filters.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {campgrounds.map((campground) => (
        <CampgroundCard key={campground.id} campground={campground} />
      ))}
    </div>
  )
}
