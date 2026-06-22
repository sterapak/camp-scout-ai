import { render, screen } from '@testing-library/react'
import AvailabilityNotice from './AvailabilityNotice'

describe('AvailabilityNotice', () => {
  it('renders full notice by default', () => {
    render(<AvailabilityNotice />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()
  })

  it('renders compact notice when compact prop is set', () => {
    render(<AvailabilityNotice compact />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()
  })
})
