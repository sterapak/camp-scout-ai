import React, { useState } from 'react'
import { FiExternalLink, FiImage } from 'react-icons/fi'

/**
 * Displays a campground hero image with source attribution, or a clean placeholder.
 * @param {{
 *   image?: import('../data/campgroundSchema.js').CampgroundImage | null
 *   campgroundName: string
 *   className?: string
 * }} props
 */
export default function CampgroundImage({ image, campgroundName, className = '' }) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
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
      onError={() => setHasError(true)}
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
