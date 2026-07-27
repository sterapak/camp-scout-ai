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
import { buildSiteDeepLink } from '../availability/recGovAdapter.js'
import { buildReserveCaliforniaLink } from '../availability/reserveCaliforniaAdapter.js'
import { buildFlybookBookingLink } from '../availability/flybookAdapter.js'
import type { WatchMatch } from '../availability/diffEngine.js'
import { sendSms, twilioConfigured, type SendSmsDeps } from './twilioSmsSender.js'
import { emailConfigured, sendEmail, type SendEmailDeps } from './emailSender.js'
import { pushoverConfigured, sendPushover, type SendPushoverDeps } from './pushoverSender.js'

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
  emailDeps?: SendEmailDeps
  pushoverDeps?: SendPushoverDeps
  /** Override deep-link builder (Phase 2 RC uses a different one). */
  deepLinkFor?: (platform: string, siteId: string) => string
}

function deepLinkForMatch(watch: WatchRow, siteId: string, deps: DispatchDeps): string {
  if (deps.deepLinkFor) return deps.deepLinkFor(watch.platform, siteId)
  if (watch.platform === 'reservecalifornia') return buildReserveCaliforniaLink()
  if (watch.platform === 'flybook') return buildFlybookBookingLink(watch.facilityId)
  return buildSiteDeepLink(siteId)
}

/** Channel button label for the booking link, per platform. */
function bookUrlTitle(platform: string): string {
  if (platform === 'reservecalifornia') return 'Book on ReserveCalifornia'
  if (platform === 'flybook') return 'Book now'
  return 'Book on Recreation.gov'
}

export function formatMessage(watch: WatchRow, match: WatchMatch, deepLink: string): string {
  const loop = match.loop ? ` (${match.loop})` : ''
  const nights = match.nights > 1 ? `, ${match.nights} nts` : ''
  return `🏕 SPOT FREED: ${watch.campgroundName} — Site ${match.siteName}${loop} on ${match.date}${nights}. Book now: ${deepLink}`
}

/**
 * ONE message for a batch of freed slots. A campground's first poll can surface
 * hundreds of available site-nights at once; we must never send one alert each
 * (that was the volume-spike bug).
 *
 * The link deep-links to the FIRST freed site's page (recgov), NOT the campground
 * list — one tap lands on a bookable site instead of a scroll of every site. And
 * because recreation.gov has no URL parameter to pre-select a date (verified
 * 2026-07-21: it strips ?date= and ignores ?checkInDate=), we keep the exact date
 * in the text and list the freed site numbers so they can be pasted into
 * recreation.gov's "Search Site Number or Loop" box.
 */
export function formatBatchMessage(
  watch: WatchRow,
  matches: WatchMatch[],
  deps: DispatchDeps,
): { body: string; deepLink: string } {
  const first = matches[0]
  const link = deepLinkForMatch(watch, first.siteId, deps)
  if (matches.length === 1) {
    return { body: formatMessage(watch, first, link), deepLink: link }
  }
  const siteNumbers = [...new Set(matches.map((m) => m.siteName))]
  const shown = siteNumbers.slice(0, 6).join(', ')
  const more = siteNumbers.length > 6 ? ` +${siteNumbers.length - 6} more` : ''
  const loop = first.loop ? ` (${first.loop})` : ''
  const body =
    `🏕 ${matches.length} openings at ${watch.campgroundName} for your dates. ` +
    `Sites: ${shown}${more}. ` +
    `Link opens ${first.siteName}${loop} on ${first.date} — Book: ${link}`
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
  const canEmail =
    owner.emailEnabled && Boolean(owner.email) && emailConfigured(deps.emailDeps)
  // Pushover is a single-recipient global channel (no per-user pref yet).
  const canPush = pushoverConfigured(deps.pushoverDeps)

  // Exactly ONE message per channel for the whole batch — never one per site-night.
  const { body, deepLink } = formatBatchMessage(watch, fresh.map((f) => f.match), deps)
  const firedChannels: string[] = []

  if (canSms) {
    const res = await sendSms(owner.phone as string, body, deps.smsDeps)
    firedChannels.push('sms')
    if (res.ok) result.sent += 1
    else result.failed += 1
  }
  if (canEmail) {
    const subject = `🏕 Cancellation alert: ${watch.campgroundName}`
    const res = await sendEmail(owner.email as string, subject, body, deps.emailDeps)
    firedChannels.push('email')
    if (res.ok) result.sent += 1
    else result.failed += 1
  }
  if (canPush) {
    const res = await sendPushover(
      body,
      { title: `🏕 ${watch.campgroundName}`, url: deepLink, urlTitle: bookUrlTitle(watch.platform) },
      deps.pushoverDeps,
    )
    firedChannels.push('push')
    if (res.ok) result.sent += 1
    else result.failed += 1
  }
  if (firedChannels.length === 0) result.skipped += fresh.length

  // Record every fresh slot for dedup + history; the message(s) covered them all.
  const channelLabel = firedChannels.length ? firedChannels.join('+') : 'none'
  const deliveryStatus = firedChannels.length ? (result.sent > 0 ? 'sent' : 'failed') : 'skipped'
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
        channel: channelLabel,
        deepLink: deepLinkForMatch(watch, match.siteId, deps),
        messageBody: body,
        deliveryStatus,
      })
      .run()
  }

  return result
}
