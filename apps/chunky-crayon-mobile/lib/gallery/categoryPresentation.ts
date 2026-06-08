/**
 * Mobile presentation layer over the SHARED gallery-category catalogue.
 *
 * The category DATA (slug, name, description, keywords, tags) is the single
 * source of truth in `@one-colored-pixel/coloring-core/gallery` (the RN-safe
 * subpath — importing the root barrel would drag the package's Node-only AI/
 * native deps into Metro and crash the bundle). This file re-attaches the
 * MOBILE presentation onto each category, keyed by `slug`:
 *   - `icon` — FA duotone, the same icon CHOICES web uses (constants.ts
 *     GALLERY_CATEGORY_PRESENTATION); only the colour format differs.
 *   - `primary` / `secondary` — the duotone hex pairing (web uses Tailwind
 *     `text-crayon-*`; we map to the same brand hex from COLORS).
 *
 * Same data-only / presentation-per-app split as scene-catalog.
 */
import {
  faPaw,
  faWandMagicSparkles,
  faDragon,
  faHorseHead,
  faCrown,
  faMask,
  faDinosaur,
  faRocket,
  faFishFins,
  faCar,
  faSkullCrossbones,
  faFlower,
  faTreeChristmas,
  faRobot,
  faPizzaSlice,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { COLORS } from "@/lib/design";

export type CategoryPresentation = {
  icon: IconDefinition;
  /** Duotone primary (brand hex matching web's text-crayon-* choice). */
  primary: string;
  /** Soft tinted background behind the icon. */
  bg: string;
};

// Brand hex from COLORS, matching web's per-category text-crayon-* choice.
const ORANGE = COLORS.crayonOrange; // #E46444
const PURPLE = COLORS.lavender; // = crayon-purple
const GREEN = COLORS.mint; // = crayon-green
const PINK = COLORS.coral; // = crayon-pink
const YELLOW = COLORS.yellow; // = crayon-yellow
const BLUE = COLORS.sky; // = crayon-blue

// 12% tint over white — the soft chip background, matching web's bg-crayon-*/10.
const tint = (hex: string) => `${hex}1F`; // 0x1F ≈ 12% alpha

const PRESENTATION: Record<string, CategoryPresentation> = {
  animals: { icon: faPaw, primary: ORANGE, bg: tint(ORANGE) },
  fantasy: { icon: faWandMagicSparkles, primary: PURPLE, bg: tint(PURPLE) },
  dragons: { icon: faDragon, primary: GREEN, bg: tint(GREEN) },
  unicorns: { icon: faHorseHead, primary: PINK, bg: tint(PINK) },
  princesses: { icon: faCrown, primary: PURPLE, bg: tint(PURPLE) },
  superheroes: { icon: faMask, primary: YELLOW, bg: tint(YELLOW) },
  dinosaurs: { icon: faDinosaur, primary: GREEN, bg: tint(GREEN) },
  space: { icon: faRocket, primary: BLUE, bg: tint(BLUE) },
  underwater: { icon: faFishFins, primary: GREEN, bg: tint(GREEN) },
  vehicles: { icon: faCar, primary: ORANGE, bg: tint(ORANGE) },
  pirates: { icon: faSkullCrossbones, primary: PURPLE, bg: tint(PURPLE) },
  nature: { icon: faFlower, primary: GREEN, bg: tint(GREEN) },
  holidays: { icon: faTreeChristmas, primary: PINK, bg: tint(PINK) },
  robots: { icon: faRobot, primary: BLUE, bg: tint(BLUE) },
  food: { icon: faPizzaSlice, primary: ORANGE, bg: tint(ORANGE) },
};

const FALLBACK: CategoryPresentation = {
  icon: faPaw,
  primary: ORANGE,
  bg: tint(ORANGE),
};

/** Presentation (icon + duotone hex) for a category slug. */
export const getCategoryPresentation = (slug: string): CategoryPresentation =>
  PRESENTATION[slug] ?? FALLBACK;
