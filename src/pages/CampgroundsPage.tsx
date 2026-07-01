import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AvailabilityNotice from '../components/AvailabilityNotice'
import DonationCard from '../components/DonationCard'
import CampgroundFilters from '../components/CampgroundFilters'
import CampgroundList from '../components/CampgroundList'
import {
  getAllAmenities,
  getAllRegions,
  getAllTags,
  searchCampgrounds,
} from '../data/campgroundData'

/** @param {URLSearchParams} searchParams @param {string} key */
function readMultiParam(searchParams, key) {
  return searchParams.getAll(key).filter(Boolean)
}

export default function CampgroundsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [selectedRegions, setSelectedRegions] = useState(() => readMultiParam(searchParams, 'region'))
  const [selectedAmenities, setSelectedAmenities] = useState(() =>
    readMultiParam(searchParams, 'amenity')
  )
  const [selectedTags, setSelectedTags] = useState(() => readMultiParam(searchParams, 'tag'))

  const regions = useMemo(() => getAllRegions(), [])
  const amenityOptions = useMemo(() => getAllAmenities(), [])
  const tags = useMemo(() => getAllTags(), [])

  useEffect(() => {
    const params = new URLSearchParams()
    selectedRegions.forEach((region) => params.append('region', region))
    selectedAmenities.forEach((amenity) => params.append('amenity', amenity))
    selectedTags.forEach((tag) => params.append('tag', tag))

    const next = params.toString()
    const current = searchParams.toString()
    if (next !== current) {
      setSearchParams(params, { replace: true })
    }
  }, [selectedRegions, selectedAmenities, selectedTags, searchParams, setSearchParams])

  const results = useMemo(
    () =>
      searchCampgrounds({
        query,
        regions: selectedRegions,
        amenities: selectedAmenities,
        tags: selectedTags,
      }),
    [query, selectedRegions, selectedAmenities, selectedTags]
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
        selectedRegions={selectedRegions}
        selectedAmenities={selectedAmenities}
        selectedTags={selectedTags}
        regions={regions}
        amenityOptions={amenityOptions}
        tags={tags}
        onQueryChange={setQuery}
        onRegionsChange={setSelectedRegions}
        onAmenitiesChange={setSelectedAmenities}
        onTagsChange={setSelectedTags}
      />

      <p className="text-sm text-gray-500">
        Showing {results.length} campground{results.length !== 1 ? 's' : ''}
      </p>

      <CampgroundList campgrounds={results} />

      <DonationCard />
    </div>
  )
}
