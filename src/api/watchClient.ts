/**
 * Client for the availability-watch API (/api/watches, /api/alerts,
 * /api/settings/contact). Follows the repo's per-endpoint client pattern
 * (askClient.ts): a typed error class + relative paths + Bearer auth via
 * buildApiRequestHeaders. Server contracts live in src/server/api/watchRoute.ts.
 */
import { buildApiRequestHeaders } from './apiAuth.js'

export class WatchApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'WatchApiError'
    this.statusCode = statusCode
  }
}

export interface Watch {
  id: string
  platform: string
  facilityId: string
  campgroundName: string
  startDate: string
  endDate: string
  minNights: number
  status: 'active' | 'paused' | 'expired'
  lastPolledAt: string | null
  lastPollStatus: string | null
  /** JSON blob of per-watch match filters (e.g. {"weekdays":[5,6]}). */
  siteFilters: string | null
  createdAt: string
}

export interface Alert {
  id: string
  watchId: string
  siteId: string
  siteName: string | null
  date: string
  channel: string
  deepLink: string | null
  messageBody: string | null
  deliveryStatus: string
  sentAt: string
}

export interface ContactSettings {
  phone: string | null
  email: string | null
  smsEnabled: boolean
  emailEnabled: boolean
}

export interface CreateWatchInput {
  recgovUrl?: string
  facilityId?: string
  campgroundName: string
  startDate: string
  endDate: string
  minNights?: number
  platform?: string
  /** Only alert for freed nights on these weekdays (0=Sun … 6=Sat). Omit/all = any. */
  weekdays?: number[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { headers: buildApiRequestHeaders(), ...init })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new WatchApiError(
      typeof data?.error === 'string' ? data.error : 'Request failed.',
      response.status,
    )
  }
  return data as T
}

export async function listWatches(): Promise<Watch[]> {
  const data = await request<{ watches: Watch[] }>('/api/watches')
  return data.watches ?? []
}

export async function createWatch(input: CreateWatchInput): Promise<Watch> {
  const { weekdays, ...rest } = input
  const body: Record<string, unknown> = { platform: 'recgov', ...rest }
  // Send weekdays as a site filter only when it's a real subset (1–6 days).
  if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
    body.siteFilters = { weekdays }
  }
  const data = await request<{ watch: Watch }>('/api/watches', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.watch
}

export async function updateWatch(
  id: string,
  patch: { status?: 'active' | 'paused'; minNights?: number },
): Promise<Watch> {
  const data = await request<{ watch: Watch }>(`/api/watches/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return data.watch
}

export async function deleteWatch(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/watches/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listAlerts(): Promise<Alert[]> {
  const data = await request<{ alerts: Alert[] }>('/api/alerts')
  return data.alerts ?? []
}

export async function clearAlerts(): Promise<void> {
  await request<{ ok: boolean }>('/api/alerts', { method: 'DELETE' })
}

export async function getContactSettings(): Promise<ContactSettings | null> {
  const data = await request<{ settings: ContactSettings | null }>('/api/settings/contact')
  return data.settings
}

export async function updateContactSettings(
  input: Partial<ContactSettings>,
): Promise<ContactSettings> {
  const data = await request<{ settings: ContactSettings }>('/api/settings/contact', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return data.settings
}
