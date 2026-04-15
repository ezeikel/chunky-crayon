'use server';

import {
  generateText,
  models,
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  PINTEREST_CAPTION_SYSTEM,
  TIKTOK_CAPTION_SYSTEM,
  LINKEDIN_CAPTION_SYSTEM,
  createInstagramCaptionPrompt,
  createFacebookCaptionPrompt,
  createPinterestCaptionPrompt,
  createTikTokCaptionPrompt,
  createLinkedInCaptionPrompt,
} from '@/lib/ai';
import { ColoringImage } from '@one-colored-pixel/db';

/**
 * Instagram carousel-specific system prompt addition.
 * Static image first (conversion), video second (engagement).
 */
const INSTAGRAM_CAROUSEL_ADDENDUM = `

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
const INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM = `

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
const INSTAGRAM_REEL_ADDENDUM = `

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
const FACEBOOK_VIDEO_ADDENDUM = `

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
const FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM = `

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
const DEMO_REEL_FRAMING = `
This video is a real product demo recorded from chunkycrayon.com:
1. A kid types a short prompt
2. Our AI draws a printable coloring page in seconds
3. Magic Brush sweeps across and colors it in automatically

The caption must frame this as "watch our AI turn an idea into a coloring
page" — NOT as "animated line-art" or "a video of a coloring page". The
hero is the workflow, not the drawing.`;

const INSTAGRAM_DEMO_REEL_ADDENDUM = `
${DEMO_REEL_FRAMING}

REEL — product-demo hook, optimized for saves + shares:

REQUIREMENTS:
1. HOOK (first line, <60 chars): something that teases the transformation.
   Good: "Kid types 3 words → coloring page appears." /
         "Watch AI turn 'space dinosaur' into a coloring page."
   Avoid: "So satisfying", "ASMR", "animation" framing.
2. BENEFIT (1 line): why a parent cares — free, instant, any idea their kid has.
3. SAVE TRIGGER: "Save this for the next 'I'm bored' moment".
4. CTA: "Try it free at chunkycrayon.com".
5. 8-12 discovery hashtags mixing #reels with niche parent tags
   (#kidsactivities #aiforkids #coloringpage #screenfreeplay).
6. Short — under 220 chars before hashtags. Reel captions get clipped.

Remember: Write as Chunky Crayon the brand. Output ONLY the final caption text without any labels or section markers.`;

const FACEBOOK_DEMO_REEL_ADDENDUM = `
${DEMO_REEL_FRAMING}

FACEBOOK VIDEO — product demo framed for parents/grandparents:

REQUIREMENTS:
1. Warm opener acknowledging the workflow: "We had to show you this —
   your kid types an idea, and our AI draws a free coloring page for them."
2. SHARE TRIGGER: "Tag a parent who'd love this" / "Share with the grandparents".
3. CTA: "Free at chunkycrayon.com — no signup needed to try it".
4. 2-3 hashtags max, family-friendly (#Parenting #KidsActivities).

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers.`;

const TIKTOK_DEMO_REEL_ADDENDUM = `
${DEMO_REEL_FRAMING}

TIKTOK — authentic product-demo energy:

REQUIREMENTS:
1. Lead with the transformation in present tense: "kid types a prompt
   → ai draws the coloring page → watch it color itself".
2. Keep it short, lowercase, conversational — no corporate voice.
3. One cheeky aside is fine ("this is unfair to crayons").
4. 5-8 hashtags: #fyp #parentsoftiktok #kidsactivities #aiforkids #coloringpage.
5. End with "free at chunkycrayon.com".

Remember: Output ONLY the final caption text without any labels.`;

const LINKEDIN_DEMO_REEL_ADDENDUM = `
${DEMO_REEL_FRAMING}

LINKEDIN — professional framing for educators, early-years pros, working parents:

REQUIREMENTS:
1. Open with the observation, not the pitch: "We've been watching how
   kids interact with generative AI, and this is what convinced us we
   were onto something."
2. Explain the workflow in one sentence (prompt → AI → Magic Brush).
3. Tie it to a professional theme — screen-free follow-through, agency,
   creativity, reducing prep time for educators.
4. CTA: "Free to try at chunkycrayon.com — we'd love your feedback".
5. 3-5 professional hashtags (#EarlyYears #EdTech #ScreenFreePlay #Parenting).
6. 150-220 words.

Remember: Output ONLY the final post text without any labels.`;

export type InstagramPostType =
  | 'image'
  | 'carousel'
  | 'carousel_with_colored'
  | 'reel'
  | 'demo_reel';

export const generateInstagramCaption = async (
  coloringImage: ColoringImage,
  postType: InstagramPostType = 'image',
) => {
  let systemPrompt = INSTAGRAM_CAPTION_SYSTEM;

  if (postType === 'carousel') {
    systemPrompt += INSTAGRAM_CAROUSEL_ADDENDUM;
  } else if (postType === 'carousel_with_colored') {
    systemPrompt += INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM;
  } else if (postType === 'reel') {
    systemPrompt += INSTAGRAM_REEL_ADDENDUM;
  } else if (postType === 'demo_reel') {
    systemPrompt += INSTAGRAM_DEMO_REEL_ADDENDUM;
  }

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt: createInstagramCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export type FacebookPostType =
  | 'image'
  | 'video'
  | 'image_with_video'
  | 'demo_reel';

export const generateFacebookCaption = async (
  coloringImage: ColoringImage,
  postType: FacebookPostType = 'image',
) => {
  let systemPrompt = FACEBOOK_CAPTION_SYSTEM;

  if (postType === 'video') {
    systemPrompt += FACEBOOK_VIDEO_ADDENDUM;
  } else if (postType === 'image_with_video') {
    systemPrompt += FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM;
  } else if (postType === 'demo_reel') {
    systemPrompt += FACEBOOK_DEMO_REEL_ADDENDUM;
  }

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt: createFacebookCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export const generatePinterestCaption = async (
  coloringImage: ColoringImage,
) => {
  const { text } = await generateText({
    model: models.creative,
    system: PINTEREST_CAPTION_SYSTEM,
    prompt: createPinterestCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export type TikTokPostType = 'image' | 'demo_reel';

export const generateTikTokCaption = async (
  coloringImage: ColoringImage,
  postType: TikTokPostType = 'image',
): Promise<string> => {
  let systemPrompt = TIKTOK_CAPTION_SYSTEM;
  if (postType === 'demo_reel') {
    systemPrompt += TIKTOK_DEMO_REEL_ADDENDUM;
  }

  try {
    const { text } = await generateText({
      model: models.creative,
      system: systemPrompt,
      prompt: createTikTokCaptionPrompt(
        coloringImage.title ?? '',
        coloringImage.description ?? '',
        coloringImage.tags ?? [],
      ),
    });

    return text.trim();
  } catch (error) {
    console.error('[TikTok] Caption generation failed:', error);
    return `${coloringImage.title ?? 'New coloring page'} 🎨 Free coloring page! #coloringpage #kidscrafts #artforkids #freecoloringpage`;
  }
};

export type LinkedInPostType = 'image' | 'demo_reel';

export const generateLinkedInCaption = async (
  coloringImage: ColoringImage,
  postType: LinkedInPostType = 'image',
): Promise<string> => {
  let systemPrompt = LINKEDIN_CAPTION_SYSTEM;
  if (postType === 'demo_reel') {
    systemPrompt += LINKEDIN_DEMO_REEL_ADDENDUM;
  }

  try {
    const { text } = await generateText({
      model: models.creative,
      system: systemPrompt,
      prompt: createLinkedInCaptionPrompt(
        coloringImage.title ?? '',
        coloringImage.description ?? '',
        coloringImage.tags ?? [],
      ),
    });

    return text.trim();
  } catch (error) {
    console.error('[LinkedIn] Caption generation failed:', error);
    throw error;
  }
};

// =============================================================================
// Fact Card Caption Generation
// =============================================================================

import type { GeneratedFact } from '@/lib/social/facts';

/**
 * System prompt for fact card captions.
 * These are different from coloring page captions - they focus on the fact itself.
 */
const FACT_CARD_CAPTION_SYSTEM = `You are writing captions for Chunky Crayon's fact card posts - beautiful graphics with facts about coloring, creativity, or child development.

VOICE: You ARE Chunky Crayon the brand. Use "we" not "I". Never pretend to be a parent.

FACT CARD TRUTH: These are SHARE-BAIT. People love sharing "did you know" content.

STRUCTURE:
1. REACTION (1 sentence): "We had to share this!" / "This is why we're passionate about coloring"
2. SHAREABILITY: "Tag someone who'd love this!" / "Share this with your friends"
3. ENGAGEMENT: "Did you know this? Yes or No!" / "Does this resonate?"
4. SOFT CTA: "More coloring fun at chunkycrayon.com"

Keep SHORT - the graphic has the main message. Caption supports, doesn't repeat.
Use 1-2 emojis naturally.

OUTPUT FORMAT:
Return ONLY the final caption text. Do NOT include labels like "REACTION:", "SHAREABILITY:", "ENGAGEMENT:", etc. Just the caption itself.`;

const FACT_CARD_INSTAGRAM_ADDENDUM = `

Instagram format:
- Hook + reaction (under 100 chars before hashtags)
- SAVE TRIGGER: "Save this for inspiration"
- 5-6 hashtags: #parentingtips #kidsactivities #coloring #creativity #learningthroughplay #chunkycrayon
- End: "Link in bio for free coloring pages!"

Remember: Output ONLY the final caption text without any labels or section markers.`;

const FACT_CARD_FACEBOOK_ADDENDUM = `

Facebook format:
- Conversational, shareable tone
- SHARE TRIGGER: "Tag someone who'd love this!" / "Share this with your friends"
- 2-3 hashtags max
- Full link: chunkycrayon.com

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers.`;

const FACT_CARD_PINTEREST_ADDENDUM = `

Pinterest format:
- SEO-first: Front-load "coloring tips" "kids activities" "parenting" keywords
- 300-400 characters, descriptive and searchable
- NO hashtags, NO emojis
- End with: chunkycrayon.com

Remember: Output ONLY the pin description text without any labels or section markers.`;

export type FactCardPlatform = 'instagram' | 'facebook' | 'pinterest';

/**
 * Generate a caption for a fact card post.
 */
export const generateFactCardCaption = async (
  fact: GeneratedFact,
  platform: FactCardPlatform,
): Promise<string> => {
  let systemPrompt = FACT_CARD_CAPTION_SYSTEM;

  if (platform === 'instagram') {
    systemPrompt += FACT_CARD_INSTAGRAM_ADDENDUM;
  } else if (platform === 'facebook') {
    systemPrompt += FACT_CARD_FACEBOOK_ADDENDUM;
  } else if (platform === 'pinterest') {
    systemPrompt += FACT_CARD_PINTEREST_ADDENDUM;
  }

  const prompt = `Write a caption for this fact card:

Fact: "${fact.fact}"
Category: ${fact.category}
Emoji used on card: ${fact.emoji}

Remember: The fact is already displayed on the graphic. Your caption should complement it with a brief comment and CTA.`;

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt,
  });

  return text;
};
