import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import SignInGate from './components/SignInGate'
import PageViewTracker from './components/PageViewTracker'
import CampgroundsPage from './pages/CampgroundsPage'
import CampgroundDetailPage from './pages/CampgroundDetailPage'
import SettingsPage from './pages/SettingsPage'
import WatchesPage from './pages/WatchesPage'
import RetrievalPlaygroundPage from './pages/RetrievalPlaygroundPage'
import DonationSuccessPage from './pages/DonationSuccessPage'
import DonationCancelPage from './pages/DonationCancelPage'
import SupportPage from './pages/SupportPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function AuthenticatedApp() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <PageViewTracker />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/campgrounds" />} />
          <Route path="/campgrounds" element={<CampgroundsPage />} />
          <Route path="/campgrounds/:id" element={<CampgroundDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/watches" element={<WatchesPage />} />
          <Route path="/retrieval" element={<RetrievalPlaygroundPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/donation-success" element={<DonationSuccessPage />} />
          <Route path="/donation-cancel" element={<DonationCancelPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

function Gate() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <AuthenticatedApp /> : <SignInGate />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
