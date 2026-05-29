/**
 * Brand-safety gate for the organic content engine.
 *
 * A kids-app brand chasing engagement has a stricter line than the
 * sister project (which can run pure parking outrage). The research is
 * explicit: punch UP at systems, never DOWN at parents/teachers; never
 * rationalise screen time for our own metrics; stay out of culture-war,
 * child-safety panic, and partisan framing. A post that could be
 * screenshotted into a political thread as "look what this kids app
 * believes" is a trust leak.
 *
 * Two layers:
 *   1. A cheap deterministic block-list (`hasBlockedTerm`) catches the
 *      obvious red-zone topics with zero model spend.
 *   2. A 3-judge cheap-tier jury (reusing `runJury`) with an Opus
 *      tie-break for the edges — escalates whenever the panel disagrees
 *      OR any judge flags a hard-block, so a single "this is risky" vote
 *      gets a second, smarter look rather than being out-voted.
 *
 * Returns an APPROVED / BLOCKED verdict plus the reason, which the
 * caller persists (OrganicPost.safetyVerdict / safetyNotes) and surfaces
 * in the morning Posting Brief for editorial audit.
 */

import { z } from "zod";

import { models } from "../models";
import { runJury } from "../jury";

/**
 * Hard-block substrings. Lower-cased, matched against hook+payoff+source.
 * Deliberately broad — false positives here just mean "ask the jury / skip
 * this candidate", which is cheap. The cost of a false negative (a culture
 * war post going out under a kids brand) is not.
 */
export const SAFETY_BLOCK_TERMS = [
  // Culture war / partisan
  "woke",
  "groomer",
  "trans",
  "gender ideology",
  "critical race",
  "crt",
  "book ban",
  "banned book",
  "sex education",
  "sex ed",
  "abortion",
  "immigrant",
  "republican",
  "democrat",
  "maga",
  "left-wing",
  "right-wing",
  // Child-safety panic / crime
  "abduct",
  "kidnap",
  "predator",
  "groom",
  "trafficking",
  "abuse",
  "assault",
  "murder",
  "suicide",
  "self-harm",
  "overdose",
  // Religion in schools
  "prayer in school",
  "religious",
];

export const hasBlockedTerm = (text: string): string | null => {
  const lower = text.toLowerCase();
  for (const term of SAFETY_BLOCK_TERMS) {
    // Word-ish boundary so "transit"/"transfer" don't trip "trans", and
    // "therapist" doesn't trip "rapist"-adjacent matches. We test the
    // term as a standalone-ish token.
    const re = new RegExp(
      `(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
      "i",
    );
    if (re.test(lower)) return term;
  }
  return null;
};

const safetyVerdictSchema = z.object({
  approved: z
    .boolean()
    .describe("true ONLY if the post clears every rule below"),
  reason: z
    .string()
    .describe(
      "If blocked, the single most important reason. If approved, a brief why.",
    ),
});

type SafetyJuryVerdict = z.infer<typeof safetyVerdictSchema>;

const SAFETY_SYSTEM = `You are the brand-safety editor for Chunky Crayon, a kids' coloring app. You vet social posts written for an audience of PARENTS and TEACHERS. The brand's whole strategy is content-first, product implicit, parent-trust-safe. Approve a post ONLY if EVERY rule holds:

1. PUNCHES UP, NOT DOWN. The post may criticise systems, policies, costs, or absurd rules. It must NEVER shame, mock, or look down on individual parents, teachers, children, or any community. "We're all doing our best" energy, never "look at this bad parent".

2. SCREEN TIME IS HARM-REDUCTION ONLY. We are a screen-based product, so any screen-time angle must take parents' concerns seriously and centre intentional, creative use. NEVER dismiss screen-time worry as overblown, never imply "screens are fine", never anything that reads as rationalising more screen time for our own growth.

3. NO CULTURE WAR. Reject anything touching curriculum/gender/identity wars, book bans, religion in schools, sex education controversies, "parents' rights" politics, or any party-aligned framing. If a post could be screenshotted into a political fight as "look what this kids app believes", reject it.

4. NO CHILD-SAFETY PANIC OR CRIME. Reject graphic crime, abduction/abuse stories, anything whose dominant emotion is terror rather than informed calm. Practical empowerment is fine; horror is not.

5. NO TRIVIALISING SERIOUS ISSUES. Reject flippant takes on neurodivergence, trauma, bullying, mental health, or disability. Reject medical/diagnostic claims stated as authority.

6. STAYS IN LANE. The post should be about childhood, parenting, school, play, creativity, or development. Mild, light debate ("genius or madness?") is good; rage-bait that invites pile-ons is not.

Reply with JSON only: { "approved": boolean, "reason": string }.`;

const buildSafetyPrompt = (input: {
  hook: string;
  payoff: string;
  sourceTitle?: string;
}): string =>
  [
    "Vet this proposed post.",
    `Hook: ${input.hook}`,
    `Payoff: ${input.payoff}`,
    `Source: ${input.sourceTitle ?? "(none)"}`,
    "",
    "Approve or reject per the rules. JSON only.",
  ].join("\n");

export type SafetyResult = {
  approved: boolean;
  reason: string;
  /** "blocklist" when a hard term tripped; "jury" when the panel decided. */
  via: "blocklist" | "jury" | "error";
};

/**
 * Gate a candidate post. Block-list first (free), then jury.
 * On jury error, fail CLOSED (block) — for a kids brand an un-vetted post
 * never ships.
 */
export async function vetOrganicPost(input: {
  hook: string;
  payoff: string;
  sourceTitle?: string;
}): Promise<SafetyResult> {
  const combined = `${input.hook}\n${input.payoff}\n${input.sourceTitle ?? ""}`;
  const blocked = hasBlockedTerm(combined);
  if (blocked) {
    return {
      approved: false,
      reason: `blocked term: "${blocked}"`,
      via: "blocklist",
    };
  }

  try {
    const verdict = await runJury<SafetyJuryVerdict>({
      system: SAFETY_SYSTEM,
      prompt: buildSafetyPrompt(input),
      schema: safetyVerdictSchema,
      getPassed: (r) => r.approved,
      tier1: ["haiku-4.5", "gemini-3-flash", "gpt-5.4-mini"],
      tieBreak: "opus-4.7",
      // Escalate to Opus whenever the panel isn't unanimous OR anyone votes
      // to block — a single "risky" vote earns a smarter second look.
      escalationTrigger: (_v, passing, failing) => failing > 0 || passing === 0,
    });
    const reason =
      verdict.tieBreakVerdict?.ok && verdict.tieBreakVerdict.result
        ? verdict.tieBreakVerdict.result.reason
        : (verdict.verdicts.find((v) => v.ok)?.result?.reason ??
          "vetted by safety jury");
    return { approved: verdict.passed, reason, via: "jury" };
  } catch (err) {
    // Fail closed.
    return {
      approved: false,
      reason: `safety jury unavailable: ${err instanceof Error ? err.message : "unknown"}`,
      via: "error",
    };
  }
}
