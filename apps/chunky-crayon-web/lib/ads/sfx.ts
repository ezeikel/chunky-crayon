// Licensed transition SFX for ad videos, sourced from Epidemic Sound via
// PTP's library, stored in our R2 bucket at social/sfx/transition/.
// Pattern mirrors parking-ticket-pal/apps/web/lib/music.ts.
//
// Three variants exist — the render pipeline picks a random one per scene
// boundary so the same ad doesn't use identical whooshes back-to-back.

const { R2_PUBLIC_URL } = process.env;

const TRANSITION_SFX = R2_PUBLIC_URL
  ? [
      `${R2_PUBLIC_URL}/social/sfx/transition/transition-01.mp3`,
      `${R2_PUBLIC_URL}/social/sfx/transition/transition-02.mp3`,
      `${R2_PUBLIC_URL}/social/sfx/transition/transition-03.mp3`,
    ]
  : [];

/** Pick a random transition whoosh from the pool. */
export function getRandomTransitionSfx(): string | null {
  if (!TRANSITION_SFX.length) return null;
  return TRANSITION_SFX[Math.floor(Math.random() * TRANSITION_SFX.length)];
}

/** All transition SFX URLs (useful when we want per-boundary variety). */
export function getAllTransitionSfx(): string[] {
  return [...TRANSITION_SFX];
}
