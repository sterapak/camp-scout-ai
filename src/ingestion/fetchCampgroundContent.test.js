/** @jest-environment node */

import { fetchCampgroundReadableText } from './fetchCampgroundContent.js'
import { getSupplementalSourceUrls } from './ingestionConfig.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { categorizeContent, scoreRulesParagraphPriority } from './categorizeContent.js'

const fixturePath = join(__dirname, '__fixtures__', 'mount-tamalpais-pantoll.html')
const fixtureHtml = readFileSync(fixturePath, 'utf8')

describe('fetchCampgroundReadableText', () => {
  const campground = {
    id: 'yosemite-upper-pines',
    name: 'Upper Pines Campground (Yosemite NP)',
    region: 'Yosemite Valley',
    sourceUrl: 'https://www.nps.gov/yose/planyourvisit/campgrounds.htm',
    reservationUrl: 'https://www.recreation.gov/camping/campgrounds/232449',
    amenities: [],
    rules: [],
    dogPolicy: '',
    notes: '',
    lastVerifiedAt: '2025-06-01',
    tags: [],
  }

  it('merges primary and supplemental official sources', async () => {
    const supplementalUrl = getSupplementalSourceUrls(campground.id)[0]
    const supplementalHtml = `
      <html><body><main>
        <p>All food, toiletries, and scented items must be stored in metal food lockers when not in use.</p>
        <p>Failure to store food properly may result in impoundment of your food and a citation.</p>
      </main></body></html>
    `

    const result = await fetchCampgroundReadableText(campground, {
      fetchImpl: async (url) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => (url === campground.sourceUrl ? fixtureHtml : supplementalHtml),
      }),
    })

    expect(result.ok).toBe(true)
    expect(result.fetchedUrls).toEqual([campground.sourceUrl, supplementalUrl])
    expect(result.readableText).toContain('Pantoll Campground')
    expect(result.readableText).toContain('metal food lockers')
  })

  it('continues when a supplemental source fails', async () => {
    const result = await fetchCampgroundReadableText(campground, {
      fetchImpl: async (url) => {
        if (url === campground.sourceUrl) {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => fixtureHtml,
          }
        }

        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => '',
        }
      },
    })

    expect(result.ok).toBe(true)
    expect(result.failedSupplementalUrls).toHaveLength(1)
    expect(result.readableText).toContain('Pantoll Campground')
  })
})

describe('bear rule prioritization', () => {
  it('ranks bear food storage paragraphs ahead of generic rules', () => {
    const lockerRule = 'All food, toiletries, and scented items must be stored in metal food lockers when not in use.'
    const fireRule = 'Campfires are allowed only in provided fire rings between 5 pm and 10 pm.'

    expect(scoreRulesParagraphPriority(lockerRule)).toBeGreaterThan(
      scoreRulesParagraphPriority(fireRule),
    )

    const categorized = categorizeContent(`${lockerRule}\n\n${fireRule}`)
    expect(categorized.rules[0]).toContain('metal food lockers')
  })
})
