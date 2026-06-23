import React from 'react'
import { FiSearch } from 'react-icons/fi'

/**
 * @param {{
 *   query: string
 *   region: string
 *   selectedAmenities: string[]
 *   tag: string
 *   regions: string[]
 *   amenityOptions: string[]
 *   tags: string[]
 *   onQueryChange: (value: string) => void
 *   onRegionChange: (value: string) => void
 *   onAmenitiesChange: (value: string[]) => void
 *   onTagChange: (value: string) => void
 * }} props
 */
export default function CampgroundFilters({
  query,
  region,
  selectedAmenities,
  tag,
  regions,
  amenityOptions,
  tags,
  onQueryChange,
  onRegionChange,
  onAmenitiesChange,
  onTagChange,
}) {
  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

  function removeAmenity(amenity) {
    onAmenitiesChange(selectedAmenities.filter((value) => value !== amenity))
  }

  function toggleAmenity(amenity) {
    if (selectedAmenities.includes(amenity)) {
      removeAmenity(amenity)
    } else {
      onAmenitiesChange([...selectedAmenities, amenity])
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search by name, region, amenity, or tag…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          aria-label="Search campgrounds"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Region
          </span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by region"
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="block">
          <legend className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Amenities
          </legend>
          <div
            className="max-h-36 overflow-y-auto rounded-lg border border-gray-300 bg-white px-3 py-2 space-y-1.5"
            aria-label="Filter by amenities"
          >
            {amenityOptions.map((amenity) => (
              <label
                key={amenity}
                className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                />
                <span>{amenity}</span>
              </label>
            ))}
          </div>
          {selectedAmenities.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div
                className="flex flex-wrap gap-1.5"
                aria-label="Selected amenities"
              >
                {selectedAmenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 rounded-full bg-green-50 pl-2 pr-1 py-0.5 text-xs font-medium text-green-800"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="rounded-full p-0.5 text-green-700 hover:bg-green-100 hover:text-green-900"
                      aria-label={`Remove ${amenity}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onAmenitiesChange([])}
                className="text-xs text-green-700 hover:underline"
              >
                Clear amenities ({selectedAmenities.length})
              </button>
            </div>
          )}
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Tag
          </span>
          <select
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
