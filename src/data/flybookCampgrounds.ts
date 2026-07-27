/**
 * Campgrounds whose reservations run on The Flybook (go.theflybook.com) rather
 * than Recreation.gov. Unlike recgov (whose facility id is parseable from the
 * campground's reservationUrl), a Flybook campground's watch identity is the
 * Flybook ACCOUNT id — widget config, not present in the operator URL — so it
 * must be mapped here explicitly.
 *
 * `facilityId` (= the account id) is what the watch row stores and what the
 * flybookAdapter POSTs to RoomFinder. `entityId` is the booking entity guid from
 * the widget URL (`/Book/<accountId>/<entityId>/0`); kept for reference / a
 * future per-entity deep link.
 */
export interface FlybookWatchConfig {
  /** campground id in src/data/campgrounds.js */
  campgroundId: string
  /** The Flybook account id (stored as the watch facilityId). */
  facilityId: string
  /** Booking entity guid from the widget URL (reference only). */
  entityId?: string
}

export const FLYBOOK_CAMPGROUNDS: Record<string, FlybookWatchConfig> = {
  'sly-park': {
    campgroundId: 'sly-park',
    facilityId: '356',
    entityId: '7769c097-a91b-48f8-b916-6edfe28534b8',
  },
}

/** The Flybook watch config for a campground id, or null if it's not a Flybook site. */
export function flybookConfigForCampground(campgroundId: string): FlybookWatchConfig | null {
  return FLYBOOK_CAMPGROUNDS[campgroundId] ?? null
}
