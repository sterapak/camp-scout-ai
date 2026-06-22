/**
 * Aggregates all campground knowledge documents from the repository.
 * Register new documents here when adding campground folders.
 */

import { isValidKnowledgeDocument } from '../knowledgeSchema.js'

import yosemiteUpperPinesDescription from './campgrounds/yosemite-upper-pines/description.js'
import yosemiteUpperPinesRules from './campgrounds/yosemite-upper-pines/rules.js'
import yosemiteUpperPinesReservation from './campgrounds/yosemite-upper-pines/reservation.js'
import yosemiteUpperPinesAlert from './campgrounds/yosemite-upper-pines/alert.js'

import lassenManzanitaLakeDescription from './campgrounds/lassen-manzanita-lake/description.js'
import lassenManzanitaLakeRules from './campgrounds/lassen-manzanita-lake/rules.js'
import lassenManzanitaLakeReservation from './campgrounds/lassen-manzanita-lake/reservation.js'

import redwoodJedediahSmithDescription from './campgrounds/redwood-jedediah-smith/description.js'
import redwoodJedediahSmithRules from './campgrounds/redwood-jedediah-smith/rules.js'
import redwoodJedediahSmithReservation from './campgrounds/redwood-jedediah-smith/reservation.js'

import emeraldBayEaglePointDescription from './campgrounds/emerald-bay-eagle-point/description.js'
import emeraldBayEaglePointRules from './campgrounds/emerald-bay-eagle-point/rules.js'
import emeraldBayEaglePointReservation from './campgrounds/emerald-bay-eagle-point/reservation.js'

import vanDammeSpDescription from './campgrounds/van-damme-sp/description.js'
import vanDammeSpRules from './campgrounds/van-damme-sp/rules.js'
import vanDammeSpReservation from './campgrounds/van-damme-sp/reservation.js'

import humboldtRedwoodsBurlingtonDescription from './campgrounds/humboldt-redwoods-burlington/description.js'
import humboldtRedwoodsBurlingtonRules from './campgrounds/humboldt-redwoods-burlington/rules.js'
import humboldtRedwoodsBurlingtonReservation from './campgrounds/humboldt-redwoods-burlington/reservation.js'

import mcarthurBurneyFallsDescription from './campgrounds/mcarthur-burney-falls/description.js'
import mcarthurBurneyFallsRules from './campgrounds/mcarthur-burney-falls/rules.js'
import mcarthurBurneyFallsReservation from './campgrounds/mcarthur-burney-falls/reservation.js'
import mcarthurBurneyFallsAlert from './campgrounds/mcarthur-burney-falls/alert.js'

import samuelPTaylorDescription from './campgrounds/samuel-p-taylor/description.js'
import samuelPTaylorRules from './campgrounds/samuel-p-taylor/rules.js'
import samuelPTaylorReservation from './campgrounds/samuel-p-taylor/reservation.js'

import botheNapaValleyDescription from './campgrounds/bothe-napa-valley/description.js'
import botheNapaValleyRules from './campgrounds/bothe-napa-valley/rules.js'
import botheNapaValleyReservation from './campgrounds/bothe-napa-valley/reservation.js'

import sonomaCoastBodegaDunesDescription from './campgrounds/sonoma-coast-bodega-dunes/description.js'
import sonomaCoastBodegaDunesRules from './campgrounds/sonoma-coast-bodega-dunes/rules.js'
import sonomaCoastBodegaDunesReservation from './campgrounds/sonoma-coast-bodega-dunes/reservation.js'

import donnerMemorialDescription from './campgrounds/donner-memorial/description.js'
import donnerMemorialRules from './campgrounds/donner-memorial/rules.js'
import donnerMemorialReservation from './campgrounds/donner-memorial/reservation.js'
import donnerMemorialAlert from './campgrounds/donner-memorial/alert.js'

import sugarPinePointDescription from './campgrounds/sugar-pine-point/description.js'
import sugarPinePointRules from './campgrounds/sugar-pine-point/rules.js'
import sugarPinePointReservation from './campgrounds/sugar-pine-point/reservation.js'

/** @type {import('../knowledgeSchema.js').KnowledgeDocument[]} */
export const knowledgeDocuments = [
  yosemiteUpperPinesDescription,
  yosemiteUpperPinesRules,
  yosemiteUpperPinesReservation,
  yosemiteUpperPinesAlert,
  lassenManzanitaLakeDescription,
  lassenManzanitaLakeRules,
  lassenManzanitaLakeReservation,
  redwoodJedediahSmithDescription,
  redwoodJedediahSmithRules,
  redwoodJedediahSmithReservation,
  emeraldBayEaglePointDescription,
  emeraldBayEaglePointRules,
  emeraldBayEaglePointReservation,
  vanDammeSpDescription,
  vanDammeSpRules,
  vanDammeSpReservation,
  humboldtRedwoodsBurlingtonDescription,
  humboldtRedwoodsBurlingtonRules,
  humboldtRedwoodsBurlingtonReservation,
  mcarthurBurneyFallsDescription,
  mcarthurBurneyFallsRules,
  mcarthurBurneyFallsReservation,
  mcarthurBurneyFallsAlert,
  samuelPTaylorDescription,
  samuelPTaylorRules,
  samuelPTaylorReservation,
  botheNapaValleyDescription,
  botheNapaValleyRules,
  botheNapaValleyReservation,
  sonomaCoastBodegaDunesDescription,
  sonomaCoastBodegaDunesRules,
  sonomaCoastBodegaDunesReservation,
  donnerMemorialDescription,
  donnerMemorialRules,
  donnerMemorialReservation,
  donnerMemorialAlert,
  sugarPinePointDescription,
  sugarPinePointRules,
  sugarPinePointReservation,
]

/**
 * Returns all validated knowledge documents.
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function getAllKnowledgeDocuments() {
  return knowledgeDocuments.filter((doc) => {
    if (!isValidKnowledgeDocument(doc)) {
      console.warn(`Invalid knowledge document skipped: ${doc?.id ?? 'unknown'}`)
      return false
    }
    return true
  })
}

/**
 * Returns unique campground IDs that have knowledge documents.
 * @returns {string[]}
 */
export function getKnowledgeCampgroundIds() {
  return [...new Set(getAllKnowledgeDocuments().map((doc) => doc.campgroundId))].sort()
}
