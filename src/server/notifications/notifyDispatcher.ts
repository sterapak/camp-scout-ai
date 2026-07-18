/**
 * Notify dispatcher: turn diff-engine matches into actual alerts. Handles dedup
 * (one alert per watch+site+date via the unique alerts_sent.dedupKey), message
 * formatting with the all-important deep link, channel fan-out (SMS now; email
 * in Phase 3), and recording every send. Never throws into the scheduler loop.
 */
import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import type { Db } from '../db/index.js'
import { alertsSent, userSettings, type WatchRow } from '../db/schema.js'
import { buildCampgroundLink, buildSiteDeepLink } from '../availability/recGovAdapter.js'
import type { WatchMatch } from '../availability/diffEngine.js'
import { sendSms, twilioConfigured, type SendSmsDeps } from './twilioSmsSender.js'

/** Global kill-switch: set WATCH_SMS_ENABLED=false to stop all SMS sends. */
function smsSendingEnabled(): boolean {
  return process.env.WATCH_SMS_ENABLED !== 'false'
}

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

/**
 * ONE message for a batch of freed slots. A campground's first poll can surface
 * hundreds of available site-nights at once; we must never send one SMS each
 * (that was the volume-spike bug). Single opening → the detailed message; many →
 * a count + example + the campground availability link.
 */
export function formatBatchMessage(
  watch: WatchRow,
  matches: WatchMatch[],
  deps: DispatchDeps,
): { body: string; deepLink: string } {
  const first = matches[0]
  if (matches.length === 1) {
    const link = deepLinkForMatch(watch.platform, first.siteId, deps)
    return { body: formatMessage(watch, first, link), deepLink: link }
  }
  const link = deps.deepLinkFor
    ? deepLinkForMatch(watch.platform, first.siteId, deps)
    : buildCampgroundLink(watch.facilityId)
  const loop = first.loop ? ` (${first.loop})` : ''
  const body = `🏕 ${matches.length} openings at ${watch.campgroundName} for your dates — e.g. Site ${first.siteName}${loop} on ${first.date}. Book: ${link}`
  return { body, deepLink: link }
}

export async function dispatchMatches(
  db: Db,
  watch: WatchRow,
  matches: WatchMatch[],
  deps: DispatchDeps = {},
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, skipped: 0, failed: 0 }
  if (matches.length === 0) return result

  // Notify the watch's OWNER (per-user settings). Phase 2 will additionally gate
  // SMS on phoneVerified + smsConsentAt (once A2P 10DLC is live).
  const owner = db.select().from(userSettings).where(eq(userSettings.userId, watch.userId)).get()
  if (!owner) return result // this user hasn't set up notifications yet

  // Drop slots we've already alerted on (idempotency across polls).
  const fresh: Array<{ match: WatchMatch; dedupKey: string }> = []
  for (const match of matches) {
    const dedupKey = `${watch.id}|${match.siteId}|${match.date}`
    const existing = db
      .select({ id: alertsSent.id })
      .from(alertsSent)
      .where(eq(alertsSent.dedupKey, dedupKey))
      .get()
    if (existing) result.skipped += 1
    else fresh.push({ match, dedupKey })
  }
  if (fresh.length === 0) return result

  const canSms =
    smsSendingEnabled() &&
    owner.smsEnabled &&
    Boolean(owner.phone) &&
    twilioConfigured(deps.smsDeps)

  // Exactly ONE SMS for the whole batch — never one per site-night.
  const { body } = formatBatchMessage(watch, fresh.map((f) => f.match), deps)
  let deliveryStatus = 'skipped'
  if (canSms) {
    const res = await sendSms(owner.phone as string, body, deps.smsDeps)
    deliveryStatus = res.ok ? 'sent' : 'failed'
    if (res.ok) result.sent += 1
    else result.failed += 1
  } else {
    result.skipped += fresh.length
  }

  // Record every fresh slot for dedup + history; the single SMS covered them all.
  for (const { match, dedupKey } of fresh) {
    db.insert(alertsSent)
      .values({
        id: randomUUID(),
        userId: watch.userId,
        watchId: watch.id,
        dedupKey,
        siteId: match.siteId,
        siteName: match.siteName,
        date: match.date,
        channel: canSms ? 'sms' : 'none',
        deepLink: deepLinkForMatch(watch.platform, match.siteId, deps),
        messageBody: body,
        deliveryStatus,
      })
      .run()
  }

  return result
}
