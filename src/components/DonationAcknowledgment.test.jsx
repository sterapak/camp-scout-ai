import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import DonationAcknowledgment from './DonationAcknowledgment'
import { markDonationAcknowledged } from '../utils/donationAcknowledgment'

describe('DonationAcknowledgment', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  function renderWithRoute(pathname) {
    return render(
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route path="*" element={<DonationAcknowledgment />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('does not render before a successful donation', () => {
    renderWithRoute('/campgrounds')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders after a successful donation for the browser session', () => {
    markDonationAcknowledged()
    renderWithRoute('/campgrounds')

    expect(screen.getByRole('status')).toHaveTextContent('Thanks for supporting CampScout.ai!')
  })

  it('remains visible when navigating after a successful donation', async () => {
    markDonationAcknowledged()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/donation-success']}>
        <Routes>
          <Route
            path="/donation-success"
            element={
              <>
                <DonationAcknowledgment />
                <Link to="/campgrounds">Back to campgrounds</Link>
              </>
            }
          />
          <Route path="/campgrounds" element={<DonationAcknowledgment />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to campgrounds' }))

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
