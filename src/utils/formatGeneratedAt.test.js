import { formatGeneratedAt, formatKnowledgeSnapshotDate } from './formatGeneratedAt'

describe('formatGeneratedAt', () => {
  it('formats ISO timestamps in a user-friendly local style', () => {
    const formatted = formatGeneratedAt('2026-06-27T15:30:00.000Z', {
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
    })

    expect(formatted).toMatch(/June 27, 2026/)
    expect(formatted).toMatch(/8:30/)
  })

  it('formats knowledge snapshot dates without time', () => {
    const formatted = formatKnowledgeSnapshotDate('2026-06-25T17:52:19.161Z', {
      locale: 'en-US',
      timeZone: 'UTC',
    })

    expect(formatted).toMatch(/Jun 25, 2026/)
  })
})
