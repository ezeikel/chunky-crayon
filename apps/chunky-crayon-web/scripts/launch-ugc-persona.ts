/**
 * UGC persona launch orchestrator.
 *
 * Single command that takes a vibe string ("32yo Latina mom in Austin")
 * and produces a fully-drafted Persona row + all associated R2 assets,
 * ready for the operator to review in /admin/ugc and then lock for
 * warming.
 *
 * Steps (each is independently re-runnable via --only=):
 *
 *   dossier — Perplexity + Claude Opus 4.7 ×2; FaceBrief, handleOptions,
 *             displayName, bio, voiceDesignPrompt, followList,
 *             likeTargets, commentTargets, warmUpPlan
 *   face    — GPT Image 2 canonical face still → R2
 *   pfp     — Nano Banana Pro identity-locked + reverse-image-search
 *             gate (up to 3 retries on full-match hits) → R2
 *   voice   — ElevenLabs Voice Design 3 previews → R2; preview ids
 *             stashed in Persona.notes until operator commits in admin
 *   warmup  — 6 faceless Seedance b-roll clips → R2 + UgcWarmUpClip rows
 *   actions — UgcWarmUpAction rows from the dossier's warmUpPlan
 *
 * Default: run all of them. Use --only=warmup or --only=face,pfp to
 * re-roll specific assets without touching the others. When --only
 * skips the dossier step, this script loads the existing FaceBrief and
 * warmUpPlan from the DB row keyed on --handle.
 *
 * After this finishes, the persona is in DRAFTING in the DB. Operator
 * reviews everything in /admin/ugc, picks a voice preview, optionally
 * changes the handle (regenerates asset paths), then flips status to
 * WARMING which triggers the next manual phase (provision device + SIM
 * + proxy, create TikTok account, work through warmUpActions).
 *
 * Cost (approximate Higgsfield credits + ElevenLabs) FULL RUN:
 *   - Persona dossier (Anthropic + Perplexity): ~$0.10 total
 *   - Canonical face still (GPT Image 2): ~15 credits
 *   - PFP (Nano Banana Pro, may retry ×3): ~10-30 credits
 *   - Voice Design (3 previews): ~$0.10 ElevenLabs
 *   - Warm-up clips (Seedance 2.0 ×6): ~180 credits
 *   Total: ~205-225 credits per persona + ~$0.30 in API spend.
 *
 * Wall-clock: ~30-60 min total full run (warm-up clips dominate;
 * sequential). --only=warmup alone is ~20-30 min.
 *
 * Usage:
 *   pnpm tsx -r dotenv/config scripts/launch-ugc-persona.ts \
 *     --vibe="32-year-old Latina stay-at-home mom in Austin, warm relatable vibe" \
 *     dotenv_config_path=.env.local
 *
 *   --dry              Skip all API calls + DB writes
 *   --handle=...       Force a specific handle. Required when --only
 *                      skips dossier (no other way to identify the persona).
 *   --only=warmup      Comma-separated subset: dossier,face,pfp,voice,warmup,actions
 *
 * Examples:
 *   # Re-roll just the warm-up clips against an existing persona
 *   ... --handle=mariposa.mami --only=warmup
 *
 *   # Re-roll face + PFP (regenerates the persona's identity stills)
 *   ... --handle=mariposa.mami --only=face,pfp
 *
 *   # Re-roll voice previews only
 *   ... --handle=mariposa.mami --only=voice
 */

import { db } from '@one-colored-pixel/db';
import {
  generatePersonaDossier,
  type PersonaDossier,
} from '../lib/ugc-ads/persona-generator';
import {
  generateCanonicalFace,
  generatePfp,
} from '../lib/ugc-ads/still-generator';
import {
  assertPfpIsUnique,
  ReverseImageGateError,
} from '../lib/ugc-ads/reverse-image-check';
import { designVoicePreviews } from '../lib/ugc-ads/voice-design';
import { generateWarmupClips } from '../lib/ugc-ads/warmup-generator';
import { ugcCampaignKey } from '../lib/ugc-ads/utm';
import {
  parseFaceBrief,
  type FaceBrief,
  type WarmUpAction,
} from '../lib/ugc-ads/types';
import { WarmUpActionSchema } from '../lib/ugc-ads/types';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────
// Step set
// ─────────────────────────────────────────────────────────────────────

const ALL_STEPS = [
  'dossier',
  'face',
  'pfp',
  'voice',
  'warmup',
  'actions',
] as const;
type Step = (typeof ALL_STEPS)[number];

const PFP_RETRY_BUDGET = 3;

type LaunchOptions = {
  vibe?: string;
  handle?: string;
  dryRun?: boolean;
  only?: Set<Step>;
};

const isStep = (s: string): s is Step =>
  (ALL_STEPS as readonly string[]).includes(s);

async function launch(opts: LaunchOptions): Promise<void> {
  const only = opts.only ?? new Set(ALL_STEPS);
  const want = (s: Step) => only.has(s);

  console.log(`\n=== UGC persona launch ===`);
  if (opts.vibe) console.log(`vibe: ${opts.vibe}`);
  if (opts.handle) console.log(`handle (forced): ${opts.handle}`);
  console.log(`steps: ${[...only].join(', ')}`);
  if (opts.dryRun) console.log('(dry run — no side effects)');
  if (opts.dryRun) return;

  // ───────────────────────────────────────────────────────────────────
  // Resolve persona + working data
  //
  // Two shapes here:
  //   - If `dossier` is requested, generate it fresh (full run).
  //   - Otherwise, load the existing persona row keyed on --handle and
  //     reuse its FaceBrief + voiceDesignPrompt + warmUpPlan. This is
  //     what enables targeted re-rolls.
  // ───────────────────────────────────────────────────────────────────

  let dossier: PersonaDossier | null = null;
  let handle: string;
  let personaId: string;
  let faceBrief: FaceBrief;
  let voiceDesignPrompt: string;
  let warmUpPlan: WarmUpAction[];

  if (want('dossier')) {
    if (!opts.vibe) {
      throw new Error('--vibe is required when running the dossier step');
    }
    console.log(
      `\n[dossier] Generating persona dossier (Perplexity + Claude)...`,
    );
    dossier = await generatePersonaDossier(opts.vibe);

    handle = opts.handle ?? dossier.identity.handleOptions[0]?.handle ?? '';
    if (!handle) {
      throw new Error(
        '[launch] no handle available (dossier returned empty options)',
      );
    }
    console.log(
      `[dossier] Handle: ${handle}; alternates: ${
        dossier.identity.handleOptions
          .slice(1)
          .map((h) => h.handle)
          .join(', ') || '(none)'
      }`,
    );

    // Upsert the Persona row. R2 URLs and voiceId are placeholders here
    // — later steps fill them in. If a persona already exists for this
    // handle, we update its dossier fields in place rather than re-create.
    const existing = await db.persona.findUnique({ where: { handle } });
    if (existing) {
      await db.persona.update({
        where: { id: existing.id },
        data: {
          displayName: dossier.identity.displayName,
          bio: dossier.identity.bio,
          faceBriefJson: dossier.identity.faceBrief,
          followListJson: dossier.research.followList,
          likeTargetsJson: dossier.research.likeTargets,
          commentTargetsJson: dossier.research.commentTargets,
        },
      });
      personaId = existing.id;
      console.log(`[dossier] Updated existing persona ${personaId} in place.`);
    } else {
      const created = await db.persona.create({
        data: {
          handle,
          displayName: dossier.identity.displayName,
          bio: dossier.identity.bio,
          status: 'DRAFTING',
          posture: 'STEALTH',
          faceStillUrl: '',
          pfpUrl: '',
          voiceId: '',
          faceBriefJson: dossier.identity.faceBrief,
          followListJson: dossier.research.followList,
          likeTargetsJson: dossier.research.likeTargets,
          commentTargetsJson: dossier.research.commentTargets,
          utmCampaign: ugcCampaignKey(handle),
        },
      });
      personaId = created.id;
      console.log(`[dossier] Created persona ${personaId}.`);
    }

    faceBrief = dossier.identity.faceBrief;
    voiceDesignPrompt = dossier.identity.voiceDesignPrompt;
    warmUpPlan = dossier.research.warmUpPlan;
  } else {
    // No dossier step — load existing persona from DB.
    if (!opts.handle) {
      throw new Error(
        '--handle is required when --only skips the dossier step',
      );
    }
    const row = await db.persona.findUnique({
      where: { handle: opts.handle },
    });
    if (!row) {
      throw new Error(
        `[launch] no persona found with handle=${opts.handle}. Run with --only including 'dossier' to create one.`,
      );
    }
    handle = row.handle;
    personaId = row.id;
    faceBrief = parseFaceBrief(row.faceBriefJson);

    // voiceDesignPrompt + warmUpPlan are only used by certain steps —
    // pull them from the notes stash / actions table if needed.
    if (want('voice')) {
      const notes = row.notes ? safeParseNotes(row.notes) : null;
      const stash = notes?.voicePreviewStash;
      if (!stash?.designPrompt) {
        throw new Error(
          `[launch] cannot re-roll voice — no voicePreviewStash.designPrompt on persona ${handle}. Re-run with --only including 'dossier' to regenerate it.`,
        );
      }
      voiceDesignPrompt = stash.designPrompt;
    } else {
      voiceDesignPrompt = '';
    }

    if (want('actions')) {
      // Need the warmUpPlan to repopulate actions. It only lives in the
      // dossier output, never persisted to its own column — the
      // UgcWarmUpAction rows ARE the plan. So if we want to rebuild
      // them, we have to re-run dossier. Reject cleanly.
      throw new Error(
        `[launch] --only=actions requires --only including 'dossier' too (the warmUpPlan only lives in dossier output, not persisted separately).`,
      );
    }
    warmUpPlan = [];

    console.log(`[load] Loaded existing persona ${personaId} (${handle}).`);
  }

  // ───────────────────────────────────────────────────────────────────
  // Step face — canonical face still
  // ───────────────────────────────────────────────────────────────────
  let faceR2Url: string | null = null;
  if (want('face')) {
    console.log(`\n[face] Generating canonical face still (GPT Image 2)...`);
    const face = await generateCanonicalFace(handle, faceBrief);
    faceR2Url = face.r2Url;
    console.log(`[face] → ${faceR2Url}`);
    await db.persona.update({
      where: { id: personaId },
      data: { faceStillUrl: faceR2Url },
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // Step pfp — PFP + reverse-image-search gate
  //
  // The PFP gate uses the canonical face as identity reference, so we
  // need the face URL even when --only=pfp. Load it from the persona
  // row if we didn't generate it this run.
  // ───────────────────────────────────────────────────────────────────
  if (want('pfp')) {
    if (!faceR2Url) {
      const row = await db.persona.findUnique({
        where: { id: personaId },
        select: { faceStillUrl: true },
      });
      faceR2Url = row?.faceStillUrl || null;
      if (!faceR2Url) {
        throw new Error(
          `[launch] cannot re-roll pfp — persona has no faceStillUrl. Run with --only including 'face' too.`,
        );
      }
    }

    console.log(
      `\n[pfp] Generating PFP variant (Nano Banana Pro) + reverse-image gate...`,
    );
    let pfpUrl: string | null = null;
    let lastGateError: ReverseImageGateError | null = null;
    for (let attempt = 1; attempt <= PFP_RETRY_BUDGET; attempt += 1) {
      console.log(`[pfp] attempt ${attempt}/${PFP_RETRY_BUDGET}`);
      const pfp = await generatePfp(handle, faceBrief, faceR2Url);
      try {
        await assertPfpIsUnique(pfp.r2Url);
        pfpUrl = pfp.r2Url;
        console.log(`[pfp] → ${pfpUrl} (gate passed)`);
        break;
      } catch (err) {
        if (err instanceof ReverseImageGateError) {
          lastGateError = err;
          console.warn(
            `[pfp] gate FAILED with ${err.hits.length} full match(es):`,
            err.hits.slice(0, 3).map((h) => h.url),
          );
          if (attempt < PFP_RETRY_BUDGET) {
            console.warn(`[pfp] retrying with a fresh PFP...`);
          }
          continue;
        }
        throw err;
      }
    }
    if (!pfpUrl) {
      throw new Error(
        `[launch] PFP gate failed after ${PFP_RETRY_BUDGET} attempts. ` +
          `Persona ${handle} is left with no PFP. ` +
          `Last hits: ${
            lastGateError?.hits
              .slice(0, 3)
              .map((h) => h.url)
              .join(', ') ?? '(none)'
          }`,
      );
    }
    await db.persona.update({
      where: { id: personaId },
      data: { pfpUrl },
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // Step voice — Voice Design 3 previews
  // ───────────────────────────────────────────────────────────────────
  if (want('voice')) {
    if (!voiceDesignPrompt) {
      throw new Error(
        `[launch] voice step requires a voiceDesignPrompt — should be set from dossier or notes stash.`,
      );
    }
    console.log(`\n[voice] Designing voice (3 ElevenLabs previews)...`);
    const voiceDesign = await designVoicePreviews(handle, voiceDesignPrompt);
    const voiceStash = {
      designPrompt: voiceDesignPrompt,
      previews: voiceDesign.previews.map((p) => ({
        generatedVoiceId: p.generatedVoiceId,
        audioUrl: p.audioUrl,
        index: p.index,
      })),
    };
    await db.persona.update({
      where: { id: personaId },
      data: {
        notes: JSON.stringify({ voicePreviewStash: voiceStash }),
      },
    });
    for (const p of voiceDesign.previews) {
      console.log(`[voice] preview ${p.index}: ${p.audioUrl}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // Step warmup — 6 faceless b-roll clips
  // ───────────────────────────────────────────────────────────────────
  if (want('warmup')) {
    console.log(
      `\n[warmup] Generating 6 faceless warm-up clips (Seedance 2.0)...`,
    );
    const clips = await generateWarmupClips({
      handle,
      city: faceBrief.city,
      count: 6,
    });
    await db.ugcWarmUpClip.deleteMany({ where: { personaId } });
    await db.ugcWarmUpClip.createMany({
      data: clips.map((c) => ({
        personaId,
        sequence: c.sequence,
        prompt: c.prompt,
        videoUrl: c.videoR2Url,
        caption: c.caption,
        // Posting days for the 6 clips of a 10-day plan: 6, 7, 8, 9, 10, 10
        scheduledDay: [6, 7, 8, 9, 10, 10][c.sequence - 1] ?? 10,
        posted: false,
      })),
    });
    for (const c of clips) {
      console.log(
        `[warmup] clip ${c.sequence} (${c.promptSlug}): ${c.videoR2Url}`,
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // Step actions — warm-up action rows from the dossier's warmUpPlan
  // ───────────────────────────────────────────────────────────────────
  if (want('actions')) {
    console.log(
      `\n[actions] Inserting ${warmUpPlan.length} warm-up action rows...`,
    );
    await db.ugcWarmUpAction.deleteMany({ where: { personaId } });
    await db.ugcWarmUpAction.createMany({
      data: warmUpPlan.map((a) => ({
        personaId,
        day: a.day,
        type: a.type,
        target: a.target ?? null,
        description: a.description,
        done: false,
      })),
    });
  }

  console.log(
    `\n=== Done. Persona ${handle} (${personaId}) is in DRAFTING. ===`,
  );
  console.log(
    `Next: review in /admin/ugc, pick a voice preview, then flip status to WARMING.`,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const VoicePreviewStashSchema = z.object({
  voicePreviewStash: z
    .object({
      designPrompt: z.string(),
      previews: z.array(
        z.object({
          generatedVoiceId: z.string(),
          audioUrl: z.string(),
          index: z.number(),
        }),
      ),
    })
    .optional(),
});

function safeParseNotes(
  raw: string,
): { voicePreviewStash?: { designPrompt: string } } | null {
  try {
    return VoicePreviewStashSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────

const isCli = require.main === module;
if (isCli) {
  const args = process.argv.slice(2);
  const get = (flag: string) =>
    args
      .find((a) => a.startsWith(`${flag}=`))
      ?.split('=')
      .slice(1)
      .join('=');

  const vibe = get('--vibe');
  const handle = get('--handle');
  const onlyArg = get('--only');
  const dryRun = args.includes('--dry');

  let only: Set<Step> | undefined;
  if (onlyArg) {
    const parts = onlyArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const invalid = parts.filter((p) => !isStep(p));
    if (invalid.length > 0) {
      throw new Error(
        `--only: invalid step name(s): ${invalid.join(', ')}. Valid steps: ${ALL_STEPS.join(', ')}`,
      );
    }
    only = new Set(parts as Step[]);
  }

  if (!only || only.has('dossier')) {
    if (!vibe) {
      throw new Error(
        '--vibe is required for a full run (or any run including the dossier step)',
      );
    }
  } else {
    if (!handle) {
      throw new Error(
        '--handle is required when --only skips the dossier step',
      );
    }
  }

  launch({ vibe, handle, dryRun, only })
    .catch((e) => {
      console.error('[launch-ugc-persona]', e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
