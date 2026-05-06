/**
 * One-shot script — deactivate ContentReel rows flagged in editorial
 * review by setting factCheckConfidence = LOW and adding a
 * factCheckNotes entry explaining why. The picker filters HIGH
 * (and HIGH+MEDIUM for tips), so LOW = effectively retired.
 *
 * Reasons noted inline so a future re-research pass can re-classify
 * if the ground truth changes (or if we want to re-write the row by
 * hand later — search for "DEACTIVATED:" in factCheckNotes to find).
 *
 * Run from worker dir:
 *   pnpm exec tsx scripts/deactivate-rows.ts
 */

import "dotenv/config";

import { db } from "@one-colored-pixel/db";

type Deactivation = {
  id: string;
  reason: string;
};

const TO_DEACTIVATE: Deactivation[] = [
  // ── MYTH: clunky "Myth that..." framing ────────────────────────────
  // These read as meta-statements ("Myth that...") instead of the
  // myth itself in the parent's voice ("Worried...", "Heard...").
  // Five of them; two also have inverted centerBlock (True instead
  // of False) which compounds the issue.
  {
    id: "myth-myth-that-sleep-schedules-are-too-rigid-for-babies",
    reason:
      "Clunky 'Myth that...' framing AND centerBlock=True is inverted (myth IS too rigid? but payoff says routines help → should be False).",
  },
  {
    id: "myth-myth-that-drawing-must-be-realistic-by-age-5",
    reason: "Clunky 'Myth that...' framing.",
  },
  {
    id: "myth-myth-that-play-is-just-fun-not-real-learning",
    reason:
      "Clunky 'Myth that...' framing AND centerBlock=True is inverted (play IS just fun? but payoff says it's the foundation of learning → should be False).",
  },
  {
    id: "myth-myth-that-kids-must-walk-by-12-months-or-worry",
    reason:
      "Clunky 'Myth that...' framing AND duplicate of myth-believe-kids-must-walk-by-12-months-or-worry.",
  },
  {
    id: "myth-myth-that-more-toys-mean-more-creativity",
    reason: "Clunky 'Myth that...' framing.",
  },

  // ── MYTH: inverted centerBlock ─────────────────────────────────────
  // The centerBlock should read as the verdict on the parent's stated
  // belief. If the payoff debunks the belief, centerBlock should be False.
  {
    id: "myth-think-bedtime-routines-are-optional-for-sleep",
    reason:
      "centerBlock=True is inverted. Hook asks if routines are optional, payoff says no → centerBlock should be False.",
  },

  // ── MYTH: duplicates (keep the better-worded one) ─────────────────
  {
    id: "myth-think-holding-your-baby-too-much-will-spoil-them",
    reason:
      "Duplicate of myth-worried-you-re-spoiling-your-baby-by-holding-them-too-much (kept the 'Worried...' phrasing).",
  },
  {
    id: "myth-believe-a-child-s-brain-is-set-for-life-after-age-3",
    reason:
      "Duplicate of myth-think-your-child-s-brain-is-set-for-life-after-age-3.",
  },
  {
    id: "myth-think-educational-screen-time-is-always-harmless",
    reason:
      "Duplicate of myth-believe-educational-screen-time-is-always-harmless.",
  },

  // ── STAT: non-numeric centerBlocks ─────────────────────────────────
  // Stats need numbers — the chromatic-aberration big-number reveal
  // doesn't read with phrases. Drop these.
  {
    id: "stat-co-viewing-boosts-expressive-language",
    reason:
      "Non-numeric centerBlock 'Co-viewing ↑' — stat-kind needs a number.",
  },
  {
    id: "stat-screen-time-delaying-communication-skills",
    reason:
      "Non-numeric centerBlock 'Developmental delays' — stat-kind needs a number.",
  },
  {
    id: "stat-externalizing-behaviors-up-with-preschool-screens",
    reason:
      "Non-numeric centerBlock 'Psychosocial risks' — stat-kind needs a number.",
  },
  {
    id: "stat-which-screen-activity-poses-highest-emotional-risk",
    reason: "Non-numeric centerBlock 'Gaming' — stat-kind needs a number.",
  },
  {
    id: "stat-gaming-hurts-boys-emotions-more-than-girls",
    reason: "Non-numeric centerBlock 'Boys only' — stat-kind needs a number.",
  },
  {
    id: "stat-screens-in-bedrooms-how-common-and-risky",
    reason: "Non-numeric centerBlock 'No bedroom' — stat-kind needs a number.",
  },
  {
    id: "stat-emotional-problems-lead-to-more-screens",
    reason:
      "Non-numeric centerBlock 'Vicious cycle' — stat-kind needs a number.",
  },
  {
    id: "stat-can-co-viewing-screens-boost-your-child-s-language",
    reason: "Non-numeric centerBlock 'Co-viewing' — stat-kind needs a number.",
  },

  // ── STAT: technical correlation values that don't read for parents ─
  {
    id: "stat-starting-screens-later-helps-language-development",
    reason:
      "centerBlock '+0.17 correlation' is a stats coefficient — doesn't read as a parent-friendly number.",
  },
  {
    id: "stat-over-2-hours-of-screens-daily-hurts-language-skills",
    reason:
      "centerBlock 'r = -0.14' is a stats coefficient — doesn't read as a parent-friendly number.",
  },

  // ── STAT: hook/answer mismatch ─────────────────────────────────────
  {
    id: "stat-parents-think-screens-are-fine-at-what-age",
    reason:
      "Hook asks 'at what age' but centerBlock is '21 hrs' (hours, not age) — mismatch.",
  },

  // ── STAT: ID-as-month-range, not really a stat reveal ──────────────
  {
    id: "stat-24-36-month-screens-predict-problems",
    reason:
      "centerBlock '24-36 mos' is the same content as the hook — no reveal.",
  },

  // ── FACT: mis-classified — looks like a myth ───────────────────────
  {
    id: "fact-think-playtime-is-just-fun-for-babies",
    reason:
      "Should be myth-kind, not fact-kind (hook is 'Think...' which is myth phrasing). Already covered by other myth rows.",
  },
];

async function main() {
  console.log(`[deactivate] flagging ${TO_DEACTIVATE.length} rows as LOW`);

  let updated = 0;
  let missing = 0;
  for (const { id, reason } of TO_DEACTIVATE) {
    const result = await db.contentReel.updateMany({
      where: { id },
      data: {
        factCheckConfidence: "LOW",
        factCheckNotes: `DEACTIVATED (editorial review): ${reason}`,
      },
    });
    if (result.count === 0) {
      console.warn(`[deactivate] row not found: ${id}`);
      missing++;
    } else {
      console.log(`[deactivate] ${id}`);
      updated++;
    }
  }

  console.log(`\n[deactivate] done. ${updated} updated, ${missing} missing.`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[deactivate] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
