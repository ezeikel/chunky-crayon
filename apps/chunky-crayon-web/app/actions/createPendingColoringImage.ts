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
import { REFERENCE_IMAGES, prompts } from '@/lib/ai';
import { buildCharacterAwareColoringPrompt } from '@/lib/ai/character-aware-prompts';
import { moderateVoiceText } from '@/lib/moderation';
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
   * Optional recurring character to feature in the generated page. When set,
   * we swap the standard prompt for `buildCharacterAwareColoringPrompt`,
   * prepend the character's line-art portrait to `referenceImageUrls`, and
   * record a CharacterUsage row after worker dispatch. v1 cap is one
   * character per scene (enforced here — the form picker also enforces it).
   *
   * Ignored on photo mode: the photo IS the reference there, and mixing
   * a character portrait with a kid-photo reference produces unpredictable
   * results. Photo mode also already debits 5 credits for its own pipeline.
   */
  characterId?: string;
};

export type CreatePendingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'invalid_input'
        | 'moderation_blocked'
        | 'insufficient_credits'
        | 'worker_unavailable'
        | 'character_not_ready'
        | 'unknown';
      message?: string;
      credits?: number;
    };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const debitCredits = async (userId: string, amount: number): Promise<void> => {
  await db.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });
  await db.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: CreditTransactionType.GENERATION,
    },
  });
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

type WorkerBody = {
  coloringImageId: string;
  prompt: string;
  description: string;
  locale: string;
  brand: Brand;
  /** Worker refunds this if the job ends FAILED. */
  creditCost: number;
  referenceImageUrls?: string[];
  imagesInline?: { b64: string; ext: 'png' | 'jpeg' | 'webp' }[];
  size: '1024x1024';
  quality: ImageQuality;
  partialImages: 3;
};

const postToWorker = async (body: WorkerBody): Promise<void> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    throw new Error('CHUNKY_CRAYON_WORKER_URL not set');
  }
  const resp = await fetch(`${workerUrl}/jobs/coloring-image/start`, {
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
      `worker /jobs/coloring-image/start failed: ${resp.status} ${text.slice(0, 300)}`,
    );
  }
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
    await debitCredits(userId, cost);
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
  let resolvedCharacter: ResolvedCharacter | null = null;
  if (args.characterId && args.mode !== 'photo' && userId && activeProfile) {
    const character = await db.character.findFirst({
      where: {
        id: args.characterId,
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
    if (!character || character.status !== 'READY') {
      // Refund what we just debited — character was selected client-side
      // but isn't usable. Don't penalise the user for a stale UI state.
      if (userId) {
        await refundCredits(userId, cost).catch(() => {});
      }
      return {
        ok: false,
        error: 'character_not_ready',
        message:
          character?.status === 'GENERATING'
            ? 'Character is still being drawn. Try again in a moment.'
            : 'Character is not available.',
      };
    }
    if (!character.portraitLineArtUrl) {
      // READY without a line-art URL shouldn't happen, but the column is
      // nullable in the schema. Soft-fail to refund + friendly error.
      if (userId) {
        await refundCredits(userId, cost).catch(() => {});
      }
      return {
        ok: false,
        error: 'character_not_ready',
        message: 'Character portrait is missing. Try again later.',
      };
    }
    resolvedCharacter = {
      id: character.id,
      name: character.name,
      species: character.species,
      traits: character.traits,
      signatureDetails: character.signatureDetails,
      portraitLineArtUrl: character.portraitLineArtUrl,
    };
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
      // Three prompt branches:
      //   1. Character picked → character-aware prompt + portrait at
      //      slot 0 of referenceImageUrls (cap total at 4 to stay within
      //      OpenAI's 16-ref limit with comfy headroom and to avoid
      //      drowning the character ref in style refs).
      //   2. No character + non-BEGINNER difficulty → difficulty-aware
      //      prompt (existing behaviour).
      //   3. Default → standard coloring prompt (existing behaviour).
      let corePrompt: string;
      let referenceImageUrls: string[];

      if (resolvedCharacter) {
        corePrompt = buildCharacterAwareColoringPrompt({
          description,
          locale: args.locale,
          difficulty: activeProfile?.difficulty,
          character: {
            name: resolvedCharacter.name,
            species: resolvedCharacter.species,
            traits: resolvedCharacter.traits,
            signatureDetails: resolvedCharacter.signatureDetails,
          },
        });
        // Character portrait first; then top up with brand style refs so
        // gpt-image-2 still knows the target line-art aesthetic.
        referenceImageUrls = [
          resolvedCharacter.portraitLineArtUrl,
          ...REFERENCE_IMAGES.slice(0, 3),
        ];
      } else if (
        activeProfile?.difficulty &&
        activeProfile.difficulty !== 'BEGINNER'
      ) {
        corePrompt = prompts.createDifficultyAwarePrompt(
          description,
          activeProfile.difficulty,
        );
        referenceImageUrls = REFERENCE_IMAGES.slice(0, 4);
      } else {
        corePrompt = prompts.createColoringImagePrompt(description);
        referenceImageUrls = REFERENCE_IMAGES.slice(0, 4);
      }

      const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${corePrompt}`;
      workerBody = {
        coloringImageId: pending.id,
        prompt: styledPrompt,
        description,
        locale: args.locale,
        brand: BRAND,
        creditCost: userId ? cost : 0,
        referenceImageUrls,
        size: '1024x1024',
        quality: resolvedQuality,
        partialImages: 3,
      };
    }

    await postToWorker(workerBody);

    // Record character usage AFTER the worker has accepted the job — if the
    // worker rejected (404 / 5xx), the row above flips to FAILED and there
    // was never any value to log. Unique (characterId, coloringImageId)
    // makes accidental double-writes a no-op.
    if (resolvedCharacter) {
      await db.characterUsage
        .create({
          data: {
            characterId: resolvedCharacter.id,
            coloringImageId: pending.id,
          },
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
