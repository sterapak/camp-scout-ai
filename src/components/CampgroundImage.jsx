import React, { useState } from 'react'
import { FiExternalLink, FiImage, FiMapPin } from 'react-icons/fi'

/**
 * Displays a campground hero image with source attribution, or a clean placeholder.
 * When there's no image but the campground has a known operator brand, shows a
 * branded banner (e.g. "EID Parks") so the empty state reads as intentional.
 * @param {{
 *   image?: import('../data/campgroundSchema.js').CampgroundImage | null
 *   campgroundName: string
 *   brand?: { label: string, domain: string } | null
 *   className?: string
 *   onLoadError?: () => void
 * }} props
 */
export default function CampgroundImage({ image, campgroundName, brand = null, className = '', onLoadError }) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    if (brand) {
      return (
        <div
          className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-green-700 to-green-900 text-center text-white ${className}`}
          aria-label={`${brand.label} — no official photo available for ${campgroundName}`}
        >
          <FiMapPin size={28} className="opacity-80" aria-hidden="true" />
          <span className="text-sm font-semibold">{brand.label}</span>
          <span className="text-xs opacity-70">{brand.domain}</span>
        </div>
      )
    }
    return (
      <div
        className={`flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 ${className}`}
        aria-label={`No official image available for ${campgroundName}`}
      >
        <div className="flex flex-col items-center gap-2 px-4 text-center text-gray-500">
          <FiImage size={28} aria-hidden="true" />
          <p className="text-sm">Official image not available</p>
        </div>
      </div>
    )
  }

  const imageElement = (
    <img
      src={image.url}
      alt={image.altText}
      className="aspect-[4/3] w-full rounded-xl object-cover"
      onError={() => {
        setHasError(true)
        // Tell the parent so it can fall back to an official Recreation.gov photo.
        // Curated image URLs rot: as of 2026-07-19, five of nine 404'd or 403'd.
        // Without this the page shows "Official image not available" even though a
        // live official photo is one lookup away — the fallback previously fired
        // only when a curated image was ABSENT, never when one existed but broke.
        onLoadError?.()
      }}
    />
  )

  return (
    <figure className={`space-y-2 ${className}`}>
      {image.sourceUrl ? (
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
          aria-label={`View official source for ${campgroundName} image on ${image.sourceName}`}
        >
          {imageElement}
        </a>
      ) : (
        imageElement
      )}

      <figcaption className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{image.sourceName}</span>
        {image.sourceUrl && (
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-green-700 hover:text-green-900"
          >
            Source
            <FiExternalLink className="ml-1" size={12} />
          </a>
        )}
      </figcaption>
    </figure>
  )
}
