/**
 * Drift guard for the composed CC social prompts.
 *
 * Why this test exists: the brand-voice cores (CC_BRAND_VOICE_CORE,
 * ccPlatformAdapter, ccContentTypeAdapter) define hard rules, but the
 * caption-system prompts and demo-reel addendums are separate strings
 * that have drifted off-voice in the past — e.g. LinkedIn caption prompt
 * literally said "kids' AI coloring-book platform" with an "generated
 * by AI" example, contradicting CC's own no-"AI" rule. Em-dashed CTA
 * exemplars have appeared and been hand-removed. This test composes the
 * full system prompt each caption fn would actually send to the model
 * and asserts the voice rules are respected.
 *
 * NOT exhaustive — explicitly designed to catch the categories of drift
 * that have already bitten us once. Add new rules as we catch new drift.
 *
 * Hard fails (the build breaks) on em dashes, the word "AI" outside the
 * core's own ban-string, and ventriloquism phrases ("my kid"/"your kid"
 * in CTA exemplars rather than as forbidden examples). Soft warns on
 * borderline phrases worth reviewing but not breaking the build over.
 */
import { describe, it, expect } from 'vitest';
import {
  CC_BRAND_VOICE_CORE,
  NO_EM_DASHES_RULE,
  NO_MARKDOWN_RULE,
} from '@one-colored-pixel/coloring-core';
import {
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  PINTEREST_CAPTION_SYSTEM,
  TIKTOK_CAPTION_SYSTEM,
  LINKEDIN_CAPTION_SYSTEM,
  THREADS_CAPTION_SYSTEM,
} from './prompts';
import {
  INSTAGRAM_CAROUSEL_ADDENDUM,
  INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM,
  INSTAGRAM_REEL_ADDENDUM,
  FACEBOOK_VIDEO_ADDENDUM,
  FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM,
  INSTAGRAM_COLORED_STATIC_ADDENDUM,
  FACEBOOK_COLORED_STATIC_ADDENDUM,
  buildDemoReelFraming,
  buildInstagramDemoReelAddendum,
  buildFacebookDemoReelAddendum,
  buildTikTokDemoReelAddendum,
  buildLinkedinDemoReelAddendum,
} from '@/app/actions/social';

/**
 * The cores intentionally name the banned things ("never use em dashes",
 * "never the word AI") inside their own copy. Strip those rule strings
 * before scanning so we're checking the prompt's *advice and exemplars*,
 * not the rule statement itself.
 */
const stripMetaStrings = (s: string): string =>
  s
    .replaceAll(NO_EM_DASHES_RULE, '')
    .replaceAll(NO_MARKDOWN_RULE, '')
    .replaceAll(CC_BRAND_VOICE_CORE, '');

type Composed = { name: string; prompt: string };

/**
 * Every realistic system prompt CC composes today. If a new caption fn
 * is added, add it here so the drift guard covers it.
 */
const allComposedPrompts = (): Composed[] => {
  const variants = ['TEXT', 'IMAGE', 'VOICE'] as const;
  const out: Composed[] = [];

  // Caption systems as-is (the model sees these standalone in some paths).
  for (const [name, prompt] of [
    ['INSTAGRAM_CAPTION_SYSTEM', INSTAGRAM_CAPTION_SYSTEM],
    ['FACEBOOK_CAPTION_SYSTEM', FACEBOOK_CAPTION_SYSTEM],
    ['PINTEREST_CAPTION_SYSTEM', PINTEREST_CAPTION_SYSTEM],
    ['TIKTOK_CAPTION_SYSTEM', TIKTOK_CAPTION_SYSTEM],
    ['LINKEDIN_CAPTION_SYSTEM', LINKEDIN_CAPTION_SYSTEM],
    ['THREADS_CAPTION_SYSTEM', THREADS_CAPTION_SYSTEM],
  ] as const) {
    out.push({ name, prompt });
  }

  // Caption systems + each addendum, mirroring how the caption fns
  // build them. (See app/actions/social.ts generateInstagramCaption etc.)
  for (const [name, addendum] of [
    ['IG + carousel', INSTAGRAM_CAROUSEL_ADDENDUM],
    ['IG + carousel-with-colored', INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM],
    ['IG + reel', INSTAGRAM_REEL_ADDENDUM],
    ['IG + colored-static', INSTAGRAM_COLORED_STATIC_ADDENDUM],
  ] as const) {
    out.push({ name, prompt: INSTAGRAM_CAPTION_SYSTEM + addendum });
  }
  for (const [name, addendum] of [
    ['FB + video', FACEBOOK_VIDEO_ADDENDUM],
    ['FB + image-with-video', FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM],
    ['FB + colored-static', FACEBOOK_COLORED_STATIC_ADDENDUM],
  ] as const) {
    out.push({ name, prompt: FACEBOOK_CAPTION_SYSTEM + addendum });
  }

  // Demo-reel framing + per-platform demo-reel addendums vary by variant.
  for (const variant of variants) {
    out.push({
      name: `demo-reel framing (${variant})`,
      prompt: buildDemoReelFraming(variant),
    });
    out.push({
      name: `IG demo-reel (${variant})`,
      prompt:
        INSTAGRAM_CAPTION_SYSTEM + buildInstagramDemoReelAddendum(variant),
    });
    out.push({
      name: `FB demo-reel (${variant})`,
      prompt:
        FACEBOOK_CAPTION_SYSTEM + buildFacebookDemoReelAddendum(variant),
    });
    out.push({
      name: `TikTok demo-reel (${variant})`,
      prompt: TIKTOK_CAPTION_SYSTEM + buildTikTokDemoReelAddendum(variant),
    });
    out.push({
      name: `LinkedIn demo-reel (${variant})`,
      prompt: LINKEDIN_CAPTION_SYSTEM + buildLinkedinDemoReelAddendum(variant),
    });
  }

  return out;
};

describe('CC prompt drift guard — hard rules', () => {
  const prompts = allComposedPrompts();

  it.each(prompts)(
    'no em dashes in the model-facing copy: $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // The voice rule literally says "Never use em dashes". The
      // sanitiser catches output, but if the prompt itself models the
      // bad behaviour the model copies the rhythm.
      expect(scanned, 'em dash present in prompt copy').not.toContain('—');
    },
  );

  it.each(prompts)(
    'no en dashes in the model-facing copy: $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // En dashes drift in from copy-paste / AI output describing
      // numeric ranges like "150–220 words". Same rule, same problem.
      expect(scanned, 'en dash present in prompt copy').not.toContain('–');
    },
  );

  it.each(prompts)(
    'no standalone word "AI" in the model-facing copy: $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // "AI" as a word is banned (parents are AI-skeptical). Allowed
      // INSIDE the ban-list of the brand-voice core, which is stripped
      // above. Also allowed in hyphenated context like "AI-skeptical"
      // or in literal quotes that ARE the ban list (e.g. '"AI", "tech",
      // "automatic" — banned everywhere'). The \b on each side catches
      // standalone usage; AI-skeptical / AI- / "AI" all bypass it.
      // Quoted occurrences inside forbidden-example arrays pass because
      // the quote chars aren't word-boundary matches.
      expect(
        scanned,
        'standalone word "AI" present in model-facing prompt',
      ).not.toMatch(/(^|[^A-Za-z"'#-])AI(?=[^A-Za-z"'-])/);
    },
  );

  it.each(prompts)(
    'no fake-testimonial ventriloquism CTAs ("my kid X" as positive exemplar): $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // The voice core forbids ventriloquism ("my kid loved this" =
      // putting words in a non-existent kid's mouth). The brand-voice
      // core, demo-reel framing, and per-platform forbidden-example
      // lists deliberately QUOTE the anti-pattern so the model treats
      // it as banned. The drift we're catching is the OPPOSITE: the
      // phrase appearing UNQUOTED in a positive exemplar, body CTA, or
      // suggested opener.
      //
      // Heuristic: any "my kid" preceded immediately by a quote char
      // (" or ') is an anti-pattern reference and safe. Unquoted "my
      // kid" is the violation.
      //
      // "your kid" is explicitly allowed (second-person address to the
      // parent reading is fine: "let your kid have a go"); only "my
      // kid" is the ventriloquism failure.
      expect(
        scanned,
        'unquoted "my kid" in model-facing prompt (ventriloquism)',
      ).not.toMatch(/(?<![""'])\bmy kid\b/i);
    },
  );
});

describe('CC prompt drift guard — soft review (warnings, do not fail)', () => {
  // These don't fail the build — they print to stderr so they show up
  // in CI logs and pre-commit output as "hey, you might want to look".
  // Add patterns here whenever drift bites; promote to a hard rule once
  // the rule is settled.
  const borderlinePatterns: { name: string; pattern: RegExp }[] = [
    { name: 'corporate cliché "in today\'s fast-paced"', pattern: /in today's fast-paced/i },
    { name: 'marketing cliché "unlock"', pattern: /\bunlock(?:s|ing)?\b/i },
    { name: 'marketing cliché "game.?changer"', pattern: /\bgame.?changer\b/i },
    { name: 'engagement-bait "don\'t miss out"', pattern: /don't miss out/i },
    { name: 'condescending "every parent should"', pattern: /every parent should/i },
  ];

  it('soft-warns on borderline phrases in any composed prompt', () => {
    const findings: string[] = [];
    for (const { name, prompt } of allComposedPrompts()) {
      const scanned = stripMetaStrings(prompt);
      for (const { name: ruleName, pattern } of borderlinePatterns) {
        if (pattern.test(scanned)) {
          findings.push(`  [${name}] matched borderline rule: ${ruleName}`);
        }
      }
    }
    if (findings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[prompt-drift-guard] ${findings.length} borderline match(es):\n${findings.join('\n')}\n(soft warning — fix or promote to hard rule)`,
      );
    }
    // Always passes — borderline matches are review-worthy, not blocking.
    expect(true).toBe(true);
  });
});
