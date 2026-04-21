// Model adapters for b-roll generation. Each adapter wraps a fal.ai
// endpoint + its input field names + any model-specific prompt
// seasoning. Adapters receive EXPANDED prompts — the template system
// (lib/ads/prompt-templates.ts) runs in generate-broll.ts before this,
// so adapters just consume a plain motion prompt string.
//
// Exported so scripts/compare-broll-models.ts can reuse them without
// duplicating the per-model logic.

import { fal } from '@fal-ai/client';
import type { BrollModel, BrollSpec } from '../lib/ads/schema';

export type AdapterArgs = {
  spec: BrollSpec;
  /** Fully-expanded motion prompt (template + variables already resolved). */
  motionPrompt: string;
  startStillUrl: string;
  endStillUrl: string | null;
  /** Optional seed for reproducibility / `--vary` retries. */
  seed?: number;
};

export type ModelAdapter = {
  label: string;
  run: (args: AdapterArgs) => Promise<string>;
};

function logProgress(update: {
  status: string;
  logs?: Array<{ message?: string }>;
}) {
  if (update.status === 'IN_PROGRESS') {
    const lastMsg = update.logs?.[update.logs.length - 1]?.message;
    if (lastMsg) console.log(`     · ${lastMsg}`);
  }
}

function extractVideoUrl(
  data: unknown,
  modelLabel: string,
  stableId: string,
): string {
  const url = (data as { video?: { url?: string } })?.video?.url;
  if (!url) {
    throw new Error(
      `${modelLabel} returned no video for ${stableId}: ${JSON.stringify(data)}`,
    );
  }
  return url;
}

const SEEDANCE_ADAPTER: ModelAdapter = {
  label: 'Seedance 2',
  async run({ spec, motionPrompt, startStillUrl, endStillUrl, seed }) {
    const result = await fal.subscribe(
      'bytedance/seedance-2.0/image-to-video',
      {
        input: {
          image_url: startStillUrl,
          end_image_url: endStillUrl ?? startStillUrl,
          prompt: motionPrompt,
          resolution: spec.resolution ?? '720p',
          duration: String(spec.durationSeconds ?? 5),
          aspect_ratio: '9:16',
          generate_audio: false,
          ...(seed !== undefined ? { seed } : {}),
        },
        logs: true,
        onQueueUpdate: logProgress,
      },
    );
    return extractVideoUrl(result.data, 'Seedance', spec.stableId);
  },
};

const KLING_ADAPTER: ModelAdapter = {
  label: 'Kling v3 Pro',
  async run({ spec, motionPrompt, startStillUrl, endStillUrl, seed }) {
    // Kling likes terser prompts + explicit camera direction. Prefix a
    // camera-lock instruction so it doesn't wander.
    // Field names per Kling v3 Pro fal schema:
    //   start_image_url (required) — not image_url
    //   end_image_url (optional)   — not tail_image_url
    const prompt = `Camera static. No camera pan, tilt, or zoom. ${motionPrompt}`;
    const result = await fal.subscribe(
      'fal-ai/kling-video/v3/pro/image-to-video',
      {
        input: {
          start_image_url: startStillUrl,
          end_image_url: endStillUrl ?? undefined,
          prompt,
          duration: String(spec.durationSeconds ?? 5),
          negative_prompt:
            'camera movement, camera pan, zoom, morph, distortion, warping, extra hands, text artifacts',
          ...(seed !== undefined ? { seed } : {}),
        },
        logs: true,
        onQueueUpdate: logProgress,
      },
    );
    return extractVideoUrl(result.data, 'Kling', spec.stableId);
  },
};

const VEO_ADAPTER: ModelAdapter = {
  label: 'Veo 3.1 (first-last-frame)',
  async run({ spec, motionPrompt, startStillUrl, endStillUrl, seed }) {
    // Veo responds well to cinematographic language. Prepend lens + shot.
    const prompt = `Medium overhead shot on a prime lens, handheld cozy home feel, shallow depth of field, natural morning window light. ${motionPrompt}`;
    // Veo only supports 4/6/8s. Round our spec up to the nearest.
    const requestedDur = spec.durationSeconds ?? 5;
    const veoDur = requestedDur <= 4 ? '4s' : requestedDur <= 6 ? '6s' : '8s';

    const endpoint = endStillUrl
      ? 'fal-ai/veo3.1/first-last-frame-to-video'
      : 'fal-ai/veo3.1/image-to-video';
    const input: Record<string, unknown> = endStillUrl
      ? {
          first_frame_url: startStillUrl,
          last_frame_url: endStillUrl,
          prompt,
          aspect_ratio: '9:16',
          duration: veoDur,
          resolution: spec.resolution ?? '720p',
          generate_audio: false,
        }
      : {
          image_url: startStillUrl,
          prompt,
          aspect_ratio: '9:16',
          duration: veoDur,
          resolution: spec.resolution ?? '720p',
          generate_audio: false,
        };
    try {
      const result = await fal.subscribe(endpoint, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: input as any,
        logs: true,
        onQueueUpdate: logProgress,
      });
      return extractVideoUrl(result.data, 'Veo', spec.stableId);
    } catch (err) {
      // Surface fal's validation detail — the default message "Unprocessable
      // Entity" hides the actual per-field errors. Re-throw with the full body.
      const e = err as { body?: unknown; message?: string };
      const detail = e.body ? JSON.stringify(e.body, null, 2) : e.message;
      throw new Error(
        `Veo endpoint ${endpoint} rejected input:\n${detail}\n\ninput was: ${JSON.stringify(input, null, 2)}`,
      );
    }
  },
};

export const ADAPTERS: Record<BrollModel, ModelAdapter> = {
  'seedance-2': SEEDANCE_ADAPTER,
  'kling-v3-pro': KLING_ADAPTER,
  'veo-3.1': VEO_ADAPTER,
};
