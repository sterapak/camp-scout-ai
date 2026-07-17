import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import WatchesPage from './WatchesPage'
import * as watchClient from '../api/watchClient'

jest.mock('../api/watchClient')
jest.mock('../components/WatchCreateForm', () => function MockForm() {
  return <div>create-form</div>
})

function setToken(token) {
  if (token) window.__CAMP_SCOUT_RUNTIME__ = { apiToken: token }
  else delete window.__CAMP_SCOUT_RUNTIME__
}

describe('WatchesPage', () => {
  afterEach(() => {
    setToken(null)
    jest.clearAllMocks()
  })

  it('hides the feature and shows a notice when no API is available (static build)', () => {
    setToken(null)
    render(<MemoryRouter><WatchesPage /></MemoryRouter>)
    expect(screen.getByText(/only available on the hosted app/i)).toBeInTheDocument()
    expect(watchClient.listWatches).not.toHaveBeenCalled()
  })

  it('loads and lists watches + alerts when the API is available', async () => {
    setToken('tok')
    watchClient.listWatches.mockResolvedValue([
      {
        id: 'w1',
        platform: 'recgov',
        facilityId: '232447',
        campgroundName: 'Upper Pines',
        startDate: '2026-11-15',
        endDate: '2026-11-22',
        minNights: 1,
        status: 'active',
        lastPolledAt: null,
        lastPollStatus: null,
        createdAt: '2026-07-17T00:00:00Z',
      },
    ])
    watchClient.listAlerts.mockResolvedValue([])

    render(<MemoryRouter><WatchesPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Upper Pines')).toBeInTheDocument())
    expect(screen.getByText(/2026-11-15/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()

    // The create form is not shown until a campground is picked — the page now
    // drives watch creation off the app's own campground list, not free text.
    expect(screen.queryByText('create-form')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Campground'), { target: { value: '__other__' } })
    expect(screen.getByText('create-form')).toBeInTheDocument()
  })
})
