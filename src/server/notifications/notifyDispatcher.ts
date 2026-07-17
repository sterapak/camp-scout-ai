/**
 * Notify dispatcher: turn diff-engine matches into actual alerts. Handles dedup
 * (one alert per watch+site+date via the unique alerts_sent.dedupKey), message
 * formatting with the all-important deep link, channel fan-out (SMS now; email
 * in Phase 3), and recording every send. Never throws into the scheduler loop.
 */
import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import type { Db } from '../db/index.js'
import { alertsSent, ownerSettings, type WatchRow } from '../db/schema.js'
import { buildSiteDeepLink } from '../availability/recGovAdapter.js'
import type { WatchMatch } from '../availability/diffEngine.js'
import { sendSms, twilioConfigured, type SendSmsDeps } from './twilioSmsSender.js'

export interface DispatchResult {
  sent: number
  skipped: number
  failed: number
}

export interface DispatchDeps {
  smsDeps?: SendSmsDeps
  /** Override deep-link builder (Phase 2 RC uses a different one). */
  deepLinkFor?: (platform: string, siteId: string) => string
}

function deepLinkForMatch(platform: string, siteId: string, deps: DispatchDeps): string {
  if (deps.deepLinkFor) return deps.deepLinkFor(platform, siteId)
  // Phase 1: recgov only.
  return buildSiteDeepLink(siteId)
}

export function formatMessage(watch: WatchRow, match: WatchMatch, deepLink: string): string {
  const loop = match.loop ? ` (${match.loop})` : ''
  const nights = match.nights > 1 ? `, ${match.nights} nts` : ''
  return `🏕 SPOT FREED: ${watch.campgroundName} — Site ${match.siteName}${loop} on ${match.date}${nights}. Book now: ${deepLink}`
}

export async function dispatchMatches(
  db: Db,
  watch: WatchRow,
  matches: WatchMatch[],
  deps: DispatchDeps = {},
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, skipped: 0, failed: 0 }
  if (matches.length === 0) return result

  const owner = db.select().from(ownerSettings).where(eq(ownerSettings.id, 1)).get()
  if (!owner) return result // no contact configured yet

  for (const match of matches) {
    const dedupKey = `${watch.id}|${match.siteId}|${match.date}`
    const existing = db
      .select({ id: alertsSent.id })
      .from(alertsSent)
      .where(eq(alertsSent.dedupKey, dedupKey))
      .get()
    if (existing) {
      result.skipped += 1
      continue
    }

    const deepLink = deepLinkForMatch(watch.platform, match.siteId, deps)
    const body = formatMessage(watch, match, deepLink)

    // SMS (Phase 1). Email is Phase 3.
    if (owner.smsEnabled && owner.phone && twilioConfigured(deps.smsDeps)) {
      const res = await sendSms(owner.phone, body, deps.smsDeps)
      db.insert(alertsSent)
        .values({
          id: randomUUID(),
          watchId: watch.id,
          dedupKey,
          siteId: match.siteId,
          siteName: match.siteName,
          date: match.date,
          channel: 'sms',
          deepLink,
          messageBody: body,
          deliveryStatus: res.ok ? 'sent' : 'failed',
        })
        .run()
      if (res.ok) result.sent += 1
      else result.failed += 1
    } else {
      result.skipped += 1
    }
  }

  return result
}
