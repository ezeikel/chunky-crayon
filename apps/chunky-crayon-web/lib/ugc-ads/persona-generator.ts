/**
 * Persona dossier generator — the "drafting" half of `launch-ugc-persona.ts`.
 *
 * Two-step flow:
 *
 *   1. Perplexity Sonar does location-aware web research for the persona's
 *      vibe — surfaces real local accounts to follow, real micro-creators
 *      in the niche, real handle conventions. Single grounded call. Output
 *      is freeform text passed straight into step 2.
 *
 *   2. Claude Opus 4.7 consolidates the research into a strict
 *      PersonaDossierSchema — face brief + handle options + bio + follow
 *      list (split by category) + engagement targets + warm-up action
 *      plan. Two consecutive structured calls (face/identity first, then
 *      research-driven structure) — keeps each prompt focused.
 *
 * The output is parsed against Zod and returned. Caller (the orchestrator)
 * picks a handle, generates assets, and writes the row. This module only
 * produces JSON — no DB writes, no R2 writes, no API beyond OpenAI/Claude.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { perplexity } from '@ai-sdk/perplexity';
import { z } from 'zod';
import {
  FaceBriefSchema,
  FollowListSchema,
  EngagementTargetsSchema,
  WarmUpActionSchema,
  type FaceBrief,
  type FollowList,
  type EngagementTargets,
  type WarmUpAction,
} from './types';

// ─────────────────────────────────────────────────────────────────────
// Output type — what the generator returns. Stage A produces the
// identity (face + voice spec + handle options); stage B produces the
// research-driven blocks. Caller assembles into a Persona row.
// ─────────────────────────────────────────────────────────────────────

export const HandleOptionSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_.]+$/, {
      message:
        'handle must be lowercase letters, digits, _ or . (TikTok handle rules)',
    }),
  /** Why this handle reads as a real human, not a brand or bot. */
  reasoning: z.string().min(1),
});

export const PersonaIdentitySchema = z.object({
  faceBrief: FaceBriefSchema,
  /** What the operator picks from. The generator suggests several. */
  handleOptions: z.array(HandleOptionSchema).min(3).max(6),
  /** Display name (the persona's first name + maybe an emoji or stylization). */
  displayName: z.string().min(1).max(30),
  bio: z.string().min(1).max(80),
  /**
   * Voice-design prompt fed into ElevenLabs `/v1/text-to-voice/design`.
   * Should describe age, accent, pace, vocal qualities — NOT what they
   * say. ElevenLabs docs recommend ~100-300 words ≈ 600-2000 chars; cap
   * at 2500 to leave headroom for Claude's natural verbosity without
   * being so loose the output starts including script content (which
   * the system prompt explicitly forbids).
   */
  voiceDesignPrompt: z.string().min(20).max(2500),
});

export type PersonaIdentity = z.infer<typeof PersonaIdentitySchema>;
export type HandleOption = z.infer<typeof HandleOptionSchema>;

export const PersonaResearchSchema = z.object({
  followList: FollowListSchema,
  likeTargets: EngagementTargetsSchema,
  commentTargets: EngagementTargetsSchema,
  warmUpPlan: z.array(WarmUpActionSchema).min(20),
});

export type PersonaResearch = z.infer<typeof PersonaResearchSchema>;

export type PersonaDossier = {
  identity: PersonaIdentity;
  research: PersonaResearch;
};

// ─────────────────────────────────────────────────────────────────────
// Step 1 — Perplexity-grounded research dump.
// Single text-mode call; Sonar handles the search itself. We pass the
// raw output text directly to Claude in step 2 as grounding.
// ─────────────────────────────────────────────────────────────────────

const RESEARCH_SYSTEM = `You are a research assistant. The user will describe a fictional TikTok creator persona — age, ethnicity, city, profession, vibe.

Your job: search the web NOW and return real, current information that another model will use to make this persona feel authentic. Return PLAIN PROSE, no JSON.

For the given persona, find and list:

1. **15-20 real TikTok micro-creators (5k-500k followers)** in this persona's main niche AS OF 2026. Real handles, no @. One short line each ("@handle — what they post, why this persona would follow").

2. **8-12 adjacent-lifestyle TikTok accounts** (food, comedy, couples, pets, NOT the main niche). Real handles, one-liner each.

3. **5-8 big creators** the persona would also follow (A-list tier — MrBeast, Khaby, Bella Poarch type). Real handles.

4. **6-10 local accounts in the persona's city** — local news, restaurants, regional creators. Real handles, one line each.

5. **3-5 unrelated viral accounts** (sports, music, random viral). Real handles.

6. **Naming conventions for TikTok handles in this persona's demographic** — what real humans of this age/ethnicity/city use. List 5-8 real-looking handle patterns (don't invent fake users, describe the pattern).

7. **What this persona's actual home/kitchen looks like** — what's on the counter, what's on the fridge, what's clutter looks like in an apartment in this city for this demographic. Be specific and mundane.

8. **What this persona sounds like when speaking on TikTok** — accent details, filler words, pace, typical phrases. Describe the SOUND, not what they say.

Keep the prose dense — bullet points are fine. Cite sources where you actually used them (URLs after the line). If you can't find something for a section, write "INSUFFICIENT RESEARCH" — do not invent.`;

async function researchPersona(vibe: string): Promise<string> {
  const sonar = perplexity('sonar');
  const { text } = await generateText({
    model: sonar,
    system: RESEARCH_SYSTEM,
    prompt: `Persona vibe: ${vibe}\n\nResearch this persona per the system instructions. Return plain prose, no JSON.`,
    temperature: 0.4,
  });
  return text;
}

// ─────────────────────────────────────────────────────────────────────
// Step 2a — Identity consolidation.
// Claude Opus 4.7 reads the vibe + research dump and produces the
// PersonaIdentity (FaceBrief + handle options + bio + voice spec).
// Kept separate from the research-block call so each schema is focused
// and JSON failure surfaces are smaller.
// ─────────────────────────────────────────────────────────────────────

const OPUS_MODEL_ID = 'claude-opus-4-7';

const IDENTITY_SYSTEM = `<role>
You design AI personas for synthetic TikTok creators. The output of this call drives image generation (FaceBrief → still prompt), voice generation (voiceDesignPrompt → ElevenLabs Voice Design), and the operator's account-creation step (handleOptions, displayName, bio).
</role>

<critical-rules>
- Take the user's vibe LITERALLY. If they said "32yo Latina mom in Austin", do NOT shift the age, ethnicity, or city in the FaceBrief.
- FaceBrief.skinDescription MUST explicitly call out imperfections — pores, blemishes, faint asymmetries. This is the anti-AI-sheen instruction; without it the still generator outputs glamour shots.
- FaceBrief.kitchenStyle MUST describe lived-in clutter (specific items: banana on counter, magnet to-do list, etc.) — not "modern kitchen with clean counters".
- FaceBrief.doNotInclude MUST contain at least: "no makeup retouching", "no studio lighting", "no commercial polish", "no glossy skin". Add 2-4 more relevant to the persona.
- Handle options: TikTok handles are lowercase letters, digits, underscores, and dots. 3-24 chars. NO emojis or special chars in the handle itself. The displayName field can have an emoji.
- Handles must look like real humans of this demographic. NOT brand-style ("@chunkycrayon_official"), NOT bot-style ("@user_8472"). Examples of real patterns: "sarahatx", "mari.k", "itsjessxo", "sarah03_".
- Bio: 1 short line, max 80 chars. Lowercase fine. At most one emoji. NO "link in bio", NO CTAs (added later).
- voiceDesignPrompt: describes the SOUND of the voice (age, accent, pace, vocal fry, tone). Per ElevenLabs docs, ~100-300 words. Do NOT include script content.
</critical-rules>

<output-format>
Return ONLY a JSON object exactly matching this shape — no prose, no code fences, every field present:

{
  "faceBrief": {
    "ageRange": "string — e.g. '32 years old, faint smile lines, tired under-eyes'",
    "ethnicity": "string — e.g. 'Mexican-American Latina, warm medium-tan complexion'",
    "city": "string — e.g. 'Austin, Texas — East Austin / Riverside area'",
    "profession": "string — e.g. 'Stay-at-home mom of two kids ages 4 and 6'",
    "vibe": "string — 1-2 sentences describing the persona's vibe / on-camera energy",
    "hairDescription": "string — concrete hair details for the image generator",
    "skinDescription": "string — MUST call out imperfections per the rules above",
    "clothing": "string — typical outfit, mundane and lived-in",
    "kitchenStyle": "string — lived-in clutter with specific named items",
    "lightingNotes": "string — window direction, time-of-day default, no studio look",
    "speechPatterns": "string — fillers, pace, accent details for voice generation",
    "doNotInclude": ["array of strings — 4+ entries per rules above"]
  },
  "handleOptions": [
    { "handle": "lowercase string, TikTok-valid chars only", "reasoning": "1 sentence" },
    { "handle": "...", "reasoning": "..." },
    { "handle": "...", "reasoning": "..." }
  ],
  "displayName": "1-30 char string, may include emoji",
  "bio": "1-80 char string",
  "voiceDesignPrompt": "100-300 word string describing the SOUND of the voice"
}

Every single field in faceBrief MUST be present and non-empty. Every entry in handleOptions MUST be an object with both 'handle' and 'reasoning' keys — NOT a bare string.
</output-format>`;

async function generateIdentity(
  vibe: string,
  research: string,
): Promise<PersonaIdentity> {
  const claude = anthropic(OPUS_MODEL_ID);
  const userPrompt = `<persona-vibe>
${vibe}
</persona-vibe>

<research-dump-from-perplexity>
${research}
</research-dump-from-perplexity>

Produce the PersonaIdentity for this persona. The research dump is grounding — use it to make the bio + handle suggestions feel real for this demographic + city. The FaceBrief should reflect the persona's actual look and home; lean on the research's "what their kitchen looks like" section verbatim.`;

  // Plain text + JSON.parse + Zod. We deliberately don't use Output.object
  // here — the AI SDK's structured-output mode wraps Anthropic tool responses
  // in a $JSON envelope that doesn't match the declared schema, and the
  // first-real-run failed for that reason. Text mode is one fewer moving
  // part; Zod still gives runtime safety and the retry loop handles malformed
  // JSON.
  //
  // No `temperature` — Anthropic deprecated it on claude-opus-4-7.
  const { text } = await generateText({
    model: claude,
    system: `${IDENTITY_SYSTEM}\n\nIMPORTANT: respond with ONLY the JSON, no prose, no code fences.`,
    prompt: userPrompt,
  });
  return parseClaudeJson('identity', PersonaIdentitySchema, text);
}

// ─────────────────────────────────────────────────────────────────────
// Step 2b — Research-block consolidation.
// Claude Opus 4.7 transforms the Perplexity dump into the structured
// FollowList + EngagementTargets + WarmUpAction[] plan. Uses the same
// research input as step 2a so the model sees the same context.
// ─────────────────────────────────────────────────────────────────────

const RESEARCH_BLOCKS_SYSTEM = `<role>
You translate persona research into a structured action plan for the operator (a human running a synthetic TikTok account).
</role>

<critical-rules>
- ALL handles in followList/likeTargets/commentTargets MUST come from the research dump. Do NOT invent handles. If the dump doesn't have enough handles in a category, repeat real ones rather than fabricate.
- FollowList ratios target ~30-40% niche, ~15-25% adjacent, ~10-20% big, ~10-15% local, ~5-10% unrelated. The Zod schema enforces minimums; aim above the minimums where the dump supports it.
- WarmUpPlan is 10 days (days 1-10), 2-4 actions per day, 20-40 actions total. Days 1-3 are scroll-heavy and very low engagement (0-5 likes/day, no comments, 0-3 follows/day). Days 4-7 ramp slowly. Days 8-10 introduce 1-2 short comments/day and the first warmup post.
- WarmUpPlan action types are limited to: SCROLL_FYP, FOLLOW_ACCOUNT, LIKE_VIDEO, COMMENT_VIDEO, POST_WARMUP_CLIP, ADD_LINK_IN_BIO. ADD_LINK_IN_BIO MUST appear AFTER the first POST_WARMUP_CLIP day, never on day 1.
- WarmUpAction.target: handle for FOLLOW_ACCOUNT, content description for LIKE_VIDEO/COMMENT_VIDEO, omit for SCROLL_FYP/ADD_LINK_IN_BIO, sequence number for POST_WARMUP_CLIP.
- description: human-readable for the operator's checklist row. "Follow @sarahcoeur (parenting micro-creator in Austin)". "Scroll FYP 30+ min, watch most videos to completion".
- DO NOT include any reasoning, prose, or markdown — strict JSON only.
</critical-rules>

<output-format>
Return ONLY a JSON object exactly matching this shape — no prose, no code fences, every key present:

{
  "followList": {
    "niche": [{ "handle": "string (no @)", "why": "1 sentence" }, ...],
    "adjacent": [{ "handle": "...", "why": "..." }, ...],
    "big": [{ "handle": "...", "why": "..." }, ...],
    "local": [{ "handle": "...", "why": "..." }, ...],
    "unrelated": [{ "handle": "...", "why": "..." }, ...]
  },
  "likeTargets": [
    { "handle": "string (no @)", "contentDescription": "1 sentence", "why": "1 sentence" }, ...
  ],
  "commentTargets": [
    { "handle": "string (no @)", "contentDescription": "1 sentence", "why": "1 sentence" }, ...
  ],
  "warmUpPlan": [
    { "day": 1, "type": "SCROLL_FYP", "description": "..." },
    { "day": 2, "type": "FOLLOW_ACCOUNT", "target": "handle_no_at", "description": "..." },
    ...
  ]
}

Minimums (the consuming Zod schema enforces these):
- followList.niche: 8+ entries
- followList.adjacent: 4+ entries
- followList.big: 3+ entries
- followList.local: 3+ entries
- followList.unrelated: 2+ entries
- warmUpPlan: 20+ entries across days 1-10

Every followList/likeTargets/commentTargets entry MUST be an object — NEVER a bare string.
</output-format>`;

async function generateResearchBlocks(
  vibe: string,
  research: string,
): Promise<PersonaResearch> {
  const claude = anthropic(OPUS_MODEL_ID);
  const userPrompt = `<persona-vibe>
${vibe}
</persona-vibe>

<research-dump-from-perplexity>
${research}
</research-dump-from-perplexity>

Produce the PersonaResearch structured block. All handles must come from the research dump above. WarmUpPlan must follow the practitioner-consensus ramp (days 1-3 low, days 4-7 medium, days 8-10 first posts).`;

  // Plain text + JSON.parse + Zod. Same reasoning as generateIdentity —
  // structured-output mode wraps Anthropic responses in a $JSON envelope
  // that doesn't match the declared schema. Text mode is one fewer moving
  // part.
  const { text } = await generateText({
    model: claude,
    system: `${RESEARCH_BLOCKS_SYSTEM}\n\nIMPORTANT: respond with ONLY the JSON, no prose, no code fences.`,
    prompt: userPrompt,
  });
  return parseClaudeJson('research-blocks', PersonaResearchSchema, text);
}

const stripFences = (s: string): string =>
  s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

/**
 * Parse Claude's JSON response and validate against the schema. On
 * failure, echo the raw text + parsed value into the thrown error so
 * the next debug pass doesn't have to add logging. Without this the
 * Zod error shows what's missing but not what Claude actually produced.
 */
function parseClaudeJson<T>(
  label: string,
  schema: { parse: (v: unknown) => T },
  text: string,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch (err) {
    throw new Error(
      `[ugc-persona] ${label} JSON.parse failed: ${(err as Error).message}\n` +
        `--- raw text (first 1000 chars) ---\n${text.slice(0, 1000)}`,
    );
  }
  try {
    return schema.parse(parsed);
  } catch (err) {
    throw new Error(
      `[ugc-persona] ${label} Zod validation failed: ${(err as Error).message}\n` +
        `--- parsed shape (top-level keys) ---\n${
          parsed && typeof parsed === 'object'
            ? Object.keys(parsed as object).join(', ')
            : typeof parsed
        }\n` +
        `--- raw text (first 2000 chars) ---\n${text.slice(0, 2000)}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Public entry — orchestrates the three-call pipeline. The caller is
// the persona-launch script. Wall-clock: ~30-60s end-to-end (Perplexity
// search dominates).
// ─────────────────────────────────────────────────────────────────────

export async function generatePersonaDossier(
  vibe: string,
): Promise<PersonaDossier> {
  const research = await researchPersona(vibe);

  const [identity, researchBlocks] = await Promise.all([
    generateIdentity(vibe, research),
    generateResearchBlocks(vibe, research),
  ]);

  return {
    identity,
    research: researchBlocks,
  };
}

// Re-export the parsed types so callers don't have to know the schema names.
export type {
  FaceBrief,
  FollowList,
  EngagementTargets,
  WarmUpAction,
} from './types';
