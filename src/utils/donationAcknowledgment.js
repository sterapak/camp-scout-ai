export const DONATION_ACK_SESSION_KEY = 'camp-scout-donation-thanks'

export function markDonationAcknowledged() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(DONATION_ACK_SESSION_KEY, '1')
}

export function hasDonationAcknowledgment() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.sessionStorage.getItem(DONATION_ACK_SESSION_KEY) === '1'
}
