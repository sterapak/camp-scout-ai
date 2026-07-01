import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SupportPage from './SupportPage'

jest.mock('../components/DonationCard', () => {
  return function MockDonationCard() {
    return <div>Donation card</div>
  }
})

describe('SupportPage', () => {
  it('renders the support heading and donation card', () => {
    render(
      <MemoryRouter>
        <SupportPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument()
    expect(screen.getByText('Donation card')).toBeInTheDocument()
  })
})
