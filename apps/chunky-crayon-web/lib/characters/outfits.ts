/**
 * Outfit library — static catalogue of pre-designed line-art overlays.
 *
 * v1 ships 6 outfits drawn (or AI-generated and exported) by hand. Each
 * overlay is a transparent-background line-art SVG aligned to a fixed
 * pivot (face/torso anchor) so it composites cleanly onto any character
 * portrait via CSS / SVG <image> overlay without a per-character re-render.
 *
 * Why static + hand-drawn vs AI-generated per-character:
 *   - Predictable quality. No identity drift on the user's favourite friend.
 *   - No extra credit cost per dress action — equip is free, unlock is 5 credits.
 *   - Faster ship — no Phase 4b worker route required.
 *
 * SVG assets land under apps/chunky-crayon-web/public/characters/outfits/.
 * The actual drawings are placeholders until v1.1 art lands; the system
 * works the moment the SVGs are dropped in.
 *
 * NOTE: outfit SVGs are NOT bundled with this commit. Drop them in at
 * the listed paths before flipping the characters-feature flag on in
 * production. Until then, the OutfitPicker renders the "?" silhouette
 * fallback for unlocked outfits, which is acceptable for dev / staging.
 */

export type OutfitKey =
  | 'wizard'
  | 'astronaut'
  | 'pyjamas'
  | 'party'
  | 'raincoat'
  | 'swimsuit';

export type OutfitDefinition = {
  key: OutfitKey;
  /** Display label shown in the OutfitPicker tile. */
  label: string;
  /** Public path (under /public) to the line-art SVG overlay. */
  imagePath: string;
  /** Credit cost to unlock. Equipping after unlock is free. */
  unlockCost: number;
};

export const OUTFIT_LIBRARY: readonly OutfitDefinition[] = [
  {
    key: 'wizard',
    label: 'Wizard',
    imagePath: '/characters/outfits/wizard.svg',
    unlockCost: 5,
  },
  {
    key: 'astronaut',
    label: 'Astronaut',
    imagePath: '/characters/outfits/astronaut.svg',
    unlockCost: 5,
  },
  {
    key: 'pyjamas',
    label: 'Pyjamas',
    imagePath: '/characters/outfits/pyjamas.svg',
    unlockCost: 5,
  },
  {
    key: 'party',
    label: 'Party hat',
    imagePath: '/characters/outfits/party.svg',
    unlockCost: 5,
  },
  {
    key: 'raincoat',
    label: 'Raincoat',
    imagePath: '/characters/outfits/raincoat.svg',
    unlockCost: 5,
  },
  {
    key: 'swimsuit',
    label: 'Swimsuit',
    imagePath: '/characters/outfits/swimsuit.svg',
    unlockCost: 5,
  },
] as const;

/** Quick lookup by key. Throws on an unknown key. */
export const getOutfit = (key: string): OutfitDefinition => {
  const found = OUTFIT_LIBRARY.find((o) => o.key === key);
  if (!found) {
    throw new Error(`[outfits] unknown outfit key: ${key}`);
  }
  return found;
};

/** All valid outfit keys — useful for runtime input validation. */
export const ALL_OUTFIT_KEYS: ReadonlySet<string> = new Set(
  OUTFIT_LIBRARY.map((o) => o.key),
);
