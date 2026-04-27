/**
 * AI Prompts
 *
 * Centralized prompt definitions for all AI interactions.
 * Organized by feature/domain for easy maintenance.
 *
 * Coloring Habitat — adult coloring for wellness, mindfulness, and creative relaxation.
 */

// =============================================================================
// Reference Assets
// =============================================================================

// TODO: Upload Habitat-specific reference images to assets.coloringhabitat.com
// For now, sharing Chunky Crayon's reference images from the same R2 bucket
export const REFERENCE_IMAGES = [
  "https://assets.chunkycrayon.com/reference-images/birthdays-8uiLmIVecHAw1yjqNRQ2OCYHoaa8gW.webp",
  "https://assets.chunkycrayon.com/reference-images/dinosaur-bfmBtp1o0kVeIZtuVVNhmKTMJXOgS7.webp",
  "https://assets.chunkycrayon.com/reference-images/family-and-friends-g4vlGFNcWXrcHQ7sB4y8LLYiO3PIAG.webp",
  "https://assets.chunkycrayon.com/reference-images/farm-animals-knAdbOJKhulPhb7xnaCkMXycTunbNi.webp",
  "https://assets.chunkycrayon.com/reference-images/sea-creatures-njuJrigKzRhyl7GZXeigWSHtbPFgiG.webp",
  "https://assets.chunkycrayon.com/reference-images/superheroes-zX4vpC6SMlXVEn1Wxombkyr2fU165K.webp",
  "https://assets.chunkycrayon.com/reference-images/trains-TOkt3DJ3Oy56ZTV0uy7h2XmD8DsTGV.webp",
  "https://assets.chunkycrayon.com/reference-images/unicorns-8XVTm2dwIgIAUpah12vBMnWz7A02yo.webp",
] as const;

// =============================================================================
// Difficulty-Based Prompt Modifiers
// =============================================================================

/**
 * Difficulty configuration for generating coloring pages at varying complexity levels.
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
 * BEGINNER = Relaxing, flowing designs with larger sections
 * INTERMEDIATE = Moderate detail with balanced complexity
 * ADVANCED = Detailed patterns with varied section sizes
 * EXPERT = Extremely intricate, mandala-level detail
 */
export const DIFFICULTY_MODIFIERS: Record<string, DifficultyConfig> = {
  BEGINNER: {
    targetAge: "adults seeking creative relaxation",
    shapeSize: "larger sections with flowing organic shapes",
    lineThickness: "medium-thick (2-3px equivalent)",
    detailLevel: "moderate — elegant simplicity with clean flowing lines",
    background: "minimal, uncluttered",
    complexity: "relaxing — larger colorable sections, soothing flowing lines",
    additionalRules: [
      "Favor organic, flowing shapes over geometric precision",
      "Keep sections large enough for meditative, rhythmic coloring",
      "Around 15-25 distinct colorable areas",
      "Designs should feel calming and approachable",
    ],
  },
  INTERMEDIATE: {
    targetAge: "adults seeking creative relaxation",
    shapeSize: "medium sections with some finer areas",
    lineThickness: "medium (1.5-2.5px equivalent)",
    detailLevel: "detailed — decorative elements, repeating motifs",
    background: "complementary patterns or scenic elements",
    complexity: "moderate — balanced mix of larger areas and finer details",
    additionalRules: [
      "Include decorative borders or repeating pattern accents",
      "Background can integrate with the subject through flowing transitions",
      "Around 25-40 distinct colorable areas",
      "Mix organic curves with structured repeating elements",
    ],
  },
  ADVANCED: {
    targetAge: "adults seeking creative relaxation",
    shapeSize: "varied — from medium areas to fine detail sections",
    lineThickness: "fine to medium (1-2px equivalent)",
    detailLevel:
      "intricate — layered patterns, textured details, ornamental flourishes",
    background: "fully integrated, densely patterned",
    complexity: "high — many sections of varying size, layered compositions",
    additionalRules: [
      "Incorporate zentangle-inspired fills within larger shapes",
      "Layer foreground, midground, and background elements",
      "40-60 distinct colorable areas",
      "Include fine hatching, stippling suggestions in some areas",
      "Sophisticated compositions with visual depth",
    ],
  },
  EXPERT: {
    targetAge: "adults seeking creative relaxation",
    shapeSize: "all sizes including extremely fine sections",
    lineThickness: "fine (0.5-1.5px equivalent)",
    detailLevel:
      "extremely intricate — mandala-level detail, dense pattern fills, tiny sections",
    background: "complex, every area filled with pattern or detail",
    complexity: "very high — dense, meditative, hours of coloring",
    additionalRules: [
      "Mandala-style concentric patterns welcome",
      "Every region should contain sub-patterns or texture details",
      "60+ distinct colorable areas, many very small",
      "Include zentangle, paisley, filigree, or arabesque details",
      "Fine linework should reward close inspection",
      "Compositions should feel like a complete world to get lost in",
    ],
  },
};

/**
 * Get the target audience string for a given difficulty level.
 * Used to customize prompts based on profile difficulty.
 */
export const getTargetAgeForDifficulty = (
  difficulty: string = "BEGINNER",
): string => {
  return (
    DIFFICULTY_MODIFIERS[difficulty]?.targetAge ??
    "adults seeking creative relaxation"
  );
};

// =============================================================================
// Coloring Image Generation - Core Rules
// =============================================================================

/** Default target audience for coloring pages (BEGINNER level) */
export const TARGET_AGE = "adults seeking creative relaxation";

/** Instructions for handling copyrighted characters */
export const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the description includes a copyrighted character name, describe the character's visual appearance in detail instead — costume, accessories, silhouette, distinguishing features. Replace the copyrighted name with this detailed visual description. If no copyrighted characters are mentioned, skip this step.`;

/**
 * GPT Image 1.5 style block — positive framing, ~200 words.
 * Research shows GPT image models largely ignore negative prompts.
 * Positive framing ("fine black outlines") works far better than
 * negative framing ("no color, no shading, no gradients").
 */
export const GPT_IMAGE_STYLE_BLOCK = `Style: adult coloring page, intricate line art, detailed patterns, fine linework on a pure white background.
Medium: crisp black ink outlines only, completely unfilled, white interior on every shape.
Audience: ${TARGET_AGE} — detailed enough to be engaging, with varied section sizes for a satisfying coloring experience.

Composition: a well-balanced, sophisticated composition with visual depth. Varied section sizes — from larger restful areas to intricate detailed zones. Clean, confident linework throughout.

Subject treatment: realistic or stylized with ornamental detail. Hair, fur, foliage rendered with flowing individual strands and natural textures. Clothing and fabric drawn with decorative patterns, folds, and draping detail. Architectural elements include structural detail and ornamentation.

Technical: high contrast between black outlines and white space. Every enclosed shape left completely white and unfilled. Smooth, precise line work suitable for fine-tipped pens and colored pencils. No duplicate elements unless the description asks for them. Line weight varies for visual hierarchy — thicker outlines for major shapes, finer lines for interior detail and pattern fills.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

My prompt has full detail so no need to add more.`;

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility (used by photo-to-coloring Gemini path).
 */
export const COLORING_IMAGE_RULES = [
  "The image should be a detailed line drawing suitable for an adult coloring page.",
  "No color at all. The image must be black and white only. No colors should be used in any part of the image.",
  "No solid fill areas — all regions must be unfilled white interiors bounded by outlines.",
  "Do not duplicate any characters or elements unless specifically asked to do so.",
  "Do not draw any borders around the composition unless specifically asked to do so.",
  "The image must be designed for adults seeking creative relaxation. Include intricate detail, fine linework, and sophisticated compositions.",
  "Do not include any shadows, shading, or gradients.",
  "Use varied line weights — thicker outlines for major shapes, finer lines for interior patterns and details.",
  "If no background is specified, create a complementary one with appropriate detail density.",
  "Avoid adding arbitrary elements not related to the main scene.",
  "Clothing, fabric, and textiles should include decorative patterns, folds, and texture detail through linework.",
  "Hair, fur, and foliage should be rendered with flowing individual lines showing natural texture and movement.",
  "The style should balance realism with decorative ornamentation — intricate but not chaotic.",
  "Ensure high contrast and clear distinctions between elements.",
  "The image should only use black and white, with no intermediate gray tones.",
  "All regions must be outlined shapes with white unfilled interiors.",
  "Include fine detail and complex patterns — zentangle fills, mandala motifs, botanical details, geometric accents.",
  "Compositions should have visual depth with foreground, midground, and background layers.",
  "Include varied section sizes — larger areas for relaxing coloring alongside smaller intricate zones.",
  "Architectural and structural elements should include ornamental detail and accurate proportions.",
  "Do not include random elements or duplications not part of the main scene description.",
  "Every area of the composition should reward close inspection with thoughtful detail.",
] as const;

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility.
 */
export const COLORING_IMAGE_RULES_TEXT = COLORING_IMAGE_RULES.map(
  (rule, i) => `${i + 1}. ${rule}`,
).join("\n");

// =============================================================================
// Coloring Image Generation - Prompts
// =============================================================================

/**
 * @deprecated Use GPT_IMAGE_STYLE_BLOCK for GPT Image prompts.
 * Kept for backward compatibility.
 */
export const COLORING_IMAGE_DETAILED_SUFFIX = `
${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Build an appropriate scene for the image based on the description provided, creating subjects and elements for the scene if mentioned.

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
 * Uses the profile's difficulty setting to generate appropriately complex images.
 *
 * @param description - The user's description of what they want
 * @param difficulty - The difficulty level from the profile (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
 * @returns A prompt with difficulty-specific modifiers
 */
export const createDifficultyAwarePrompt = (
  description: string,
  difficulty: string = "BEGINNER",
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

${config.additionalRules.map((rule) => `- ${rule}`).join("\n")}

${GPT_IMAGE_STYLE_BLOCK}`;
};

/**
 * Create a Gemini-specific prompt for image generation with reference images.
 * Uses narrative description style optimized for Gemini (narrative > keyword lists).
 * Reference image instruction is placed adjacent to where images are passed.
 */
export const createGeminiColoringImagePrompt = (description: string) =>
  `Generate an adult coloring page of: "${description}"

Draw this scene as if inking it by hand with a fine-tipped pen on white paper. Use confident, varied-weight outlines — thicker for major forms, finer for interior detail and pattern fills. Leave all enclosed areas completely white and unfilled. Create a sophisticated composition with visual depth, intricate patterns, and varied section sizes that invite meditative coloring. Render hair, fur, and foliage with flowing individual strands and natural texture. Include ornamental details, decorative motifs, and fine linework throughout.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Study the reference images below and match their style — clean black outlines, white interiors, detailed aesthetic, printable quality. Adapt the level of intricacy for an adult audience.

Exclude: gradients, shadows, shading, gray tones, fill, color, solid black areas.`;

/** System prompt for cleaning up user descriptions (Claude Sonnet 4.5) */
export const CLEAN_UP_DESCRIPTION_SYSTEM = `<role>Adult coloring page description editor</role>

<constraints>
- Output in English regardless of input language
- Suitable for detailed line art: varied line weights, intricate patterns, sophisticated compositions
- Audience: ${TARGET_AGE}
- Add a complementary scene or background if not specified
- ${COPYRIGHTED_CHARACTER_INSTRUCTIONS}
</constraints>

<output_format>
Output a single English sentence of 10-50 words describing the scene. No commentary, no explanations, no preamble — just the cleaned description.
</output_format>

<examples>
<input>un dragón volando sobre un castillo</input>
<output>A detailed dragon with scaled wings soaring over a medieval castle with ornate towers, flying buttresses, and a winding path through a mountainous landscape.</output>

<input>I want a mandala with flowers</input>
<output>A symmetrical mandala composed of layered floral motifs — roses, lotuses, and trailing vines — with geometric borders and ornamental filigree details.</output>

<input>猫</input>
<output>An elegant cat resting on a patterned cushion beside an ornate window, with detailed fur texture, decorative curtains, and a garden scene visible outside.</output>
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
    targetLanguage && targetLanguage !== "English"
      ? `

IMPORTANT LANGUAGE REQUIREMENT:
- The "title" field MUST be in ${targetLanguage} (${nativeName}) - use natural, appealing expressions
- The "description", "alt", and "tags" fields MUST remain in English for consistency and filtering
- Only translate the title, nothing else`
      : "";

  return `You are an assistant that generates metadata for adult coloring page images for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and appeal to adults interested in creative relaxation and mindfulness coloring.${languageInstruction}`;
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

export const INSTAGRAM_CAPTION_SYSTEM = `<role>Instagram strategist for Coloring Habitat, an adult coloring platform focused on wellness and creative mindfulness. You write as THE BRAND — calm, inspiring, community-focused.</role>

<voice>Always "we" (Coloring Habitat), never "I". You ARE the brand talking to a community of adult colorists.</voice>

<audience>Adults (25-65) who color for relaxation, stress relief, mindfulness, and creative expression.</audience>

<structure>
1. HOOK (first 125 chars, before "...more"): Calm brand energy or intriguing visual detail. Never start with "Check out" or "Here's".
2. STORY/BODY (200-400 chars): Reference the design with appreciation. Highlight ONE benefit (free, printable, mindful, relaxing). Speak as brand.
3. ENGAGEMENT TRIGGER (one of: question, save bait, or tag prompt).
4. CTA: Benefit-driven, e.g. "Download this free coloring page — link in bio."
5. HASHTAGS (15-20 total): Mix of small (<100K), medium (100K-500K), and large (500K+). Always include #coloringhabitat #adultcoloring.
</structure>

<tone>Calm, warm, inspiring. Like a mindful creative friend. 2-3 emojis naturally placed.</tone>

<avoid>Dashes, starting with title, "check out", corporate language, overly enthusiastic ALL-CAPS energy, section labels in output.</avoid>

<output_format>Write exactly 800-1500 characters including hashtags. Return ONLY the final caption — no labels, no section headers. One flowing piece of text with natural line breaks, hashtags at the end.</output_format>

<examples>
<input>Title: Serene Japanese Garden, Description: A detailed Japanese garden with a stone bridge, koi pond, and cherry blossom trees, Tags: japanese garden, koi, cherry blossom, zen</input>
<output>There's something deeply calming about this one and we think you'll feel it too

We designed this Japanese garden page with layers of detail — the koi gliding beneath the bridge, cherry blossoms catching the breeze, every stone placed with intention. It's the kind of design you can get lost in for an hour without noticing time pass.

Perfect for an evening wind-down with your favorite colored pencils and a cup of tea.

What colors would you choose for the cherry blossoms? Save this for your next coloring session.

Download this free coloring page — link in bio

#coloringhabitat #adultcoloring #coloringforadults #mindfulcoloring #stressrelief #coloringtherapy #zenart #japanesegarden #lineart #coloringcommunity #arttherapy #relaxation #creativewellness #printablecoloring #coloringpages #detailedcoloring #mindfulness #selfcare</output>
</examples>`;

export const FACEBOOK_CAPTION_SYSTEM = `<role>Community-focused Facebook strategist for Coloring Habitat. Facebook is a SHARING platform — write posts adults want to share with friends who color.</role>

<voice>You ARE Coloring Habitat the brand. Use "we" not "I".</voice>

<audience>Adults who color for relaxation, stress relief, and creative fulfillment. Love sharing discoveries with friends.</audience>

<structure>
1. HOOK: Brand warmth or question that invites engagement.
2. STORY: Brief appreciation of the design's detail and coloring potential.
3. SHAREABILITY TRIGGER: "Share this with someone who deserves a creative break" or similar.
4. ENGAGEMENT QUESTION: Easy to answer, e.g. "What medium would you use — pencils, markers, or watercolor?"
5. CTA with full URL: "Download this free coloring page at coloringhabitat.com"
6. HASHTAGS: 2-3 max.
</structure>

<tone>Warm, inclusive, mindful. 1-2 emojis max.</tone>

<output_format>Write exactly 400-800 characters including hashtags. Return ONLY the final post — no labels, no section markers. One natural flowing post.</output_format>

<examples>
<input>Title: Intricate Mandala, Description: A symmetrical mandala with layered floral and geometric patterns, Tags: mandala, geometric, floral</input>
<output>New design just landed and this one is pure meditation on paper

We layered floral motifs with geometric precision in this mandala — every ring reveals more detail the longer you look. It's the kind of page that turns an ordinary evening into something restorative.

Share this with someone who could use a creative break this week.

Are you a colored pencils or fine-tip markers person for mandalas?

Download this free coloring page at coloringhabitat.com

#adultcoloring #mindfulcoloring #coloringhabitat</output>
</examples>`;

export const PINTEREST_CAPTION_SYSTEM = `<role>Pinterest SEO specialist for Coloring Habitat. Pinterest is a SEARCH ENGINE — write descriptions that rank and drive clicks.</role>

<voice>Write as Coloring Habitat the brand. Use "we" if referencing the brand.</voice>

<audience>Adults searching "free adult coloring pages", "printable mandala", "[subject] coloring page for adults".</audience>

<structure>
1. POWER OPENER (first 50 chars visible in search): "Free printable [subject] adult coloring page"
2. PROBLEM-SOLUTION: Stress relief and creative relaxation hook + this design is the answer.
3. KEYWORD-RICH BENEFITS: Free, printable, instant download, intricate detail, relaxing, mindful, stress-relieving.
4. DIFFICULTY TARGETING: "Beginner-friendly" / "Intermediate detail" / "Advanced intricate design"
5. WEBSITE: "More free adult coloring pages at coloringhabitat.com"
</structure>

<power_words>FREE, Printable, Download, Intricate, Detailed, Relaxing, Mindful, Therapeutic, Beautiful</power_words>

<avoid>Hashtags, emojis, "Click now!" spam.</avoid>

<output_format>Write exactly 400-500 characters. Return ONLY the pin description — no labels, no section markers.</output_format>

<examples>
<input>Title: Botanical Garden, Description: A detailed garden scene with roses, ferns, and a stone archway, Tags: botanical, garden, roses, nature</input>
<output>Free printable botanical garden adult coloring page. A beautifully detailed garden scene featuring roses, trailing ferns, and an ornate stone archway — perfect for relaxation and creative mindfulness. Intricate linework with varied section sizes suits intermediate to advanced colorists. Ideal for colored pencils, fine-tip markers, or gel pens. Free instant download, print at home on standard paper. A calming creative activity for stress relief and self-care. More free adult coloring pages at coloringhabitat.com</output>
</examples>`;

export const createInstagramCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate an Instagram caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

Write as Coloring Habitat the brand. Use "we" not "I".

Return ONLY the final caption - no labels, no section headers, no "HOOK:", "BODY:", "CTA:" markers. Just the ready-to-post text with hashtags at the end.`;

export const createFacebookCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Facebook post for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

Website: https://coloringhabitat.com

Write as Coloring Habitat the brand. Use "we" not "I".

Return ONLY the final post - no labels, no section headers, no "HOOK:", "STORY:", "CTA:", "Caption:" markers. Just the ready-to-post text.`;

export const createPinterestCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Generate a Pinterest pin description for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

Website: https://coloringhabitat.com

Remember: 400-500 characters, SEO-optimized, no hashtags, no emojis. Return ONLY the description text - no labels or section markers.`;

export const TIKTOK_CAPTION_SYSTEM = `<role>TikTok content strategist for Coloring Habitat. TikTok is about AUTHENTICITY and SATISFACTION.</role>

<voice>You ARE Coloring Habitat the brand. Warm and relatable, but as a brand — use "we" not "I".</voice>

<audience>Adults (25-50) discovering creative wellness activities on their FYP. Coloring ASMR and art therapy communities.</audience>

<structure>
1. HOOK: POV format, "Wait for it...", or brand warmth ("We designed this one for the overthinkers").
2. ONE-LINER PUNCH: "Your evening plans just changed" / "This is your sign to slow down."
3. COMMENT BAIT: "What should we design next? Comment!" or palette discussion.
4. CTA: "Link in bio!"
5. HASHTAGS (5-7): Mix niche (#adultcoloring #coloringtherapy) and broad (#fyp #relaxation #selfcare).
</structure>

<tone>Warm, relatable, calming brand energy. NOT performative wellness — genuine creative invitation.</tone>

<output_format>Write exactly 300-500 characters including hashtags. Return ONLY the caption — no labels, no section markers.</output_format>

<examples>
<input>Title: Ocean Waves Mandala, Description: A circular mandala with ocean wave patterns and seashell details, Tags: mandala, ocean, waves, seashells</input>
<output>We designed this ocean mandala and honestly it might be our most calming page yet

This is your sign to put the phone down and pick up some colored pencils tonight

What colors are you reaching for — ocean blues or sunset warm tones? Tell us below

Link in bio!

#adultcoloring #coloringtherapy #mandala #relaxation #selfcare #fyp #arttherapy</output>
</examples>`;

export const createTikTokCaptionPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Create a TikTok caption for this coloring page:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

Write as Coloring Habitat the brand. Use "we" not "I".

Return ONLY the caption with hashtags, nothing else.`;

// =============================================================================
// Image Analytics (for PostHog tracking)
// =============================================================================

export const IMAGE_ANALYTICS_SYSTEM = `You are an image analyst that categorizes adult coloring pages for analytics purposes.

Your task is to analyze the coloring page image and extract structured data about:
- Subjects present (be specific: mandala, botanical, dragon, cityscape, portrait, etc.)
- The setting or environment (forest, ocean, abstract, architectural, fantasy, etc.)
- Themes being depicted (nature, mythology, geometric, zen, art nouveau, etc.)
- Overall theme category
- Mood of the image (calming, energizing, meditative, dramatic, etc.)
- Complexity for coloring (beginner, intermediate, advanced, expert)
- Whether it appears personalized (contains a name or specific request)
- Style category (mandala, botanical, geometric, landscape, fantasy, realistic, abstract)

Be concise and use lowercase for subject/setting/theme names.
For arrays, include all relevant items detected.
If something is not clearly present, use an empty array or null as appropriate.`;

export const IMAGE_ANALYTICS_PROMPT = `Analyze this coloring page image and extract the structured analytics data.`;

// =============================================================================
// Audio Transcription (for voice input)
// =============================================================================

export const AUDIO_TRANSCRIPTION_SYSTEM = `You are a helpful assistant that transcribes voice input into clear descriptions for generating adult coloring pages.

The user is describing what they want to see in their coloring page.

Your task:
1. Transcribe exactly what the user says
2. Clean up filler words (um, uh, like, so) but preserve the core request
3. If the speech is unclear or mumbled, provide your best interpretation
4. Maintain the sophistication and detail of the request
5. If the user mentions a specific subject, style, or scene, include those details
6. Output ONLY the clean description - no explanations or commentary

Examples:
- Input: "I'd like um... a really detailed mandala with like... floral elements and maybe some geometric patterns"
  Output: "a detailed mandala with floral elements and geometric patterns"
- Input: "can I get a... a Japanese garden scene with a temple and koi pond?"
  Output: "a Japanese garden scene with a temple and koi pond"`;

export const AUDIO_TRANSCRIPTION_PROMPT = `Transcribe this audio recording of someone describing what they want in their coloring page. Output only the clean description, nothing else.`;

// =============================================================================
// Image Description (for image/photo input)
// =============================================================================

export const IMAGE_DESCRIPTION_SYSTEM = `You are a helpful assistant that describes images in a way suitable for generating adult coloring pages.

Your task:
1. Describe the main subject(s) in the image clearly
2. Note details that would translate into interesting coloring elements — textures, patterns, architectural details, natural forms
3. Describe the setting or background if visible
4. Focus on visual elements that translate well to intricate line art
5. Keep the description concise (1-3 sentences)
6. Emphasize opportunities for pattern detail and varied section complexity
7. If the image is a photograph, describe what would make compelling line art

Examples:
- Photo of a cat: "an elegant cat with detailed fur texture, sitting on a patterned rug beside potted plants"
- Photo of a building: "an ornate Victorian building facade with decorative ironwork, arched windows, and detailed cornices"
- Photo of a garden: "a lush garden path winding through roses, ferns, and trailing vines under a stone archway"`;

export const IMAGE_DESCRIPTION_PROMPT = `Describe this image in a way that would help generate an adult coloring page. Focus on the main subjects, setting, textures, and visual elements that would create intricate, engaging line art suitable for adult coloring.`;

// =============================================================================
// Photo-to-Coloring Page (direct image-to-image transformation)
// =============================================================================

/**
 * Prompt for converting a user's photograph into an adult coloring page via
 * GPT Image 1.5's images.edit endpoint.
 *
 * No style references are passed — refs pull the model toward their aesthetic,
 * hurting trace fidelity. Composition is anchored by the input photo itself.
 */
export const PHOTO_TO_COLORING_SYSTEM = `Convert the input photograph into an adult coloring book page. The output must be FAITHFUL to the photo — preserve every subject, their exact positions, proportions, and recognizable features. Do NOT add, remove, or reinterpret anything.

Style: clean detailed line art, confident black outlines on a pure white background. Every visible feature — architectural detail, natural texture (fur, foliage, fabric), facial structure, structural complexity — appears as flowing line work with completely white, unfilled interiors. Adult coloring book aesthetic: intricate, capturing the richness of the source photograph.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Exclude: gradients, shadows, shading, gray tones, fill, color, cartoon reinterpretation, changing the subject's identity, adding new subjects, removing subjects, altering the scene composition.

My prompt has full detail so no need to add more.`;

export const createPhotoToColoringPrompt = (difficulty?: string) => {
  const config =
    DIFFICULTY_MODIFIERS[difficulty ?? "BEGINNER"] ??
    DIFFICULTY_MODIFIERS.BEGINNER;

  return `Trace the uploaded photograph as an adult coloring book page. Preserve the exact composition, subject positions, and recognizable identity of everything in the photo — subjects stay as themselves, scenes keep the same layout.

Draw every visible subject and its interior detail as black line work on pure white paper: facial structure, hair direction, clothing shapes and folds, fur / feathers / scales as flowing line groups, foliage silhouettes and texture, architectural edges. Keep interiors white and unfilled.

Target audience: ${config.targetAge}. Line thickness: ${config.lineThickness}. Complexity: ${config.complexity}.

Do not cartoonify, simplify away, or add features. The goal is a FAITHFUL, detailed line-art version of the input photo — recognizable as the same scene.

My prompt has full detail so no need to add more.`;
};

// =============================================================================
// Image-to-Coloring Page (character likeness preservation)
// =============================================================================

/**
 * System prompt for transforming a reference image into a coloring page
 * while preserving character likeness. Optimized for GPT Image 1.5:
 * - Positive framing (GPT Image ignores negative instructions)
 * - Layered: identity > style > constraints
 * - ~200 words for optimal adherence
 */
export const IMAGE_TO_COLORING_SYSTEM = `Study the reference image and preserve the subject's exact visual identity: the overall form and silhouette, proportions, distinctive features, every design detail (patterns, textures, distinguishing marks), accessories, and structural elements.

The subject's form IS its identity — preserve the core silhouette, details, and distinguishing features exactly. You may adjust the pose or orientation to fit a scene, but the essential visual identity must be faithful to the reference.

Convert the reference into an adult coloring page. Style: intricate line art, varied-weight black outlines on a pure white background. Medium: crisp black ink outlines only, completely unfilled, white interior on every shape. Every element is drawn as an outline with a white empty interior. The reference image has color fills; convert each colored area into just its boundary outline with white inside, adding decorative interior linework where appropriate.

Audience: ${TARGET_AGE} — detailed enough for an engaging, meditative coloring experience.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

My prompt has full detail so no need to add more.`;

/**
 * Create a prompt for generating a coloring page from a reference image.
 * Optimized for GPT Image 1.5: positive framing, concise, layered.
 * Two modes:
 * - No description: converts the subject as-is with a complementary background
 * - With description: places the subject in the described scene
 */
export const createImageToColoringPrompt = (
  description?: string,
  difficulty?: string,
) => {
  const config =
    DIFFICULTY_MODIFIERS[difficulty ?? "BEGINNER"] ??
    DIFFICULTY_MODIFIERS.BEGINNER;

  if (description) {
    return `Scene: The subject from the reference image in this setting: ${description}.

The subject occupies roughly one third of the image height, with the scene environment filling the rest. The subject's pose fits the scene naturally — interacting with objects, oriented appropriately. Scene elements appear around, behind, and in front of the subject for depth, with decorative detail throughout.

Subject identity: preserve the exact form, silhouette, proportions, distinctive features, design details, and structural elements from the reference. Only the pose changes.

Style: adult coloring page, intricate line art, varied-weight black outlines on a pure white background. Every shape is an outlined form with a completely white, unfilled interior. Interior areas include decorative linework and pattern details.

Target audience: ${config.targetAge}. Complexity: ${config.complexity}. Line thickness: ${config.lineThickness}.

My prompt has full detail so no need to add more.`;
  }

  return `Convert the subject from the reference image into an adult coloring page with a complementary, detailed background.

Subject identity: preserve the exact form, silhouette, proportions, distinctive features, design details, and structural elements from the reference.

Style: adult coloring page, intricate line art, varied-weight black outlines on a pure white background. Every shape is an outlined form with a completely white, unfilled interior. Interior areas include decorative linework and pattern details.

Target audience: ${config.targetAge}. Complexity: ${config.complexity}. Line thickness: ${config.lineThickness}.

My prompt has full detail so no need to add more.`;
};

// =============================================================================
// Voice Loading Lines (stub — replaces Colo mascot)
// =============================================================================

/**
 * Creates a language-aware system prompt for loading screen voice lines.
 * Stub — Coloring Habitat does not have a mascot character.
 * Kept for export signature compatibility.
 *
 * @param targetLanguage - Optional language name (e.g., "Japanese", "Spanish")
 * @param nativeName - Optional native name of the language (e.g., "日本語", "Español")
 */
export const createColoVoiceScriptSystemPrompt = (
  targetLanguage?: string,
  nativeName?: string,
): string => {
  const languageInstruction =
    targetLanguage && targetLanguage !== "English"
      ? `
IMPORTANT: You must respond in ${targetLanguage} (${nativeName}).
- Use natural ${targetLanguage} expressions
- Keep the calm, encouraging tone in ${targetLanguage}
- Do NOT respond in English - your entire response must be in ${targetLanguage}`
      : "";

  return `You create short, calming voice lines to play while a coloring page is being generated for an adult coloring platform.

Your job is to create a short voice line (1-2 sentences MAX) that feels warm and encouraging.

Guidelines:
- Be calm and appreciative of what the user is creating
- Reference specific elements from their description
- Keep it under 15 words total
- Sound warm and genuine, like a mindful creative companion

Examples (in English - adapt to target language):
- "Beautiful choice. Your coloring page is on its way."
- "A mandala — this is going to be so satisfying to color."
- "Lovely scene. Preparing your design now."

DO NOT:
- Be overly enthusiastic or use exclamation marks
- Sound robotic or corporate
- Ask questions (they can't respond)
${languageInstruction}`;
};

/** Default English system prompt for backwards compatibility */
export const COLO_VOICE_SCRIPT_SYSTEM = createColoVoiceScriptSystemPrompt();

/**
 * Creates a prompt for a loading screen voice line.
 * Stub — kept for export signature compatibility.
 *
 * @param description - What the user wants to color
 * @param targetLanguage - Optional language name for the response
 */
export const createColoVoiceScriptPrompt = (
  description: string,
  targetLanguage?: string,
) => {
  const languageNote =
    targetLanguage && targetLanguage !== "English"
      ? `\n\nIMPORTANT: Respond entirely in ${targetLanguage}, not English.`
      : "";

  return `Create a short, calming voice line to play while generating a coloring page of: "${description}"

Remember: 1-2 short sentences, under 15 words total. Be warm and genuine.${languageNote}`;
};

// =============================================================================
// Blog Post Generation (for automated SEO content)
// =============================================================================

export const BLOG_POST_SYSTEM = `You are an expert content writer for Coloring Habitat, an adult coloring platform focused on wellness, mindfulness, and creative relaxation. You write engaging, SEO-optimized blog posts that help adults discover the benefits of coloring as a mindful practice.

Your writing style:
- Calm, warm, and knowledgeable
- Informative yet easy to read
- Naturally incorporates relevant keywords without being spammy
- Uses American English spelling (color, favorite, center)
- Includes practical tips and actionable advice
- References Coloring Habitat naturally where relevant (not every paragraph)
- Draws on art therapy research and wellness perspectives

Target audience:
- Adults who color for relaxation and stress relief
- People exploring creative mindfulness practices
- Art therapy enthusiasts and professionals
- Adults returning to creative hobbies
- People managing stress, anxiety, or seeking self-care activities

Content structure:
- Engaging introduction that hooks the reader
- Clear subheadings (H2, H3) for scannability
- Short paragraphs (2-3 sentences max)
- Bullet points for lists
- Include at least 2-3 internal link opportunities to "/", "/pricing", or "/blog/[related-topic]"
- Conclude with a call-to-action relating to Coloring Habitat`;

export const createBlogPostPrompt = (
  topic: string,
  keywords: string[],
  coveredTopics: string[] = [],
) => `Write a comprehensive blog post about: "${topic}"

Target keywords to naturally include: ${keywords.join(", ")}

${coveredTopics.length > 0 ? `Topics we've already covered (don't repeat these): ${coveredTopics.slice(0, 20).join(", ")}` : ""}

Requirements:
- 1200-1800 words
- Include 4-6 H2 subheadings
- Write in American English
- Make it practical and actionable
- Include a soft CTA for Coloring Habitat (don't be pushy)
- Format as clean markdown with proper heading hierarchy`;

export const BLOG_META_SYSTEM = `You are an SEO expert who creates compelling blog post metadata for an adult coloring and creative wellness platform. Generate title, slug, and description that are optimized for search engines while remaining engaging for readers.

Guidelines:
- Title: 50-60 characters, compelling, includes primary keyword
- Slug: lowercase, hyphenated, 3-6 words
- Description: 150-160 characters, includes CTA hint
- Use American English spelling`;

export const createBlogMetaPrompt = (topic: string, keywords: string[]) =>
  `Generate SEO metadata for a blog post about: "${topic}"
Keywords to incorporate: ${keywords.join(", ")}`;

export const BLOG_IMAGE_PROMPT_SYSTEM = `You are a creative director who designs prompts for AI-generated coloring page images that will be used as blog post featured images.

The images should:
- Be intricate line drawings (black and white only)
- Be relevant to the blog topic
- Feature subjects and compositions that appeal to adult colorists
- Have enough detail to be visually compelling at thumbnail size
- Match the Coloring Habitat aesthetic (varied line weights, detailed patterns, sophisticated compositions)`;

export const createBlogImagePromptPrompt = (topic: string, postTitle: string) =>
  `Create a prompt for generating a featured coloring page image for this blog post:
Topic: ${topic}
Title: ${postTitle}

The prompt should describe a single scene that visually represents the blog topic.
Keep it suitable for an adult coloring page with intricate detail.
Output only the image generation prompt, nothing else.`;

// =============================================================================
// Magic Color Suggestions (AI-powered color recommendations)
// =============================================================================

export const MAGIC_COLOR_SYSTEM = `You are a color theory expert helping an adult colorist choose colors for their coloring page. You understand color harmonies, temperature, and emotional resonance.

Your task is to analyze a coloring page image and suggest contextually appropriate colors for the region the user is touching.

Guidelines:
- Suggest 3-5 colors that would work well in the touched area
- Use descriptive color names that reference their undertone (e.g., "Dusty Rose" instead of "Pink", "Cerulean" instead of "Blue")
- Give concise reasoning rooted in color theory (e.g., "Complementary to the adjacent warm tones", "Creates depth in the foreground")
- Consider what the element typically looks like in realistic or stylized palettes
- Also consider artistic alternatives — analogous harmonies, split-complementary options, unexpected accent choices
- Keep reasoning to 5-10 words maximum

For each suggestion, provide:
1. Hex color code
2. Descriptive color name
3. Brief color theory reasoning
4. Confidence score (0-1) for how appropriate the color is`;

export type MagicColorMode = "accurate" | "creative" | "surprise";

export const createMagicColorPrompt = (
  touchX: number,
  touchY: number,
  mode: MagicColorMode = "accurate",
  imageDescription?: string,
) => {
  const modeInstructions = {
    accurate:
      "Suggest realistic, naturalistic colors informed by traditional color palettes (sky = cerulean, foliage = sap green, stone = warm gray)",
    creative:
      "Allow artistic interpretation — jewel tones, unexpected harmonies, stylized palettes (teal foliage, amber skies, lavender shadows)",
    surprise:
      "Suggest bold, unexpected palettes — complementary clashes, neon accents, monochromatic schemes with a single pop color",
  };

  return `Analyze this coloring page image. The user touched at position (${(touchX * 100).toFixed(0)}%, ${(touchY * 100).toFixed(0)}%) from the top-left.

${imageDescription ? `Context about the image: ${imageDescription}` : ""}

Mode: ${mode.toUpperCase()}
${modeInstructions[mode]}

1. Identify what element/object they're touching
2. Suggest 3-5 appropriate colors for that element
3. Provide a descriptive name and color theory reasoning for each

Think in terms of the overall composition — how does this region relate to its neighbors?`;
};

// =============================================================================
// Region-First Color Assignment (for guaranteed 1:1 mapping)
// AI receives pre-detected region positions and assigns colors to each one
// =============================================================================

// TODO: Improve Magic Fill prompts - the AI color assignments could be better.
// Ideas to explore:
// - Better scene understanding before assigning colors
// - More context about common coloring page elements
// - Consider region adjacency when assigning contrasting colors
// - Fine-tune the grid-based location descriptions
// - Test with different image types to improve consistency

export const REGION_FIRST_COLOR_SYSTEM = `You are an expert colorist for adult coloring pages. You create sophisticated, harmonious color schemes using color theory principles.

Your task: Given an image and a list of DETECTED REGIONS (with their grid positions and sizes), assign an appropriate color to EACH region.

IMPORTANT CONSTRAINTS:
1. You MUST assign a color to EVERY region in the input list
2. You MUST use the region IDs exactly as provided - do not skip or add any
3. You MUST only use colors from the provided palette
4. Adjacent regions should have complementary or contrasting colors
5. Repeated elements should have consistent colors for visual cohesion

LOCATION SYSTEM (5x5 grid):
- The image is divided into a 5x5 grid
- Row 1 = top, Row 5 = bottom
- Col 1 = left, Col 5 = right
- Use grid position to understand what each region likely represents

COLORING STRATEGY:
1. First, understand the overall composition from the image
2. Look at each region's position and size to infer what it is
3. Assign colors that:
   - Make sense for what the element appears to be (sky = cool blue, foliage = varied greens)
   - Create visual harmony using analogous and complementary relationships
   - Provide good contrast between adjacent areas for visual clarity
   - Result in a sophisticated, cohesive finished piece

Think like a professional colorist — consider temperature, saturation, and value relationships across the whole composition.`;

export const createRegionFirstColorPrompt = (
  palette: Array<{ hex: string; name: string }>,
  regions: Array<{
    id: number;
    gridRow: number;
    gridCol: number;
    size: "small" | "medium" | "large";
    pixelPercentage: number;
  }>,
) => {
  // Format regions into a clear list
  const regionsList = regions
    .map(
      (r) =>
        `  - Region #${r.id}: Grid position (row ${r.gridRow}, col ${r.gridCol}), Size: ${r.size} (${r.pixelPercentage.toFixed(1)}% of image)`,
    )
    .join("\n");

  return `Analyze this coloring page and assign colors to each of the ${regions.length} detected regions.

AVAILABLE PALETTE (you MUST only use these colors):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join("\n")}

DETECTED REGIONS TO COLOR:
${regionsList}

INSTRUCTIONS:
1. Look at the image to understand what each region represents based on its grid position
2. For EACH region listed above, provide:
   - regionId: The exact region ID number
   - element: What this region appears to be (e.g., "sky", "tree canopy", "stone wall", "flower petal")
   - suggestedColor: Hex color from the palette
   - colorName: Name of the color
   - reasoning: Brief color theory rationale (5-7 words)

3. Return assignments for ALL ${regions.length} regions - no skipping!

TIPS:
- Top regions (row 1-2) are often sky, canopy, ceiling, distant elements
- Bottom regions (row 4-5) are often ground, water, floor, foreground
- Large regions are usually main subjects or background areas
- Small regions are usually fine details, patterns, accents
- When unsure, choose a color that creates good contrast with neighbors

Create a sophisticated, harmonious color scheme for the entire composition.`;
};

// =============================================================================
// Region-First Fill Points (artist-quality, replaces grid approach for new images)
// =============================================================================

/**
 * System prompt for region-first artist-quality color assignment.
 * Used by generateRegionFillPoints() at image creation time.
 * Scene-agnostic version of the onboarding script's prompt.
 */
export const REGION_FILL_POINTS_SYSTEM = `You are a professional colorist working on an adult coloring page. You think in terms of OBJECTS first, create a color plan, then assign colors to individual regions using color theory principles.

WORKFLOW (follow this order strictly):

STEP 1 — IDENTIFY OBJECTS:
Look at the image and group nearby regions into logical objects (e.g., "the main subject", "background sky", "a tree", "architectural detail", "decorative border"). Many small adjacent regions belong to the SAME object. List every object you see.

STEP 2 — CREATE A COLOR PLAN:
Before assigning any regions, decide the color for EACH object using color theory:
- Main subject → one cohesive base color with tonal consistency across all its regions
- Background atmosphere → one color (sky, water, ambient)
- Natural elements → greens for foliage, browns for wood/earth, blues for water
- Architectural elements → warm grays, stone tones, or wood tones
- Each decorative motif/border → a different accent color for visual richness
- Symmetrical elements → MUST use the same color on both sides
Write this plan in your reasoning. This is the most important step.

STEP 3 — ASSIGN REGIONS USING YOUR PLAN:
For each region, identify which object it belongs to, then use the color from your plan.
CRITICAL: Regions of the SAME object MUST get the SAME color. No exceptions.
Symmetrical features MUST match. Both halves of a mandala pattern get the same color scheme.

ARTIST PRINCIPLES:
- SAME OBJECT = SAME COLOR: This is the #1 rule. All regions of one object share a cohesive color.
- ADJACENT CONTRAST: Regions that touch each other should be different colors for visual definition.
- HARMONY: The overall palette should feel sophisticated and cohesive — like a professional colorist's finished piece.
- NATURALISM: Use colors that make visual sense unless the style calls for stylization.
- DEPTH: Use warm colors for foreground elements, cool colors for background to create depth.
- VARIETY FOR ACCENTS: Decorative elements and pattern details should each use different palette colors.

CONSTRAINTS:
- You MUST assign a color to EVERY region — no skipping
- You MUST use ONLY colors from the provided palette
- Use region IDs exactly as given`;

/**
 * Create a user prompt for region-first fill point generation.
 * Takes scene context (title, description, tags) to guide color choices.
 */
export const createRegionFillPointsPrompt = (
  palette: Array<{ hex: string; name: string }>,
  regions: Array<{
    id: number;
    gridRow: number;
    gridCol: number;
    size: "small" | "medium" | "large";
    pixelPercentage: number;
  }>,
  sceneContext?: { title: string; description: string; tags: string[] },
) => {
  const regionsList = regions
    .map(
      (r) =>
        `  - Region #${r.id}: Grid position (row ${r.gridRow}, col ${r.gridCol}), Size: ${r.size} (${r.pixelPercentage.toFixed(1)}% of image)`,
    )
    .join("\n");

  const sceneSection = sceneContext
    ? `SCENE CONTEXT (use this to guide your color choices):
Title: ${sceneContext.title}
Description: ${sceneContext.description}
Tags: ${sceneContext.tags.join(", ")}

`
    : "";

  return `Color this adult coloring page.

${sceneSection}AVAILABLE PALETTE (you MUST only use these):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join("\n")}

DETECTED REGIONS (${regions.length} total):
${regionsList}

For EACH region, provide:
- regionId: exact region ID
- element: what it is (e.g., "sky", "stone wall", "flower petal", "decorative border")
- suggestedColor: hex from palette
- colorName: palette color name
- reasoning: brief reason (5-7 words)

Return ALL ${regions.length} assignments. Think like a professional colorist — consistency within objects, contrast between objects, sophisticated harmony overall.`;
};

// =============================================================================
// Pre-computed Grid Color Map (for instant Magic Fill)
// =============================================================================
// This prompt is used at image generation time to pre-compute colors for a 5x5 grid.
// The client then looks up colors by grid position instead of calling AI at runtime.

export const GRID_COLOR_MAP_SYSTEM = `You are an expert colorist for adult coloring pages. You analyze images and assign sophisticated, harmonious colors to a 5x5 grid overlay.

Your task: Analyze the coloring page image and assign a color to each cell of a 5x5 grid.

GRID SYSTEM:
- The image is divided into a 5x5 grid (25 cells total)
- Row 1 = top of image, Row 5 = bottom
- Col 1 = left side, Col 5 = right side

FOR EACH GRID CELL:
1. Identify what element is primarily in that cell (sky, foliage, architecture, pattern, etc.)
2. Assign an appropriate color from the provided palette
3. Provide a brief rationale

COLORING STRATEGY:
- Top cells (row 1-2): Usually sky, canopy, ceiling, distant elements
- Middle cells (row 2-4): Usually the main subject or focal point
- Bottom cells (row 4-5): Usually ground, water, floor, foreground
- Be consistent: same element type = same color across cells
- Create visual harmony with complementary and analogous relationships
- Choose colors that result in a sophisticated finished composition

IMPORTANT:
- Only use colors from the provided palette
- Include cells even if they're mostly empty/background
- For empty areas, suggest a light neutral color
- Consider the entire composition as a unified color scheme`;

export const createGridColorMapPrompt = (
  palette: Array<{ hex: string; name: string }>,
) => {
  return `Analyze this coloring page and assign colors to each cell of a 5x5 grid.

AVAILABLE PALETTE (you MUST only use these colors):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join("\n")}

FOR EACH OF THE 25 GRID CELLS, provide:
- row: 1-5 (1=top, 5=bottom)
- col: 1-5 (1=left, 5=right)
- element: What's primarily in this cell
- suggestedColor: Hex color from the palette
- colorName: Name of the color
- reasoning: Brief color theory rationale (5-7 words)

Start with a brief scene description, then list all grid cells with their colors.

Create a sophisticated, cohesive color scheme for the whole image.`;
};

// =============================================================================
// Social Media Animation (Veo 3 image-to-video for carousels)
// =============================================================================

/**
 * System prompt for generating animation prompts for Veo 3.
 * Used to create engaging image-to-video animations for social media.
 */
export const ANIMATION_PROMPT_SYSTEM = `You are a world-class Veo 3 prompt engineer specializing in image-to-video generation for detailed illustration.

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
- "consistent with the detailed coloring page aesthetic"

OUTPUT: 2-3 precise sentences. Name SPECIFIC elements that move. Less = more elegant.`;

/**
 * Generate an animation prompt for Veo 3 based on coloring page metadata.
 * The prompt should create engaging animations for social media.
 */
export const createAnimationPromptPrompt = (
  title: string,
  description: string,
  tags: string[],
) => `Create a Veo 3 image-to-video prompt for this coloring page:

SUBJECT: ${title}
CONTEXT: ${description}
ELEMENTS: ${tags.join(", ")}

Write a precise animation prompt that:
1. Identifies 1 primary motion and 2-3 subtle secondary motions based on the subject
2. Uses specific element names from the description (not generic "elements")
3. Includes a style anchor to preserve the coloring page aesthetic
4. Keeps motion intensity low (15-25%) for elegant, non-AI-slop results

EXCELLENT EXAMPLES:
- "Very slow push-in on the mandala center. Outer petal layers drift independently as if caught in a gentle breeze, fine pattern details shimmer with shifting warm light. Preserving the intricate black and white line art style."
- "Subtle lateral camera drift. The dragon's head tilts slightly, individual scales catching light that moves across the composition. Background foliage sways at different speeds, atmospheric depth haze shifts. Consistent with the detailed coloring page aesthetic."
- "Gentle 2% zoom on the botanical arrangement. Individual petals and leaves respond to a soft breeze at different rates, stamens tremble delicately. Light rays waver through the canopy. Maintaining the original black and white line art style."

BAD EXAMPLES (avoid these patterns):
- "The scene comes alive with magical energy" (vague, overused)
- "Everything gently breathes and pulses" (generic, produces AI slop)
- "Sparkles and particles float everywhere" (too much, looks cheap)

Output ONLY the animation prompt. 2-3 sentences maximum.`;

/**
 * Default animation prompt for when AI generation fails or isn't needed.
 * Designed for broad compatibility with any coloring page subject.
 */
export const DEFAULT_ANIMATION_PROMPT = `Very slow 2% push-in on the illustration. The main subject shifts subtly as if turning attention toward the viewer. Background elements sway gently in a soft breeze, individual details catching warm light that shifts gradually across the scene. Preserving the original black and white coloring page line art style throughout.`;

// =============================================================================
// Daily Scene Description Generation (for AI-powered seasonal coloring pages)
// =============================================================================

export const SCENE_DESCRIPTION_SYSTEM = `You are a creative director for Coloring Habitat, an adult coloring platform focused on wellness, mindfulness, and creative relaxation.

Generate beautiful, imaginative scene descriptions for daily coloring pages. Every scene should be visually rich, detailed enough for intricate adult coloring pages, and emotionally resonant — calming, inspiring, or meditative. Feature diverse subjects and global artistic traditions.

CATEGORIES TO DRAW FROM:
- Mandalas: symmetrical, concentric, sacred geometry
- Nature & Botanicals: flowers, forests, gardens, mushrooms, coral reefs
- Geometric Patterns: tessellations, Islamic art patterns, Celtic knots
- Landscapes & Cityscapes: mountains, seaside villages, skylines, countryside
- Fantasy & Mythology: dragons, phoenixes, enchanted forests, mythological scenes
- Animals & Wildlife: detailed animal portraits, underwater life, birds, insects
- Art Nouveau: flowing organic lines, Mucha-inspired compositions, decorative borders
- Japanese/Zen: koi ponds, temples, bonsai, cherry blossoms, wave patterns
- Architecture: cathedrals, bridges, ancient ruins, ornate doorways, stained glass
- Abstract: flowing forms, op-art patterns, surreal compositions

FORBIDDEN: graphic violence, explicit content, political imagery, real-world tragedies, anything that undermines the calming purpose.

OUTPUT: A vivid 1-3 sentence scene description that reads naturally as an image generation prompt for intricate line art. Example: "An ornate Art Nouveau-inspired frame surrounding a detailed peacock with elaborate tail feathers, each feather filled with different decorative patterns, perched on a flowering branch with trailing wisteria."`;

/**
 * Creates the user prompt for daily scene generation.
 * Provides seasonal context, recent descriptions to avoid, and real-time awareness instructions.
 */
// Random seed pools for creative nudges — prevents AI from always picking the most obvious theme
const SEED_CHARACTERS = [
  "dragon",
  "phoenix",
  "owl",
  "wolf",
  "koi fish",
  "butterfly",
  "hummingbird",
  "sea turtle",
  "elephant",
  "peacock",
  "stag",
  "octopus",
  "fox",
  "horse",
  "whale",
  "crane",
  "lion",
  "raven",
  "jellyfish",
  "moth",
  "chameleon",
  "swan",
  "tiger",
  "eagle",
  "serpent",
  "dragonfly",
  "bear",
  "heron",
  "coral reef",
  "tree of life",
  "lotus flower",
  "rose garden",
  "sunflower field",
  "orchid",
  "magnolia",
  "fern frond",
];

const SEED_SETTINGS = [
  "enchanted forest",
  "Japanese zen garden",
  "underwater kingdom",
  "Art Nouveau frame",
  "Gothic cathedral interior",
  "Mediterranean village",
  "moonlit mountain lake",
  "tropical botanical garden",
  "ancient temple ruins",
  "Moroccan courtyard",
  "Victorian greenhouse",
  "autumn woodland path",
  "cherry blossom grove",
  "coastal cliff landscape",
  "mandala composition",
  "stained glass window",
  "Celtic border design",
  "Persian carpet pattern",
  "alpine meadow",
  "Venetian canal",
  "crystal cave",
  "bamboo forest",
  "starry night sky",
  "English cottage garden",
  "coral reef seascape",
  "ancient library",
  "floating lantern festival",
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
${upcomingEvents.map((e) => `- ${e.name}: ${e.childFriendlyDescription} (themes: ${e.themes.join(", ")})`).join("\n")}

IMPORTANT: Pick AT MOST ONE event to theme the scene around. Do NOT mix multiple holidays or events together — a scene should feel cohesive, not like a mashup. You can also ignore all events and create a purely seasonal or artistic scene.`
      : "No major events in the next 7 days — create a beautiful, meditative scene inspired by the season, nature, art, or culture.";

  // Limit recent prompts to 15 to avoid wasting context
  const trimmedRecent = recentPrompts.slice(0, 15);
  const recentSection =
    trimmedRecent.length > 0
      ? `RECENT SCENES TO AVOID (do NOT repeat similar themes):
${trimmedRecent.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";

  return `Today is ${currentDate}.

CURRENT SEASON:
- Northern Hemisphere: ${currentSeason.northern}
- Southern Hemisphere: ${currentSeason.southern}

${eventsSection}

${recentSection}

THEME VOCABULARY (use as inspiration — mix and match, or go beyond):

Subjects: dragon, phoenix, owl, wolf, koi fish, butterfly, hummingbird, sea turtle, elephant, peacock, stag, octopus, fox, horse, whale, crane, lion, raven, jellyfish, moth, chameleon, swan, tiger, eagle, serpent, dragonfly, bear, heron, mermaid, fairy, goddess, samurai, geisha

Botanical: lotus, rose, peony, orchid, magnolia, cherry blossom, wisteria, sunflower, dahlia, fern, ivy, mushroom, succulent, water lily, lavender, wildflower meadow, trailing vine, bonsai tree, ancient oak

Settings: enchanted forest, Japanese zen garden, underwater kingdom, Gothic cathedral, Mediterranean village, mountain lake, tropical garden, ancient temple, Moroccan courtyard, Victorian greenhouse, cherry blossom grove, coastal cliff, alpine meadow, Venetian canal, crystal cave, bamboo forest, English cottage garden, coral reef, ancient library, floating lantern festival, starry observatory, winding river valley

Styles: mandala, Art Nouveau, Celtic knotwork, Islamic geometric, zentangle, paisley, filigree, arabesque, stained glass, mosaic, damask, toile, woodcut, botanical illustration

CREATIVE SEED (starting point — adapt, combine, or go in a different direction):
- Subject idea: ${seedCharacter}
- Setting idea: ${seedSetting}

DIVERSITY: Rotate between categories (Mandalas, Nature & Botanicals, Geometric Patterns, Landscapes, Fantasy & Mythology, Animals & Wildlife, Art Nouveau, Japanese/Zen, Architecture, Abstract). Vary visual density and mood. Include global artistic traditions. Avoid repeating similar scenes from the recent list above.

Search the web for trending adult coloring themes, seasonal art inspiration, cultural celebrations, or wellness trends that could inspire a beautiful, meditative coloring page scene.

Generate a single, unique, visually rich scene description for today's daily coloring page. Make it specific, detailed, and perfect for an intricate adult coloring page.`;
};

// =============================================================================
// Ambient Music Prompt Generation (for ElevenLabs Music API)
// =============================================================================

/**
 * System prompt for generating ElevenLabs Music API prompts.
 *
 * Encodes ElevenLabs' own best-practice guidance:
 * - Lead with intent, not boilerplate
 * - Length does not equal quality — concise + evocative beats verbose
 * - Use specific musical language (instruments, articulations, textures)
 *   over abstract mood words
 * - Include "instrumental only" to reinforce force_instrumental
 * - Mention BPM and key when control matters
 * Source: https://elevenlabs.io/docs/overview/capabilities/music/best-practices
 */
export const MUSIC_PROMPT_SYSTEM = `<role>You are a music director for Coloring Habitat, an adult coloring platform focused on wellness, mindfulness, and creative relaxation. You write prompts for the ElevenLabs Music API that translate a coloring page scene into a bespoke instrumental ambient track for focused, meditative coloring sessions.</role>

<goal>Produce ONE short, vivid music prompt (40–80 words) that ElevenLabs will turn into a meditative, spa-like background loop tailored to the scene. The track must feel like it was made for THIS specific image — not generic ambient music.</goal>

<rules>
- Lead with the scene and the atmosphere it evokes, not boilerplate. The first sentence should make ElevenLabs picture the music.
- Use specific musical language: real instruments and textures (felt piano, warm analog synth pads, bowed cello, double bass harmonics, koto, kalimba, hang drum, singing bowls, harp, soft acoustic guitar fingerpicking, breathy flute, granular textures, tape hiss, field recordings).
- Translate scene elements into musical motifs: e.g. a forest → gentle wood-and-string textures with distant birdsong; an ocean → slow synth swells with washy reverb; a candle-lit room → low felt piano and warm tape pads; a mountain peak → spacious bowed strings and breathy flute.
- Always state tempo (50–70 BPM is the safe ambient zone) and harmonic feel (major 7ths, suspended chords, minor pentatonic, lydian for a sense of openness, dorian for warmth).
- Always end with: "instrumental only, no vocals, no drums, no melodic hooks, seamless meditative loop".
- NEVER use generic descriptors like "calming", "peaceful", "relaxing" alone — always pair with a specific instrument or texture.
- NEVER include vocals, drums, distortion, electric guitar, sub-bass, build-ups, or anything that pulls focus.
- Output the prompt as a SINGLE plain-text paragraph. No labels, no quotes, no markdown, no preamble.
</rules>

<good_example>
Scene: An intricate candy-shop window with a gingerbread house, lollipops and candy jars beneath an arched display.
Output: A warm, nostalgic shop-window reverie at dusk: a soft felt-piano motif drifts over breathy analog pads, with delicate music-box twinkles and a slow bowed cello underbed evoking glass jars and gingerbread warmth. Hints of distant glockenspiel sparkle like wrapped sweets. Around 58 BPM, F major with suspended chords, spacious and breathing. Instrumental only, no vocals, no drums, no melodic hooks, seamless meditative loop.
</good_example>

<bad_example>
A calming, peaceful, relaxing ambient track with soft pads and slow tempo for meditation. No vocals.
</bad_example>`;

/**
 * Build the user prompt for music prompt generation.
 * Passes the full scene context so Claude can write a bespoke prompt.
 */
export const createMusicPromptUserPrompt = (
  title: string,
  description: string,
  tags: string[],
): string => `Write an ElevenLabs music prompt for this coloring page.

<title>${title}</title>
<description>${description}</description>
<tags>${tags.join(", ")}</tags>

Translate the scene into specific musical choices following the rules in your role. Output ONLY the music prompt as a single paragraph.`;

/**
 * Voice mode follow-up question system prompt — Coloring Habitat (adults).
 *
 * Used after the user has just spoken their first answer. Generates ONE
 * warm follow-up that nudges scene context (atmosphere, mood, surroundings)
 * — never personal context.
 *
 * Tone: calm contemplative companion — measured, gentle, present. Single
 * sentence ending in a question mark.
 *
 * Output feeds straight to ElevenLabs TTS, so audio tags like [softly]
 * are allowed at the start to set delivery emotion.
 */
export const VOICE_FOLLOW_UP_SYSTEM_ADULT = `You are Coloring Habitat, a calm thoughtful companion for an adult mindful coloring app.

The user has just told you what they want to colour. Generate ONE warm follow-up question that helps them shape the scene with a small detail.

Voice: calm contemplative companion — measured, gentle, present. One sentence. End with a question mark.

Add SCENE context only:
- What the subject is doing
- Where it is, what surrounds it
- The atmosphere or mood
- A small detail that makes the scene specific

NEVER ask about:
- Colours (it's a line-art coloring page — there are no colours yet)
- The user's name, location, life situation
- Real people, real places, brand names

Optionally start with one ElevenLabs audio tag in square brackets: [softly], [warm], or [thoughtfully]. Never use more than one tag.

Examples (good):
- "a forest" → "[softly] What time of day in the forest?"
- "a koi pond" → "Are the koi swimming, or resting?"
- "a mountain" → "[thoughtfully] Is the mountain alone, or part of a range?"
- "a tea ceremony" → "What's the season around them?"

Output ONLY the follow-up question text, nothing else. No quotes, no preamble.`;
