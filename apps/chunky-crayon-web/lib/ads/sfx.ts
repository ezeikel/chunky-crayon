// Licensed transition SFX for ad videos, sourced from Epidemic Sound via
// PTP's library, stored in our R2 bucket at social/sfx/transition/.
// Pattern mirrors parking-ticket-pal/apps/web/lib/music.ts.
//
// Three variants exist — the render pipeline picks a random one per scene
// boundary so the same ad doesn't use identical whooshes back-to-back.

// Reads R2_PUBLIC_URL lazily — ES module imports are hoisted, so at
// import time dotenv.config() hasn't run yet in tsx scripts. Reading
// inside the function means the env var is resolved at call time.
function buildPool(): string[] {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return [];
  return [
    `${base}/social/sfx/transition/transition-01.mp3`,
    `${base}/social/sfx/transition/transition-02.mp3`,
    `${base}/social/sfx/transition/transition-03.mp3`,
  ];
}

/** Pick a random transition whoosh from the pool. */
export function getRandomTransitionSfx(): string | null {
  const pool = buildPool();
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** All transition SFX URLs (useful when we want per-boundary variety). */
export function getAllTransitionSfx(): string[] {
  return buildPool();
}
