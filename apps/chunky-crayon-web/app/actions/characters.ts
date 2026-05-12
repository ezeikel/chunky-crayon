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
import { extractCharacterTraits } from '@/lib/characters/trait-extraction';
import { buildCharacterPortraitPrompt } from '@/lib/characters/portrait-prompt';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type CreateCharacterInput = {
  /** 1-24 chars; PII — never indexed / never logged as event property. */
  name: string;
  /** Parent's free-text description; ≤ 240 chars. Moderated upstream. */
  shortPrompt: string;
  /** Optional override of the LLM-suggested voice persona. */
  voicePersona?: string;
  /** HMAC token issued by `issueParentGateToken('character:create')`. */
  parentGateToken: string;
};

export type CreateCharacterResult =
  | { ok: true; characterId: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'no_active_profile'
        | 'parent_gate_required'
        | 'invalid_input'
        | 'moderation_blocked'
        | 'limit_reached'
        | 'extraction_failed'
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
  prompt: string;
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
 * Free for all signed-in users up to MAX_PER_PROFILE; the only cost gate
 * is the cap. Parent-gated; no guests allowed.
 *
 * Flow:
 *   1. Auth → parent gate → input shape.
 *   2. Cap check against the active profile.
 *   3. Moderate name + short prompt.
 *   4. Trait extraction (LLM) → moderate the extracted output too
 *      (rare but observed in bundle work — clean input can still produce
 *      unsafe output).
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

  // 1b. Parent gate
  const gateOk = await verifyParentGateToken(
    input.parentGateToken,
    'character:create',
  );
  if (!gateOk) {
    return { ok: false, error: 'parent_gate_required' };
  }

  // 1c. Input shape
  const name = input.name?.trim();
  const shortPrompt = input.shortPrompt?.trim();
  if (!name || name.length > 24) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'name must be 1-24 chars',
    };
  }
  if (!shortPrompt || shortPrompt.length > 240) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'shortPrompt must be 1-240 chars',
    };
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

  // 3. Moderate user input
  const nameMod = await moderateVoiceText(name);
  if (!nameMod.ok) {
    return { ok: false, error: 'moderation_blocked', message: nameMod.code };
  }
  const promptMod = await moderateVoiceText(shortPrompt);
  if (!promptMod.ok) {
    return { ok: false, error: 'moderation_blocked', message: promptMod.code };
  }

  // 4. Trait extraction
  let extracted;
  try {
    extracted = await extractCharacterTraits({
      name,
      shortPrompt,
      userId,
    });
  } catch (err) {
    console.error('[createCharacter] trait extraction failed:', err);
    return {
      ok: false,
      error: 'extraction_failed',
      message: err instanceof Error ? err.message : 'unknown',
    };
  }

  // 4b. Moderate the LLM output too — clean input can still produce
  //     offside output (rare but observed in bundles).
  const extractedBlob = [
    extracted.species,
    ...extracted.traits,
    ...extracted.signatureDetails,
    extracted.referenceSheetPrompt,
  ].join(' \n ');
  const extractedMod = await moderateVoiceText(extractedBlob.slice(0, 4000));
  if (!extractedMod.ok) {
    return {
      ok: false,
      error: 'moderation_blocked',
      message: `extracted:${extractedMod.code}`,
    };
  }

  const portraitPrompt = buildCharacterPortraitPrompt({ name, extracted });

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
        referenceSheetPrompt: portraitPrompt,
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
      prompt: portraitPrompt,
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
 * Regenerate the portrait for an existing character (admin / dev tool).
 * Flips status back to GENERATING and re-POSTs the worker with the same
 * stored `referenceSheetPrompt` + `signatureDetails`. Useful when a prompt
 * change is rolled out and we want to refresh an existing character without
 * the parent having to recreate it.
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
      referenceSheetPrompt: true,
      signatureDetails: true,
    },
  });
  if (!existing) return { ok: false, error: 'not_found' };

  await db.character.update({
    where: { id },
    data: { status: CharacterStatus.GENERATING, failureReason: null },
  });

  try {
    await postToWorker({
      characterId: existing.id,
      brand: BRAND,
      prompt: existing.referenceSheetPrompt,
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
