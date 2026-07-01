import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from './AppShell'

jest.mock('./SupportMenu', () => {
  return function MockSupportMenu() {
    return <button type="button">Support</button>
  }
})

describe('AppShell', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      </MemoryRouter>,
    )
  })

  it('renders header controls for theme, support, and settings', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    const headerControls = screen.getByRole('navigation', { name: 'Application controls' })
    expect(headerControls).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Light Theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Support' })).toBeInTheDocument()
    expect(headerControls).toHaveTextContent('Settings')
  })

  it('links to settings from the header controls', () => {
    render(
      <MemoryRouter initialEntries={['/campgrounds']}>
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      </MemoryRouter>,
    )

    const headerControls = screen.getByRole('navigation', { name: 'Application controls' })
    expect(headerControls.querySelector('a[href="/settings"]')).toBeInTheDocument()
  })
})
