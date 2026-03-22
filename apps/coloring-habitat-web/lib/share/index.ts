export {
  createArtworkShare,
  getSharedArtwork,
  getUserShares,
  deactivateShare,
  getShareStats,
} from "./service";

export type {
  ShareExpiration,
  ShareWithArtwork,
  SharedArtworkData,
  CreateShareResult,
} from "./types";
