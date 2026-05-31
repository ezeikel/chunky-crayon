import type { ImageSourcePropType } from "react-native";

/**
 * Bundled imagery shared across all paywall surfaces (subscription +
 * credit packs). Everything here is committed locally and loaded via
 * static require() — paywalls can open offline / pre-auth, so they must
 * never fetch art over the network (Metro also needs static paths, same
 * as lib/colo). Lives in lib/paywall alongside the plan data so every
 * paywall component imports from one place.
 */

/**
 * Coloring-page line art for the hero fan. Generated via CC's
 * coloring-page pipeline (gpt-image-2), purpose-made for the paywall.
 * Three deliberately different "worlds" so the fan reads as "you can
 * make anything": space adventure, underwater fantasy, cute animals.
 */
export const PAYWALL_HERO_PAGES: ImageSourcePropType[] = [
  require("@/assets/paywall/hero-dragon-rocket.png"),
  require("@/assets/paywall/hero-mermaid-castle.png"),
  require("@/assets/paywall/hero-puppy-tea-party.png"),
];

/**
 * The credit "coin" mascot for the credit-pack paywalls — a transparent
 * PNG generated in the SAME brand-illustration style as the profile
 * avatars + Colo (gpt-image-2 brand recipe + Replicate bg-strip, see
 * apps/chunky-crayon-web/scripts/generate-paywall-coin.ts), NOT the
 * coloring-page line art.
 */
export const PAYWALL_COIN: ImageSourcePropType = require("@/assets/paywall/credit-coin.png");
