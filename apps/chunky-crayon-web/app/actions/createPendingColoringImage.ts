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
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { ACTIONS } from '@/constants';
import { REFERENCE_IMAGES, prompts } from '@/lib/ai';
import { moderateVoiceText } from '@/lib/moderation';
import {
  generateQuickTitleFromVoice,
  generateQuickTitleFromPhoto,
} from '@/app/actions/quickTitle';

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

export type CreatePendingArgs =
  | { mode: 'text'; description: string; locale: string }
  | { mode: 'photo'; photoBase64: string; locale: string }
  | {
      mode: 'voice';
      firstAnswer: string;
      secondAnswer: string;
      locale: string;
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
  quality: 'high';
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

  // Credit pre-flight + debit. Debited up-front so concurrent submissions
  // can't both succeed against a near-empty balance. Refund happens via
  // the worker's markFailed path when the job ends FAILED.
  // Guests skip credits entirely — they get N free generations gated
  // client-side; voice mode would have already returned unauthorized.
  const cost = CREDIT_COST[modeForCost];
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user || user.credits < cost) {
      return {
        ok: false,
        error: 'insufficient_credits',
        credits: user?.credits ?? 0,
      };
    }
    await debitCredits(userId, cost);
  }

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
        quality: 'high',
        partialImages: 3,
      };
    } else {
      const corePrompt =
        activeProfile?.difficulty && activeProfile.difficulty !== 'BEGINNER'
          ? prompts.createDifficultyAwarePrompt(
              description,
              activeProfile.difficulty,
            )
          : prompts.createColoringImagePrompt(description);
      const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${corePrompt}`;
      workerBody = {
        coloringImageId: pending.id,
        prompt: styledPrompt,
        description,
        locale: args.locale,
        brand: BRAND,
        creditCost: userId ? cost : 0,
        referenceImageUrls: REFERENCE_IMAGES.slice(0, 4),
        size: '1024x1024',
        quality: 'high',
        partialImages: 3,
      };
    }

    await postToWorker(workerBody);
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
