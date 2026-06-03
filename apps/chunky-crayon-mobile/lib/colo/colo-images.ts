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

/**
 * Bundled Colo accessory illustrations, keyed by accessory id (the id is the
 * web PNG filename, one-to-one). Same static-`require()` pattern as the stages
 * — the 10 PNGs are copied from `apps/chunky-crayon-web/public/images/colo/
 * accessories/` into `assets/colo/accessories/` so the evolution celebration
 * + Colo bottom sheet render the real accessory art (web parity) instead of an
 * emoji placeholder. The catalog's `imagePath` is a web URL meaningless to RN,
 * so accessories resolve through this map by id (exactly how stages sidestep
 * `COLO_STAGES[n].imagePath` via `COLO_STAGE_IMAGES[n]`).
 */
export const COLO_ACCESSORY_IMAGES: Record<string, ImageSourcePropType> = {
  "astronaut-helmet": require("@/assets/colo/accessories/astronaut-helmet.png"),
  crown: require("@/assets/colo/accessories/crown.png"),
  "rainbow-scarf": require("@/assets/colo/accessories/rainbow-scarf.png"),
  "party-hat": require("@/assets/colo/accessories/party-hat.png"),
  "artist-beret": require("@/assets/colo/accessories/artist-beret.png"),
  "wizard-hat": require("@/assets/colo/accessories/wizard-hat.png"),
  "dino-spikes": require("@/assets/colo/accessories/dino-spikes.png"),
  "flower-crown": require("@/assets/colo/accessories/flower-crown.png"),
  "superhero-cape": require("@/assets/colo/accessories/superhero-cape.png"),
  "sparkle-glasses": require("@/assets/colo/accessories/sparkle-glasses.png"),
};
