import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { hasDonationAcknowledgment } from '../utils/donationAcknowledgment'

export default function DonationAcknowledgment() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(hasDonationAcknowledgment())
  }, [location.pathname])

  if (!visible) {
    return null
  }

  return (
    <p
      role="status"
      className="text-sm font-medium text-green-700 dark:text-green-400"
    >
      <span aria-hidden="true">❤️ </span>
      Thanks for supporting CampScout.ai!
    </p>
  )
}
