/**
 * Grounded scripting + claim verification.
 *
 * Shared by the news engine and the tips engine. Both discover a candidate
 * via Perplexity, fetch the real source text (article.ts), then:
 *   1. groundedScript() — Claude writes hook / centerBlock / payoff /
 *      coverTeaser using ONLY facts present in the supplied source text.
 *      The prompt forbids inventing numbers, names, prices, or study sizes.
 *   2. verifyGrounding() — a second cheap-model pass checks that the
 *      specific claims in the script (especially any number) are actually
 *      supported by the source text. Unsupported → caller discards.
 *
 * Why both steps: a single "be faithful" instruction isn't enough — models
 * still confabulate plausible specifics. The separate verifier catches the
 * fabrication the writer slipped in, the same way the brand-safety jury is
 * a backstop for tone. For a kids brand that cites the source by name, a
 * stat the source never stated is a real trust + accuracy failure.
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import { models } from "../../models";
import { NO_EM_DASHES_RULE } from "../../utils/copy";

export type GroundedScript = {
  hook: string;
  centerBlock: string;
  payoff: string;
  coverTeaser: string;
};

const scriptSchema = z.object({
  hook: z.string(),
  centerBlock: z.string(),
  payoff: z.string(),
  coverTeaser: z.string(),
});

/**
 * Build a script for a discovered item, grounded in the real source text.
 *
 * `kind` tweaks the framing: "news" reads as "here's what's happening, what
 * do you think"; "tip" reads as practical save-worthy advice for a parent.
 * Both must stay strictly inside the source's facts.
 */
export async function groundedScript(input: {
  kind: "news" | "tip";
  title: string;
  sourceText: string;
  audience?: string;
}): Promise<GroundedScript | null> {
  const audience =
    input.audience ?? "parents and teachers of children aged 3 to 8";
  const framing =
    input.kind === "news"
      ? [
          "This is a news/discussion reel. Stay curious, calm, pro-child, empathetic to BOTH parents and teachers.",
          "Frame as 'here is what is happening, what do you think', never 'pick a side and fight'.",
          "End the payoff on a genuine, open, practical question. NEVER use loaded/insinuating closers ('or is it about something else?').",
        ]
      : [
          "This is a practical tips reel — the kind of useful thing a parent SAVES to refer back to (a drill, an activity, a recipe idea, a money-saving tip, a thing to try).",
          "Be concrete and genuinely useful. The payoff should leave the parent with something they can actually do, then invite them to share their own.",
        ];

  try {
    const { output } = await generateText({
      model: models.creative,
      prompt: [
        `Write a short vertical-reel script for ${audience}.`,
        `Topic title: ${input.title}`,
        "",
        "SOURCE TEXT (the only facts you may use):",
        '"""',
        input.sourceText,
        '"""',
        "",
        "HARD GROUNDING RULES:",
        "- Use ONLY facts, numbers, names, prices, study sizes, and claims that appear in the SOURCE TEXT above.",
        "- NEVER invent or estimate a number, statistic, price, date, or study size. If the source has no specific figure, do not state one.",
        "- If you are not confident a specific is in the source, leave it out and stay general.",
        "",
        ...framing.map((l) => `- ${l}`),
        "- Punch up at systems, never down at individual parents, teachers, or children. No 'AI' framing. US-friendly spelling.",
        `- ${NO_EM_DASHES_RULE}`,
        "",
        "Return JSON with exactly these fields:",
        '  "hook": a curiosity/problem-first opening line (max ~16 words),',
        '  "centerBlock": the single most striking, SOURCE-SUPPORTED detail as one readable sentence (~8 to 16 words). Lead with a real figure ONLY if it is in the source. Never a vague 1 to 3 word phrase.',
        '  "payoff": one or two sentences ending on a genuine, open question,',
        '  "coverTeaser": a question-shaped line for the cover image.',
        "JSON only.",
      ].join("\n"),
      output: Output.object({ schema: scriptSchema }),
      temperature: 0.5,
    });
    if (!output?.hook || !output.centerBlock) return null;
    return output;
  } catch (err) {
    console.warn(
      "[grounding] script failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

const verdictSchema = z.object({
  supported: z
    .boolean()
    .describe("true only if EVERY specific claim is supported by the source"),
  reason: z.string().describe("the unsupported claim if any, else a brief ok"),
});

/**
 * Verify the script's specific claims are supported by the source text.
 * Returns { supported, reason }. Fails CLOSED on error (treats as
 * unsupported) — for a kids brand an unverifiable claim never ships.
 */
export async function verifyGrounding(input: {
  script: GroundedScript;
  sourceText: string;
}): Promise<{ supported: boolean; reason: string }> {
  try {
    const { output } = await generateText({
      model: models.analytics,
      system:
        "You are a strict fact-checker. You verify that the SPECIFIC claims in a short script (especially any number, name, price, or study size) are directly supported by the SOURCE TEXT. General, well-known advice is fine without a source. A specific figure NOT in the source is NOT supported.",
      prompt: [
        "SOURCE TEXT:",
        '"""',
        input.sourceText,
        '"""',
        "",
        "SCRIPT:",
        `hook: ${input.script.hook}`,
        `centerBlock: ${input.script.centerBlock}`,
        `payoff: ${input.script.payoff}`,
        "",
        'Is every specific claim (numbers/names/prices/study sizes) supported by the source text? Reply JSON only: { "supported": boolean, "reason": string }.',
      ].join("\n"),
      output: Output.object({ schema: verdictSchema }),
      temperature: 0,
    });
    return {
      supported: !!output?.supported,
      reason: output?.reason ?? "no reason",
    };
  } catch (err) {
    return {
      supported: false,
      reason: `verifier error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
