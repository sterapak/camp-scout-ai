/**
 * Aggregates all campground knowledge documents from the repository.
 * Register new documents here when adding campground folders.
 * This file is auto-updated by `npm run ingest:campgrounds`.
 */

import { isValidKnowledgeDocument, type KnowledgeDocument } from '../knowledgeSchema.js'

import botheNapaValleyDescription from './campgrounds/bothe-napa-valley/description.js'
import botheNapaValleyRules from './campgrounds/bothe-napa-valley/rules.js'
import botheNapaValleyReservation from './campgrounds/bothe-napa-valley/reservation.js'
import botheNapaValleyAlert from './campgrounds/bothe-napa-valley/alert.js'
import castleCragsDescription from './campgrounds/castle-crags/description.js'
import castleCragsRules from './campgrounds/castle-crags/rules.js'
import castleCragsReservation from './campgrounds/castle-crags/reservation.js'
import clearLakeSpDescription from './campgrounds/clear-lake-sp/description.js'
import clearLakeSpRules from './campgrounds/clear-lake-sp/rules.js'
import clearLakeSpReservation from './campgrounds/clear-lake-sp/reservation.js'
import donnerMemorialDescription from './campgrounds/donner-memorial/description.js'
import donnerMemorialRules from './campgrounds/donner-memorial/rules.js'
import donnerMemorialReservation from './campgrounds/donner-memorial/reservation.js'
import donnerMemorialAlert from './campgrounds/donner-memorial/alert.js'
import emeraldBayEaglePointDescription from './campgrounds/emerald-bay-eagle-point/description.js'
import emeraldBayEaglePointRules from './campgrounds/emerald-bay-eagle-point/rules.js'
import emeraldBayEaglePointReservation from './campgrounds/emerald-bay-eagle-point/reservation.js'
import humboldtRedwoodsBurlingtonDescription from './campgrounds/humboldt-redwoods-burlington/description.js'
import humboldtRedwoodsBurlingtonRules from './campgrounds/humboldt-redwoods-burlington/rules.js'
import humboldtRedwoodsBurlingtonReservation from './campgrounds/humboldt-redwoods-burlington/reservation.js'
import humboldtRedwoodsBurlingtonAlert from './campgrounds/humboldt-redwoods-burlington/alert.js'
import iceHouseReservoirDescriptionSource1 from './campgrounds/ice-house-reservoir/description--source-1.js'
import iceHouseReservoirDescriptionSource2 from './campgrounds/ice-house-reservoir/description--source-2.js'
import iceHouseReservoirDescriptionSource3 from './campgrounds/ice-house-reservoir/description--source-3.js'
import iceHouseReservoirRulesSource1 from './campgrounds/ice-house-reservoir/rules--source-1.js'
import iceHouseReservoirRulesSource2 from './campgrounds/ice-house-reservoir/rules--source-2.js'
import iceHouseReservoirRulesSource3 from './campgrounds/ice-house-reservoir/rules--source-3.js'
import iceHouseReservoirReservationSource1 from './campgrounds/ice-house-reservoir/reservation--source-1.js'
import iceHouseReservoirReservationSource2 from './campgrounds/ice-house-reservoir/reservation--source-2.js'
import iceHouseReservoirReservationSource3 from './campgrounds/ice-house-reservoir/reservation--source-3.js'
import iceHouseReservoirAlertSource3 from './campgrounds/ice-house-reservoir/alert--source-3.js'
import lakeOrovilleLoaferCreekDescription from './campgrounds/lake-oroville-loafer-creek/description.js'
import lakeOrovilleLoaferCreekRules from './campgrounds/lake-oroville-loafer-creek/rules.js'
import lakeOrovilleLoaferCreekReservation from './campgrounds/lake-oroville-loafer-creek/reservation.js'
import lassenManzanitaLakeDescription from './campgrounds/lassen-manzanita-lake/description.js'
import lassenManzanitaLakeRules from './campgrounds/lassen-manzanita-lake/rules.js'
import lassenManzanitaLakeReservation from './campgrounds/lassen-manzanita-lake/reservation.js'
import mcarthurBurneyFallsDescription from './campgrounds/mcarthur-burney-falls/description.js'
import mcarthurBurneyFallsRules from './campgrounds/mcarthur-burney-falls/rules.js'
import mcarthurBurneyFallsReservation from './campgrounds/mcarthur-burney-falls/reservation.js'
import mcarthurBurneyFallsAlert from './campgrounds/mcarthur-burney-falls/alert.js'
import mountTamalpaisPantollDescription from './campgrounds/mount-tamalpais-pantoll/description.js'
import mountTamalpaisPantollRules from './campgrounds/mount-tamalpais-pantoll/rules.js'
import mountTamalpaisPantollReservation from './campgrounds/mount-tamalpais-pantoll/reservation.js'
import mountTamalpaisPantollAlert from './campgrounds/mount-tamalpais-pantoll/alert.js'
import plumasEurekaDescription from './campgrounds/plumas-eureka/description.js'
import plumasEurekaRules from './campgrounds/plumas-eureka/rules.js'
import plumasEurekaReservation from './campgrounds/plumas-eureka/reservation.js'
import plumasEurekaAlert from './campgrounds/plumas-eureka/alert.js'
import portolaRedwoodsDescription from './campgrounds/portola-redwoods/description.js'
import portolaRedwoodsRules from './campgrounds/portola-redwoods/rules.js'
import portolaRedwoodsReservation from './campgrounds/portola-redwoods/reservation.js'
import redwoodGoldBluffsBeachDescription from './campgrounds/redwood-gold-bluffs-beach/description.js'
import redwoodGoldBluffsBeachRules from './campgrounds/redwood-gold-bluffs-beach/rules.js'
import redwoodGoldBluffsBeachReservation from './campgrounds/redwood-gold-bluffs-beach/reservation.js'
import redwoodJedediahSmithDescription from './campgrounds/redwood-jedediah-smith/description.js'
import redwoodJedediahSmithRules from './campgrounds/redwood-jedediah-smith/rules.js'
import redwoodJedediahSmithReservation from './campgrounds/redwood-jedediah-smith/reservation.js'
import samuelPTaylorDescription from './campgrounds/samuel-p-taylor/description.js'
import samuelPTaylorRules from './campgrounds/samuel-p-taylor/rules.js'
import samuelPTaylorReservation from './campgrounds/samuel-p-taylor/reservation.js'
import silverLakeWestDescriptionSource1 from './campgrounds/silver-lake-west/description--source-1.js'
import silverLakeWestDescriptionSource2 from './campgrounds/silver-lake-west/description--source-2.js'
import silverLakeWestRulesSource1 from './campgrounds/silver-lake-west/rules--source-1.js'
import silverLakeWestRulesSource2 from './campgrounds/silver-lake-west/rules--source-2.js'
import silverLakeWestReservationSource1 from './campgrounds/silver-lake-west/reservation--source-1.js'
import silverLakeWestReservationSource2 from './campgrounds/silver-lake-west/reservation--source-2.js'
import silverLakeWestAlertSource1 from './campgrounds/silver-lake-west/alert--source-1.js'
import sonomaCoastBodegaDunesDescription from './campgrounds/sonoma-coast-bodega-dunes/description.js'
import sonomaCoastBodegaDunesRules from './campgrounds/sonoma-coast-bodega-dunes/rules.js'
import sonomaCoastBodegaDunesReservation from './campgrounds/sonoma-coast-bodega-dunes/reservation.js'
import sonomaCoastBodegaDunesAlert from './campgrounds/sonoma-coast-bodega-dunes/alert.js'
import standishHickeyDescription from './campgrounds/standish-hickey/description.js'
import standishHickeyRules from './campgrounds/standish-hickey/rules.js'
import standishHickeyReservation from './campgrounds/standish-hickey/reservation.js'
import sugarPinePointDescription from './campgrounds/sugar-pine-point/description.js'
import sugarPinePointRules from './campgrounds/sugar-pine-point/rules.js'
import sugarPinePointReservation from './campgrounds/sugar-pine-point/reservation.js'
import vanDammeSpDescription from './campgrounds/van-damme-sp/description.js'
import vanDammeSpRules from './campgrounds/van-damme-sp/rules.js'
import vanDammeSpReservation from './campgrounds/van-damme-sp/reservation.js'
import yosemiteUpperPinesDescription from './campgrounds/yosemite-upper-pines/description.js'
import yosemiteUpperPinesRules from './campgrounds/yosemite-upper-pines/rules.js'
import yosemiteUpperPinesReservation from './campgrounds/yosemite-upper-pines/reservation.js'
import yosemiteUpperPinesAlert from './campgrounds/yosemite-upper-pines/alert.js'

/** @type {import('../knowledgeSchema.js').KnowledgeDocument[]} */
export const knowledgeDocuments: KnowledgeDocument[] = [
  botheNapaValleyDescription,
  botheNapaValleyRules,
  botheNapaValleyReservation,
  botheNapaValleyAlert,
  castleCragsDescription,
  castleCragsRules,
  castleCragsReservation,
  clearLakeSpDescription,
  clearLakeSpRules,
  clearLakeSpReservation,
  donnerMemorialDescription,
  donnerMemorialRules,
  donnerMemorialReservation,
  donnerMemorialAlert,
  emeraldBayEaglePointDescription,
  emeraldBayEaglePointRules,
  emeraldBayEaglePointReservation,
  humboldtRedwoodsBurlingtonDescription,
  humboldtRedwoodsBurlingtonRules,
  humboldtRedwoodsBurlingtonReservation,
  humboldtRedwoodsBurlingtonAlert,
  iceHouseReservoirDescriptionSource1,
  iceHouseReservoirDescriptionSource2,
  iceHouseReservoirDescriptionSource3,
  iceHouseReservoirRulesSource1,
  iceHouseReservoirRulesSource2,
  iceHouseReservoirRulesSource3,
  iceHouseReservoirReservationSource1,
  iceHouseReservoirReservationSource2,
  iceHouseReservoirReservationSource3,
  iceHouseReservoirAlertSource3,
  lakeOrovilleLoaferCreekDescription,
  lakeOrovilleLoaferCreekRules,
  lakeOrovilleLoaferCreekReservation,
  lassenManzanitaLakeDescription,
  lassenManzanitaLakeRules,
  lassenManzanitaLakeReservation,
  mcarthurBurneyFallsDescription,
  mcarthurBurneyFallsRules,
  mcarthurBurneyFallsReservation,
  mcarthurBurneyFallsAlert,
  mountTamalpaisPantollDescription,
  mountTamalpaisPantollRules,
  mountTamalpaisPantollReservation,
  mountTamalpaisPantollAlert,
  plumasEurekaDescription,
  plumasEurekaRules,
  plumasEurekaReservation,
  plumasEurekaAlert,
  portolaRedwoodsDescription,
  portolaRedwoodsRules,
  portolaRedwoodsReservation,
  redwoodGoldBluffsBeachDescription,
  redwoodGoldBluffsBeachRules,
  redwoodGoldBluffsBeachReservation,
  redwoodJedediahSmithDescription,
  redwoodJedediahSmithRules,
  redwoodJedediahSmithReservation,
  samuelPTaylorDescription,
  samuelPTaylorRules,
  samuelPTaylorReservation,
  silverLakeWestDescriptionSource1,
  silverLakeWestDescriptionSource2,
  silverLakeWestRulesSource1,
  silverLakeWestRulesSource2,
  silverLakeWestReservationSource1,
  silverLakeWestReservationSource2,
  silverLakeWestAlertSource1,
  sonomaCoastBodegaDunesDescription,
  sonomaCoastBodegaDunesRules,
  sonomaCoastBodegaDunesReservation,
  sonomaCoastBodegaDunesAlert,
  standishHickeyDescription,
  standishHickeyRules,
  standishHickeyReservation,
  sugarPinePointDescription,
  sugarPinePointRules,
  sugarPinePointReservation,
  vanDammeSpDescription,
  vanDammeSpRules,
  vanDammeSpReservation,
  yosemiteUpperPinesDescription,
  yosemiteUpperPinesRules,
  yosemiteUpperPinesReservation,
  yosemiteUpperPinesAlert,
]

/**
 * Returns all validated knowledge documents.
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function getAllKnowledgeDocuments(): KnowledgeDocument[] {
  return knowledgeDocuments.filter((doc): doc is KnowledgeDocument => {
    if (!isValidKnowledgeDocument(doc)) {
      console.warn(`Invalid knowledge document skipped: ${(doc as { id?: string })?.id ?? 'unknown'}`)
      return false
    }
    return true
  })
}

/**
 * Returns unique campground IDs that have knowledge documents.
 * @returns {string[]}
 */
export function getKnowledgeCampgroundIds(): string[] {
  return [...new Set(getAllKnowledgeDocuments().map((doc) => doc.campgroundId))].sort()
}
