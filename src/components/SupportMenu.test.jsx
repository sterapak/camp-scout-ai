import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SupportMenu from './SupportMenu'
import { postDonate } from '../api/donateClient'

jest.mock('../api/donateClient', () => ({
  postDonate: jest.fn(),
}))

describe('SupportMenu', () => {
  beforeEach(() => {
    postDonate.mockReset()
  })

  it('renders the support trigger button', () => {
    render(<SupportMenu />)

    expect(screen.getByRole('button', { name: /Support/i })).toBeInTheDocument()
  })

  it('opens the donation menu when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<SupportMenu />)

    await user.click(screen.getByRole('button', { name: /Support/i }))

    expect(screen.getByRole('menu', { name: 'Support CampScout.ai' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Buy me a coffee/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Support the project/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Help CampScout.ai grow/i })).toBeInTheDocument()
  })

  it('starts checkout when a donation option is selected', async () => {
    postDonate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
    const user = userEvent.setup()

    render(<SupportMenu />)
    await user.click(screen.getByRole('button', { name: /Support/i }))
    await user.click(screen.getByRole('menuitem', { name: /\$10 — Support the project/i }))

    await waitFor(() => {
      expect(postDonate).toHaveBeenCalledWith(10)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<SupportMenu />)

    await user.click(screen.getByRole('button', { name: /Support/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows an error when checkout fails', async () => {
    postDonate.mockRejectedValue(new Error('Donations are not configured yet.'))
    const user = userEvent.setup()

    render(<SupportMenu />)
    await user.click(screen.getByRole('button', { name: /Support/i }))
    await user.click(screen.getByRole('menuitem', { name: /\$5 — Buy me a coffee/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Donations are not configured yet.',
    )
  })
})
