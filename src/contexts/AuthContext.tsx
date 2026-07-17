/**
 * Auth context: exposes the signed-in user injected by the server into the
 * runtime config (window.__CAMP_SCOUT_RUNTIME__.user). Identity is established
 * server-side via the session cookie; the SPA just reads the projection. A
 * login/logout is a full-page redirect (302), so reading once at mount is
 * sufficient — no /auth/me round-trip needed.
 */
import { createContext, useContext, type ReactNode } from 'react'

import { hasRuntimeConfig, resolveRuntimeUser } from '../api/apiAuth'

export interface AuthUser {
  email: string
  name?: string
  picture?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Whether a backend served the runtime config at all (false on static build). */
  hasServer: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  hasServer: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = resolveRuntimeUser()
  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    hasServer: hasRuntimeConfig(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

/** Kick off Google sign-in (server sets state cookie + redirects to Google). */
export function startGoogleSignIn(): void {
  window.location.assign('/auth/google')
}

/** POST /auth/logout, then reload to the gate. */
export async function signOut(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    // Ignore network errors — clearing the cookie is best-effort; the reload
    // below re-evaluates auth state regardless.
  }
  window.location.assign('/')
}
