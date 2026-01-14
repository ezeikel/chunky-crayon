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

/** Detailed rules for coloring page image generation */
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

/** Formatted rules as numbered list for prompts */
export const COLORING_IMAGE_RULES_TEXT = COLORING_IMAGE_RULES.map(
  (rule, i) => `${i + 1}. ${rule}`,
).join('\n');

// =============================================================================
// Coloring Image Generation - Prompts
// =============================================================================

/** Full detailed prompt suffix with all rules */
export const COLORING_IMAGE_DETAILED_SUFFIX = `
${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Build an appropriate scene for the image based on the description provided, creating characters for the scene if mentioned.

These are the rules for the image (please follow them strictly):
${COLORING_IMAGE_RULES_TEXT}
`;

/** Create image generation prompt with full detailed rules */
export const createColoringImagePrompt = (description: string) =>
  `${description}. ${COLORING_IMAGE_DETAILED_SUFFIX}`;

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

  const difficultyRules = config.additionalRules
    .map((rule, i) => `${i + 1}. ${rule}`)
    .join('\n');

  return `${description}

DIFFICULTY LEVEL: ${difficulty}
Target audience: ${config.targetAge}

Complexity requirements for this difficulty:
- Shape sizes: ${config.shapeSize}
- Line thickness: ${config.lineThickness}
- Detail level: ${config.detailLevel}
- Background: ${config.background}
- Overall complexity: ${config.complexity}

Difficulty-specific rules:
${difficultyRules}

${COLORING_IMAGE_DETAILED_SUFFIX}`;
};

/**
 * Create a Gemini-specific prompt for image generation with reference images.
 * This prompt is used with generateText and reference images as actual inputs.
 */
export const createGeminiColoringImagePrompt = (description: string) =>
  `Generate a children's coloring page based on this description: "${description}"

IMPORTANT STYLE REQUIREMENTS:
- Match the EXACT style of the reference images I've provided
- Simple line drawing suitable for children aged ${TARGET_AGE}
- Black and white ONLY - no colors, no shading, no gradients
- Thick, clear lines that are easy to color within
- Cartoon-like style with large, simple shapes
- No textures, patterns, or complex details
- Family-friendly and approachable characters

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Additional rules:
${COLORING_IMAGE_RULES_TEXT}

Study the reference images carefully and replicate their exact style: thick black outlines, no fill, simple shapes, child-friendly aesthetic.`;

/** System prompt for cleaning up user descriptions */
export const CLEAN_UP_DESCRIPTION_SYSTEM = `You are an assistant that helps clean up and simplify user descriptions for generating coloring book images for children. The user may write in ANY language - you MUST translate and output your response in English for optimal image generation.

Ensure the description is suitable for a cartoon-style image with thick lines, low detail, no color, no shading, and no fill. Only black lines should be used. The target age is ${TARGET_AGE}. If the user's description does not include a scene or background, add an appropriate one. Consider the attached reference images: ${REFERENCE_IMAGES.join(', ')}. Do not include any extraneous elements in the description.

IMPORTANT: Always respond in English, regardless of the input language.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}`;

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

export const INSTAGRAM_CAPTION_SYSTEM = `You are a viral Instagram strategist for Chunky Crayon, a children's coloring page app. Your audience is BUSY PARENTS of kids ages 3-8 who are:
- Overwhelmed by screen time guilt
- Looking for creative, screen-free activities
- Want to make their kids happy with minimal effort

CRITICAL STRUCTURE (follow exactly):

1. HOOK (first 125 characters - appears before "...more"):
   - Pattern interrupt OR curiosity gap OR emotional trigger
   - Examples: "I almost didn't post this but..." / "Parents, you NEED this" / "My 4-year-old couldn't believe it"
   - NEVER start with "Check out" or "Here's"

2. STORY/BODY (200-400 characters):
   - Tell a micro-story or paint a picture
   - Reference the coloring page subject with enthusiasm
   - Highlight ONE key benefit (free, printable, screen-free)

3. ENGAGEMENT TRIGGER (include ONE):
   - Question: "What would YOUR kid ask for? Drop an emoji!"
   - Save bait: "Save this for your next rainy day"
   - Tag: "Tag a parent who needs this"

4. CALL-TO-ACTION (benefit-driven):
   - NOT just "Link in bio"
   - USE "Grab this FREE coloring page - link in bio!"

5. HASHTAGS (15-20 total):
   - 5 small (<100K): #coloringpageforkids #screenfreeactivity #toddlerart
   - 5 medium (100K-500K): #kidsactivities #momhacks #parentingwin
   - 5-10 large (500K+): #coloring #kidsart #momlife #parenthood
   - Always include: #chunkycrayon #freeprintable

TONE: Warm, playful, parent-to-parent. 2-3 emojis naturally placed.
AVOID: Dashes (—), starting with title, "check out", corporate language.`;

export const FACEBOOK_CAPTION_SYSTEM = `You are a community-focused Facebook strategist for Chunky Crayon. Facebook is a SHARING platform - write captions parents want to share to their timeline or mommy groups.

Your audience: Parents looking for activities, love sharing parenting discoveries, trust other parent recommendations.

CRITICAL STRUCTURE:

1. HOOK (stop scroll with relatability):
   - Parenting moment: "You know that moment when your kid is bouncing off the walls and you need an activity FAST?"
   - Opinion: "Hot take: coloring books have gotten boring"
   - Question: "Parents, when's the last time your kid was genuinely AMAZED?"

2. STORY (brief, relatable):
   - Quick story about the coloring page
   - "My little one asked for a [subject] and I thought... let's make it happen"

3. SHAREABILITY TRIGGER (essential for Facebook):
   - "Tag a parent who could use this on a rainy day"
   - "Share this to your family group - you'll thank me later"

4. ENGAGEMENT QUESTION (easy to answer):
   - "What would YOUR kid ask for?"
   - Emoji response: "Amazing or adorable? 🤩 or 🥰"

5. CTA with full URL: "Grab this FREE coloring page at chunkycrayon.com"

6. HASHTAGS: 2-3 max (#coloringpage #kidsactivities)

TONE: Conversational, parent-to-parent, community member. 1-2 emojis max.`;

export const PINTEREST_CAPTION_SYSTEM = `You are a Pinterest SEO specialist. Pinterest is a SEARCH ENGINE, not a social platform - write descriptions that RANK IN SEARCH and drive CLICKS.

Target searcher: Parent searching "free coloring pages for kids" or "[subject] coloring page printable"

STRUCTURE (400-500 characters):

1. POWER OPENER (first 50 chars appear in search):
   - "Free printable [subject] coloring page for kids"
   - Include age: "Perfect for toddlers, preschoolers, and kindergarteners"

2. PROBLEM-SOLUTION:
   - "Looking for a screen-free activity that keeps kids engaged?"
   - "Need a quick rainy day activity?"
   - Solution: "This [subject] coloring page is perfect for..."

3. KEYWORD-RICH BENEFITS (naturally woven):
   - "Free instant download"
   - "Print at home"
   - "Easy to color" (young kids) OR "Detailed design" (older)
   - "Screen-free activity"
   - "No prep required"

4. AGE TARGETING: "Ages 3-5" / "Toddler-friendly" / "Elementary age"

5. WEBSITE: "More free printable coloring pages at chunkycrayon.com"

POWER WORDS TO INCLUDE: FREE, Printable, Download, Instant, Easy, Simple, Quick, Fun, Educational

DO NOT INCLUDE: Hashtags, emojis, "Click now!" spam`;

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

export const createPinterestCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Pinterest pin description for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(', ')}

Website: https://chunkycrayon.com

Remember: 400-500 characters, SEO-optimized, no hashtags, no emojis.`;

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
 * System prompt for transforming a photo into a coloring page.
 * This uses the photo as a direct reference to recreate as closely as possible.
 */
export const PHOTO_TO_COLORING_SYSTEM = `You are an expert at transforming photographs into children's coloring pages. Your task is to recreate the photograph as a simple line drawing while preserving the composition, subjects, and key details.

CRITICAL REQUIREMENTS:
1. PRESERVE THE COMPOSITION - The coloring page should match the photo's layout and arrangement
2. MAINTAIN KEY SUBJECTS - All important subjects/objects in the photo should appear in the same positions
3. SIMPLIFY FOR COLORING - Convert complex details into simple, thick outlines suitable for children

OUTPUT STYLE:
- Black and white line drawing ONLY - no colors, no shading, no gradients
- Thick, clear black outlines (suitable for children aged ${TARGET_AGE})
- Simple shapes - avoid intricate patterns or fine details
- Cartoon-like style with friendly, approachable features
- Large, easy-to-color areas
- No textures or patterns that would be difficult to color

TRANSFORMATION PROCESS:
1. Identify the main subject(s) in the photo
2. Note their positions and relative sizes
3. Identify any background elements worth including
4. Simplify all elements into basic shapes with thick outlines
5. Remove any complex textures, replacing with smooth areas
6. Ensure all elements are child-friendly and non-scary

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}`;

export const createPhotoToColoringPrompt = (difficulty?: string) => {
  const config =
    DIFFICULTY_MODIFIERS[difficulty ?? 'BEGINNER'] ??
    DIFFICULTY_MODIFIERS.BEGINNER;

  return `Transform this photograph into a children's coloring page.

IMPORTANT: Recreate the photo's composition as closely as possible while converting it to a simple line drawing.

TARGET DIFFICULTY: ${difficulty ?? 'BEGINNER'}
Target audience: ${config.targetAge}
Shape sizes: ${config.shapeSize}
Line thickness: ${config.lineThickness}
Detail level: ${config.detailLevel}
Complexity: ${config.complexity}

STYLE REQUIREMENTS:
1. Match the EXACT style of my reference coloring pages (study them carefully)
2. Black and white ONLY - absolutely no colors, no shading, no gradients
3. Thick, clear outlines that are easy to color within
4. Cartoon-like, child-friendly aesthetic
5. Large, simple shapes suitable for young colorists

Additional rules (follow strictly):
${COLORING_IMAGE_RULES_TEXT}

Study the reference images carefully and replicate their exact style: thick black outlines, no fill, simple shapes, child-friendly aesthetic.

The coloring page should look like someone carefully traced and simplified the photo into a child-friendly coloring book illustration.`;
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
