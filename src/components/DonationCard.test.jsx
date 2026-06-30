import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonationCard from './DonationCard'
import { postDonate } from '../api/donateClient'

jest.mock('../api/donateClient', () => ({
  postDonate: jest.fn(),
}))

describe('DonationCard', () => {
  beforeEach(() => {
    postDonate.mockReset()
  })

  it('renders heading and donation options', () => {
    render(<DonationCard />)

    expect(screen.getByRole('heading', { name: /Support CampScout.ai/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '$25' })).toBeInTheDocument()
  })

  it('starts checkout when a donation button is clicked', async () => {
    postDonate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
    const user = userEvent.setup()

    render(<DonationCard />)
    await user.click(screen.getByRole('button', { name: '$10' }))

    await waitFor(() => {
      expect(postDonate).toHaveBeenCalledWith(10)
    })
  })

  it('shows an error when checkout fails', async () => {
    postDonate.mockRejectedValue(new Error('Donations are not configured yet.'))
    const user = userEvent.setup()

    render(<DonationCard />)
    await user.click(screen.getByRole('button', { name: '$5' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Donations are not configured yet.',
    )
  })
})
