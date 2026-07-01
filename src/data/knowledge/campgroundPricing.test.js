import {
  buildVerifiedPricingPromptSection,
  extractFeesFromContent,
  extractCampgroundPricingFromResult,
  hasSufficientPricingForCheapestComparison,
  rankCampgroundsByCampingFee,
  sortResultsForPriceQuestion,
} from './campgroundPricing'

describe('campgroundPricing', () => {
  it('extracts explicit camping site fees from reservation content', () => {
    const fees = extractFeesFromContent(
      'Single site fee is $36. Double site fee is $72. Reservations are handled through Recreation.gov.',
    )

    expect(fees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amountUsd: 36, feeType: 'camping', label: 'single site fee' }),
        expect.objectContaining({ amountUsd: 72, feeType: 'camping', label: 'double site fee' }),
      ]),
    )
  })

  it('extracts day-use fees separately from camping fees', () => {
    const fees = extractFeesFromContent(
      'There is a $10 vehicle day-use fee. For camping reservations and fees, please visit www.reservecalifornia.com.',
    )

    expect(fees).toEqual([
      expect.objectContaining({ amountUsd: 10, feeType: 'day_use', label: 'day-use fee' }),
    ])
    expect(fees.some((fee) => fee.feeType === 'camping')).toBe(false)
  })

  it('ranks campgrounds by lowest verified camping fee', () => {
    const ranked = rankCampgroundsByCampingFee([
      {
        campgroundId: 'ice-house-reservoir',
        campgroundName: 'Ice House Campground',
        documentId: 'ice-house-reservoir-source-2-reservation',
        documentType: 'reservation',
        sourceName: 'U.S. Forest Service',
        sourceUrl: 'https://example.com/ice-house',
        fees: [
          { amountUsd: 36, label: 'single site fee', feeType: 'camping', excerpt: 'Single site fee is $36.' },
          { amountUsd: 72, label: 'double site fee', feeType: 'camping', excerpt: 'Double site fee is $72.' },
        ],
        lowestCampingFeeUsd: 36,
      },
      {
        campgroundId: 'sample-campground',
        campgroundName: 'Sample Campground',
        documentId: 'sample-reservation',
        documentType: 'reservation',
        sourceName: 'California State Parks',
        sourceUrl: 'https://example.com/sample',
        fees: [
          { amountUsd: 45, label: 'single site fee', feeType: 'camping', excerpt: 'Single site fee is $45.' },
        ],
        lowestCampingFeeUsd: 45,
      },
    ])

    expect(ranked).toHaveLength(2)
    expect(ranked[0].campgroundId).toBe('ice-house-reservoir')
    expect(ranked[0].lowestCampingFeeUsd).toBe(36)
    expect(ranked[1].campgroundId).toBe('sample-campground')
  })

  it('requires at least two campgrounds with camping fees for cheapest comparison', () => {
    expect(hasSufficientPricingForCheapestComparison([])).toBe(false)
    expect(hasSufficientPricingForCheapestComparison([
      { campgroundId: 'a', campgroundName: 'A', lowestCampingFeeUsd: 36, feeLabel: 'single site fee', sourceName: 'X', sourceUrl: 'https://x', documentId: 'a' },
    ])).toBe(false)
    expect(hasSufficientPricingForCheapestComparison([
      { campgroundId: 'a', campgroundName: 'A', lowestCampingFeeUsd: 36, feeLabel: 'single site fee', sourceName: 'X', sourceUrl: 'https://x', documentId: 'a' },
      { campgroundId: 'b', campgroundName: 'B', lowestCampingFeeUsd: 45, feeLabel: 'single site fee', sourceName: 'Y', sourceUrl: 'https://y', documentId: 'b' },
    ])).toBe(true)
  })

  it('builds a verified pricing prompt section without invented amounts', () => {
    const section = buildVerifiedPricingPromptSection([
      {
        campgroundId: 'ice-house-reservoir',
        campgroundName: 'Ice House Campground',
        documentId: 'ice-house-reservoir-source-2-reservation',
        documentType: 'reservation',
        sourceName: 'U.S. Forest Service',
        sourceUrl: 'https://example.com/ice-house',
        fees: [
          { amountUsd: 36, label: 'single site fee', feeType: 'camping', excerpt: 'Single site fee is $36.' },
        ],
        lowestCampingFeeUsd: 36,
      },
    ], [
      {
        campgroundId: 'ice-house-reservoir',
        campgroundName: 'Ice House Campground',
        lowestCampingFeeUsd: 36,
        feeLabel: 'single site fee',
        sourceName: 'U.S. Forest Service',
        sourceUrl: 'https://example.com/ice-house',
        documentId: 'ice-house-reservoir-source-2-reservation',
      },
    ])

    expect(section).toContain('Verified pricing extracted from official sources')
    expect(section).toContain('$36.00')
    expect(section).toContain('Ice House Campground')
  })

  it('sorts reservation documents ahead of descriptions for price questions', () => {
    const sorted = sortResultsForPriceQuestion([
      {
        document: {
          id: 'desc-1',
          campgroundId: 'ice-house-reservoir',
          title: 'Ice House Description',
          documentType: 'description',
          content: 'Scenic mountain campground.',
          sourceUrl: 'https://example.com/desc',
          sourceName: 'U.S. Forest Service',
        },
        relevanceScore: 50,
        sourceUrl: 'https://example.com/desc',
        sourceName: 'U.S. Forest Service',
        campgroundName: 'Ice House Campground',
      },
      {
        document: {
          id: 'res-1',
          campgroundId: 'ice-house-reservoir',
          title: 'Ice House Reservation Information',
          documentType: 'reservation',
          content: 'Single site fee is $36.',
          sourceUrl: 'https://example.com/res',
          sourceName: 'U.S. Forest Service',
        },
        relevanceScore: 40,
        sourceUrl: 'https://example.com/res',
        sourceName: 'U.S. Forest Service',
        campgroundName: 'Ice House Campground',
      },
    ])

    expect(sorted[0].document.documentType).toBe('reservation')
    expect(extractCampgroundPricingFromResult(sorted[0]).fees[0].amountUsd).toBe(36)
  })
})
