import { buildApiRequestHeaders, resolveApiToken } from './apiAuth'

describe('apiAuth', () => {
  const originalRuntime = window.__CAMP_SCOUT_RUNTIME__

  afterEach(() => {
    if (originalRuntime === undefined) {
      delete window.__CAMP_SCOUT_RUNTIME__
    } else {
      window.__CAMP_SCOUT_RUNTIME__ = originalRuntime
    }
  })

  it('prefers the runtime config token', () => {
    window.__CAMP_SCOUT_RUNTIME__ = { apiToken: ' runtime-token ' }

    expect(resolveApiToken()).toBe('runtime-token')
  })

  it('builds Authorization headers when a token is available', () => {
    window.__CAMP_SCOUT_RUNTIME__ = { apiToken: 'runtime-token' }

    expect(buildApiRequestHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer runtime-token',
    })
  })

  it('omits Authorization when no token is configured', () => {
    delete window.__CAMP_SCOUT_RUNTIME__

    expect(buildApiRequestHeaders()).toEqual({
      'Content-Type': 'application/json',
    })
  })
})
