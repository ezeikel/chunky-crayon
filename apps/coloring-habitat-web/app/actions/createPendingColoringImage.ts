"use server";
/**
 * Canvas-as-loader entrypoint (Coloring Habitat — Vercel side).
 *
 * Mirrors `apps/chunky-crayon-web/app/actions/createPendingColoringImage.ts`.
 * Differences:
 *   - `BRAND` is COLORING_HABITAT
 *   - No profile / difficulty (CH doesn't have profiles)
 *   - Adult-themed prompts come from CH's own `lib/ai`
 */
import {
  db,
  GenerationType,
  Brand,
  CreditTransactionType,
} from "@one-colored-pixel/db";
import { getUserId } from "@/app/actions/user";
import { ACTIONS } from "@/constants";
import { REFERENCE_IMAGES, prompts } from "@/lib/ai";
import { moderateVoiceText } from "@/lib/moderation";

const CREDIT_COST: Record<"text" | "photo" | "voice", number> = {
  text: 5,
  photo: 5,
  voice: 10,
};

const BRAND: Brand = "COLORING_HABITAT";

export type CreatePendingArgs =
  | { mode: "text"; description: string; locale: string }
  | { mode: "photo"; photoBase64: string; locale: string }
  | {
      mode: "voice";
      firstAnswer: string;
      secondAnswer: string;
      locale: string;
    };

export type CreatePendingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "invalid_input"
        | "moderation_blocked"
        | "insufficient_credits"
        | "worker_unavailable"
        | "unknown";
      message?: string;
      credits?: number;
    };

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
  creditCost: number;
  referenceImageUrls?: string[];
  imagesInline?: { b64: string; ext: "png" | "jpeg" | "webp" }[];
  size: "1024x1024";
  quality: "high";
  partialImages: 3;
};

const postToWorker = async (body: WorkerBody): Promise<void> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    throw new Error("CHUNKY_CRAYON_WORKER_URL not set");
  }
  const resp = await fetch(`${workerUrl}/jobs/coloring-image/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `worker /jobs/coloring-image/start failed: ${resp.status} ${text.slice(0, 300)}`,
    );
  }
};

export const createPendingColoringImage = async (
  args: CreatePendingArgs,
): Promise<CreatePendingResult> => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) return { ok: false, error: "unauthorized" };

  let description: string;
  let modeForCost: "text" | "photo" | "voice";
  if (args.mode === "text") {
    if (!args.description?.trim()) {
      return {
        ok: false,
        error: "invalid_input",
        message: "description required",
      };
    }
    description = args.description.trim();
    modeForCost = "text";
  } else if (args.mode === "voice") {
    const a1 = args.firstAnswer?.trim() ?? "";
    const a2 = args.secondAnswer?.trim() ?? "";
    if (!a1 || !a2) {
      return {
        ok: false,
        error: "invalid_input",
        message: "firstAnswer and secondAnswer required",
      };
    }
    description = `${a1} ${a2}`.trim();
    modeForCost = "voice";
  } else {
    if (!args.photoBase64) {
      return {
        ok: false,
        error: "invalid_input",
        message: "photoBase64 required",
      };
    }
    description = "";
    modeForCost = "photo";
  }

  if (description) {
    const m = await moderateVoiceText(description);
    if (!m.ok) {
      return {
        ok: false,
        error: "moderation_blocked",
        message: m.code,
      };
    }
  }

  const cost = CREDIT_COST[modeForCost];
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user || user.credits < cost) {
    return {
      ok: false,
      error: "insufficient_credits",
      credits: user?.credits ?? 0,
    };
  }
  await debitCredits(userId, cost);

  let workerBody: WorkerBody | null = null;
  let pendingRowId: string | null = null;

  try {
    const placeholder = description || "Coloring page";
    const pending = await db.coloringImage.create({
      data: {
        title: placeholder,
        description: placeholder,
        alt: placeholder,
        tags: [],
        generationType: GenerationType.USER,
        userId,
        sourcePrompt: description || undefined,
        purposeKey: args.mode === "voice" ? "voice" : undefined,
        brand: BRAND,
        status: "GENERATING",
      },
      select: { id: true },
    });
    pendingRowId = pending.id;

    if (args.mode === "photo") {
      const photoPrompt = `${prompts.PHOTO_TO_COLORING_SYSTEM}\n\n${prompts.createPhotoToColoringPrompt()}`;
      const raw = args.photoBase64.replace(/^data:image\/(\w+);base64,/, "");
      const extMatch = args.photoBase64.match(/^data:image\/(\w+);base64,/);
      const ext = (extMatch?.[1] ?? "png") as "png" | "jpeg" | "webp";
      workerBody = {
        coloringImageId: pending.id,
        prompt: photoPrompt,
        description,
        locale: args.locale,
        brand: BRAND,
        creditCost: cost,
        imagesInline: [{ b64: raw, ext }],
        size: "1024x1024",
        quality: "high",
        partialImages: 3,
      };
    } else {
      const corePrompt = prompts.createColoringImagePrompt(description);
      const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${corePrompt}`;
      workerBody = {
        coloringImageId: pending.id,
        prompt: styledPrompt,
        description,
        locale: args.locale,
        brand: BRAND,
        creditCost: cost,
        referenceImageUrls: REFERENCE_IMAGES.slice(0, 4),
        size: "1024x1024",
        quality: "high",
        partialImages: 3,
      };
    }

    await postToWorker(workerBody);
    return { ok: true, id: pending.id };
  } catch (err) {
    console.error("[createPendingColoringImage]", err);
    await refundCredits(userId, cost).catch(() => {});
    if (pendingRowId) {
      await db.coloringImage
        .update({
          where: { id: pendingRowId },
          data: {
            status: "FAILED",
            failureReason:
              err instanceof Error ? err.message.slice(0, 500) : "unknown",
          },
        })
        .catch(() => {});
    }
    return {
      ok: false,
      error: "worker_unavailable",
      message: err instanceof Error ? err.message : "unknown",
    };
  }
};
