import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiExternalLink, FiMapPin } from 'react-icons/fi'
import { postSummary, SummaryApiError } from '../api/summaryClient.js'
import AvailabilityNotice from '../components/AvailabilityNotice'
import CampgroundAiSummary from '../components/CampgroundAiSummary'
import CampgroundImage from '../components/CampgroundImage'
import { getCampgroundById, getPrimaryImage } from '../data/campgroundData'
import { getKnowledgeCampgroundIds } from '../data/knowledge/documents.js'

export default function CampgroundDetailPage() {
  const { id } = useParams()
  const campground = getCampgroundById(id)
  const hasKnowledge = getKnowledgeCampgroundIds().includes(id ?? '')
  const [summaryState, setSummaryState] = useState({ status: hasKnowledge ? 'loading' : 'idle' })

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
        <p className="text-gray-600">Campground not found.</p>
      </div>
    )
  }

  const primaryImage = getPrimaryImage(campground)

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
        sections={summaryState.sections}
        citations={summaryState.citations}
        sources={summaryState.sources}
        confidence={summaryState.confidence}
        generatedAt={summaryState.generatedAt}
        knowledgeSnapshot={summaryState.knowledgeSnapshot}
        message={summaryState.message}
        errorMessage={summaryState.errorMessage}
        imageSlot={
          hasKnowledge ? (
            <CampgroundImage image={primaryImage} campgroundName={campground.name} />
          ) : undefined
        }
      />

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">About</h3>
        <p className="text-gray-700">{campground.notes}</p>
        <p className="text-xs text-gray-500">
          Last verified: {campground.lastVerifiedAt}
        </p>
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

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Amenities</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {campground.amenities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Rules</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {campground.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Dog Policy</h3>
        <p className="text-gray-700">{campground.dogPolicy}</p>
      </section>

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
    </div>
  )
}
