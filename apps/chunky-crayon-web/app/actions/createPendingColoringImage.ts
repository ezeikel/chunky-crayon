'use server';
/**
 * Canvas-as-loader entrypoint (Vercel side).
 *
 * Replaces the legacy `/api/coloring-image/generate-stream` SSE proxy. The
 * form action calls this once for any of the three modes (text/photo/voice);
 * we auth, moderate, debit credits, INSERT a `coloring_images` row with
 * status=GENERATING, and POST the worker `/jobs/coloring-image/start` to
 * kick off the detached OpenAI stream. Returns `{id}` so the form can
 * `router.push('/coloring-image/${id}')` immediately. The browser then
 * subscribes to `/api/coloring-image/[id]/events` (SSE passthrough to the
 * worker's LISTEN/NOTIFY-backed stream) to render partials + final.
 *
 * Why a server action and not a route handler:
 *   - Server actions are called directly from server components and forms,
 *     no JSON wire format to design.
 *   - Mobile parity not yet required for this surface (the mobile app has
 *     its own create flow). When that lands, an HTTP wrapper around this
 *     action is the right pattern (per CLAUDE.md "actions are the source
 *     of truth").
 *
 * Does NOT:
 *   - Stream partials (worker owns that — pg_notify drives SSE)
 *   - Persist the final image (worker does this on `image_completed`)
 *   - Refund credits (handled separately when worker reports FAILED)
 */
import { db, GenerationType, Brand } from '@one-colored-pixel/db';
import { CreditTransactionType } from '@one-colored-pixel/db';
import {
  type ImageQuality,
  clampQuality,
  resolveDefaultQuality,
} from '@one-colored-pixel/coloring-core/image-quality';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { ACTIONS } from '@/constants';
import { prompts } from '@/lib/ai';
import {
  type WorkerBody,
  postToWorker,
  buildTextModeWorkerBody,
} from '@/lib/coloring-worker';
import { moderateVoiceText } from '@/lib/moderation';
import {
  assertTrialSpendAllowed,
  TrialSpendCapError,
} from '@/lib/trial-spend-guard';
import { TRIAL_GENERATION_CAP } from '@/lib/trial-policy';
import {
  generateQuickTitleFromVoice,
  generateQuickTitleFromPhoto,
} from '@/app/actions/quickTitle';
import {
  readClientMatchData,
  sendLeadConversionEvents,
} from '@/lib/conversion-api';

// Mode-specific credit cost. Voice runs richer pipelines upstream
// (Deepgram STT + Claude follow-up + ElevenLabs TTS) so it costs more.
const CREDIT_COST: Record<'text' | 'photo' | 'voice', number> = {
  text: 5,
  photo: 5,
  voice: 10,
};

// Per-app brand. Chunky Crayon ships these prompts; coloring-habitat-web
// will pass its own brand when it wires this same action up. Defaulting
// to CC keeps the action a one-liner change for CH.
const BRAND: Brand = 'CHUNKY_CRAYON';

// ----------------------------------------------------------------------------
// Input + result types
// ----------------------------------------------------------------------------

export type CreatePendingArgs = (
  | { mode: 'text'; description: string; locale: string }
  | { mode: 'photo'; photoBase64: string; locale: string }
  | {
      mode: 'voice';
      firstAnswer: string;
      secondAnswer: string;
      locale: string;
    }
) & {
  /** Quality tier the user picked in the form. Server clamps to the user's
   *  allowed tiers (free/guest get capped at 'medium'). When omitted,
   *  resolves to a tier-appropriate default. */
  quality?: ImageQuality;
  /**
   * Optional recurring character(s) to feature in the generated page (up to
   * MAX_CHARACTERS_PER_PAGE, any mix of the kid's saved characters). When set,
   * we swap the standard prompt for `buildCharacterAwareColoringPrompt`,
   * prepend each character's line-art portrait to `referenceImageUrls` in
   * order, and record a CharacterUsage row per character after worker
   * dispatch. Ownership + READY are verified server-side for every id.
   *
   * Ignored on photo mode: the photo IS the reference there, and mixing
   * a character portrait with a kid-photo reference produces unpredictable
   * results. Photo mode also already debits 5 credits for its own pipeline.
   */
  characterIds?: string[];
};

// Hard cap on featured characters per page (mirrors MAX_SUBJECTS=2 in the
// scene catalogue + the picker). gpt-image-2 multi-subject fidelity is
// fragile, so two is the ceiling.
const MAX_CHARACTERS_PER_PAGE = 2;

export type CreatePendingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'invalid_input'
        | 'moderation_blocked'
        | 'insufficient_credits'
        | 'trial_cap_reached'
        | 'worker_unavailable'
        | 'character_not_ready'
        | 'unknown';
      message?: string;
      credits?: number;
    };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// Returns false when blocked by the unpaid-trial spend cap. Debit +
// audit-row now run in one tx (previously two separate writes) with the
// cap checked inside it before the decrement, so count+debit are atomic.
const debitCredits = async (
  userId: string,
  amount: number,
): Promise<{ ok: true } | { ok: false; capped: true }> => {
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

// ----------------------------------------------------------------------------
// Action
// ----------------------------------------------------------------------------

export const createPendingColoringImage = async (
  args: CreatePendingArgs,
): Promise<CreatePendingResult> => {
  // userId can be undefined for guests on text/photo. Voice mode requires
  // sign-in (10 credits, no guest path). The guest free-tries cap is
  // enforced client-side via useUser; server-side rate-limiting + Vercel
  // function-level throttling keep abuse down.
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (args.mode === 'voice' && !userId) {
    return { ok: false, error: 'unauthorized' };
  }

  // Per-mode validation + description build.
  let description: string;
  let modeForCost: 'text' | 'photo' | 'voice';
  if (args.mode === 'text') {
    if (!args.description?.trim()) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'description required',
      };
    }
    description = args.description.trim();
    modeForCost = 'text';
  } else if (args.mode === 'voice') {
    const a1 = args.firstAnswer?.trim() ?? '';
    const a2 = args.secondAnswer?.trim() ?? '';
    if (!a1 || !a2) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'firstAnswer and secondAnswer required',
      };
    }
    description = `${a1} ${a2}`.trim();
    modeForCost = 'voice';
  } else {
    if (!args.photoBase64) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'photoBase64 required',
      };
    }
    description = ''; // photo mode: no kid-typed prompt
    modeForCost = 'photo';
  }

  // Moderation — text + voice only. Photos are moderated upstream by
  // OpenAI's vision model when it tries to convert them; we don't run a
  // separate kid-photo moderation pass.
  if (description) {
    const m = await moderateVoiceText(description);
    if (!m.ok) {
      return {
        ok: false,
        error: 'moderation_blocked',
        message: m.code,
      };
    }
  }

  // Credit pre-flight + debit + subscriber check (used to clamp quality).
  // Debited up-front so concurrent submissions can't both succeed against
  // a near-empty balance. Refund happens via the worker's markFailed path
  // when the job ends FAILED. Guests skip credits entirely — they get N
  // free generations gated client-side; voice mode would have already
  // returned unauthorized.
  const cost = CREDIT_COST[modeForCost];
  let isSubscriber = false;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        subscriptions: {
          where: { OR: [{ status: 'ACTIVE' }, { status: 'TRIALING' }] },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!user || user.credits < cost) {
      return {
        ok: false,
        error: 'insufficient_credits',
        credits: user?.credits ?? 0,
      };
    }
    isSubscriber = user.subscriptions.length > 0;
    const debit = await debitCredits(userId, cost);
    if (!debit.ok) {
      return {
        ok: false,
        error: 'trial_cap_reached',
        message: `Your free trial includes ${TRIAL_GENERATION_CAP} creations. Add a payment method to keep creating.`,
        credits: user.credits,
      };
    }
  }

  // Resolve final quality. If the user passed one, clamp it to what their
  // tier is allowed (free/guest capped at 'medium'). If they didn't, fall
  // back to the tier-appropriate default ('low' for free/guest, 'high'
  // for subscribers).
  const resolvedQuality: ImageQuality = args.quality
    ? clampQuality({ requested: args.quality, isSubscriber })
    : resolveDefaultQuality({ isSubscriber });

  // Quick title + subject for the streaming-canvas view. The page reads
  // `title` for its heading and `sourcePrompt` for Colo's voiceover script.
  // Without this, voice mode shows the verbose transcript as the title and
  // photo mode falls back to a generic "Coloring page" — Colo says "Wow,
  // a coloring page!" instead of "Wow, a fluffy puppy!".
  //
  // Text mode skips this entirely — the typed description IS already a good
  // title and subject. Voice runs a fast text-only Sonnet call (~700ms);
  // photo runs a vision call on the b64 (~1.5-2.5s). The worker still
  // overwrites `title` with its own richer "X Coloring Page" version at
  // persist time once the image is generated.
  let quickTitle: string | null = null;
  let quickSubject: string | null = null;
  if (args.mode === 'voice') {
    try {
      const r = await generateQuickTitleFromVoice(
        args.firstAnswer,
        args.secondAnswer,
      );
      quickTitle = r.title;
      quickSubject = r.subject;
      console.log(
        `[createPendingColoringImage] quick-title voice → title="${quickTitle}" subject="${quickSubject}"`,
      );
    } catch (err) {
      console.warn(
        '[createPendingColoringImage] voice quick-title failed:',
        err,
      );
    }
  } else if (args.mode === 'photo') {
    try {
      const r = await generateQuickTitleFromPhoto(args.photoBase64);
      quickTitle = r.title;
      quickSubject = r.subject;
      console.log(
        `[createPendingColoringImage] quick-title photo → title="${quickTitle}" subject="${quickSubject}"`,
      );
    } catch (err) {
      console.warn(
        '[createPendingColoringImage] photo quick-title failed:',
        err,
      );
    }
  }

  // Build the OpenAI prompt + image inputs.
  const activeProfile = await getActiveProfile();

  // Optional character pre-fetch. Ownership + READY status are verified
  // before we touch the prompt or reference image list — a stale id from
  // the client must NOT leak someone else's portrait into a stranger's
  // page. Ignored on photo mode (see CreatePendingArgs comment).
  type ResolvedCharacter = {
    id: string;
    name: string;
    species: string;
    traits: string[];
    signatureDetails: string[];
    portraitLineArtUrl: string;
  };
  const resolvedCharacters: ResolvedCharacter[] = [];
  // Dedup + cap the requested ids (a stale client could send dupes / too
  // many). Order is preserved so the portrait order matches the picker.
  const requestedIds = Array.from(new Set(args.characterIds ?? [])).slice(
    0,
    MAX_CHARACTERS_PER_PAGE,
  );
  if (
    requestedIds.length > 0 &&
    args.mode !== 'photo' &&
    userId &&
    activeProfile
  ) {
    // One query for all requested ids, scoped to the owner + active profile —
    // a stale id from the client must NOT leak someone else's portrait.
    const found = await db.character.findMany({
      where: {
        id: { in: requestedIds },
        userId,
        profileId: activeProfile.id,
        brand: BRAND,
      },
      select: {
        id: true,
        name: true,
        species: true,
        traits: true,
        signatureDetails: true,
        portraitLineArtUrl: true,
        status: true,
      },
    });
    const byId = new Map(found.map((c) => [c.id, c]));
    // Validate EVERY requested id (strict — don't silently drop a friend the
    // kid picked). Any not-owned / not-READY / missing-portrait → refund +
    // friendly error, same as the single-character path did.
    const refundAndFail = async (
      message: string,
    ): Promise<CreatePendingResult> => {
      if (userId) await refundCredits(userId, cost).catch(() => {});
      return { ok: false, error: 'character_not_ready', message };
    };
    for (const id of requestedIds) {
      const c = byId.get(id);
      if (!c || c.status !== 'READY') {
        return refundAndFail(
          c?.status === 'GENERATING'
            ? 'A friend is still being drawn. Try again in a moment.'
            : 'A friend is not available.',
        );
      }
      if (!c.portraitLineArtUrl) {
        return refundAndFail(
          'A friend’s portrait is missing. Try again later.',
        );
      }
      resolvedCharacters.push({
        id: c.id,
        name: c.name,
        species: c.species,
        traits: c.traits,
        signatureDetails: c.signatureDetails,
        portraitLineArtUrl: c.portraitLineArtUrl,
      });
    }
  }

  let workerBody: WorkerBody | null = null;
  let pendingRowId: string | null = null;

  try {
    // INSERT the GENERATING row first so we have an id to thread into the
    // R2 paths the worker will write. title/description/alt are placeholder
    // until persist replaces them with AI-generated metadata.
    //
    // For voice and photo modes, `quickTitle` and `quickSubject` come from
    // the AI quick-pass above and feed the streaming-page heading + Colo's
    // voiceover until the worker stamps the final title at persist time.
    const placeholder = quickTitle || description || 'Coloring page';
    const sourceForVoiceover = quickSubject || description || undefined;
    const pending = await db.coloringImage.create({
      data: {
        title: placeholder,
        description: placeholder,
        alt: placeholder,
        tags: [],
        generationType: GenerationType.USER,
        // Null userId is supported for guest-created rows (community gallery).
        userId: userId ?? undefined,
        profileId: activeProfile?.id ?? undefined,
        sourcePrompt: sourceForVoiceover,
        purposeKey: args.mode === 'voice' ? 'voice' : undefined,
        difficulty:
          activeProfile?.difficulty && activeProfile.difficulty !== 'BEGINNER'
            ? activeProfile.difficulty
            : undefined,
        brand: BRAND,
        status: 'GENERATING',
      },
      select: { id: true },
    });
    pendingRowId = pending.id;

    if (args.mode === 'photo') {
      const photoPrompt = `${prompts.PHOTO_TO_COLORING_SYSTEM}\n\n${prompts.createPhotoToColoringPrompt(
        activeProfile?.difficulty && activeProfile.difficulty !== 'BEGINNER'
          ? activeProfile.difficulty
          : undefined,
      )}`;
      const raw = args.photoBase64.replace(/^data:image\/(\w+);base64,/, '');
      const extMatch = args.photoBase64.match(/^data:image\/(\w+);base64,/);
      const ext = (extMatch?.[1] ?? 'png') as 'png' | 'jpeg' | 'webp';
      workerBody = {
        coloringImageId: pending.id,
        prompt: photoPrompt,
        description,
        locale: args.locale,
        brand: BRAND,
        creditCost: userId ? cost : 0,
        imagesInline: [{ b64: raw, ext }],
        size: '1024x1024',
        quality: resolvedQuality,
        partialImages: 3,
      };
    } else {
      // Text + voice modes share the same prompt-build path: optional
      // character ref, difficulty-aware fallback, then the standard
      // prompt. Lives in lib/coloring-worker.ts so the comment-request
      // flow can reuse it without dragging credits/auth into that path.
      workerBody = buildTextModeWorkerBody({
        coloringImageId: pending.id,
        description,
        locale: args.locale,
        brand: BRAND,
        quality: resolvedQuality,
        creditCost: userId ? cost : 0,
        difficulty: activeProfile?.difficulty ?? undefined,
        characters:
          resolvedCharacters.length > 0
            ? resolvedCharacters.map((c) => ({
                name: c.name,
                species: c.species,
                traits: c.traits,
                signatureDetails: c.signatureDetails,
                portraitLineArtUrl: c.portraitLineArtUrl,
              }))
            : undefined,
      });
    }

    await postToWorker(workerBody);

    // Record character usage AFTER the worker has accepted the job — if the
    // worker rejected (404 / 5xx), the row above flips to FAILED and there
    // was never any value to log. Unique (characterId, coloringImageId)
    // makes accidental double-writes a no-op; createMany skipDuplicates does
    // the whole set in one round-trip.
    if (resolvedCharacters.length > 0) {
      await db.characterUsage
        .createMany({
          data: resolvedCharacters.map((c) => ({
            characterId: c.id,
            coloringImageId: pending.id,
          })),
          skipDuplicates: true,
        })
        .catch((err) => {
          // Non-fatal: feature engagement analytics shouldn't tank a
          // successful generation. Log and move on.
          console.warn(
            '[createPendingColoringImage] CharacterUsage insert failed:',
            err,
          );
        });
    }

    // Server-side Lead event for Meta + Pinterest. Mirrors the browser
    // trackLead fire from CreateColoringPageForm — gives Meta the
    // intent signal even when the browser pixel is blocked (iOS
    // in-app browsers, ad blockers). eventId = pending.id matches the
    // client fire so Meta deduplicates. Fire-and-forget; CAPI failures
    // must never block image creation.
    void (async () => {
      try {
        const match = await readClientMatchData();
        const email = userId
          ? ((
              await db.user.findUnique({
                where: { id: userId },
                select: { email: true },
              })
            )?.email ?? undefined)
          : undefined;
        await sendLeadConversionEvents({
          email,
          userId: userId ?? undefined,
          eventId: pending.id,
          contentName: description || 'Coloring Page',
          contentCategory: 'coloring_page_creation',
          ...match,
        });
      } catch (err) {
        console.error('[createPendingColoringImage] Lead CAPI failed:', err);
      }
    })();

    return { ok: true, id: pending.id };
  } catch (err) {
    console.error('[createPendingColoringImage]', err);
    // Best-effort cleanup: refund + flip the row to FAILED so it doesn't
    // sit in GENERATING. Stale-row cron would catch it eventually but we
    // know now, no need to wait. Guests have nothing to refund.
    if (userId) {
      await refundCredits(userId, cost).catch(() => {});
    }
    if (pendingRowId) {
      await db.coloringImage
        .update({
          where: { id: pendingRowId },
          data: {
            status: 'FAILED',
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
};
