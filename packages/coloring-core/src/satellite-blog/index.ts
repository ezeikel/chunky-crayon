export type { SatelliteSiteConfig, SatelliteBlogTopic } from "./types";
export { SATELLITE_SITES, getSatelliteSite } from "./sites";
export {
  createSatelliteBlogPostSystem,
  createSatelliteBlogPostPrompt,
  createSatelliteBlogMetaSystem,
  createSatelliteBlogMetaPrompt,
  createSatelliteBlogImagePromptSystem,
  createSatelliteBlogImagePromptPrompt,
} from "./prompts";
