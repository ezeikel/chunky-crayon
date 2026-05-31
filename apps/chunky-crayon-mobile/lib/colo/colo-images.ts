import type { ImageSourcePropType } from "react-native";
import type { ColoStage } from "./types";

/**
 * Bundled Colo stage illustrations. RN/Metro needs STATIC `require()`s (no
 * dynamic paths), so the 6 evolution-stage PNGs are mapped here by stage.
 * These are the same artworks the web app ships at
 * `apps/chunky-crayon-web/public/images/colo/stage-N.png` — copied into
 * `assets/colo/` so mobile renders the real Colo, not the gradient
 * placeholder. ColoAvatar reads from this map.
 */
export const COLO_STAGE_IMAGES: Record<ColoStage, ImageSourcePropType> = {
  1: require("@/assets/colo/stage-1.png"),
  2: require("@/assets/colo/stage-2.png"),
  3: require("@/assets/colo/stage-3.png"),
  4: require("@/assets/colo/stage-4.png"),
  5: require("@/assets/colo/stage-5.png"),
  6: require("@/assets/colo/stage-6.png"),
};
