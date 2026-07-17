import React, { useEffect, useState } from 'react'
import { FiImage } from 'react-icons/fi'
import { getPrimaryImage } from '../data/campgroundData'
import { isApiAvailable } from '../api/apiAuth'
import { parseRecGovCampgroundId } from '../utils/recgov'
import { fetchCampgroundPhoto } from '../api/campgroundMediaClient'

/**
 * Compact card thumbnail. Prefers a curated image; otherwise resolves the
 * official Recreation.gov photo (RIDB) for Recreation.gov campgrounds. Falls
 * back to a clean placeholder tile. Full attribution lives on the detail page
 * this card links to.
 *
 * @param {{ campground: import('../data/campgroundSchema.js').Campground }} props
 */
export default function CampgroundThumbnail({ campground }) {
  const curated = getPrimaryImage(campground)
  const [photo, setPhoto] = useState(curated)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
    setPhoto(curated)
    if (curated) return undefined

    const facilityId = parseRecGovCampgroundId(campground.reservationUrl)
    if (!facilityId || !isApiAvailable()) return undefined

    let cancelled = false
    fetchCampgroundPhoto(facilityId).then((resolved) => {
      if (!cancelled && resolved) setPhoto(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [campground.id, campground.reservationUrl, curated])

  if (!photo || errored) {
    return (
      <div
        className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100 dark:bg-gray-800"
        aria-hidden="true"
      >
        <FiImage className="text-gray-300 dark:text-gray-600" size={28} />
      </div>
    )
  }

  return (
    <img
      src={photo.url}
      alt={photo.altText}
      title={photo.sourceName ? `Photo: ${photo.sourceName}` : undefined}
      loading="lazy"
      className="aspect-[16/9] w-full object-cover"
      onError={() => setErrored(true)}
    />
  )
}
