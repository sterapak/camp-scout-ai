import { DONATION_ACK_SESSION_KEY, hasDonationAcknowledgment, markDonationAcknowledged } from './donationAcknowledgment'

describe('donationAcknowledgment', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('marks and reads donation acknowledgment from session storage', () => {
    expect(hasDonationAcknowledgment()).toBe(false)

    markDonationAcknowledged()

    expect(window.sessionStorage.getItem(DONATION_ACK_SESSION_KEY)).toBe('1')
    expect(hasDonationAcknowledgment()).toBe(true)
  })
})
