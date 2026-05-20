/**
 * CC caption system-prompt addendums + per-platform demo-reel builders.
 *
 * Extracted from social.ts because that file has `'use server'` at the top,
 * which makes Next.js enforce "every export must be an async function".
 * The addendum constants and synchronous builder fns (buildDemoReelFraming,
 * buildInstagramDemoReelAddendum, etc.) violated that rule, breaking the
 * Vercel build the moment they were exported for the drift-guard test.
 *
 * Two upsides of the extraction beyond fixing the build:
 *   1. Mirrors the PTP pattern (apps/web/app/actions/social-prompts.ts).
 *   2. Drift-guard test (lib/ai/prompts.test.ts) imports from here directly;
 *      no risk of test-time side effects from social.ts's 'use server'
 *      transitive deps.
 *
 * The actual caption-fn generators (generateInstagramCaption etc.) stay in
 * social.ts as async server actions; they import addendums from here.
 */

import { ccVoice } from '@one-colored-pixel/coloring-core';

/**
 * Instagram carousel-specific system prompt addition.
 * Static image first (conversion), video second (engagement).
 */
export const INSTAGRAM_CAROUSEL_ADDENDUM = `

CAROUSEL POST - Create ANTICIPATION for swiping:

Slides: 1) Printable coloring page 2) Animated version coming to life

REQUIREMENTS:
1. Hook MUST create swipe urge: "Swipe to see this [subject] come to life" / "Slide 2 is *chef's kiss*"
2. Natural swipe CTAs: "Swipe to watch the animation" / "Wait till you see slide 2"
3. SAVE TRIGGER (essential): "Save this for your next coloring session"
4. Final CTA: "Love it? Grab this page free - link in bio!"

Remember: Write as Chunky Crayon the brand. Output ONLY the final caption text without any labels or section markers.`;

/**
 * Instagram carousel with colored example (2 slides).
 * Colored example first (scroll-stopper) → B&W printable second
 */
export const INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM = `

2-SLIDE CAROUSEL - Color first to stop the scroll:

Slides: 1) Colored example (eye-catching) 2) Printable B&W version

REQUIREMENTS:
1. Color hook: "Look how this one turned out!" / "We love how this [subject] came together"
2. Swipe CTA: "Swipe for the free printable version!"
3. SAVE TRIGGER: "Save this for your next coloring session"
4. CTA: "Free download - link in bio!"

Remember: Write as Chunky Crayon the brand. Output ONLY the final caption text without any labels or section markers.`;

/**
 * Instagram Reel-specific system prompt addition.
 * Cross-promotes the carousel post for downloads.
 */
export const INSTAGRAM_REEL_ADDENDUM = `

REEL - Optimized for DISCOVERY and REACH:

REQUIREMENTS:
1. VIRAL HOOK (choose one that fits):
   - "You're welcome."
   - "POV: You find the perfect coloring page"
   - "This is why we love making coloring pages"

2. SHORT caption (under 150 chars before hashtags) - Reel captions get clipped

3. CROSS-PROMO to feed: "Want to color this? Check our latest post for the free printable!"

4. ENGAGEMENT: "Double tap if your kid would love this" / "Comment what we should make next!"

5. DISCOVERY HASHTAGS (8-12): Mix #reels #explorepage with niche tags like #kidsactivities #coloringpage

Remember: Write as Chunky Crayon the brand. Output ONLY the final caption text without any labels or section markers like "REEL:", "VIRAL HOOK:", etc.`;

/**
 * Facebook video-specific system prompt addition.
 */
export const FACEBOOK_VIDEO_ADDENDUM = `

VIDEO POST - Optimize for watch time and shares:

REQUIREMENTS:
1. WATCH-TIME hook: "Watch until the end - the animation is SO satisfying"
2. SHARE TRIGGER: "Share this with someone who loves creative activities!"
3. COMMENT DRIVER: "What should we animate next? Drop your vote!"
4. CTA: "Download the printable version at chunkycrayon.com"

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers like "POST CAPTION:", "VIDEO:", etc.`;

/**
 * Facebook image post when video is also posted.
 * Cross-references the video post.
 */
export const FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM = `

IMAGE POST (video also posted) - Cross-reference naturally:

REQUIREMENTS:
1. Reference the video: "Saw our animated video? Here's the printable version!"
2. OR lead with printable: "The printable version of today's animated coloring page"
3. Download CTA: "Free download at chunkycrayon.com"
4. Keep warm and family-focused

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers like "Caption:", "Call to Action:", etc.`;

/**
 * Shared demo-reel framing. The reel is a product demo (not an animated
 * line-art reel): a kid types/speaks a prompt, AI draws the coloring page,
 * Magic Brush reveals the colors. Captions should sell the *product*, not
 * the artwork — that's what the static image posts are for.
 */
/**
 * Build the per-render reel framing — varies by which input the kid uses.
 * The framing is what the caption opener hooks on, so getting the input
 * mode right is what makes a TikTok caption read true vs. like AI slop.
 *
 * Hard rule: do NOT use the words "AI", "artificial intelligence", "tech",
 * "magic brush", or any reference to the underlying model. Parents are
 * AI-skeptical right now — frame the magic in human terms (the kid asks,
 * a coloring page appears, watch the colors fill in).
 */
export const buildDemoReelFraming = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => {
  // What input the demo shows on screen. Stated as the feature we're
  // demonstrating ("type an idea"), NOT as something the viewer's kid did
  // ("your kid types"). That second-person framing is the fake-testimonial
  // failure Phase 0 research flagged; the brand-voice core forbids it.
  const inputLine =
    variant === 'IMAGE'
      ? 'upload a photo (a pet, a toy, something around them)'
      : variant === 'VOICE'
        ? 'say out loud what they want to colour'
        : 'type a short idea';

  // ccVoice('tiktok', 'demo_reel') carries the brand core + the demo-reel
  // anti-ventriloquism rule. Platform-specific length is layered on by the
  // per-platform addendum that wraps this; tiktok is just the seed here.
  return `
${ccVoice('tiktok', 'demo_reel')}

WHAT THIS SPECIFIC REEL SHOWS (a demo we recorded from chunkycrayon.com):
1. A kid can ${inputLine}
2. A printable coloring page appears in seconds
3. The colors sweep across and fill it in

Caption it as us showing the feature in action ("watch our app turn a
${variant === 'IMAGE' ? 'photo' : variant === 'VOICE' ? 'spoken idea' : 'typed idea'} into a coloring page"). Sell the OUTCOME, a free
printable and a screen-free win, never the workflow and never the
technology. The video carries the wow; the caption stays plain.`;
};

/**
 * The mandatory verb for line-1 of caption hooks. The variant of the reel
 * dictates which input the kid used — captions MUST acknowledge it on
 * the first line so the hook reads true to what the viewer is watching.
 *
 * Pass these into the caption prompt as a non-negotiable requirement, not
 * as a hint, otherwise Claude defaults to generic "we just released …"
 * openers that ignore the variant entirely.
 */
const variantHookRequirement = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): {
  /** What action the kid took. Use these exact verbs / phrasings on line 1. */
  inputAction: string;
  /** Concrete examples Claude should mimic on line 1. */
  examples: string[];
  /** What to avoid — common Claude failure modes. */
  forbidden: string[];
} => {
  if (variant === 'IMAGE') {
    return {
      inputAction: 'a photo gets uploaded',
      examples: [
        '"watch a photo turn into a coloring page"',
        '"upload a pic, get a printable coloring page back"',
        '"snap → coloring page, here\'s how it works"',
      ],
      forbidden: [
        '"my kid uploaded…", "your kid uploads…", "watch her face": fake-testimonial / ventriloquism, banned',
        '"we made…", "we released…": ignores the photo input, which is what the video shows',
        '"AI", "tech", "automatic": banned everywhere',
      ],
    };
  }
  if (variant === 'VOICE') {
    return {
      inputAction: 'an idea gets said aloud',
      examples: [
        '"say it out loud, get a coloring page"',
        '"watch a spoken idea become a printable page"',
        '"\'space dragon\' said out loud → coloring page"',
      ],
      forbidden: [
        '"my kid said…", "your kid says…", "watch her say it": fake-testimonial / ventriloquism, banned',
        '"we made…", "we released…": ignores the spoken input, which is what the video shows',
        '"typed", "uploaded": wrong variant',
        '"AI", "voice AI", "tech": banned everywhere',
      ],
    };
  }
  return {
    inputAction: 'a short idea gets typed',
    examples: [
      '"type 3 words, get a coloring page"',
      '"watch a typed idea become a printable page"',
      "\"'bumblebee garden' typed in → here's the page\"",
    ],
    forbidden: [
      '"my kid typed…", "your kid types…": fake-testimonial / ventriloquism, banned',
      '"we made…", "we released…", "we added…": reads as marketing, not a demo',
      '"snapped", "uploaded", "said": wrong variant',
      '"AI", "tech", "automatic": banned everywhere',
    ],
  };
};

/** Render the variant requirement as a prompt block — used by IG / FB / TikTok addendums. */
const renderVariantRequirement = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => {
  const req = variantHookRequirement(variant);
  return `
HARD REQUIREMENT: line 1 MUST show the feature where ${req.inputAction}.
Frame it as us demonstrating the app, not as a kid or parent narrating.

Good line-1 patterns to mimic:
${req.examples.map((e) => `  - ${e}`).join('\n')}

DO NOT use these openers:
${req.forbidden.map((f) => `  - ${f}`).join('\n')}`;
};

export const buildInstagramDemoReelAddendum = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => `
${buildDemoReelFraming(variant)}

REEL: product-demo hook, optimized for saves + shares:
${renderVariantRequirement(variant)}

REQUIREMENTS:
1. HOOK (first line, <60 chars): see the HARD REQUIREMENT above. The
   line MUST reference the kid's input action verbatim. Failure mode:
   generic "we made / we released" openers that ignore the variant.
   Avoid: "So satisfying", "ASMR", "animation" framing, anything tech-y.
2. BENEFIT (1 line): why a parent cares: free, instant, any idea their kid has.
3. SAVE TRIGGER: "Save this for the next 'I'm bored' moment".
4. CTA: "Try it free at chunkycrayon.com".
5. 8-12 discovery hashtags. Use parent + creativity tags, no tech ones,
   e.g. #kidsactivities #screenfreeplay #coloringpage #freeprintable
   #toddleractivities #preschool #kidscrafts #parentingwin.
   Do NOT use any tech-related hashtag.
6. Short, under 220 chars before hashtags. Reel captions get clipped.

Remember: Write as Chunky Crayon the brand. Output ONLY the final caption text without any labels or section markers.`;

export const buildFacebookDemoReelAddendum = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => {
  const opener =
    variant === 'IMAGE'
      ? `"We had to show you this. Upload a photo, and a free coloring page of it appears."`
      : variant === 'VOICE'
        ? `"We had to show you this. Say what you want to draw, and a free coloring page appears."`
        : `"We had to show you this. Type an idea, and a free coloring page appears."`;

  return `
${buildDemoReelFraming(variant)}

FACEBOOK VIDEO: product demo framed for parents/grandparents:
${renderVariantRequirement(variant)}

REQUIREMENTS:
1. Warm opener acknowledging the workflow. Line 1 MUST reference the
   kid's input action (per HARD REQUIREMENT above). Mimic the example:
   ${opener}
2. SHARE TRIGGER: "Tag a parent who'd love this" / "Share with the grandparents".
3. CTA: "Free at chunkycrayon.com, no signup needed to try it".
4. 2-3 hashtags max, family-friendly (#Parenting #KidsActivities).
5. Do NOT mention "AI", "artificial intelligence", "tech", "automatic",
   or "magic brush". Parents are AI-skeptical; show the feature and the
   free printable outcome, not the underlying tech.

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers.`;
};

export const buildTikTokDemoReelAddendum = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => {
  const lead =
    variant === 'IMAGE'
      ? `"snapped a pic → coloring page → watch the colors fill in"`
      : variant === 'VOICE'
        ? `"said it out loud → coloring page → watch the colors fill in"`
        : `"typed an idea → coloring page → watch the colors fill in"`;

  return `
${buildDemoReelFraming(variant)}

TIKTOK: authentic product-demo energy:
${renderVariantRequirement(variant)}

REQUIREMENTS:
1. Line 1 MUST follow the HARD REQUIREMENT above (lowercase, references
   the kid's input action). Use this template as the structural model:
   ${lead}
2. Keep it short, lowercase, conversational, no corporate voice.
3. One cheeky aside is fine ("this is unfair to crayons").
4. 5-8 hashtags: #fyp #parentsoftiktok #kidsactivities #coloringpage
   #screenfreeplay #kidstok. No tech-related hashtags.
5. End with "free at chunkycrayon.com".
6. Do NOT mention "AI", "artificial intelligence", "automatic", "tech",
   or "magic brush". Show the feature and the free printable outcome.

Remember: Output ONLY the final caption text without any labels.`;
};

export const buildLinkedinDemoReelAddendum = (
  variant: 'TEXT' | 'IMAGE' | 'VOICE' | null | undefined,
): string => {
  const inputDesc =
    variant === 'IMAGE'
      ? 'a child uploads a photo of something around them, and a printable coloring page of that photo appears'
      : variant === 'VOICE'
        ? 'a child says aloud what they want to colour, and a printable coloring page of that idea appears'
        : 'a child types a short idea, and a printable coloring page of that idea appears';

  return `
${buildDemoReelFraming(variant)}

LINKEDIN: professional framing for educators, early-years pros, working parents:

REQUIREMENTS:
1. Open with the observation, not the pitch: lead with what we've noticed
   about how young kids interact with creative tools and what we built in
   response.
2. Explain the workflow in one sentence: ${inputDesc}, then sweeps of color
   fill it in so they can see what's possible before they pick up a crayon.
3. Tie it to a professional theme: screen-free follow-through, agency,
   creativity, reducing prep time for educators.
4. CTA: "Free to try at chunkycrayon.com. We'd love your feedback".
5. 3-5 professional hashtags (#EarlyYears #EdTech #ScreenFreePlay #Parenting).
6. 150-220 words.
7. Do NOT use the words "AI", "artificial intelligence", "GenAI", "machine
   learning", or "magic brush". Even on LinkedIn the parents/educators
   audience reacts better to outcome-led language than tech-led language.

Remember: Output ONLY the final post text without any labels.`;
};

/**
 * Shared "colored static after the demo reel" framing. We post this AFTER
 * the demo reel so people who saw the colored result think "I want to make
 * my own", click through, and get the printable line art.
 */
const COLORED_STATIC_FRAMING = `
This is the BLANK line-art coloring page, the one viewers just saw
being colored in our demo reel. It's posted immediately after the reel
so people who watched it think "I want to print that". The image
they're seeing is the blank canvas, ready to print and color.

The caption must:
- Tie back to the reel they just watched (e.g. "saw the colors fill in
  earlier? here's the blank version, ready to print")
- Drive the click: this page is free to print + color at
  chunkycrayon.com, no signup needed.
- Make it about the kid's creativity and the screen-free moment, not
  about the underlying tech.
- Emphasize that THEIR version will look completely different. Every
  kid colors it their own way.`;

export const INSTAGRAM_COLORED_STATIC_ADDENDUM = `
${COLORED_STATIC_FRAMING}

INSTAGRAM SINGLE IMAGE: drive a click to chunkycrayon.com:

REQUIREMENTS:
1. HOOK (first line): something that ties to the demo reel they just
   saw OR teases the printable. Avoid "ASMR", "satisfying" framing.
   Good: "Saw the colors fill in earlier? Here's the blank version, ready to print."
         "We made this in seconds. Print it free and let your kid have a go."
2. SAVE TRIGGER: "Save this idea for your next bored-rainy-day moment".
3. CTA: "Try it free at chunkycrayon.com, link in bio".
4. 6-10 hashtags mixing #kidsactivities #coloringpage #freeprintable
   #screenfreeplay #parentingwin. No tech-related hashtags.

Remember: Output ONLY the caption text without labels.`;

export const FACEBOOK_COLORED_STATIC_ADDENDUM = `
${COLORED_STATIC_FRAMING}

FACEBOOK SINGLE IMAGE: warm, parent/grandparent voice:

REQUIREMENTS:
1. Open warmly: "Saw our short video earlier? This is how today's
   coloring page came out, and the blank version is free at
   chunkycrayon.com so your kid can have a go."
2. SHARE TRIGGER: "Tag a parent or grandparent who'd love this for
   the next car ride / rainy day".
3. CTA: "Free at chunkycrayon.com, no signup needed to try".
4. 2-3 family-friendly hashtags (#KidsActivities #FreePrintable).

Remember: Output ONLY the post text without labels.`;
