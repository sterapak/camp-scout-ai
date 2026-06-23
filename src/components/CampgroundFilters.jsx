import React from 'react'
import { FiSearch, FiX } from 'react-icons/fi'

/**
 * @param {{
 *   query: string
 *   selectedRegions: string[]
 *   selectedAmenities: string[]
 *   selectedTags: string[]
 *   regions: string[]
 *   amenityOptions: string[]
 *   tags: string[]
 *   onQueryChange: (value: string) => void
 *   onRegionsChange: (value: string[]) => void
 *   onAmenitiesChange: (value: string[]) => void
 *   onTagsChange: (value: string[]) => void
 * }} props
 */
export default function CampgroundFilters({
  query,
  selectedRegions,
  selectedAmenities,
  selectedTags,
  regions,
  amenityOptions,
  tags,
  onQueryChange,
  onRegionsChange,
  onAmenitiesChange,
  onTagsChange,
}) {
  function toggleRegion(region) {
    if (selectedRegions.includes(region)) {
      onRegionsChange(selectedRegions.filter((value) => value !== region))
    } else {
      onRegionsChange([...selectedRegions, region])
    }
  }

  function toggleAmenity(amenity) {
    if (selectedAmenities.includes(amenity)) {
      onAmenitiesChange(selectedAmenities.filter((value) => value !== amenity))
    } else {
      onAmenitiesChange([...selectedAmenities, amenity])
    }
  }

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((value) => value !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  function removeRegion(region) {
    onRegionsChange(selectedRegions.filter((value) => value !== region))
  }

  function removeTag(tag) {
    onTagsChange(selectedTags.filter((value) => value !== tag))
  }

  const chipClass =
    'inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800'

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
        <fieldset className="block">
          <legend className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Region
          </legend>
          <div
            className="max-h-36 overflow-y-auto rounded-lg border border-gray-300 bg-white px-3 py-2 space-y-1.5"
            aria-label="Filter by region"
          >
            {regions.map((region) => (
              <label
                key={region}
                className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(region)}
                  onChange={() => toggleRegion(region)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                />
                <span>{region}</span>
              </label>
            ))}
          </div>
          {selectedRegions.length > 0 && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected regions">
                {selectedRegions.map((region) => (
                  <span key={region} className={chipClass}>
                    {region}
                    <button
                      type="button"
                      onClick={() => removeRegion(region)}
                      className="rounded-full p-0.5 hover:bg-green-100"
                      aria-label={`Remove ${region}`}
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRegionsChange([])}
                className="mt-1 text-xs text-green-700 hover:underline"
              >
                Clear regions ({selectedRegions.length})
              </button>
            </>
          )}
        </fieldset>

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
            <button
              type="button"
              onClick={() => onAmenitiesChange([])}
              className="mt-1 text-xs text-green-700 hover:underline"
            >
              Clear amenities ({selectedAmenities.length})
            </button>
          )}
        </fieldset>

        <fieldset className="block">
          <legend className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Tag
          </legend>
          <div
            className="max-h-36 overflow-y-auto rounded-lg border border-gray-300 bg-white px-3 py-2 space-y-1.5"
            aria-label="Filter by tag"
          >
            {tags.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected tags">
                {selectedTags.map((tag) => (
                  <span key={tag} className={chipClass}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full p-0.5 hover:bg-green-100"
                      aria-label={`Remove ${tag}`}
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onTagsChange([])}
                className="mt-1 text-xs text-green-700 hover:underline"
              >
                Clear tags ({selectedTags.length})
              </button>
            </>
          )}
        </fieldset>
      </div>
    </div>
  )
}
