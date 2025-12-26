/**
 * Colo Evolution System
 *
 * Public exports for the Colo mascot evolution system.
 * Import from here for convenience.
 */

// Types
export type {
  ColoStage,
  ColoStageInfo,
  ColoAccessory,
  AccessoryUnlockType,
  AccessoryUnlockCondition,
  ColoState,
  EvolutionResult,
} from './types';

// Catalog (static data)
export {
  COLO_STAGES,
  COLO_ACCESSORIES,
  ACCESSORY_CONDITIONS,
  getStageInfo,
  getNextStage,
  getStageForArtworkCount,
  getAccessory,
  TOTAL_STAGES,
  TOTAL_ACCESSORIES,
} from './catalog';

// Service (server-side logic) - import directly from './service' to avoid client bundle
// export { getColoState, checkEvolution, getAccessoriesWithStatus, getProgressToNextStage } from './service';
