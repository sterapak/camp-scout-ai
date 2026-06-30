import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders the current theme label', () => {
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: /Light Theme/i })).toBeInTheDocument()
  })

  it('toggles between light and dark themes', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /Light Theme/i }))

    expect(screen.getByRole('button', { name: /Dark Theme/i })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
