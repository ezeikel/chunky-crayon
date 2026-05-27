/**
 * Avatar catalog for profile selection. Mobile-side duplicate of
 * apps/chunky-crayon-web/lib/avatars.ts.
 *
 * On web the catalog stores R2 keys (`profile-avatars/dragon.png`)
 * resolved at render time via `NEXT_PUBLIC_R2_PUBLIC_URL`. On mobile
 * we bundle the PNGs directly into the app under
 * `assets/profile-avatars/` and `require()` them so:
 *   - first profile-switcher render is instant (no R2 fetch)
 *   - the app works offline
 *   - kids on slow connections don't see a 2s grey-initials chip
 *     before the PNG appears
 *
 * The bundled PNGs are 256×256 (2× retina headroom for xl=128px)
 * vs the 1024² web originals. To add a new avatar:
 *   1. Update web's catalog + run scripts/generate-profile-avatars.ts
 *      to produce + upload to R2.
 *   2. Copy the new R2 PNG into this dir, resize to 256² with sips
 *      (sips --resampleHeightWidth 256 256 file.png --out file.png).
 *   3. Add the entry below + require() the new path.
 *
 * `bg` differs from web because web ships Tailwind class names
 * (`bg-crayon-green/15`) that don't apply on RN. Here we resolve to
 * explicit RGBA strings using mobile's CRAYON_PALETTE, with ~15%
 * alpha to match web's `/15` Tailwind opacity modifier.
 */

import type { ImageSourcePropType } from "react-native";
import { CRAYON_PALETTE } from "@/lib/design";

export type Avatar = {
  id: string;
  /** Display label (a11y label + initials fallback). */
  name: string;
  /** Bundled PNG asset — `require()` of the 256² file. */
  image: ImageSourcePropType;
  /** Soft tinted background colour behind the illustration. */
  bg: string;
};

// `${hex}26` ≈ 15% alpha → matches web's Tailwind `/15` modifier.
// Yellow uses 33 (~20%) to keep parity with web's `bg-crayon-yellow/20`.
const tint = (hex: string, alphaHex = "26") => `${hex}${alphaHex}`;

// Paper-cream-dark / 40 on web → a warm off-white at ~40% alpha. We
// don't have a paper-cream in mobile's palette, so use the textWarmMuted
// hue at low alpha for a similar visual.
const PAPER_CREAM_DARK_TINT = "#A8908066";

export const AVATARS: Avatar[] = [
  // Magical creatures (3) — kid wants to BE the thing.
  {
    id: "dragon",
    name: "Dragon",
    image: require("@/assets/profile-avatars/dragon.png"),
    bg: tint(CRAYON_PALETTE.green),
  },
  {
    id: "unicorn",
    name: "Unicorn",
    image: require("@/assets/profile-avatars/unicorn.png"),
    bg: tint(CRAYON_PALETTE.purple),
  },
  {
    id: "mermaid",
    name: "Mermaid",
    image: require("@/assets/profile-avatars/mermaid.png"),
    bg: tint(CRAYON_PALETTE.blue),
  },
  {
    id: "ghost",
    name: "Ghost",
    image: require("@/assets/profile-avatars/ghost.png"),
    bg: PAPER_CREAM_DARK_TINT,
  },
  // Roleplay / costume identities (3) — face-with-iconic-prop tier.
  {
    id: "superhero",
    name: "Superhero",
    image: require("@/assets/profile-avatars/superhero.png"),
    bg: tint(CRAYON_PALETTE.pink),
  },
  {
    id: "astronaut",
    name: "Astronaut",
    image: require("@/assets/profile-avatars/astronaut.png"),
    bg: tint(CRAYON_PALETTE.blue),
  },
  {
    id: "wizard",
    name: "Wizard",
    image: require("@/assets/profile-avatars/wizard.png"),
    bg: tint(CRAYON_PALETTE.purple),
  },
  {
    id: "alien",
    name: "Alien",
    image: require("@/assets/profile-avatars/alien.png"),
    bg: tint(CRAYON_PALETTE.green),
  },
  {
    id: "rocket",
    name: "Rocket",
    image: require("@/assets/profile-avatars/rocket.png"),
    bg: tint(CRAYON_PALETTE.blue),
  },
  // Friendly objects / shapes (3) — abstract no-bias picks.
  {
    id: "ice-cream",
    name: "Ice Cream",
    image: require("@/assets/profile-avatars/ice-cream.png"),
    bg: tint(CRAYON_PALETTE.pink),
  },
  {
    id: "sun",
    name: "Sun",
    image: require("@/assets/profile-avatars/sun.png"),
    bg: tint(CRAYON_PALETTE.yellow, "33"),
  },
  {
    id: "rainbow",
    name: "Rainbow",
    image: require("@/assets/profile-avatars/rainbow.png"),
    bg: tint(CRAYON_PALETTE.blue),
  },
];

// Default avatar for new profiles. Brand-friendly, no-bias starter.
export const DEFAULT_AVATAR_ID = "ice-cream";

// Legacy ID map — every old `crayon-*` or species-set id resolves
// to a sensible new tile so existing profile rows in the DB keep
// rendering after the catalog rewrite. No DB migration needed; the
// resolver transparently swaps them. Removing this map is safe
// once every active profile has been re-saved with a new id.
const LEGACY_AVATAR_MAP: Record<string, string> = {
  // Original crayon-colour ids (pre-2026 illustrated avatars).
  "crayon-red": "dragon",
  "crayon-orange": "ice-cream",
  "crayon-yellow": "sun",
  "crayon-green": "alien",
  "crayon-blue": "rocket",
  "crayon-purple": "unicorn",
  "crayon-pink": "superhero",
  "crayon-brown": "wizard",
  "crayon-teal": "mermaid",
  "crayon-coral": "astronaut",
  // First illustrated set (animals — 2026-05, replaced same month).
  cat: "ice-cream",
  dog: "ice-cream",
  bunny: "ice-cream",
  fox: "dragon",
  lion: "sun",
  panda: "ghost",
  frog: "alien",
  turtle: "mermaid",
  owl: "wizard",
  // Second illustrated set (magical creatures — 2026-05, swap day).
  fairy: "wizard",
  monster: "alien",
  robot: "astronaut",
  // Placeholder slot ids — pre-launch test rows.
  "avatar-01": "ice-cream",
  "avatar-02": "rainbow",
  "avatar-03": "unicorn",
  "avatar-04": "dragon",
  "avatar-05": "astronaut",
  // Schema default — profiles created before the picker was wired up.
  default: DEFAULT_AVATAR_ID,
};

const resolveLegacy = (avatarId: string): string =>
  LEGACY_AVATAR_MAP[avatarId] ?? avatarId;

/**
 * Get an avatar by id, transparently mapping legacy ids to their
 * replacement in the new catalog.
 */
export const getAvatar = (avatarId: string): Avatar | undefined => {
  const id = resolveLegacy(avatarId);
  return AVATARS.find((avatar) => avatar.id === id);
};

/**
 * Every avatar in the new catalog is selectable — no placeholder
 * shape any more. Kept as a function so consumers don't import the
 * raw array.
 */
export const getSelectableAvatars = (): Avatar[] => AVATARS;

/** Initials fallback when image fails to load and there's no catalog match. */
export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
