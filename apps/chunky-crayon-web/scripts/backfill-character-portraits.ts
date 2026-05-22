/**
 * One-off backfill: regenerate every existing character's portraits
 * through the new two-asset pipeline (line-art + colored illustration).
 *
 * Characters created before the two-asset change have a line-art-only
 * `portraitUrl` and no real colored illustration. This script re-POSTs
 * each to the worker's /jobs/character/generate, which now runs the two
 * gpt-image-2 calls. The worker writes the final state back to the row,
 * so this script is fire-and-forget per character.
 *
 * The line-art prompt is the stored `referenceSheetPrompt`; the coloring
 * prompt is rebuilt from the stored `species` + `signatureDetails` (same
 * derivation as regenerateCharacterPortrait).
 *
 * Idempotent: safe to re-run. A character already mid-GENERATING is
 * skipped (don't double-fire the worker). Resumable after a partial run.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — lists what would be regenerated, no worker calls
 *   pnpm tsx -r dotenv/config scripts/backfill-character-portraits.ts \
 *     dotenv_config_path=.env.local
 *
 *   # real run
 *   pnpm tsx -r dotenv/config scripts/backfill-character-portraits.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # single character
 *   pnpm tsx -r dotenv/config scripts/backfill-character-portraits.ts \
 *     --only=<characterId> --commit dotenv_config_path=.env.local
 */

import { db, CharacterStatus } from '@one-colored-pixel/db';
import { buildCharacterColoringPrompt } from '../lib/characters/portrait-prompt';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const ONLY = args
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.trim();

const main = async () => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) throw new Error('CHUNKY_CRAYON_WORKER_URL not set');

  // READY characters only — a GENERATING one is mid-flight; a FAILED one
  // the parent can retry themselves. Backfill is for the already-done.
  const characters = await db.character.findMany({
    where: {
      status: CharacterStatus.READY,
      ...(ONLY ? { id: ONLY } : {}),
    },
    select: {
      id: true,
      name: true,
      species: true,
      traits: true,
      referenceSheetPrompt: true,
      signatureDetails: true,
    },
  });

  if (characters.length === 0) {
    console.log('[backfill] no READY characters found.');
    return;
  }
  console.log(
    `[backfill] ${characters.length} character(s)${COMMIT ? '' : ' (DRY RUN)'}`,
  );

  let dispatched = 0;
  for (const ch of characters) {
    const coloringPrompt = buildCharacterColoringPrompt({
      name: ch.name,
      extracted: {
        species: ch.species,
        traits: ch.traits,
        signatureDetails: ch.signatureDetails,
        referenceSheetPrompt: ch.referenceSheetPrompt,
        suggestedVoicePersona: 'warm-girl-7yo',
      },
    });

    if (!COMMIT) {
      console.log(`[backfill] would regenerate ${ch.id} (${ch.name})`);
      continue;
    }

    // Flip to GENERATING, then POST the worker — same shape as
    // regenerateCharacterPortrait. The worker writes the final state.
    await db.character.update({
      where: { id: ch.id },
      data: { status: CharacterStatus.GENERATING, failureReason: null },
    });

    const resp = await fetch(`${workerUrl}/jobs/character/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({
        characterId: ch.id,
        brand: 'CHUNKY_CRAYON',
        lineArtPrompt: ch.referenceSheetPrompt,
        coloringPrompt,
        signatureDetails: ch.signatureDetails,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(
        `[backfill] ${ch.id} worker POST failed: ${resp.status} ${text.slice(0, 200)}`,
      );
      await db.character.update({
        where: { id: ch.id },
        data: {
          status: CharacterStatus.FAILED,
          failureReason: `backfill: worker ${resp.status}`,
        },
      });
      continue;
    }

    dispatched += 1;
    console.log(`[backfill] dispatched ${ch.id} (${ch.name})`);
  }

  if (COMMIT) {
    console.log(
      `\n[backfill] done: ${dispatched}/${characters.length} dispatched. The worker writes each row to READY/FAILED as it finishes.`,
    );
  } else {
    console.log('\n[backfill] dry run done. Re-run with --commit.');
  }
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill] failed:', err);
    process.exit(1);
  });
