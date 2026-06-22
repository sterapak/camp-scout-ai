import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import CampgroundsPage from './pages/CampgroundsPage'
import CampgroundDetailPage from './pages/CampgroundDetailPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/campgrounds" />} />
          <Route path="/campgrounds" element={<CampgroundsPage />} />
          <Route path="/campgrounds/:id" element={<CampgroundDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
