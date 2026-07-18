import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiExternalLink, FiMapPin } from 'react-icons/fi'
import { postSummary, SummaryApiError } from '../api/summaryClient.js'
import { isApiAvailable } from '../api/apiAuth.js'
import { isWatchable, parseRecGovCampgroundId } from '../utils/recgov.js'
import { fetchCampgroundPhoto, type CampgroundPhoto } from '../api/campgroundMediaClient.js'
import WatchCreateForm from '../components/WatchCreateForm.js'
import AvailabilityNotice from '../components/AvailabilityNotice'
import CampgroundAiSummary from '../components/CampgroundAiSummary'
import CampgroundImage from '../components/CampgroundImage'
import { getCampgroundById, getPrimaryImage } from '../data/campgroundData'
import { loadImportedCampgrounds, type DisplayCampground } from '../data/mergedCampgrounds'
import { getKnowledgeCampgroundIds } from '../data/knowledge/documents.js'

import type { Citation, UniqueSourceReference, AnswerConfidenceLevel, SummarySectionContent } from '../shared/types/api.js'
import type { KnowledgeSnapshot } from '../server/rag/knowledgeSnapshot.js'

type SummaryPageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; sections: SummarySectionContent; citations: Citation[]; sources: UniqueSourceReference[]; confidence: AnswerConfidenceLevel; generatedAt?: string; knowledgeSnapshot?: KnowledgeSnapshot }
  | { status: 'insufficient_context'; message: string }
  | { status: 'error'; errorMessage: string }

export default function CampgroundDetailPage() {
  const { id } = useParams()
  const staticCampground = getCampgroundById(id)
  const [importedCampground, setImportedCampground] = useState<DisplayCampground | null>(null)
  const [resolving, setResolving] = useState(!staticCampground)
  const campground = staticCampground ?? importedCampground
  const hasKnowledge = getKnowledgeCampgroundIds().includes(id ?? '')

  // Fall back to the Recreation.gov-imported set for campgrounds not curated.
  useEffect(() => {
    if (staticCampground) {
      setResolving(false)
      return undefined
    }
    let cancelled = false
    setResolving(true)
    loadImportedCampgrounds().then((list) => {
      if (cancelled) return
      setImportedCampground(list.find((c) => c.id === id) ?? null)
      setResolving(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, staticCampground])
  const [summaryState, setSummaryState] = useState<SummaryPageState>(
    { status: hasKnowledge ? 'loading' : 'idle' },
  )
  const [showWatch, setShowWatch] = useState(false)
  const [watchCreated, setWatchCreated] = useState(false)
  const [officialPhoto, setOfficialPhoto] = useState<CampgroundPhoto | null>(null)

  // When there's no curated image, try the official Recreation.gov photo (RIDB).
  // Only recreation.gov campgrounds have a facility id to resolve.
  useEffect(() => {
    setOfficialPhoto(null)
    if (!campground || getPrimaryImage(campground)) return undefined
    const facilityId = parseRecGovCampgroundId(campground.reservationUrl)
    if (!facilityId || !isApiAvailable()) return undefined

    let cancelled = false
    fetchCampgroundPhoto(facilityId).then((photo) => {
      if (!cancelled) setOfficialPhoto(photo)
    })
    return () => {
      cancelled = true
    }
  }, [campground])

  useEffect(() => {
    if (!campground || !hasKnowledge) {
      return undefined
    }

    let cancelled = false

    async function loadSummary() {
      setSummaryState({ status: 'loading' })

      try {
        const result = await postSummary({ campgroundId: campground.id })

        if (cancelled) {
          return
        }

        if (result.status === 'insufficient_context') {
          setSummaryState({
            status: 'insufficient_context',
            message: result.message,
          })
          return
        }

        setSummaryState({
          status: 'success',
          sections: result.sections,
          citations: result.citations,
          sources: result.sources,
          confidence: result.confidence,
          generatedAt: result.generatedAt,
          knowledgeSnapshot: result.knowledgeSnapshot,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        const errorMessage =
          error instanceof SummaryApiError
            ? error.message
            : 'Summary generation failed. Please try again.'
        setSummaryState({ status: 'error', errorMessage })
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [campground, hasKnowledge])

  if (!campground) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/campgrounds" className="inline-flex items-center text-sm text-green-700 hover:text-green-900">
          <FiArrowLeft className="mr-1" />
          Back to campgrounds
        </Link>
        <p className="text-gray-600">{resolving ? 'Loading…' : 'Campground not found.'}</p>
      </div>
    )
  }

  const primaryImage = getPrimaryImage(campground) ?? officialPhoto

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/campgrounds" className="inline-flex items-center text-sm text-green-700 hover:text-green-900">
        <FiArrowLeft className="mr-1" />
        Back to campgrounds
      </Link>

      <header className="space-y-2">
        <h2 className="text-3xl font-semibold text-gray-900">{campground.name}</h2>
        <p className="inline-flex items-center text-gray-600">
          <FiMapPin className="mr-1" />
          {campground.region}
        </p>
      </header>

      <AvailabilityNotice />

      {!hasKnowledge && (
        <CampgroundImage image={primaryImage} campgroundName={campground.name} />
      )}

      <CampgroundAiSummary
        status={summaryState.status}
        sections={'sections' in summaryState ? summaryState.sections : undefined}
        citations={'citations' in summaryState ? summaryState.citations : undefined}
        sources={'sources' in summaryState ? summaryState.sources : undefined}
        confidence={'confidence' in summaryState ? summaryState.confidence : undefined}
        generatedAt={'generatedAt' in summaryState ? summaryState.generatedAt : undefined}
        knowledgeSnapshot={'knowledgeSnapshot' in summaryState ? summaryState.knowledgeSnapshot : undefined}
        message={'message' in summaryState ? summaryState.message : undefined}
        errorMessage={'errorMessage' in summaryState ? summaryState.errorMessage : undefined}
        imageSlot={
          hasKnowledge ? (
            <CampgroundImage image={primaryImage} campgroundName={campground.name} />
          ) : undefined
        }
      />

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">About</h3>
        <p className="text-gray-700">
          {campground.notes || 'Recreation.gov campground. See the official page for full details.'}
        </p>
        {campground.lastVerifiedAt && (
          <p className="text-xs text-gray-500">Last verified: {campground.lastVerifiedAt}</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Official Sources</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={campground.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            View official info
            <FiExternalLink size={14} />
          </a>
          <a
            href={campground.reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Reservation portal
            <FiExternalLink size={14} />
          </a>
        </div>
      </section>

      {isApiAvailable() && isWatchable(campground.reservationUrl) && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Watch for cancellations</h3>
          {watchCreated ? (
            <p className="text-sm text-green-700">
              Watch created — you&apos;ll get an SMS if a spot frees up.{' '}
              <Link to="/watches" className="underline">Manage watches</Link>
            </p>
          ) : showWatch ? (
            <WatchCreateForm
              prefillName={campground.name}
              prefillUrl={campground.reservationUrl}
              onCreated={() => {
                setWatchCreated(true)
                setShowWatch(false)
              }}
            />
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Fully booked? Get an SMS the moment someone cancels.
              </p>
              <button
                onClick={() => setShowWatch(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                🔔 Watch this campground
              </button>
            </>
          )}
        </section>
      )}

      {campground.amenities.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Amenities</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {campground.amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {campground.rules.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Rules</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {campground.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      )}

      {campground.dogPolicy && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Dog Policy</h3>
          <p className="text-gray-700">{campground.dogPolicy}</p>
        </section>
      )}

      {campground.tags.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {campground.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
