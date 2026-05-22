'use server';

/**
 * Character server actions.
 *
 * Owns the lifecycle of a `Character` row: create (parent-gated), list for
 * the active profile, fetch one, regenerate the portrait, delete. The
 * portrait generation itself happens on the worker — this action just
 * INSERTs a GENERATING row and POSTs to the worker, which writes the
 * portraits to R2 and flips the row to READY/FAILED.
 *
 * Mirrors the streaming-generation pattern documented in
 * `createPendingColoringImage`:
 *   - DB row inserted up front so the UI has an id to render against
 *   - Worker is the source of truth for the slow path
 *   - Action returns immediately; worker writes the final state
 *
 * COPPA / safety:
 *   - Parent gate token required on create + delete + (future) custom voice.
 *   - Character `name` is treated as PII: never indexed, never sent to
 *     PostHog event properties (only `characterId`).
 *   - No public sharing endpoints. Memory rule.
 */

import { revalidatePath } from 'next/cache';
import { db, Brand, CharacterStatus } from '@one-colored-pixel/db';
import { ACTIONS, CHARACTER_LIMITS } from '@/constants';
import { BRAND } from '@/lib/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { moderateVoiceText } from '@/lib/moderation';
import { verifyParentGateToken } from '@/app/actions/parent-gate';
import {
  buildCharacterLineArtPrompt,
  buildCharacterColoringPrompt,
} from '@/lib/characters/portrait-prompt';
import {
  buildShortPromptFromPicks,
  buildExtractedFromPicks,
} from '@/lib/characters/build-prompt-from-picks';
import type {
  ColorKey,
  SpeciesKey,
  TraitKey,
} from '@/lib/characters/picker-catalog';
import {
  COLOR_OPTIONS,
  MAX_TRAITS,
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
} from '@/lib/characters/picker-catalog';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type CreateCharacterInput = {
  /** 1-24 chars; PII — never indexed / never logged as event property.
   *  Kids never type this themselves — the create flow auto-generates a
   *  fun name from a curated pool keyed to species+traits. Parents can
   *  override before submit. */
  name: string;
  /** Required: which creature is the character. */
  species: SpeciesKey;
  /** Required: primary colour. Drives gpt-image-2's strongest cue. */
  color: ColorKey;
  /** 0..MAX_TRAITS personality picks. Become Character.traits verbatim. */
  traits: readonly TraitKey[];
  /** Optional override of the suggested voice persona (derived from
   *  the first trait when omitted). */
  voicePersona?: string;
};

export type CreateCharacterResult =
  | { ok: true; characterId: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'no_active_profile'
        | 'invalid_input'
        | 'moderation_blocked'
        | 'limit_reached'
        | 'worker_unavailable'
        | 'unknown';
      message?: string;
    };

// ────────────────────────────────────────────────────────────────────────────
// Worker dispatch
// ────────────────────────────────────────────────────────────────────────────

type CharacterWorkerBody = {
  characterId: string;
  brand: Brand;
  /** Prompt for call 1 — the clean line-art portrait. */
  lineArtPrompt: string;
  /** Prompt for call 2 — colour in the line-art (warm brand recipe). */
  coloringPrompt: string;
  /** QA-checkable visual features. Worker reruns gpt-image-2 with these
   *  appended on retry if the first pass misses any of them. */
  signatureDetails: readonly string[];
};

/**
 * POST the new character to the worker's /jobs/character/generate endpoint.
 * Fire-and-forget from the action's perspective — the worker updates the
 * Character row directly when it's done. Errors here flip the row to FAILED
 * so the dev viewer / future UI shows a retryable state instead of being
 * stuck in GENERATING.
 */
const postToWorker = async (body: CharacterWorkerBody): Promise<void> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    throw new Error('CHUNKY_CRAYON_WORKER_URL not set');
  }
  const resp = await fetch(`${workerUrl}/jobs/character/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(
      `worker /jobs/character/generate failed: ${resp.status} ${text.slice(
        0,
        300,
      )}`,
    );
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a new character for the active profile.
 *
 * Driven by the icon-first picker UI. The kid taps species + colour +
 * up to 3 traits; we deterministically construct the shortPrompt and
 * structured trait list — no LLM extraction call needed.
 *
 * Free for all signed-in users up to MAX_PER_PROFILE; the only cost gate
 * is the cap. No guests (action needs userId + profile).
 *
 * No parent gate: creation is the same kind of operation as making a
 * coloring page (kid describes thing → we draw it). Gating it would
 * imply it's more sensitive than scene generation, which it isn't.
 * Parent gates stay on `generateCustomVoiceLine` (1-credit purchase)
 * and `deleteCharacter` (destructive) where the trust line is real.
 *
 * Flow:
 *   1. Auth → input shape (validate picks against the catalogues).
 *   2. Cap check against the active profile.
 *   3. Moderate the auto-generated name (kid taps a button, but the
 *      name still becomes a DB row + appears in UI, so moderate it).
 *   4. Build extracted structure from picks (synchronous, no LLM).
 *   5. INSERT Character row with status=GENERATING.
 *   6. POST to worker. On failure: flip the row to FAILED and return error.
 *   7. revalidate /characters and return characterId.
 */
export const createCharacter = async (
  input: CreateCharacterInput,
): Promise<CreateCharacterResult> => {
  // 1. Auth (no guests)
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) {
    return { ok: false, error: 'unauthorized' };
  }

  // 1b. Input shape — validate the structured picks against the catalogues
  //     so a tampered client can't smuggle an unknown species through.
  const name = input.name?.trim();
  if (!name || name.length > 24) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'name must be 1-24 chars',
    };
  }
  if (!SPECIES_OPTIONS.some((s) => s.key === input.species)) {
    return { ok: false, error: 'invalid_input', message: 'unknown species' };
  }
  if (!COLOR_OPTIONS.some((c) => c.key === input.color)) {
    return { ok: false, error: 'invalid_input', message: 'unknown color' };
  }
  if (!Array.isArray(input.traits) || input.traits.length > MAX_TRAITS) {
    return { ok: false, error: 'invalid_input', message: 'too many traits' };
  }
  for (const t of input.traits) {
    if (!TRAIT_OPTIONS.some((opt) => opt.key === t)) {
      return { ok: false, error: 'invalid_input', message: 'unknown trait' };
    }
  }

  // 2. Active profile + cap
  const activeProfile = await getActiveProfile();
  if (!activeProfile) {
    return { ok: false, error: 'no_active_profile' };
  }

  const existingCount = await db.character.count({
    where: { profileId: activeProfile.id, brand: BRAND },
  });
  if (existingCount >= CHARACTER_LIMITS.MAX_PER_PROFILE) {
    return { ok: false, error: 'limit_reached' };
  }

  // 3. Moderate the name only — the picks are from a closed catalogue,
  //    so there's nothing user-typed to moderate beyond the name.
  const nameMod = await moderateVoiceText(name);
  if (!nameMod.ok) {
    return { ok: false, error: 'moderation_blocked', message: nameMod.code };
  }

  // 4. Build the extracted structure from picks. No LLM call.
  const extracted = buildExtractedFromPicks({
    species: input.species,
    color: input.color,
    traits: input.traits,
  });

  const shortPrompt = buildShortPromptFromPicks({
    species: input.species,
    color: input.color,
    traits: input.traits,
  });

  // Two single-purpose prompts: line-art (call 1) and the colour-in
  // instruction (call 2). We persist the line-art prompt as
  // `referenceSheetPrompt` (the canonical "what the character is"
  // prompt); the coloring prompt is deterministically rebuilt from the
  // stored signatureDetails on regenerate, so no extra column.
  const lineArtPrompt = buildCharacterLineArtPrompt({ name, extracted });
  const coloringPrompt = buildCharacterColoringPrompt({ name, extracted });

  // 5. INSERT GENERATING row
  let characterId: string | null = null;
  try {
    const created = await db.character.create({
      data: {
        userId,
        profileId: activeProfile.id,
        brand: BRAND,
        name,
        species: extracted.species,
        shortPrompt,
        traits: extracted.traits,
        signatureDetails: extracted.signatureDetails,
        referenceSheetPrompt: lineArtPrompt,
        voicePersona: input.voicePersona ?? extracted.suggestedVoicePersona,
        status: CharacterStatus.GENERATING,
      },
      select: { id: true },
    });
    characterId = created.id;

    // 6. Worker dispatch
    await postToWorker({
      characterId,
      brand: BRAND,
      lineArtPrompt,
      coloringPrompt,
      signatureDetails: extracted.signatureDetails,
    });
  } catch (err) {
    console.error('[createCharacter]', err);
    if (characterId) {
      await db.character
        .update({
          where: { id: characterId },
          data: {
            status: CharacterStatus.FAILED,
            failureReason:
              err instanceof Error ? err.message.slice(0, 500) : 'unknown',
          },
        })
        .catch(() => {});
    }
    return {
      ok: false,
      error: 'worker_unavailable',
      message: err instanceof Error ? err.message : 'unknown',
    };
  }

  // 7. Revalidate + return
  revalidatePath('/[locale]/characters', 'page');
  revalidatePath('/[locale]/dev/characters', 'page');
  return { ok: true, characterId };
};

/**
 * List READY + GENERATING characters owned by the active profile.
 * Sorted newest-first so a freshly-created character is at the top.
 * FAILED characters are included so the UI can offer a retry.
 */
export const listCharactersForActiveProfile = async () => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return [];

  const activeProfile = await getActiveProfile();
  if (!activeProfile) return [];

  return db.character.findMany({
    where: { profileId: activeProfile.id, brand: BRAND },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      species: true,
      traits: true,
      signatureDetails: true,
      portraitUrl: true,
      portraitLineArtUrl: true,
      status: true,
      failureReason: true,
      voicePersona: true,
      equippedOutfitId: true,
      createdAt: true,
    },
  });
};

/**
 * Fetch a character + everything the profile page renders: unlocked
 * outfits, equipped outfit, recently-played voice lines. Single round-trip
 * so the page server-component doesn't fan out into N queries.
 *
 * Returns null on auth miss / non-ownership — leaks no information about
 * whether the id exists.
 */
export const getCharacterForProfile = async (id: string) => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return null;

  return db.character.findFirst({
    where: { id, userId, brand: BRAND },
    select: {
      id: true,
      name: true,
      species: true,
      traits: true,
      signatureDetails: true,
      portraitUrl: true,
      portraitLineArtUrl: true,
      status: true,
      failureReason: true,
      voiceId: true,
      voicePersona: true,
      equippedOutfitId: true,
      equippedOutfit: {
        select: { id: true, key: true, imageUrl: true },
      },
      outfits: {
        select: { id: true, key: true, imageUrl: true, unlockedAt: true },
        orderBy: { unlockedAt: 'asc' },
      },
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Fetch a single character owned by the current user. Returns null for
 * unauthenticated requests or when the character doesn't exist / isn't
 * owned by the caller — callers should treat both cases as "not found"
 * to avoid leaking existence.
 */
export const getCharacter = async (id: string) => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return null;

  return db.character.findFirst({
    where: { id, userId, brand: BRAND },
    select: {
      id: true,
      name: true,
      species: true,
      shortPrompt: true,
      traits: true,
      signatureDetails: true,
      referenceSheetPrompt: true,
      portraitUrl: true,
      portraitLineArtUrl: true,
      status: true,
      failureReason: true,
      voiceId: true,
      voicePersona: true,
      equippedOutfitId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Delete a character. Parent-gated. Cascades to outfits, voice lines, and
 * usage rows via the schema's onDelete: Cascade settings.
 */
export const deleteCharacter = async (
  id: string,
  parentGateToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return { ok: false, error: 'unauthorized' };

  const gateOk = await verifyParentGateToken(
    parentGateToken,
    'character:delete',
  );
  if (!gateOk) return { ok: false, error: 'parent_gate_required' };

  const existing = await db.character.findFirst({
    where: { id, userId, brand: BRAND },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: 'not_found' };

  await db.character.delete({ where: { id } });
  revalidatePath('/[locale]/characters', 'page');
  return { ok: true };
};

/**
 * Regenerate the portrait for an existing character (admin / dev tool,
 * also used by the backfill script). Flips status back to GENERATING
 * and re-POSTs the worker.
 *
 * The line-art prompt is the stored `referenceSheetPrompt`. The coloring
 * prompt is rebuilt deterministically from the stored `species` +
 * `signatureDetails` (the picked colour lives in signatureDetails as a
 * "<colour> body colour" entry) — no separate column needed.
 */
export const regenerateCharacterPortrait = async (
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return { ok: false, error: 'unauthorized' };

  const existing = await db.character.findFirst({
    where: { id, userId, brand: BRAND },
    select: {
      id: true,
      name: true,
      species: true,
      traits: true,
      referenceSheetPrompt: true,
      signatureDetails: true,
    },
  });
  if (!existing) return { ok: false, error: 'not_found' };

  // Rebuild the coloring prompt from the stored structure. The line-art
  // prompt is the stored referenceSheetPrompt verbatim.
  const coloringPrompt = buildCharacterColoringPrompt({
    name: existing.name,
    extracted: {
      species: existing.species,
      traits: existing.traits,
      signatureDetails: existing.signatureDetails,
      referenceSheetPrompt: existing.referenceSheetPrompt,
      // suggestedVoicePersona is unused by the coloring prompt — a
      // valid placeholder keeps the ExtractedCharacter shape satisfied.
      suggestedVoicePersona: 'warm-girl-7yo',
    },
  });

  await db.character.update({
    where: { id },
    data: { status: CharacterStatus.GENERATING, failureReason: null },
  });

  try {
    await postToWorker({
      characterId: existing.id,
      brand: BRAND,
      lineArtPrompt: existing.referenceSheetPrompt,
      coloringPrompt,
      signatureDetails: existing.signatureDetails,
    });
  } catch (err) {
    console.error('[regenerateCharacterPortrait]', err);
    await db.character
      .update({
        where: { id },
        data: {
          status: CharacterStatus.FAILED,
          failureReason:
            err instanceof Error ? err.message.slice(0, 500) : 'unknown',
        },
      })
      .catch(() => {});
    return { ok: false, error: 'worker_unavailable' };
  }

  revalidatePath('/[locale]/dev/characters', 'page');
  revalidatePath(`/[locale]/dev/characters/${id}`, 'page');
  return { ok: true };
};
