/**
 * Warm-up clip generator — produces 5-7 faceless b-roll clips per persona,
 * posted on days 8-14 of the warm-up window to make the account look
 * lived-in before the first real ad drops.
 *
 * Why faceless: introducing the persona's face in warm-up content gives
 * a second pre-launch face still that an OSINT pass can find and
 * reverse-image-search. We keep face appearances zero until the ad.
 *
 * Why hard-coded prompt pool, not Claude-generated: warm-up content
 * should be GENERIC, not tied to the persona's apartment. A perfectly
 * persona-themed warm-up feed is actually MORE suspicious than a
 * generic one (reads as pre-loaded). The pool below is the warm-up
 * equivalent of stock-footage filler — universally relatable.
 *
 * What's deliberately NOT in the pool:
 *   - Hands or fingers (Seedance + hand anatomy = AI tells)
 *   - Anything kids/coloring/Chunky-Crayon-niche (saves the niche
 *     signal for the actual ad — pre-loading it kills the "this account
 *     organically discovered the product" story)
 *   - Faces or visible humans (would generate a face that isn't the
 *     persona's; even worse, a face that doesn't match her)
 *   - Recognizable real locations or brands (legal + algorithmic risk)
 *
 * Each prompt is tagged with a climate group so a persona in Phoenix
 * doesn't post snow-on-windowsill content.
 */

import { put } from '@one-colored-pixel/storage';
import { personaStoragePaths } from './storage';
import {
  runHiggsfield,
  HiggsfieldNsfwError,
  HiggsfieldIpError,
} from './higgsfield';

// ─────────────────────────────────────────────────────────────────────
// Prompt pool
// ─────────────────────────────────────────────────────────────────────

type ClimateGroup = 'warm' | 'cold' | 'temperate' | 'any';

type WarmupPromptSpec = {
  /** Short slug for logs (e.g. 'mug-steam'). */
  slug: string;
  /** Seedance 2.0 prompt — text-only, no start image. */
  prompt: string;
  /** Caption for the TikTok post. Lowercase, ≤80 chars, ≤2 hashtags. */
  caption: string;
  /** Climate tag. 'any' = post anywhere; others must match persona's region. */
  climate: ClimateGroup;
};

/**
 * Hand-curated pool of ~12 prompts. The generator picks 5-7 based on
 * the persona's climate. Order is shuffle-randomised per persona so two
 * personas don't post the same clip sequence.
 *
 * Design principles (learned over v1 → v2 → v3):
 *
 *   v1 — went too "aesthetic stock footage" (perfect candles, BBC-style
 *        leaf macro shots). Reads as iStock, not phone-camera.
 *   v2 — overcorrected with walking POV and kid limbs. Seedance can't
 *        animate articulated human bodies cleanly — kid legs in the
 *        stroller shot looked dollish, walking gait warped. Anatomy
 *        is the model's weakness.
 *   v3 (this pool) — STAY INSIDE SEEDANCE'S STRENGTHS:
 *
 *   - Near-static scenes with subtle motion (steam, ripples, fabric,
 *     light shift, car-vibrate, rain on glass) — Seedance renders these
 *     perfectly.
 *   - Inanimate-object motion (water pouring, ice clinking, fabric in
 *     a breeze, a swing slowly creaking).
 *   - Static environments with a strong CONTEXT anchor — the dashboard
 *     of a parked car, the floor of an elevator, a messy bed at night.
 *     People still read these as "real moment filmed on a phone."
 *   - Strict ban: walking, hands picking things up, kids visible in
 *     motion, full bodies, fingers manipulating objects. Anything
 *     where articulated human anatomy has to be coherent across
 *     consecutive frames.
 *   - Phone-camera coding still required: "vertical 9:16 iPhone phone
 *     video", "handheld with slight shake", "casual phone framing",
 *     "natural lighting, no filter".
 *
 * If a prompt feels like it needs a person to do something physical,
 * cut the person out and let the scene speak for itself. The CONTEXT
 * (the messy bed, the parked-car dashboard, the rain on the bedroom
 * window) is what makes it feel like a real phone moment — not the
 * person.
 */
const PROMPT_POOL: WarmupPromptSpec[] = [
  {
    slug: 'dashboard-parked',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot from the driver's seat of a parked car. The phone is held just above the steering wheel pointing at the dashboard and through the windshield. The dashboard fills the lower third — a coffee cup in the cup holder with steam rising slowly, a crumpled paper receipt, a pacifier on the passenger seat partially visible. Through the windshield: a quiet suburban street, a row of single-story houses across the road, slight haze in the air. The car engine is off but a single keychain on the ignition gently sways. Real natural daylight, slightly overcast. No people in frame. No motion except the steam and the keychain. iPhone back camera, casual handheld stillness.",
    caption: 'sat here too long',
    climate: 'any',
  },
  {
    slug: 'iced-coffee-table',
    prompt:
      'Vertical 9:16 phone video. Static iPhone shot pointed at a tall iced coffee in a clear plastic cup with a straw, sitting on a small wooden cafe table. The ice cubes slowly settle and shift in the cup, condensation drops slide down the side. A tip jar and a folded napkin are blurred behind it. Soft daytime light from a coffee shop window off-camera-left. The phone is propped on the table — slight wobble. Distant cafe ambient sound (espresso machine, low voices). No people in frame. iPhone back camera, real lighting.',
    caption: 'finally',
    climate: 'any',
  },
  {
    slug: 'rain-on-bedroom-window',
    prompt:
      'Vertical 9:16 phone video. Static handheld iPhone shot filmed from inside a bedroom at night, looking out the window. Heavy rain hits the glass, water sliding down in streaks. Beyond the glass, out-of-focus suburban houses with a single yellow porch light. The lower edge of the frame shows the windowsill — a small candle (unlit), a half-glass of water, an open paperback face-down. Warm yellow lamp glow reflects faintly in the glass. The phone is held very still. Audio is rain on glass and a distant car. No people, no motion except the rain.',
    caption: 'best sound',
    climate: 'temperate',
  },
  {
    slug: 'rain-on-bedroom-window-cold',
    prompt:
      'Vertical 9:16 phone video. Static handheld iPhone shot filmed from inside a bedroom at night, looking out the window. Heavy rain hits the glass, water sliding down in streaks. Beyond the glass, the silhouettes of bare winter tree branches against a dark sky. The lower edge of the frame shows the windowsill — a small candle (unlit), a half-glass of water, an open paperback face-down. Warm yellow lamp glow reflects faintly in the glass. The phone is held very still. Audio is rain on glass. No people, no motion except the rain.',
    caption: 'best sound',
    climate: 'cold',
  },
  {
    slug: 'messy-kitchen-still',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot pointed across a cluttered kitchen counter in late afternoon light. On the counter: a half-eaten kid's plate with three remaining round cereal pieces in a small milk puddle, a sippy cup tipped on its side, a banana peel, an open generic cereal box (plain white with no logo). A cabinet door behind is slightly ajar. Light comes through a window off-camera-right, slightly warm. Subtle motion: a thin trail of steam from a forgotten coffee mug, the slowly settling milk. The phone is held very still. iPhone back camera, real overhead bulb mixed with daylight. No people, no hands, no movement except the steam and milk.",
    caption: 'after the chaos',
    climate: 'any',
  },
  {
    slug: 'fridge-art-closeup',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot of a refrigerator door covered in mismatched magnets and a kid's fingerpainting taped at an angle (a wobbly rainbow over a house). A school flyer pinned crooked. A magnetic chore chart with gold star stickers, half-filled. The fridge is white and slightly scuffed. The kid's painting paper curls slightly at the corners as the AC kicks on, soft movement. Kitchen ambient lighting, slightly yellow overhead bulb. The phone is held very still — almost like a snapshot. No people, minimal motion (just the paper curling).",
    caption: 'gallery wing',
    climate: 'any',
  },
  {
    slug: 'laundry-pile-on-bed',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot pointed down at an unfolded pile of clean laundry heaped on an unmade bed. Visible items: a mismatched kid sock with cars on it, a baby onesie, a faded gray adult t-shirt, a kid's stretchy jeans, a pillowcase tangled in. The bed has a chenille bedspread, slightly wrinkled, the corner of a folded blanket visible at the edge. Light from an overhead bedroom bulb, slightly yellow. Real iPhone back camera. Very subtle motion: the slight flutter of one sock from a ceiling fan above. No people, no hands.",
    caption: 'this is my villain origin story',
    climate: 'any',
  },
  {
    slug: 'sunset-suburban-window',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot looking out a suburban Texas apartment window at sunset. The sky is orange-pink, low single-story houses across the street, a strip mall sign glowing in the distance, a telephone pole. The bottom of the frame shows part of the windowsill — a small succulent in a chipped pot, a kid's plastic water bottle, dust. The screen of the window has a tiny tear. Subtle motion: the orange light slowly shifting across the wall as the sun sets. iPhone back camera, slightly washed out. No people.",
    caption: 'this hour',
    climate: 'warm',
  },
  {
    slug: 'kid-shoes-doorway',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot pointed at a small entryway floor: two pairs of small children's shoes scattered (a tiny pair of strap-front sneakers, a sandal with no match), an adult flip-flop, a small plain blue backpack slumped against the wall. Late afternoon shadows angle across the tile floor from a screen door off-camera-left. A house plant in a pot at the edge of the frame. Static, no motion except faint shadow drift from outdoor leaves moving. Real overhead light. No people, no hands.",
    caption: 'after school evidence',
    climate: 'any',
  },
  {
    slug: 'mug-on-side-table',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot of a generic ceramic coffee mug (slightly chipped at the rim) sitting on a small side table next to a stack of three paperback books, a phone charger cable curled next to them, a hair tie. Steam rises slowly from the mug. The table is plain light wood, the room behind is blurred — a kid's toy on the floor in the background. Soft natural light from a window. The phone is held very still. Real handheld iPhone back camera, no filter.",
    caption: 'pause',
    climate: 'any',
  },
  {
    slug: 'porch-glass-water',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot from inside a screened-in porch or apartment balcony, looking out at trees and a fence in the late afternoon. The lower third of the frame shows a small white plastic outdoor table with a glass of water (condensation slowly forming, a small bug crawling on the rim and then gone), a phone face-down, a kid's chalk drawing on the concrete floor partially visible. Cicadas distant. The screen casts a soft mesh shadow. Subtle motion: water condensation, a leaf falling slowly off-frame-right. No people.",
    caption: 'breathing for a sec',
    climate: 'warm',
  },
  {
    slug: 'bath-window-evening',
    prompt:
      "Vertical 9:16 phone video. Static handheld iPhone shot of a small bathroom window in the evening, low warm light from a fixture off-camera. The window has frosted glass, the silhouette of suburban houses faintly visible behind it. On the windowsill: a kid's bath toy (a rubber duck slightly faded), a near-empty bottle of kid shampoo, a hairbrush. The whole scene is slightly humid-looking — gentle condensation on the lower window. Subtle motion: steam slowly drifting through the frame from a recently-drawn bath off-camera-bottom. No people. iPhone back camera, soft warm tones.",
    caption: 'quietest part of the day',
    climate: 'any',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Climate classifier — coarse mapping from city → climate group.
// Conservative — if the city isn't recognised, default to 'temperate'
// so we keep both 'warm' and 'cold' specifics out of the picked set.
// ─────────────────────────────────────────────────────────────────────

const COLD_TOKENS = [
  'minneapolis',
  'chicago',
  'boston',
  'seattle',
  'portland',
  'denver',
  'toronto',
  'montreal',
  'vancouver',
  'london',
  'manchester',
  'edinburgh',
  'glasgow',
  'dublin',
  'amsterdam',
  'berlin',
  'copenhagen',
  'stockholm',
  'oslo',
  'helsinki',
  'moscow',
];

const WARM_TOKENS = [
  'phoenix',
  'tucson',
  'las vegas',
  'austin',
  'houston',
  'dallas',
  'san antonio',
  'miami',
  'orlando',
  'tampa',
  'jacksonville',
  'los angeles',
  'san diego',
  'mexico city',
  'guadalajara',
  'madrid',
  'barcelona',
  'lisbon',
  'rome',
  'athens',
  'cairo',
  'dubai',
  'mumbai',
  'bangkok',
  'singapore',
];

function classifyClimate(city: string): ClimateGroup {
  const lc = city.toLowerCase();
  if (WARM_TOKENS.some((t) => lc.includes(t))) return 'warm';
  if (COLD_TOKENS.some((t) => lc.includes(t))) return 'cold';
  return 'temperate';
}

// ─────────────────────────────────────────────────────────────────────
// Selection
// ─────────────────────────────────────────────────────────────────────

/**
 * Return all climate-eligible prompts, deterministically shuffled by the
 * persona's handle. Universal ('any') prompts always included;
 * climate-specific prompts only included when the persona's climate matches.
 *
 * Returns the FULL eligible pool, not pre-sliced to `count`, so the
 * generation loop can fall through to the next prompt when one fails
 * (Higgsfield NSFW false-positives are common — see HiggsfieldNsfwError).
 *
 * Deterministic-shuffle by handle means re-runs of the launch script on
 * the same handle pick the same prompts in the same order — predictable
 * for debug/retry.
 */
function orderedEligiblePrompts(
  handle: string,
  climate: ClimateGroup,
): WarmupPromptSpec[] {
  const eligible = PROMPT_POOL.filter(
    (p) => p.climate === 'any' || p.climate === climate,
  );

  const seed = [...handle].reduce(
    (acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0,
    1,
  );
  return [...eligible]
    .map((p, i) => ({ p, k: (seed * (i + 1) * 2654435761) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map(({ p }) => p);
}

// ─────────────────────────────────────────────────────────────────────
// R2 mirror — fetch from Higgsfield CDN, persist to our R2
// ─────────────────────────────────────────────────────────────────────

async function mirrorVideoToR2(
  higgsfieldUrl: string,
  r2Path: string,
): Promise<string> {
  const res = await fetch(higgsfieldUrl);
  if (!res.ok) {
    throw new Error(
      `[ugc-warmup] failed to download higgsfield asset ${higgsfieldUrl}: ${res.status}`,
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const { url } = await put(r2Path, buffer, {
    access: 'public',
    contentType: 'video/mp4',
    allowOverwrite: true,
  });
  return url;
}

async function putCaption(r2Path: string, caption: string): Promise<string> {
  const { url } = await put(r2Path, Buffer.from(caption, 'utf8'), {
    access: 'public',
    contentType: 'text/plain; charset=utf-8',
    allowOverwrite: true,
  });
  return url;
}

// ─────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────

export type WarmupClipResult = {
  /** Posting order (1..n). Maps to `UgcWarmUpClip.sequence`. */
  sequence: number;
  /** Prompt slug from the pool, kept for debug + repeat-detection. */
  promptSlug: string;
  /** Full Seedance prompt actually sent (logged for failure-mode review). */
  prompt: string;
  /** Caption text. */
  caption: string;
  /** Public R2 URL of the final MP4. */
  videoR2Url: string;
  /** Higgsfield job id for cost auditing. */
  higgsfieldJobId: string;
};

export type GenerateWarmupClipsOptions = {
  handle: string;
  /** Persona's city from FaceBrief — drives climate filter. */
  city: string;
  /** How many clips to generate. v1 default 6 (covers days 8-13 of a 10-day plan). */
  count?: number;
};

/**
 * Generate `count` faceless warm-up clips for a persona. Returns metadata
 * for each (URL + slug + caption + sequence). Caller (the launch script
 * orchestrator) writes the `UgcWarmUpClip` rows.
 *
 * Runs sequentially — Seedance is expensive (~30 credits per 5s clip)
 * and parallel calls don't speed up the underlying queue meaningfully.
 * If a single clip fails the whole batch fails (no partial state); the
 * launch script re-runs from scratch.
 *
 * Cost: ~30 credits per clip × 5-7 clips ≈ 150-210 credits per persona.
 */
export async function generateWarmupClips(
  opts: GenerateWarmupClipsOptions,
): Promise<WarmupClipResult[]> {
  const count = opts.count ?? 6;
  const climate = classifyClimate(opts.city);
  const eligible = orderedEligiblePrompts(opts.handle, climate);
  if (eligible.length < count) {
    throw new Error(
      `[ugc-warmup] only ${eligible.length} prompts eligible for climate=${climate}, requested ${count}`,
    );
  }

  const paths = personaStoragePaths(opts.handle);
  const results: WarmupClipResult[] = [];
  const skipped: string[] = [];

  // Walk the eligible prompt pool in deterministic order. On NSFW
  // false-positive (common with Higgsfield's safety classifier — we've
  // seen "tree leaves moving in a breeze" get flagged), skip the prompt
  // and try the next one. Anything else throws — we want the operator
  // to see real failures, not silently skip them.
  for (const pick of eligible) {
    if (results.length >= count) break;

    const sequence = results.length + 1;

    let job;
    try {
      job = await runHiggsfield({
        model: 'seedance_2_0',
        prompt: pick.prompt,
        params: {
          aspect_ratio: '9:16',
          resolution: '720p',
          duration: 5,
          mode: 'std',
        },
        waitTimeout: '20m',
      });
    } catch (err) {
      if (err instanceof HiggsfieldNsfwError) {
        console.warn(
          `[ugc-warmup] prompt "${pick.slug}" NSFW-flagged, skipping`,
        );
        skipped.push(`${pick.slug} (nsfw)`);
        continue;
      }
      if (err instanceof HiggsfieldIpError) {
        console.warn(`[ugc-warmup] prompt "${pick.slug}" IP-flagged, skipping`);
        skipped.push(`${pick.slug} (ip)`);
        continue;
      }
      throw err;
    }

    const videoR2Url = await mirrorVideoToR2(
      job.resultUrl,
      paths.warmupClip(sequence),
    );

    // Caption stored alongside on R2 too so the admin UI can fetch it
    // without making a DB roundtrip. Trivial cost.
    await putCaption(paths.warmupCaption(sequence), pick.caption);

    results.push({
      sequence,
      promptSlug: pick.slug,
      prompt: pick.prompt,
      caption: pick.caption,
      videoR2Url,
      higgsfieldJobId: job.id,
    });
  }

  if (results.length < count) {
    throw new Error(
      `[ugc-warmup] only generated ${results.length}/${count} clips; ${skipped.length} skipped (NSFW): ${skipped.join(', ')}. Pool exhausted — add more prompts or relax climate filter.`,
    );
  }

  return results;
}
