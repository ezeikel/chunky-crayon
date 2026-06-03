import type { ImageSourcePropType } from "react-native";

/**
 * Bundled achievement/collection sticker illustrations, keyed by sticker id
 * (the id is the web PNG filename, one-to-one). Same static-`require()`
 * pattern as the Colo stage/accessory maps — the 22 PNGs are copied from
 * `apps/chunky-crayon-web/public/images/stickers/` into
 * `assets/stickers/achievements/` so the Stickers tab + detail sheet render
 * the real sticker art (web parity, like web's StickerCard/StickerDetailModal)
 * instead of an emoji placeholder.
 *
 * The mobile `/api/mobile/stickers` response already carries each sticker's
 * `imageUrl` (a root-relative web path), but Metro can't `require()` a dynamic
 * path and we want offline/instant render — so we bundle + resolve by id, the
 * same choice `lib/avatars.ts` documents. `require()` paths MUST be static
 * string literals.
 */
export const STICKER_IMAGES: Record<string, ImageSourcePropType> = {
  "first-steps": require("@/assets/stickers/achievements/first-steps.png"),
  "getting-started": require("@/assets/stickers/achievements/getting-started.png"),
  "high-five": require("@/assets/stickers/achievements/high-five.png"),
  "perfect-ten": require("@/assets/stickers/achievements/perfect-ten.png"),
  "super-artist": require("@/assets/stickers/achievements/super-artist.png"),
  "master-creator": require("@/assets/stickers/achievements/master-creator.png"),
  "century-club": require("@/assets/stickers/achievements/century-club.png"),
  "animal-friend": require("@/assets/stickers/achievements/animal-friend.png"),
  "fantasy-dreamer": require("@/assets/stickers/achievements/fantasy-dreamer.png"),
  "space-explorer": require("@/assets/stickers/achievements/space-explorer.png"),
  "nature-lover": require("@/assets/stickers/achievements/nature-lover.png"),
  "vehicle-driver": require("@/assets/stickers/achievements/vehicle-driver.png"),
  "dino-hunter": require("@/assets/stickers/achievements/dino-hunter.png"),
  "ocean-diver": require("@/assets/stickers/achievements/ocean-diver.png"),
  "food-lover": require("@/assets/stickers/achievements/food-lover.png"),
  "sports-star": require("@/assets/stickers/achievements/sports-star.png"),
  "holiday-spirit": require("@/assets/stickers/achievements/holiday-spirit.png"),
  "animal-master": require("@/assets/stickers/achievements/animal-master.png"),
  "fantasy-master": require("@/assets/stickers/achievements/fantasy-master.png"),
  "space-master": require("@/assets/stickers/achievements/space-master.png"),
  "category-explorer": require("@/assets/stickers/achievements/category-explorer.png"),
  "world-traveler": require("@/assets/stickers/achievements/world-traveler.png"),
};
