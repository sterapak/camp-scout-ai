/** @jest-environment node */

import { validateCitationCoverage } from './citationValidation.js'

describe('citationValidation', () => {
  it('reports full coverage when factual sentences include organization references', () => {
    const report = validateCitationCoverage(
      'According to the National Park Service, dogs are allowed on leash. ' +
        'The U.S. Forest Service requires food storage in lockers.'
    )

    expect(report.factualSentenceCount).toBe(2)
    expect(report.citedSentenceCount).toBe(2)
    expect(report.coverageRatio).toBe(1)
    expect(report.warnings).toEqual([])
  })

  it('warns when factual sentences lack citations', () => {
    const report = validateCitationCoverage(
      'Dogs are allowed on leash. Quiet hours begin at 10 PM.'
    )

    expect(report.warnings.length).toBeGreaterThan(0)
    expect(report.coverageRatio).toBeLessThan(1)
  })
})
