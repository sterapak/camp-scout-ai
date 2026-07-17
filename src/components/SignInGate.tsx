/**
 * Full-screen sign-in wall shown when logged out. On the static GitHub Pages
 * build there is no backend (no runtime config), so /auth/* would 404 — instead
 * of a dead button we point users to the real app on Fly.
 */
import { FiCompass } from 'react-icons/fi'

import { startGoogleSignIn, useAuth } from '../contexts/AuthContext'

const FLY_APP_URL = 'https://campscout.terapak.com'

export default function SignInGate() {
  const { hasServer } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <FiCompass className="text-green-400" size={36} />
          <span className="text-2xl font-bold">Camp Scout AI</span>
        </div>
        <p className="mb-8 text-gray-300">
          Watch fully-booked campgrounds and get alerted the moment a cancellation frees a
          spot. Sign in to create your own watches.
        </p>

        {hasServer ? (
          <button
            type="button"
            onClick={startGoogleSignIn}
            className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-medium text-gray-800 transition hover:bg-gray-100"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Sign in with Google
          </button>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            <p className="mb-2 font-medium text-white">Camp Scout has moved.</p>
            <p className="mb-3">
              Sign-in and watches now live on the full app. This static preview can&apos;t sign
              you in.
            </p>
            <a
              href={FLY_APP_URL}
              className="inline-block rounded-md bg-green-500 px-4 py-2 font-medium text-white transition hover:bg-green-600"
            >
              Go to campscout.terapak.com
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
