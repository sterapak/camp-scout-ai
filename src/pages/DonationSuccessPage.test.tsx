import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DonationSuccessPage from './DonationSuccessPage'
import { hasDonationAcknowledgment } from '../utils/donationAcknowledgment'

describe('DonationSuccessPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('marks the donation acknowledgment for the browser session', () => {
    render(
      <MemoryRouter>
        <DonationSuccessPage />
      </MemoryRouter>,
    )

    expect(hasDonationAcknowledgment()).toBe(true)
    expect(screen.getByRole('heading', { name: /Thank you for your support/i })).toBeInTheDocument()
  })
})
