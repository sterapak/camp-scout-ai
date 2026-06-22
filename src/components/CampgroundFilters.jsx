import React from 'react'
import { FiSearch } from 'react-icons/fi'

/**
 * @param {{
 *   query: string
 *   region: string
 *   amenity: string
 *   tag: string
 *   regions: string[]
 *   amenities: string[]
 *   tags: string[]
 *   onQueryChange: (value: string) => void
 *   onRegionChange: (value: string) => void
 *   onAmenityChange: (value: string) => void
 *   onTagChange: (value: string) => void
 * }} props
 */
export default function CampgroundFilters({
  query,
  region,
  amenity,
  tag,
  regions,
  amenities,
  tags,
  onQueryChange,
  onRegionChange,
  onAmenityChange,
  onTagChange,
}) {
  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

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

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Amenity
          </span>
          <select
            value={amenity}
            onChange={(e) => onAmenityChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by amenity"
          >
            <option value="">All amenities</option>
            {amenities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

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
