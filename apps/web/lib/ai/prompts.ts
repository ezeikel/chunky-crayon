/**
 * AI Prompts
 *
 * Centralized prompt definitions for all AI interactions.
 * Organized by feature/domain for easy maintenance.
 */

// =============================================================================
// Reference Assets
// =============================================================================

export const REFERENCE_IMAGES = [
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/birthdays-8uiLmIVecHAw1yjqNRQ2OCYHoaa8gW.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/dinosaur-bfmBtp1o0kVeIZtuVVNhmKTMJXOgS7.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/family-and-friends-g4vlGFNcWXrcHQ7sB4y8LLYiO3PIAG.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/farm-animals-knAdbOJKhulPhb7xnaCkMXycTunbNi.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/sea-creatures-njuJrigKzRhyl7GZXeigWSHtbPFgiG.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/superheroes-zX4vpC6SMlXVEn1Wxombkyr2fU165K.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/trains-TOkt3DJ3Oy56ZTV0uy7h2XmD8DsTGV.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/unicorns-8XVTm2dwIgIAUpah12vBMnWz7A02yo.webp',
] as const;

// =============================================================================
// Coloring Image Generation - Core Rules
// =============================================================================

/** Target audience for coloring pages */
export const TARGET_AGE = '3-8 years old';

/** Instructions for handling copyrighted characters */
export const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the description includes a copyrighted name like Spiderman, then describe the character's physical appearance in detail instead. Describe their costume, logos, accessories, mask, eyes, muscles, etc. Specify that this must be in black and white only and simplify any complex details so that the image remains simple and avoids any complicated shapes or patterns. Update the original description replacing the copyrighted character name with this detailed description of the character. If the description does not include any copyrighted characters, then please ignore this step.`;

/** Detailed rules for coloring page image generation */
export const COLORING_IMAGE_RULES = [
  "The image should be a simple line drawing suitable for a children's coloring book.",
  'No color at all. The image must be black and white only. Absolutely no colors should be used in any part of the image, including eyes, tongues, shoes, and accessories.',
  'No textures, patterns, or gradients. Keep it simple.',
  'Do not duplicate any characters or elements unless specifically asked to do so.',
  'Do not draw any borders around characters or elements unless specifically asked to do so.',
  `The image must be suitable for children aged ${TARGET_AGE}. Avoid complexity and inappropriate elements, including naked bodies.`,
  'Do not include any shadows, shading, or gradients.',
  'Ensure the lines are thick and clear, with no shading, solid fill areas, or fuzzy textures.',
  'If no background is specified, create a relevant one but do not add extra elements.',
  'Avoid adding any borders or elements not part of the main scene.',
  'Any clothing or accessories should follow the same style: line drawing, thick lines, no shading or complex shapes, and no fill.',
  'Do not depict any shades of skin color or fuzzy textures like fur or hair. All skin and hair should be drawn with simple lines only, with no color or shading.',
  'Draw hair or fur as simple lines without texture or complex patterns.',
  'The style should be cartoon-like, avoiding fine detail lines and complex patterns.',
  'Ensure high contrast and clear distinctions between elements.',
  'The image should only use black and white, with no intermediate colors. No shape should have any fill or shading.',
  'Do not fill any shapes; use lines only.',
  'All elements, including accessories such as shoelaces, eyes, tongues, shoes, and any other part of the image, must be in black and white only, with no color or shading.',
  'Use large, simple shapes for all elements in the image, including background elements. Avoid small details and fine lines.',
  `Ensure that all characters and elements have a friendly and approachable appearance suitable for children aged ${TARGET_AGE}. Avoid any scary or menacing features.`,
  'All clothing or accessories should not have any fuzzy textures; use simple lines only.',
  'The entire image must be composed of large, simple shapes, and must be easy to color within for young children.',
  'Avoid any complex or intricate elements, especially in the background. Buildings and other structures should be drawn with large, simple shapes and minimal detail.',
  'Do not include any random elements, objects, or duplications that are not part of the main scene description.',
  'Ensure that there is no color used anywhere in the image. Reiterate that the image must be black and white only with no colored elements.',
] as const;

/** Formatted rules as numbered list for prompts */
export const COLORING_IMAGE_RULES_TEXT = COLORING_IMAGE_RULES.map(
  (rule, i) => `${i + 1}. ${rule}`,
).join('\n');

// =============================================================================
// Coloring Image Generation - Prompts
// =============================================================================

/** Brief style suffix for image generation prompts */
export const COLORING_IMAGE_STYLE_SUFFIX = `The image should be in cartoon style with thick lines, low detail, no color, no shading, and no fill. Only black lines should be used. Ensure no extraneous elements such as additional shapes or artifacts are included. Refer to the style of the provided reference images: ${REFERENCE_IMAGES.join(', ')}`;

/** Full detailed prompt suffix with all rules */
export const COLORING_IMAGE_DETAILED_SUFFIX = `
${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Build an appropriate scene for the image based on the description provided, creating characters for the scene if mentioned.

These are the rules for the image (please follow them strictly):
${COLORING_IMAGE_RULES_TEXT}
`;

/** Create image generation prompt with brief style instructions */
export const createColoringImagePrompt = (description: string) =>
  `${description}. ${COLORING_IMAGE_STYLE_SUFFIX}`;

/** Create image generation prompt with full detailed rules */
export const createColoringImagePromptDetailed = (description: string) =>
  `${description}. ${COLORING_IMAGE_DETAILED_SUFFIX}`;

/** System prompt for cleaning up user descriptions */
export const CLEAN_UP_DESCRIPTION_SYSTEM = `You are an assistant that helps clean up and simplify user descriptions for generating coloring book images for children. Ensure the description is suitable for a cartoon-style image with thick lines, low detail, no color, no shading, and no fill. Only black lines should be used. The target age is ${TARGET_AGE}. If the user's description does not include a scene or background, add an appropriate one. Consider the attached reference images: ${REFERENCE_IMAGES.join(', ')}. Do not include any extraneous elements in the description.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}`;

export const IMAGE_METADATA_SYSTEM = `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.`;

export const IMAGE_METADATA_PROMPT = `Generate metadata for the generated image based on the following image:`;

// =============================================================================
// Image Validation
// =============================================================================

export const CHECK_SVG_IMAGE_SYSTEM = `You are a helpful assistant that analyzes images. You check if an image shows a solid black area on the left side and a white strip on the right side.`;

export const CHECK_SVG_IMAGE_PROMPT = `Does this image show a solid black area on the left and a white strip on the right? Return true if yes, false otherwise.`;

// =============================================================================
// Social Media Captions
// =============================================================================

export const INSTAGRAM_CAPTION_SYSTEM = `You are a social media expert who creates engaging Instagram captions for coloring pages. Your task is to craft a caption that:

1. Captures attention with creativity and personality
2. Incorporates 2-3 relevant emojis in a natural way
3. Encourages followers to visit the link in bio
4. Highlights the joy and benefits of coloring
5. Maintains a warm, friendly tone
6. Stays within Instagram's character limits
7. Includes popular coloring-related hashtags

Important: Write in a natural, human-like way that resonates with our audience. Avoid using dashes (—) in your captions as they can make the text feel artificial.`;

export const FACEBOOK_CAPTION_SYSTEM = `You are a social media expert who creates engaging Facebook posts for coloring pages. Your task is to craft a Facebook post that:

1. Captures attention with creativity and warm personality
2. Incorporates 1-2 relevant emojis naturally
3. Encourages engagement and comments
4. Highlights the therapeutic benefits and joy of coloring
5. Maintains a friendly, welcoming tone
6. Is optimized for Facebook's algorithm (engages users)
7. Includes a call-to-action to visit the website
8. Uses relevant hashtags sparingly (2-3 maximum)

Write in a conversational, natural tone that builds community around the love of coloring and creativity.`;

export const createInstagramCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate an Instagram caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}`;

export const createFacebookCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Facebook post for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Website: https://chunkycrayon.com`;

// =============================================================================
// Image Analytics (for PostHog tracking)
// =============================================================================

export const IMAGE_ANALYTICS_SYSTEM = `You are an image analyst that categorizes children's coloring pages for analytics purposes.

Your task is to analyze the coloring page image and extract structured data about:
- Characters or creatures present (be specific: dragon, unicorn, princess, astronaut, etc.)
- The setting or environment (forest, beach, space, castle, etc.)
- Activities being depicted (flying, swimming, reading, playing, etc.)
- Overall theme category
- Mood of the image
- Complexity for coloring
- Whether it appears personalized (contains a name or specific person)
- Target age appeal

Be concise and use lowercase for character/setting/activity names.
For arrays, include all relevant items detected.
If something is not clearly present, use an empty array or null as appropriate.`;

export const IMAGE_ANALYTICS_PROMPT = `Analyze this coloring page image and extract the structured analytics data.`;
