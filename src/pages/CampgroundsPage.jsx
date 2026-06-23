import React, { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AvailabilityNotice from '../components/AvailabilityNotice'
import CampgroundFilters from '../components/CampgroundFilters'
import CampgroundList from '../components/CampgroundList'
import {
  getAllAmenities,
  getAllRegions,
  getAllTags,
  searchCampgrounds,
} from '../data/campgroundData'

export default function CampgroundsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [tag, setTag] = useState('')

  const regions = useMemo(() => getAllRegions(), [])
  const amenityOptions = useMemo(() => getAllAmenities(), [])
  const tags = useMemo(() => getAllTags(), [])

  const selectedAmenities = useMemo(
    () => searchParams.getAll('amenity').filter((amenity) => amenityOptions.includes(amenity)),
    [searchParams, amenityOptions]
  )

  const setSelectedAmenities = useCallback(
    (amenities) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('amenity')
          amenities.forEach((amenity) => next.append('amenity', amenity))
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const results = useMemo(
    () => searchCampgrounds({ query, region, amenities: selectedAmenities, tag }),
    [query, region, selectedAmenities, tag]
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Browse Campgrounds</h2>
        <p className="mt-1 text-sm text-gray-600">
          Real Northern California campgrounds from official park sources.
        </p>
      </div>

      <AvailabilityNotice />

      <CampgroundFilters
        query={query}
        region={region}
        selectedAmenities={selectedAmenities}
        tag={tag}
        regions={regions}
        amenityOptions={amenityOptions}
        tags={tags}
        onQueryChange={setQuery}
        onRegionChange={setRegion}
        onAmenitiesChange={setSelectedAmenities}
        onTagChange={setTag}
      />

      <p className="text-sm text-gray-500">
        Showing {results.length} campground{results.length !== 1 ? 's' : ''}
      </p>

      <CampgroundList campgrounds={results} />
    </div>
  )
}
