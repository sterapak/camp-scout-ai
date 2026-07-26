import React, { useEffect, useRef, useState } from 'react'
import { FiImage, FiMapPin } from 'react-icons/fi'
import { getPrimaryImage, getBrandPlaceholder } from '../data/campgroundData'
import { isApiAvailable } from '../api/apiAuth'
import { parseRecGovCampgroundId } from '../utils/recgov'
import { fetchCampgroundPhoto } from '../api/campgroundMediaClient'

/**
 * Compact card thumbnail. Prefers a curated image; otherwise resolves the
 * official Recreation.gov photo (RIDB) for Recreation.gov campgrounds — but only
 * once the card scrolls near the viewport, so a long list (300+) doesn't fire
 * hundreds of photo lookups at once. Falls back to a clean placeholder tile.
 * Full attribution lives on the detail page this card links to.
 *
 * @param {{ campground: import('../data/campgroundSchema.js').Campground }} props
 */
export default function CampgroundThumbnail({ campground }) {
  const curated = getPrimaryImage(campground)
  const [photo, setPhoto] = useState(curated)
  const [errored, setErrored] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  // Reset when the card is reused for a different campground.
  useEffect(() => {
    setPhoto(getPrimaryImage(campground))
    setErrored(false)
    // eslint-disable-line
  }, [campground.id])

  // Defer the photo fetch until the card is near the viewport.
  useEffect(() => {
    if (curated) return undefined
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '250px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [curated, campground.id])

  useEffect(() => {
    if (curated || !visible) return undefined
    const facilityId = parseRecGovCampgroundId(campground.reservationUrl)
    if (!facilityId || !isApiAvailable()) return undefined

    let cancelled = false
    fetchCampgroundPhoto(facilityId).then((resolved) => {
      if (!cancelled && resolved) setPhoto(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [visible, curated, campground.reservationUrl])

  // Operator campgrounds (state parks, EID, …) have no Rec.gov photo source —
  // show a branded banner so the empty state reads as intentional, not broken.
  const brand = getBrandPlaceholder(campground)

  return (
    <div ref={ref}>
      {!photo || errored ? (
        brand ? (
          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-green-700 to-green-900 text-center text-white">
            <FiMapPin size={22} className="opacity-80" />
            <span className="text-sm font-semibold">{brand.label}</span>
            <span className="text-xs opacity-70">{brand.domain}</span>
          </div>
        ) : (
          <div
            className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100 dark:bg-gray-800"
            aria-hidden="true"
          >
            <FiImage className="text-gray-300 dark:text-gray-600" size={28} />
          </div>
        )
      ) : (
        <img
          src={photo.url}
          alt={photo.altText}
          title={photo.sourceName ? `Photo: ${photo.sourceName}` : undefined}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
