'use server';

/**
 * Per-character actions surfaced from the /characters/[id] profile page.
 *
 * Owns four user-facing flows:
 *   - playPresetVoiceLine  : fetch/synthesise + return URL (no credit cost)
 *   - generateCustomVoiceLine : parent-gated, 1 credit
 *   - unlockOutfit         : 5 credits, marks outfit available for equip
 *   - equipOutfit          : free, swaps the equipped outfit (or clears it)
 *
 * Plus a small `fedExercisedDressed` track event so the cosmetic
 * Feed/Exercise/Dress pills can log engagement without each pill needing
 * its own action.
 *
 * Auth + ownership: every action verifies the character belongs to the
 * current user (and is brand-scoped). Mobile parity follows the same
 * pattern as createCharacter — server action is source of truth, HTTP
 * wrapper lives in app/api/mobile/characters/* in a follow-up.
 */

import { revalidatePath } from 'next/cache';
import {
  db,
  CreditTransactionType,
  CharacterStatus,
} from '@one-colored-pixel/db';
import { ACTIONS, CHARACTER_LIMITS } from '@/constants';
import { BRAND } from '@/lib/db';
import { getUserId } from '@/app/actions/user';
import { moderateVoiceText } from '@/lib/moderation';
import { verifyParentGateToken } from '@/app/actions/parent-gate';
import {
  getOrSynthesisePresetLine,
  synthesiseCustomVoiceLine,
  type PresetSlot,
} from '@/lib/characters/voice-lines';
import {
  assertTrialSpendAllowed,
  TrialSpendCapError,
} from '@/lib/trial-spend-guard';
import {
  ALL_OUTFIT_KEYS,
  getOutfit,
  type OutfitKey,
} from '@/lib/characters/outfits';

const PRESET_SLOTS: ReadonlySet<PresetSlot> = new Set([
  'hi',
  'feed',
  'exercise',
  'dress',
  'bye',
]);

// ────────────────────────────────────────────────────────────────────────────
// Ownership helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a character only if it belongs to the calling user. Returns null
 * for unauthenticated callers or non-matches — the caller maps that to
 * a single 'not_found' error code so we never leak the existence of a
 * character to a non-owner.
 */
const fetchOwnedCharacter = async (id: string) => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);
  if (!userId) return null;
  const character = await db.character.findFirst({
    where: { id, userId, brand: BRAND },
    select: {
      id: true,
      name: true,
      voicePersona: true,
      status: true,
    },
  });
  if (!character || character.status !== CharacterStatus.READY) return null;
  return { userId, character };
};

// ────────────────────────────────────────────────────────────────────────────
// Credit helpers (duplicated from createPendingColoringImage — small and
// keeping them inline avoids exporting from that file's 'use server' module).
// ────────────────────────────────────────────────────────────────────────────

const debitCredits = async (
  userId: string,
  amount: number,
): Promise<
  { ok: true } | { ok: false; balance: number } | { ok: false; capped: true }
> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user || user.credits < amount) {
    return { ok: false, balance: user?.credits ?? 0 };
  }
  // Debit + transaction-row in one tx (previously two separate writes that
  // could leave credits decremented with no audit row). The unpaid-trial
  // cap is checked inside the same tx before the decrement so the
  // count+debit are atomic.
  try {
    await db.$transaction(async (tx) => {
      await assertTrialSpendAllowed(tx, userId);
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: CreditTransactionType.GENERATION,
        },
      });
    });
  } catch (error) {
    if (error instanceof TrialSpendCapError) {
      return { ok: false, capped: true };
    }
    throw error;
  }
  return { ok: true };
};

const refundCredits = async (userId: string, amount: number): Promise<void> => {
  await db.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await db.creditTransaction.create({
    data: {
      userId,
      amount,
      type: CreditTransactionType.GENERATION,
    },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Voice
// ────────────────────────────────────────────────────────────────────────────

export type PlayPresetVoiceLineResult =
  | { ok: true; url: string; cached: boolean }
  | { ok: false; error: 'not_found' | 'invalid_input' | 'synthesis_failed' };

export const playPresetVoiceLine = async (
  characterId: string,
  slot: string,
): Promise<PlayPresetVoiceLineResult> => {
  if (!PRESET_SLOTS.has(slot as PresetSlot)) {
    return { ok: false, error: 'invalid_input' };
  }
  const found = await fetchOwnedCharacter(characterId);
  if (!found) return { ok: false, error: 'not_found' };

  try {
    const result = await getOrSynthesisePresetLine({
      characterId: found.character.id,
      characterName: found.character.name,
      voicePersona: found.character.voicePersona,
      slot: slot as PresetSlot,
    });
    return { ok: true, url: result.url, cached: result.cached };
  } catch (err) {
    console.error('[playPresetVoiceLine]', err);
    return { ok: false, error: 'synthesis_failed' };
  }
};

export type GenerateCustomVoiceLineResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'invalid_input'
        | 'parent_gate_required'
        | 'moderation_blocked'
        | 'insufficient_credits'
        | 'trial_cap_reached'
        | 'synthesis_failed';
      balance?: number;
    };

export const generateCustomVoiceLine = async (
  characterId: string,
  text: string,
  parentGateToken: string,
): Promise<GenerateCustomVoiceLineResult> => {
  const found = await fetchOwnedCharacter(characterId);
  if (!found) return { ok: false, error: 'not_found' };

  const trimmed = text?.trim() ?? '';
  if (!trimmed || trimmed.length > CHARACTER_LIMITS.CUSTOM_VOICE_MAX_CHARS) {
    return { ok: false, error: 'invalid_input' };
  }

  const gateOk = await verifyParentGateToken(
    parentGateToken,
    'character:voice-custom',
  );
  if (!gateOk) return { ok: false, error: 'parent_gate_required' };

  const mod = await moderateVoiceText(trimmed);
  if (!mod.ok) return { ok: false, error: 'moderation_blocked' };

  const cost = CHARACTER_LIMITS.CUSTOM_VOICE_CREDIT_COST;
  const debit = await debitCredits(found.userId, cost);
  if (!debit.ok) {
    if ('capped' in debit) {
      return { ok: false, error: 'trial_cap_reached' };
    }
    return {
      ok: false,
      error: 'insufficient_credits',
      balance: debit.balance,
    };
  }

  try {
    const result = await synthesiseCustomVoiceLine({
      characterId: found.character.id,
      voicePersona: found.character.voicePersona,
      text: trimmed,
    });
    return { ok: true, url: result.url };
  } catch (err) {
    console.error('[generateCustomVoiceLine]', err);
    await refundCredits(found.userId, cost).catch(() => {});
    return { ok: false, error: 'synthesis_failed' };
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Outfits
// ────────────────────────────────────────────────────────────────────────────

export type UnlockOutfitResult =
  | { ok: true; outfit: { key: OutfitKey; imageUrl: string } }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'invalid_input'
        | 'already_unlocked'
        | 'insufficient_credits'
        | 'trial_cap_reached';
      balance?: number;
    };

export const unlockOutfit = async (
  characterId: string,
  outfitKey: string,
): Promise<UnlockOutfitResult> => {
  if (!ALL_OUTFIT_KEYS.has(outfitKey)) {
    return { ok: false, error: 'invalid_input' };
  }
  const found = await fetchOwnedCharacter(characterId);
  if (!found) return { ok: false, error: 'not_found' };

  const outfit = getOutfit(outfitKey);

  // Already unlocked? Bail without charging — the UI shouldn't reach
  // this code path but defensive idempotency is cheap.
  const existing = await db.characterOutfit.findUnique({
    where: {
      characterId_key: {
        characterId: found.character.id,
        key: outfit.key,
      },
    },
    select: { id: true, imageUrl: true },
  });
  if (existing) {
    return {
      ok: false,
      error: 'already_unlocked',
    };
  }

  const debit = await debitCredits(found.userId, outfit.unlockCost);
  if (!debit.ok) {
    if ('capped' in debit) {
      return { ok: false, error: 'trial_cap_reached' };
    }
    return {
      ok: false,
      error: 'insufficient_credits',
      balance: debit.balance,
    };
  }

  const row = await db.characterOutfit.create({
    data: {
      characterId: found.character.id,
      key: outfit.key,
      imageUrl: outfit.imagePath,
    },
    select: { id: true },
  });

  revalidatePath(`/[locale]/characters/${characterId}`, 'page');

  return {
    ok: true,
    outfit: { key: outfit.key as OutfitKey, imageUrl: outfit.imagePath },
  };
};

export type EquipOutfitResult =
  | { ok: true; equippedOutfitId: string | null }
  | { ok: false; error: 'not_found' | 'not_unlocked' };

/**
 * Equip (or clear) an outfit. Pass `null` for outfitKey to clear.
 */
export const equipOutfit = async (
  characterId: string,
  outfitKey: string | null,
): Promise<EquipOutfitResult> => {
  const found = await fetchOwnedCharacter(characterId);
  if (!found) return { ok: false, error: 'not_found' };

  if (outfitKey === null) {
    await db.character.update({
      where: { id: found.character.id },
      data: { equippedOutfitId: null },
    });
    revalidatePath(`/[locale]/characters/${characterId}`, 'page');
    return { ok: true, equippedOutfitId: null };
  }

  if (!ALL_OUTFIT_KEYS.has(outfitKey)) {
    return { ok: false, error: 'not_unlocked' };
  }

  const owned = await db.characterOutfit.findUnique({
    where: {
      characterId_key: {
        characterId: found.character.id,
        key: outfitKey,
      },
    },
    select: { id: true },
  });
  if (!owned) {
    return { ok: false, error: 'not_unlocked' };
  }

  await db.character.update({
    where: { id: found.character.id },
    data: { equippedOutfitId: owned.id },
  });

  revalidatePath(`/[locale]/characters/${characterId}`, 'page');
  return { ok: true, equippedOutfitId: owned.id };
};
