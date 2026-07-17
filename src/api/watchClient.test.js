/** @jest-environment jsdom */
import {
  createWatch,
  listWatches,
  updateContactSettings,
  WatchApiError,
} from './watchClient'

function mockFetchOnce(body, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
}

describe('watchClient', () => {
  afterEach(() => {
    delete window.__CAMP_SCOUT_RUNTIME__
    jest.restoreAllMocks()
  })

  it('lists watches', async () => {
    mockFetchOnce({ watches: [{ id: 'w1', campgroundName: 'Upper Pines' }] })
    const watches = await listWatches()
    expect(watches).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/watches', expect.any(Object))
  })

  it('sends the Bearer token when the runtime token is present', async () => {
    window.__CAMP_SCOUT_RUNTIME__ = { apiToken: 'secret-token' }
    mockFetchOnce({ watch: { id: 'w2' } })
    await createWatch({ recgovUrl: 'x', campgroundName: 'n', startDate: '2026-08-01', endDate: '2026-08-02' })
    const [, init] = global.fetch.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer secret-token')
    expect(init.method).toBe('POST')
  })

  it('throws WatchApiError with the status code on failure', async () => {
    mockFetchOnce({ error: 'Watch not found.' }, false, 404)
    await expect(updateContactSettings({ phone: '+1' })).rejects.toMatchObject({
      name: 'WatchApiError',
      statusCode: 404,
      message: 'Watch not found.',
    })
    expect(WatchApiError).toBeDefined()
  })
})
