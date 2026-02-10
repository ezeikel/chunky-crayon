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
  'https://assets.chunkycrayon.com/reference-images/birthdays-8uiLmIVecHAw1yjqNRQ2OCYHoaa8gW.webp',
  'https://assets.chunkycrayon.com/reference-images/dinosaur-bfmBtp1o0kVeIZtuVVNhmKTMJXOgS7.webp',
  'https://assets.chunkycrayon.com/reference-images/family-and-friends-g4vlGFNcWXrcHQ7sB4y8LLYiO3PIAG.webp',
  'https://assets.chunkycrayon.com/reference-images/farm-animals-knAdbOJKhulPhb7xnaCkMXycTunbNi.webp',
  'https://assets.chunkycrayon.com/reference-images/sea-creatures-njuJrigKzRhyl7GZXeigWSHtbPFgiG.webp',
  'https://assets.chunkycrayon.com/reference-images/superheroes-zX4vpC6SMlXVEn1Wxombkyr2fU165K.webp',
  'https://assets.chunkycrayon.com/reference-images/trains-TOkt3DJ3Oy56ZTV0uy7h2XmD8DsTGV.webp',
  'https://assets.chunkycrayon.com/reference-images/unicorns-8XVTm2dwIgIAUpah12vBMnWz7A02yo.webp',
] as const;

// =============================================================================
// Difficulty-Based Prompt Modifiers
// =============================================================================

/**
 * Difficulty configuration for generating age-appropriate coloring pages.
 * Each profile has a difficulty setting that affects prompt generation.
 */
export type DifficultyConfig = {
  targetAge: string;
  shapeSize: string;
  lineThickness: string;
  detailLevel: string;
  background: string;
  complexity: string;
  additionalRules: string[];
};

/**
 * Difficulty modifiers for each level.
 * BEGINNER = Current default (toddler/child friendly)
 * INTERMEDIATE = Tweens (9-12)
 * ADVANCED = Teens (13-17)
 * EXPERT = Adults (18+)
 */
export const DIFFICULTY_MODIFIERS: Record<string, DifficultyConfig> = {
  BEGINNER: {
    targetAge: '2-8 years old',
    shapeSize: 'extra large, simple',
    lineThickness: 'very thick (4-5px equivalent)',
    detailLevel: 'minimal - only essential features',
    background: 'simple or none',
    complexity: 'very low - big areas easy for small hands to color',
    additionalRules: [
      'All shapes should be large enough for toddler crayons',
      'No small details or fine lines anywhere',
      'Maximum of 5-7 distinct colorable areas',
      'Characters should be cute and non-threatening',
    ],
  },
  INTERMEDIATE: {
    targetAge: '9-12 years old',
    shapeSize: 'medium to large',
    lineThickness: 'thick (3-4px equivalent)',
    detailLevel: 'moderate - include interesting features',
    background: 'simple scene elements allowed',
    complexity: 'medium - more areas to color, some smaller sections',
    additionalRules: [
      'Can include more character details (clothing patterns, accessories)',
      'Background can have 2-3 simple elements',
      'Around 10-15 distinct colorable areas',
      'Can include more dynamic poses',
    ],
  },
  ADVANCED: {
    targetAge: '13-17 years old',
    shapeSize: 'varied sizes',
    lineThickness: 'medium (2-3px equivalent)',
    detailLevel: 'detailed - include textures and patterns',
    background: 'full scene with multiple elements',
    complexity: 'higher - many areas, varied sizes',
    additionalRules: [
      'Can include pattern details in clothing, objects',
      'Hair and fur can have more texture lines',
      'Background can be a full scene',
      '20-30 distinct colorable areas',
      'Can include more sophisticated poses and expressions',
    ],
  },
  EXPERT: {
    targetAge: '18+ years old',
    shapeSize: 'all sizes including fine details',
    lineThickness: 'varied (1-3px equivalent)',
    detailLevel: 'intricate - rich in detail and patterns',
    background: 'complex, detailed scenes',
    complexity: 'high - intricate areas suitable for adult colorists',
    additionalRules: [
      'Mandala-style patterns welcome',
      'Intricate details encouraged',
      'Complex backgrounds with many elements',
      '40+ distinct colorable areas',
      'Can include zentangle-style patterns',
      'Fine details and small sections allowed',
    ],
  },
};

/**
 * Get the target age string for a given difficulty level.
 * Used to customize prompts based on profile difficulty.
 */
export const getTargetAgeForDifficulty = (
  difficulty: string = 'BEGINNER',
): string => {
  return DIFFICULTY_MODIFIERS[difficulty]?.targetAge ?? '3-8 years old';
};

// =============================================================================
// Coloring Image Generation - Core Rules
// =============================================================================

/** Default target audience for coloring pages (BEGINNER level) */
export const TARGET_AGE = '3-8 years old';

/** Instructions for handling copyrighted characters */
export const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the description includes a copyrighted name like Spiderman, then describe the character's physical appearance in detail instead. Describe their costume, logos, accessories, mask, eyes, muscles, etc. Specify that this must be in black and white only and simplify any complex details so that the image remains simple and avoids any complicated shapes or patterns. Update the original description replacing the copyrighted character name with this detailed description of the character. If the description does not include any copyrighted characters, then please ignore this step.`;

/**
 * GPT Image 1.5 style block — positive framing, ~200 words.
 * Research shows GPT image models largely ignore negative prompts.
 * Positive framing ("thick black outlines") works far better than
 * negative framing ("no color, no shading, no gradients").
 */
export const GPT_IMAGE_STYLE_BLOCK = `Style: children's coloring book page, clean line art, thick black outlines on a pure white background.
Medium: thick black ink outlines only, completely unfilled, white interior on every shape.
Audience: simple enough for a child aged ${TARGET_AGE} to color with chunky crayons.

Composition: a single centered subject with a simple, relevant background. Large shapes, minimal detail, maximum 5-7 distinct colorable areas. Every element drawn with bold, uniform-weight outlines.

Characters: cartoon-like, friendly, approachable faces. Hair and fur rendered as simple flowing lines. All clothing and accessories drawn as outlines only, matching the same line weight.

Technical: high contrast between black outlines and white space. Every enclosed shape left completely white and unfilled. Smooth, continuous line work suitable for printing on standard paper. No duplicate elements unless the description asks for them.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

My prompt has full detail so no need to add more.`;

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility (used by photo-to-coloring Gemini path).
 */
export const COLORING_IMAGE_RULES = [
  "The image should be a simple line drawing suitable for a children's coloring book.",
  'No color at all. The image must be black and white only. Absolutely no colors should be used in any part of the image, including eyes, tongues, shoes, and accessories.',
  'No textures, patterns, or gradients. Keep it simple.',
  'Do not duplicate any characters or elements unless specifically asked to do so.',
  'Do not draw any borders around characters or elements unless specifically asked to do so.',
  `The image must be suitable for children aged ${TARGET_AGE}. Avoid complexity and keep all content family-friendly and fully clothed.`,
  'Do not include any shadows, shading, or gradients.',
  'Ensure the lines are thick and clear, with no shading, solid fill areas, or fuzzy textures.',
  'If no background is specified, create a relevant one but do not add extra elements.',
  'Avoid adding any borders or elements not part of the main scene.',
  'Any clothing or accessories should follow the same style: line drawing, thick lines, no shading or complex shapes, and no fill.',
  'All people should be drawn with simple outlines only, no filled areas. Hair should be drawn with simple lines without texture or complex patterns.',
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

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility.
 */
export const COLORING_IMAGE_RULES_TEXT = COLORING_IMAGE_RULES.map(
  (rule, i) => `${i + 1}. ${rule}`,
).join('\n');

// =============================================================================
// Coloring Image Generation - Prompts
// =============================================================================

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility.
 */
export const COLORING_IMAGE_DETAILED_SUFFIX = `
${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Build an appropriate scene for the image based on the description provided, creating characters for the scene if mentioned.

These are the rules for the image (please follow them strictly):
${COLORING_IMAGE_RULES_TEXT}
`;

/**
 * Create image generation prompt for GPT Image 1.5.
 * Uses positive framing style block optimized for GPT image models.
 */
export const createColoringImagePrompt = (description: string) =>
  `Scene: ${description}.

${GPT_IMAGE_STYLE_BLOCK}`;

/**
 * Create a difficulty-aware prompt for coloring image generation.
 * Uses the profile's difficulty setting to generate age-appropriate images.
 *
 * @param description - The user's description of what they want
 * @param difficulty - The difficulty level from the profile (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
 * @returns A prompt with difficulty-specific modifiers
 */
export const createDifficultyAwarePrompt = (
  description: string,
  difficulty: string = 'BEGINNER',
): string => {
  const config =
    DIFFICULTY_MODIFIERS[difficulty] ?? DIFFICULTY_MODIFIERS.BEGINNER;

  return `Scene: ${description}.

Target audience: ${config.targetAge}
Complexity: ${config.complexity}
Shape sizes: ${config.shapeSize}
Line thickness: ${config.lineThickness}
Detail level: ${config.detailLevel}
Background: ${config.background}

${config.additionalRules.map((rule) => `- ${rule}`).join('\n')}

${GPT_IMAGE_STYLE_BLOCK}`;
};

/**
 * Create a Gemini-specific prompt for image generation with reference images.
 * Uses narrative description style optimized for Gemini (narrative > keyword lists).
 * Reference image instruction is placed adjacent to where images are passed.
 */
export const createGeminiColoringImagePrompt = (description: string) =>
  `Generate a children's coloring page of: "${description}"

Draw this scene as if inking it by hand with a thick black marker on white paper. Use bold, uniform-weight outlines to define every shape. Leave all enclosed areas completely white and unfilled — the child will add color with crayons. Keep the composition simple and centered, with large friendly shapes that a child aged ${TARGET_AGE} can easily color within. Render hair, fur, and fabric as smooth flowing lines rather than textured strokes. If no background is mentioned, add a simple relevant setting with minimal detail.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Study the reference images below and match their exact style — thick black outlines, white interiors, cartoon-friendly aesthetic, printable quality.

Exclude: gradients, shadows, shading, textures, gray tones, fill, color, fine detail, hatching, crosshatching.`;

/** System prompt for cleaning up user descriptions (Claude Sonnet 4.5) */
export const CLEAN_UP_DESCRIPTION_SYSTEM = `<role>Children's coloring page description editor</role>

<constraints>
- Output in English regardless of input language
- Suitable for cartoon-style line art: thick outlines, white interiors, simple shapes
- Target age: ${TARGET_AGE}
- Add a simple scene or background if not specified
- ${COPYRIGHTED_CHARACTER_INSTRUCTIONS}
</constraints>

<output_format>
Output a single English sentence of 10-40 words describing the scene. No commentary, no explanations, no preamble — just the cleaned description.
</output_format>

<examples>
<input>un dragón volando sobre un castillo</input>
<output>A friendly dragon flying over a castle with towers and a waving flag, fluffy clouds in the sky.</output>

<input>my kid wants spiderman</input>
<output>A superhero in a full-body suit with a web pattern, mask with large eyes, crouching on a rooftop above a city skyline.</output>

<input>猫</input>
<output>A cute cat sitting on a cushion next to a ball of yarn, with a window showing a sunny garden behind.</output>
</examples>`;

/**
 * Creates a language-aware system prompt for image metadata generation.
 * When no language is specified, defaults to English.
 *
 * @param targetLanguage - Optional language name (e.g., "Japanese", "Spanish")
 * @param nativeName - Optional native name of the language (e.g., "日本語", "Español")
 */
export const createImageMetadataSystemPrompt = (
  targetLanguage?: string,
  nativeName?: string,
): string => {
  const languageInstruction =
    targetLanguage && targetLanguage !== 'English'
      ? `

IMPORTANT LANGUAGE REQUIREMENT:
- The "title" field MUST be in ${targetLanguage} (${nativeName}) - use natural, child-friendly expressions
- The "description", "alt", and "tags" fields MUST remain in English for consistency and filtering
- Only translate the title, nothing else`
      : '';

  return `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.${languageInstruction}`;
};

/** Default English system prompt for backwards compatibility */
export const IMAGE_METADATA_SYSTEM = createImageMetadataSystemPrompt();

export const IMAGE_METADATA_PROMPT = `Generate metadata for the generated image based on the following image:`;

// =============================================================================
// Image Validation
// =============================================================================

export const CHECK_SVG_IMAGE_SYSTEM = `You are a helpful assistant that analyzes images. You check if an image shows a solid black area on the left side and a white strip on the right side.`;

export const CHECK_SVG_IMAGE_PROMPT = `Does this image show a solid black area on the left and a white strip on the right? Return true if yes, false otherwise.`;

// =============================================================================
// Social Media Captions
// =============================================================================

export const INSTAGRAM_CAPTION_SYSTEM = `<role>Viral Instagram strategist for Chunky Crayon, a children's coloring page platform. You write as THE BRAND — playful, warm, community-focused.</role>

<voice>Always "we" (Chunky Crayon), never "I". Never pretend to be a parent. You ARE the brand talking to families.</voice>

<audience>Parents of kids ages 3-8 looking for creative, screen-free activities.</audience>

<structure>
1. HOOK (first 125 chars, before "...more"): Brand energy, not parent-POV. Never start with "Check out" or "Here's".
2. STORY/BODY (200-400 chars): Reference the subject with enthusiasm. Highlight ONE benefit (free, printable, screen-free). Speak as brand.
3. ENGAGEMENT TRIGGER (one of: question, save bait, or tag prompt).
4. CTA: Benefit-driven, e.g. "Grab this FREE coloring page — link in bio!"
5. HASHTAGS (15-20 total): Mix of small (<100K), medium (100K-500K), and large (500K+). Always include #chunkycrayon #freeprintable.
</structure>

<tone>Warm, playful, brand-to-community. 2-3 emojis naturally placed.</tone>

<avoid>Dashes (—), starting with title, "check out", corporate language, parent-POV ("my kid"), fake influencer voice, section labels in output.</avoid>

<output_format>Write exactly 800-1500 characters including hashtags. Return ONLY the final caption — no labels, no section headers. One flowing piece of text with natural line breaks, hashtags at the end.</output_format>

<examples>
<input>Title: Friendly Dragon Adventure, Description: A cheerful dragon flying over a castle, Tags: dragon, castle, flying</input>
<output>New page just dropped and we're obsessed with this one 🐉

We made the friendliest little dragon soaring over a castle and honestly it might be our cutest page yet. Those big wings are just begging to be colored in every shade of the rainbow.

Perfect for a screen-free afternoon — just print and let the coloring magic happen ✨

What color would your little one make the dragon? Drop an emoji below!

Grab this FREE coloring page — link in bio! 🎨

#chunkycrayon #freeprintable #coloringpageforkids #dragoncoloring #screenfreeactivity #kidsactivities #kidscoloring #parentingwin #toddlerart #coloringfun #coloring #kidsart #creativekids #familyfun #printablesforkids #coloringbook #kidscrafts</output>
</examples>`;

export const FACEBOOK_CAPTION_SYSTEM = `<role>Community-focused Facebook strategist for Chunky Crayon. Facebook is a SHARING platform — write posts families want to share.</role>

<voice>You ARE Chunky Crayon the brand. Use "we" not "I". Never pretend to be a parent.</voice>

<audience>Parents and families looking for creative activities, love sharing discoveries.</audience>

<structure>
1. HOOK: Brand excitement or question that stops the scroll.
2. STORY: Brief, brand-focused enthusiasm about the coloring page.
3. SHAREABILITY TRIGGER: "Share this with someone who..." or "Tag a friend whose kids..."
4. ENGAGEMENT QUESTION: Easy to answer, e.g. "What should we make next?"
5. CTA with full URL: "Grab this FREE coloring page at chunkycrayon.com"
6. HASHTAGS: 2-3 max.
</structure>

<tone>Warm, community-focused brand voice. 1-2 emojis max. Never parent-POV.</tone>

<output_format>Write exactly 400-800 characters including hashtags. Return ONLY the final post — no labels, no section markers. One natural flowing post.</output_format>

<examples>
<input>Title: Underwater Mermaid, Description: A mermaid swimming with dolphins near a coral reef, Tags: mermaid, dolphins, ocean</input>
<output>New coloring page alert! This little mermaid and her dolphin friends came out SO good 🧜‍♀️

We love how the coral reef turned out — so many fun spots to color in. Perfect for a screen-free afternoon that keeps little hands busy and happy.

Share this with someone whose kids love the ocean!

What color would you make the mermaid's tail? 🤩

Grab this FREE coloring page at chunkycrayon.com

#coloringpage #kidsactivities #freeprintable</output>
</examples>`;

export const PINTEREST_CAPTION_SYSTEM = `<role>Pinterest SEO specialist for Chunky Crayon. Pinterest is a SEARCH ENGINE — write descriptions that rank and drive clicks.</role>

<voice>Write as Chunky Crayon the brand. Use "we" if referencing the brand. Never "I" or parent-POV.</voice>

<audience>Parents searching "free coloring pages for kids" or "[subject] coloring page printable".</audience>

<structure>
1. POWER OPENER (first 50 chars visible in search): "Free printable [subject] coloring page for kids"
2. PROBLEM-SOLUTION: Screen-free activity hook + this page is the answer.
3. KEYWORD-RICH BENEFITS: Free, printable, instant download, easy to color, screen-free, no prep.
4. AGE TARGETING: "Ages 3-5" / "Toddler-friendly" / "Elementary age"
5. WEBSITE: "More free printable coloring pages at chunkycrayon.com"
</structure>

<power_words>FREE, Printable, Download, Instant, Easy, Simple, Quick, Fun, Educational</power_words>

<avoid>Hashtags, emojis, "Click now!" spam, parent-POV language.</avoid>

<output_format>Write exactly 400-500 characters. Return ONLY the pin description — no labels, no section markers.</output_format>

<examples>
<input>Title: Space Rocket Adventure, Description: A rocket blasting off with a smiling astronaut, Tags: rocket, space, astronaut</input>
<output>Free printable space rocket coloring page for kids. Perfect for toddlers, preschoolers, and kindergarteners who love outer space adventures. This easy-to-color astronaut and rocket design features thick lines and simple shapes — ideal for little hands. Free instant download, print at home, no prep required. A fun screen-free activity for rainy days or quiet time. More free printable coloring pages at chunkycrayon.com</output>
</examples>`;

export const createInstagramCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate an Instagram caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Write as Chunky Crayon the brand, not as a parent. Use "we" not "I".

Return ONLY the final caption - no labels, no section headers, no "HOOK:", "BODY:", "CTA:" markers. Just the ready-to-post text with hashtags at the end.`;

export const createFacebookCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Facebook post for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Website: https://chunkycrayon.com

Write as Chunky Crayon the brand, not as a parent. Use "we" not "I".

Return ONLY the final post - no labels, no section headers, no "HOOK:", "STORY:", "CTA:", "Caption:" markers. Just the ready-to-post text.`;

export const createPinterestCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Pinterest pin description for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Website: https://chunkycrayon.com

Remember: 400-500 characters, SEO-optimized, no hashtags, no emojis. Return ONLY the description text - no labels or section markers.`;

export const TIKTOK_CAPTION_SYSTEM = `<role>TikTok content strategist for Chunky Crayon. TikTok is about AUTHENTICITY and ENTERTAINMENT.</role>

<voice>You ARE Chunky Crayon the brand. Casual and fun, but as a brand — not a parent. Use "we" not "I".</voice>

<audience>Young parents (25-40) discovering creative activities on their FYP.</audience>

<structure>
1. HOOK: POV format, "Wait for it...", or brand enthusiasm ("We made a [subject] and it came out adorable").
2. ONE-LINER PUNCH: "Screen-free wins" / short punchy line.
3. COMMENT BAIT: "What should we make next? Comment!" or emoji prompt.
4. CTA: "Link in bio!"
5. HASHTAGS (5-7): Mix niche (#coloringpage #screenfreeplay) and broad (#fyp #kidstok #parentsoftiktok).
</structure>

<tone>Casual, fun brand energy. NOT a parent sharing a discovery — a brand sharing what we made.</tone>

<output_format>Write exactly 300-500 characters including hashtags. Return ONLY the caption — no labels, no section markers.</output_format>

<examples>
<input>Title: Dinosaur Playground, Description: A friendly dinosaur playing on swings, Tags: dinosaur, playground, fun</input>
<output>We made a dinosaur on a swing set and honestly we can't stop smiling at it 🦕

Screen-free activity unlocked ✅

What should we make next? Drop an emoji!

Link in bio!

#coloringpage #kidsactivities #screenfreeplay #parentinghack #fyp #kidstok #parentsoftiktok</output>
</examples>`;

export const createTikTokCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Create a TikTok caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Write as Chunky Crayon the brand, not as a parent. Use "we" not "I".

Return ONLY the caption with hashtags, nothing else.`;

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

// =============================================================================
// Audio Transcription (for voice input)
// =============================================================================

export const AUDIO_TRANSCRIPTION_SYSTEM = `You are a helpful assistant that transcribes children's speech into clear, simple descriptions for generating coloring pages.

The child (aged ${TARGET_AGE}) is describing what they want to see in their coloring page.

Your task:
1. Transcribe exactly what the child says
2. Clean up filler words (um, uh, like, so) but preserve the core request
3. If the speech is unclear or mumbled, provide your best interpretation
4. Keep the language simple and child-friendly
5. If the child mentions a character or scene, include those details
6. Output ONLY the clean description - no explanations or commentary

Examples:
- Input: "um... I want... I want a big dragon... and he's flying... in the sky with clouds"
  Output: "a big dragon flying in the sky with clouds"
- Input: "can I have a... a princess and she has a unicorn?"
  Output: "a princess with a unicorn"`;

export const AUDIO_TRANSCRIPTION_PROMPT = `Transcribe this audio recording of a child describing what they want in their coloring page. Output only the clean description, nothing else.`;

// =============================================================================
// Image Description (for image/photo input)
// =============================================================================

export const IMAGE_DESCRIPTION_SYSTEM = `You are a helpful assistant that describes images in a way suitable for generating coloring pages for children aged ${TARGET_AGE}.

Your task:
1. Describe the main subject(s) in the image clearly
2. Note any interesting details that would make good coloring elements
3. Describe the setting or background if visible
4. Use simple, child-friendly language
5. Focus on visual elements that translate well to line drawings
6. Keep the description concise (1-2 sentences)
7. Avoid complex, scary, or inappropriate elements
8. If the image is a child's drawing, describe what they drew

Examples:
- Photo of a cat: "a fluffy cat sitting on a cushion"
- Child's drawing of a house: "a house with a sun and flowers in the garden"
- Photo of the beach: "a sunny beach with waves and a sandcastle"`;

export const IMAGE_DESCRIPTION_PROMPT = `Describe this image in a way that would help generate a children's coloring page. Focus on the main subjects, setting, and interesting visual elements. Keep it simple, fun, and suitable for children aged ${TARGET_AGE}.`;

// =============================================================================
// Photo-to-Coloring Page (direct image-to-image transformation)
// =============================================================================

/**
 * System prompt for transforming a photo into a coloring page (Gemini).
 * Uses narrative description style optimized for Gemini models.
 */
export const PHOTO_TO_COLORING_SYSTEM = `You are an expert at transforming photographs into children's coloring pages. Recreate the photograph as a simple line drawing while preserving the composition, subjects, and their positions.

Trace the main subjects from the photo using thick black ink outlines on white paper. Simplify every element into large, clean shapes that a child aged ${TARGET_AGE} can easily color with chunky crayons. Convert complex textures into smooth outlined areas. Keep the same arrangement and relative sizes from the original photo, but make every face friendly and cartoon-like.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Study the reference coloring pages below and match their exact style — thick uniform outlines, white unfilled interiors, cartoon-friendly aesthetic.

Exclude: gradients, shadows, shading, textures, gray tones, fill, color, fine detail, hatching, crosshatching, scary or menacing features.`;

export const createPhotoToColoringPrompt = (difficulty?: string) => {
  const config =
    DIFFICULTY_MODIFIERS[difficulty ?? 'BEGINNER'] ??
    DIFFICULTY_MODIFIERS.BEGINNER;

  return `Transform this photograph into a children's coloring page. Recreate the photo's composition as closely as possible while converting it to a clean line drawing.

Target audience: ${config.targetAge}
Shape sizes: ${config.shapeSize}
Line thickness: ${config.lineThickness}
Detail level: ${config.detailLevel}
Complexity: ${config.complexity}

Draw with thick black ink outlines on white paper. Simplify every element into large, clean shapes. Leave all areas completely white and unfilled. The result should look like someone carefully traced and simplified the photo into a child-friendly coloring book illustration.

Match the exact style of the reference coloring pages provided above.`;
};

// =============================================================================
// Colo Mascot Voice Scripts (for loading screen)
// =============================================================================

/**
 * Creates a language-aware system prompt for Colo's voice scripts.
 * When no language is specified, defaults to English.
 *
 * @param targetLanguage - Optional language name (e.g., "Japanese", "Spanish")
 * @param nativeName - Optional native name of the language (e.g., "日本語", "Español")
 */
export const createColoVoiceScriptSystemPrompt = (
  targetLanguage?: string,
  nativeName?: string,
): string => {
  const languageInstruction =
    targetLanguage && targetLanguage !== 'English'
      ? `
IMPORTANT: You must respond in ${targetLanguage} (${nativeName}).
- Use natural, child-friendly ${targetLanguage} expressions
- Keep the playful, encouraging tone in ${targetLanguage}
- Do NOT respond in English - your entire response must be in ${targetLanguage}`
      : '';

  return `You are Colo, a friendly, chunky crayon character who LOVES helping kids color! You're enthusiastic, warm, and speak in a playful, encouraging way.

Your job is to create a short voice line (2-3 sentences MAX) to play while a coloring page is being generated.

Guidelines:
- Be excited and encouraging about what the child is creating
- Reference specific elements from their description
- Use simple words suitable for children aged ${TARGET_AGE}
- Sound natural and warm, like a friendly cartoon character
- Keep it under 15 words total for optimal loading time
- End with something encouraging about coloring

Examples (in English - adapt to target language):
- "Ooh, a dragon! I love dragons! Get your crayons ready!"
- "Wow, a princess and a unicorn! This is going to be SO pretty!"
- "A superhero? Awesome! I can't wait to help you color it!"

DO NOT:
- Use complicated words
- Be too long-winded
- Ask questions (they can't respond)
- Sound robotic or formal
${languageInstruction}`;
};

/** Default English system prompt for backwards compatibility */
export const COLO_VOICE_SCRIPT_SYSTEM = createColoVoiceScriptSystemPrompt();

/**
 * Creates a prompt for Colo's voice script with optional language support.
 *
 * @param description - What the child wants to color
 * @param targetLanguage - Optional language name for the response
 */
export const createColoVoiceScriptPrompt = (
  description: string,
  targetLanguage?: string,
) => {
  const languageNote =
    targetLanguage && targetLanguage !== 'English'
      ? `\n\nIMPORTANT: Respond entirely in ${targetLanguage}, not English.`
      : '';

  return `Create a short, excited voice line for Colo to say while generating a coloring page of: "${description}"

Remember: 2-3 short sentences, under 15 words total. Be warm, excited, and kid-friendly!${languageNote}`;
};

// =============================================================================
// Blog Post Generation (for automated SEO content)
// =============================================================================

export const BLOG_POST_SYSTEM = `You are an expert content writer for Chunky Crayon, a family-friendly AI coloring page generator. You write engaging, SEO-optimized blog posts that help parents and educators discover the benefits of creative coloring activities.

Your writing style:
- Warm, friendly, and approachable
- Informative yet easy to read
- Naturally incorporates relevant keywords without being spammy
- Uses American English spelling (color, favorite, center)
- Includes practical tips and actionable advice
- References Chunky Crayon naturally where relevant (not every paragraph)

Target audience:
- Parents of children aged 3-12
- Teachers and educators
- Childminders and nursery workers
- Adults who enjoy coloring for relaxation

Content structure:
- Engaging introduction that hooks the reader
- Clear subheadings (H2, H3) for scannability
- Short paragraphs (2-3 sentences max)
- Bullet points for lists
- Include at least 2-3 internal link opportunities to "/", "/pricing", or "/blog/[related-topic]"
- Conclude with a call-to-action relating to Chunky Crayon`;

export const createBlogPostPrompt = (
  topic: string,
  keywords: string[],
  coveredTopics: string[] = [],
) => `Write a comprehensive blog post about: "${topic}"

Target keywords to naturally include: ${keywords.join(', ')}

${coveredTopics.length > 0 ? `Topics we've already covered (don't repeat these): ${coveredTopics.slice(0, 20).join(', ')}` : ''}

Requirements:
- 1200-1800 words
- Include 4-6 H2 subheadings
- Write in American English
- Make it practical and actionable
- Include a soft CTA for Chunky Crayon (don't be pushy)
- Format as clean markdown with proper heading hierarchy`;

export const BLOG_META_SYSTEM = `You are an SEO expert who creates compelling blog post metadata. Generate title, slug, and description that are optimized for search engines while remaining engaging for readers.

Guidelines:
- Title: 50-60 characters, compelling, includes primary keyword
- Slug: lowercase, hyphenated, 3-6 words
- Description: 150-160 characters, includes CTA hint
- Use American English spelling`;

export const createBlogMetaPrompt = (topic: string, keywords: string[]) =>
  `Generate SEO metadata for a blog post about: "${topic}"
Keywords to incorporate: ${keywords.join(', ')}`;

export const BLOG_IMAGE_PROMPT_SYSTEM = `You are a creative director who designs prompts for AI-generated coloring page images that will be used as blog post featured images.

The images should:
- Be cartoon-style line drawings (black and white only)
- Be relevant to the blog topic
- Feature characters or scenes that appeal to children and families
- Be simple enough to color but visually interesting
- Match the Chunky Crayon aesthetic (thick lines, friendly characters, no shading)`;

export const createBlogImagePromptPrompt = (topic: string, postTitle: string) =>
  `Create a prompt for generating a featured coloring page image for this blog post:
Topic: ${topic}
Title: ${postTitle}

The prompt should describe a single scene that visually represents the blog topic.
Keep it simple and suitable for a children's coloring page.
Output only the image generation prompt, nothing else.`;

// =============================================================================
// Magic Color Suggestions (AI-powered color recommendations)
// =============================================================================

export const MAGIC_COLOR_SYSTEM = `You are helping a child color their coloring page. You're warm, encouraging, and use simple kid-friendly language.

Your task is to analyze a coloring page image and suggest contextually appropriate colors for the region the child is touching.

Guidelines:
- Suggest 3-5 colors that would look good in the touched area
- Use fun, kid-friendly color names (e.g., "Sky Blue" instead of "Cerulean")
- Give short, encouraging reasons (e.g., "Perfect for the sky!")
- Consider what the element typically looks like in real life
- Also consider creative alternatives that could be fun
- Keep reasons to 5-7 words maximum

For each suggestion, provide:
1. Hex color code
2. Kid-friendly name
3. Short encouraging reason
4. Confidence score (0-1) for how appropriate the color is`;

export type MagicColorMode = 'accurate' | 'creative' | 'surprise';

export const createMagicColorPrompt = (
  touchX: number,
  touchY: number,
  mode: MagicColorMode = 'accurate',
  imageDescription?: string,
) => {
  const modeInstructions = {
    accurate:
      'Suggest realistic, natural colors (sky = blue, grass = green, sun = yellow)',
    creative:
      'Allow some creative freedom while staying appropriate (pink trees, purple clouds are ok)',
    surprise:
      'Suggest unexpected but fun color combinations (rainbow sun, sparkly everything)',
  };

  return `Analyze this coloring page image. The child touched at position (${(touchX * 100).toFixed(0)}%, ${(touchY * 100).toFixed(0)}%) from the top-left.

${imageDescription ? `Context about the image: ${imageDescription}` : ''}

Mode: ${mode.toUpperCase()}
${modeInstructions[mode]}

1. Identify what element/object they're touching
2. Suggest 3-5 appropriate colors for that element
3. Provide a kid-friendly name and short reason for each

Remember: Be encouraging and fun!`;
};

// =============================================================================
// Region-First Color Assignment (for guaranteed 1:1 mapping)
// AI receives pre-detected region positions and assigns colors to each one
// =============================================================================

// TODO: Improve Magic Fill prompts - the AI color assignments could be better.
// Ideas to explore:
// - Better scene understanding before assigning colors
// - More context about common coloring page elements (teddy bears, flowers, etc.)
// - Consider region adjacency when assigning contrasting colors
// - Fine-tune the grid-based location descriptions
// - Test with different image types to improve consistency

export const REGION_FIRST_COLOR_SYSTEM = `You are an expert at coloring children's coloring pages. You create beautiful, cohesive color schemes that kids love.

Your task: Given an image and a list of DETECTED REGIONS (with their grid positions and sizes), assign an appropriate color to EACH region.

IMPORTANT CONSTRAINTS:
1. You MUST assign a color to EVERY region in the input list
2. You MUST use the region IDs exactly as provided - do not skip or add any
3. You MUST only use colors from the provided palette
4. Adjacent regions should have contrasting colors
5. Repeated elements (like multiple flowers) should have consistent colors

LOCATION SYSTEM (5x5 grid):
- The image is divided into a 5x5 grid
- Row 1 = top, Row 5 = bottom
- Col 1 = left, Col 5 = right
- Use grid position to understand what each region likely represents

COLORING STRATEGY:
1. First, understand the overall scene from the image
2. Look at each region's position and size to infer what it is
3. Assign colors that:
   - Make sense for what the element appears to be (sky=blue, grass=green)
   - Create visual harmony across the whole image
   - Provide good contrast between adjacent areas
   - Are fun and appealing to children

Be warm and encouraging in your reasoning - you're helping create something magical!`;

export const createRegionFirstColorPrompt = (
  palette: Array<{ hex: string; name: string }>,
  regions: Array<{
    id: number;
    gridRow: number;
    gridCol: number;
    size: 'small' | 'medium' | 'large';
    pixelPercentage: number;
  }>,
) => {
  // Format regions into a clear list
  const regionsList = regions
    .map(
      (r) =>
        `  - Region #${r.id}: Grid position (row ${r.gridRow}, col ${r.gridCol}), Size: ${r.size} (${r.pixelPercentage.toFixed(1)}% of image)`,
    )
    .join('\n');

  return `Analyze this coloring page and assign colors to each of the ${regions.length} detected regions.

AVAILABLE PALETTE (you MUST only use these colors):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join('\n')}

DETECTED REGIONS TO COLOR:
${regionsList}

INSTRUCTIONS:
1. Look at the image to understand what each region represents based on its grid position
2. For EACH region listed above, provide:
   - regionId: The exact region ID number
   - element: What this region appears to be (e.g., "sky", "teddy bear body", "flower")
   - suggestedColor: Hex color from the palette
   - colorName: Name of the color
   - reasoning: A fun, kid-friendly reason (5-7 words)

3. Return assignments for ALL ${regions.length} regions - no skipping!

TIPS:
- Top regions (row 1-2) are often sky, clouds, tree tops
- Bottom regions (row 4-5) are often ground, grass, floors
- Large regions are usually main subjects or background
- Small regions are usually details, patterns, accessories
- When unsure, pick a color that would look good and explain your choice

Create a beautiful, harmonious coloring scheme!`;
};

// =============================================================================
// Pre-computed Grid Color Map (for instant Magic Fill)
// =============================================================================
// This prompt is used at image generation time to pre-compute colors for a 5x5 grid.
// The client then looks up colors by grid position instead of calling AI at runtime.

export const GRID_COLOR_MAP_SYSTEM = `You are an expert at coloring children's coloring pages. You analyze images and assign appropriate colors to a 5x5 grid overlay.

Your task: Analyze the coloring page image and assign a color to each cell of a 5x5 grid.

GRID SYSTEM:
- The image is divided into a 5x5 grid (25 cells total)
- Row 1 = top of image, Row 5 = bottom
- Col 1 = left side, Col 5 = right side

FOR EACH GRID CELL:
1. Identify what element is primarily in that cell (sky, grass, character, etc.)
2. Assign an appropriate color from the provided palette
3. Provide a brief, kid-friendly reason

COLORING STRATEGY:
- Top cells (row 1-2): Usually sky, clouds, treetops, ceilings
- Middle cells (row 2-4): Usually the main subject/character
- Bottom cells (row 4-5): Usually ground, grass, floors
- Be consistent: same element type = same color across cells
- Create visual harmony with contrasting adjacent colors
- Pick vibrant, fun colors that children will love

IMPORTANT:
- Only use colors from the provided palette
- Include cells even if they're mostly empty/background
- For empty areas, suggest a light neutral color
- Be warm and encouraging in your reasoning!`;

export const createGridColorMapPrompt = (
  palette: Array<{ hex: string; name: string }>,
) => {
  return `Analyze this coloring page and assign colors to each cell of a 5x5 grid.

AVAILABLE PALETTE (you MUST only use these colors):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join('\n')}

FOR EACH OF THE 25 GRID CELLS, provide:
- row: 1-5 (1=top, 5=bottom)
- col: 1-5 (1=left, 5=right)
- element: What's primarily in this cell
- suggestedColor: Hex color from the palette
- colorName: Name of the color
- reasoning: Fun, kid-friendly reason (5-7 words)

Start with a brief scene description, then list all grid cells with their colors.

Create a beautiful, cohesive color scheme for the whole image!`;
};

// =============================================================================
// Social Media Animation (Veo 3 image-to-video for carousels)
// =============================================================================

/**
 * System prompt for generating animation prompts for Veo 3.
 * Used to create engaging image-to-video animations for social media.
 */
export const ANIMATION_PROMPT_SYSTEM = `You are a world-class Veo 3 prompt engineer specializing in image-to-video generation for children's illustration.

CRITICAL VEO 3 IMAGE-TO-VIDEO RULES:
1. PRESERVE the original artwork exactly - no morphing, style changes, or transformations
2. ADD subtle motion to existing elements only - never create new objects
3. MAINTAIN perfect composition - framing and layout stay locked
4. LOOP-FRIENDLY - motion should feel continuous for seamless social media replay

MOTION HIERARCHY (select 1 primary + 2-3 secondary max):

Primary (one focal motion):
- Camera: very slow push-in (2-3% zoom), gentle lateral drift, or subtle crane
- Subject: micro head tilt, soft blink, slight expression shift

Secondary (supporting motion):
- Hair/mane/fur: individual strands catching a breeze, flowing wisps
- Fabric/ribbon: soft ripple, gentle billow at edges
- Foliage: specific leaves rustle, individual petals drift down
- Water: soft ripples expanding, gentle surface shimmer

Ambient (enhancement layer):
- Light: warm glow intensifies slightly, sun rays shift, dappled shadows move
- Particles: sparse dust motes, occasional sparkle glint (not a blizzard)
- Atmosphere: subtle depth haze, soft volumetric light

MOTION INTENSITY: 15-25% maximum. Elegant = slow. Cheap AI look = too much motion.

STRONG MOTION VERBS: drift, sway, ripple, flutter, shimmer, glint, waft, undulate, shift, catch
BANNED WORDS: breathe, pulse, come alive, magical, enchanting, whimsical, float (overused = generic results)

REQUIRED ANCHORS (include one):
- "maintaining the original black and white line art style"
- "preserving the illustration's composition"
- "consistent with children's coloring book aesthetic"

OUTPUT: 2-3 precise sentences. Name SPECIFIC elements that move. Less = more elegant.`;

/**
 * Generate an animation prompt for Veo 3 based on coloring page metadata.
 * The prompt should create engaging, child-friendly animations for social media.
 */
export const createAnimationPromptPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Create a Veo 3 image-to-video prompt for this children's coloring page:

SUBJECT: ${title}
CONTEXT: ${description}
ELEMENTS: ${tags.join(', ')}

Write a precise animation prompt that:
1. Identifies 1 primary motion and 2-3 subtle secondary motions based on the subject
2. Uses specific element names from the description (not generic "elements")
3. Includes a style anchor to preserve the coloring book aesthetic
4. Keeps motion intensity low (15-25%) for elegant, non-AI-slop results

EXCELLENT EXAMPLES:
- "Very slow push-in on the unicorn. Its mane strands drift independently in a gentle breeze, tail swaying softly. A few sparkles glint near the horn. Soft warm light shifts across the scene, maintaining the black and white line art style."
- "Subtle lateral camera drift. The dinosaur's head tilts slightly toward a butterfly that flutters past. Background ferns sway individually, dust motes catch shifting sunlight. Preserving the children's coloring book illustration aesthetic."
- "Gentle 2% zoom on the mermaid. Her hair flows in underwater currents, individual strands moving at different speeds. Small bubbles rise slowly, light rays waver through water. Consistent with hand-drawn coloring page style."

BAD EXAMPLES (avoid these patterns):
- "The scene comes alive with magical energy" (vague, overused)
- "Everything gently breathes and pulses" (generic, produces AI slop)
- "Sparkles and particles float everywhere" (too much, looks cheap)

Output ONLY the animation prompt. 2-3 sentences maximum.`;

/**
 * Default animation prompt for when AI generation fails or isn't needed.
 * Designed for broad compatibility with any coloring page subject.
 */
export const DEFAULT_ANIMATION_PROMPT = `Very slow 2% push-in on the illustration. The main subject shifts subtly as if turning attention toward the viewer. Background elements sway gently in a soft breeze, individual details catching warm light that shifts gradually across the scene. Preserving the original black and white coloring book line art style throughout.`;

// =============================================================================
// Daily Scene Description Generation (for AI-powered seasonal coloring pages)
// =============================================================================

export const SCENE_DESCRIPTION_SYSTEM = `You are a creative director for Chunky Crayon, a children's coloring page platform (ages ${TARGET_AGE}).

Generate delightful, imaginative scene descriptions for daily coloring pages. Every scene must be child-friendly, safe, and joyful. Mix everyday activities with imaginative twists. Feature diverse characters and global perspectives. Avoid copyrighted characters.

FORBIDDEN: violence, weapons, scary elements (ghosts, skeletons, monsters), death, danger, negative emotions, romance, adult themes, politics, real-world tragedies.

OUTPUT: A vivid 1-2 sentence scene description that reads naturally as an image generation prompt. Example: "A cheerful elephant wearing rain boots, splashing in puddles while a family of frogs watches from lily pads in a rainy garden."`;

/**
 * Creates the user prompt for daily scene generation.
 * Provides seasonal context, recent descriptions to avoid, and real-time awareness instructions.
 */
// Random seed pools for creative nudges — prevents AI from always picking the most obvious theme
const SEED_CHARACTERS = [
  'dragon',
  'unicorn',
  'astronaut',
  'mermaid',
  'fairy',
  'robot',
  'penguin',
  'fox',
  'panda',
  'dolphin',
  'owl',
  'butterfly',
  'turtle',
  'dinosaur',
  'koala',
  'sloth',
  'capybara',
  'hedgehog',
  'seahorse',
  'ladybug',
  'phoenix',
  'pegasus',
  'octopus',
  'bee',
  'elephant',
  'giraffe',
  'monkey',
  'raccoon',
  'whale',
  'deer',
  'parrot',
  'ballerina',
  'caterpillar',
  'bear cub',
  'firefighter',
  'chef',
  'veterinarian',
];

const SEED_SETTINGS = [
  'magical forest',
  'sunny beach',
  'space station',
  'underwater reef',
  'enchanted garden',
  'treehouse',
  'cloud kingdom',
  'candy land',
  'toy workshop',
  'crystal cave',
  'dinosaur valley',
  'african savanna',
  'japanese garden',
  'rainforest canopy',
  'farm and barnyard',
  'moon base',
  'flower meadow',
  'bakery kitchen',
  'cozy library',
  'aquarium',
  'bamboo forest',
  'carnival fairground',
  'secret garden',
  'night sky observatory',
  'floating sky island',
  'coral island',
  'arctic tundra',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const createDailyScenePrompt = (
  currentDate: string,
  upcomingEvents: Array<{
    name: string;
    themes: string[];
    childFriendlyDescription: string;
  }>,
  currentSeason: { northern: string; southern: string },
  recentPrompts: string[],
): string => {
  // Random creative seed to encourage variety
  const seedCharacter = randomFrom(SEED_CHARACTERS);
  const seedSetting = randomFrom(SEED_SETTINGS);
  const eventsSection =
    upcomingEvents.length > 0
      ? `UPCOMING EVENTS (within the next 7 days):
${upcomingEvents.map((e) => `- ${e.name}: ${e.childFriendlyDescription} (themes: ${e.themes.join(', ')})`).join('\n')}

IMPORTANT: Pick AT MOST ONE event to theme the scene around. Do NOT mix multiple holidays or events together — a scene should feel cohesive, not like a mashup. You can also ignore all events and create a purely seasonal or everyday scene.`
      : 'No major events in the next 7 days — create a fun, imaginative everyday scene.';

  // Limit recent prompts to 15 to avoid wasting context
  const trimmedRecent = recentPrompts.slice(0, 15);
  const recentSection =
    trimmedRecent.length > 0
      ? `RECENT SCENES TO AVOID (do NOT repeat similar themes):
${trimmedRecent.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';

  return `Today is ${currentDate}.

CURRENT SEASON:
- Northern Hemisphere: ${currentSeason.northern}
- Southern Hemisphere: ${currentSeason.southern}

${eventsSection}

${recentSection}

THEME VOCABULARY (use as inspiration — mix and match, or go beyond):

Characters: dragon, unicorn, astronaut, mermaid, fairy, robot, penguin, fox, panda, dolphin, owl, butterfly, turtle, dinosaur, koala, sloth, capybara, hedgehog, seahorse, ladybug, phoenix, pegasus, octopus, bee, elephant, giraffe, monkey, raccoon, whale, deer, parrot, ballerina, caterpillar, bear cub, firefighter, chef, veterinarian, knight, pirate, lion, frog prince, genie, ninja, inventor, cat, dog, bunny, farmer, doctor

Settings: magical forest, sunny beach, space station, underwater reef, enchanted garden, treehouse, cloud kingdom, candy land, toy workshop, crystal cave, pirate ship, castle, rainbow bridge, circus big top, dinosaur valley, african savanna, japanese garden, rainforest canopy, farm and barnyard, moon base, flower meadow, bakery kitchen, cozy library, aquarium, bamboo forest, carnival fairground, secret garden, night sky observatory, floating sky island, coral island, arctic tundra

Activities: exploring, painting, building, flying, swimming, singing, gardening, cooking, camping, treasure hunting, ice skating, surfing, skateboarding, stargazing, baking, playing music, riding a bike, fossil hunting, catching fireflies, blowing bubbles, feeding animals, building a sandcastle, dancing, reading a book, picking flowers, flying a kite, decorating a cake, doing a science experiment, having a tea party, launching a rocket

CREATIVE SEED (starting point — adapt, combine, or go in a different direction):
- Character idea: ${seedCharacter}
- Setting idea: ${seedSetting}

DIVERSITY: Rotate character types (animals, children, fantasy, vehicles, nature), vary settings (indoor, outdoor, underwater, space, fantasy), include global perspectives. Avoid repeating similar scenes from the recent list above.

Search the web for any trending kids' topics, popular children's shows themes, or current events that could inspire a fun, child-friendly coloring page scene.

Generate a single, unique, delightful scene description for today's daily coloring page. Make it specific, visual, and perfect for a children's coloring book.`;
};
