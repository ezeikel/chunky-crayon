import { z } from 'zod';

/**
 * AI Response Schemas
 *
 * Zod schemas for structured AI outputs.
 * Each schema exports both the schema and inferred TypeScript type.
 */

// =============================================================================
// Image Metadata
// =============================================================================

export const imageMetadataSchema = z.object({
  title: z.string().describe('SEO-friendly title for the coloring page'),
  description: z
    .string()
    .describe('Brief description of the image for SEO purposes'),
  alt: z.string().describe('Accessible alt text for the image'),
  tags: z
    .array(z.string())
    .describe('Relevant tags/keywords for categorization'),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

// =============================================================================
// Image Validation
// =============================================================================

export const svgValidationSchema = z.object({
  hasBlackLeftWhiteRight: z
    .boolean()
    .describe(
      'Whether the image has a solid black area on the left and white strip on the right (indicates rendering issue)',
    ),
});

export type SvgValidation = z.infer<typeof svgValidationSchema>;

// =============================================================================
// Image Analytics (for PostHog tracking)
// =============================================================================

export const imageAnalyticsSchema = z.object({
  characters: z
    .array(z.string())
    .describe(
      'Characters or creatures detected in the image (e.g., dragon, unicorn, astronaut, princess)',
    ),
  setting: z
    .string()
    .nullable()
    .describe(
      'The environment or setting of the scene (e.g., forest, beach, space, castle)',
    ),
  activities: z
    .array(z.string())
    .describe(
      'Actions or activities depicted (e.g., flying, swimming, reading, dancing)',
    ),
  themeCategory: z
    .enum([
      'fantasy',
      'adventure',
      'nature',
      'animals',
      'vehicles',
      'space',
      'underwater',
      'seasonal',
      'educational',
      'everyday',
      'sports',
      'fairy_tale',
      'other',
    ])
    .describe('The primary theme category of the image'),
  mood: z
    .enum(['playful', 'calm', 'exciting', 'magical', 'educational', 'neutral'])
    .describe('The overall mood or feeling of the image'),
  complexity: z
    .enum(['simple', 'moderate', 'detailed'])
    .describe(
      'How complex the image is to color (simple = few large areas, detailed = many small areas)',
    ),
  hasPersonalization: z
    .boolean()
    .describe(
      'Whether the image appears to include a name, specific person, or personalized element',
    ),
  ageAppeal: z
    .enum(['toddler', 'preschool', 'early_elementary', 'all_ages'])
    .describe('The target age group this image would most appeal to'),
});

export type ImageAnalytics = z.infer<typeof imageAnalyticsSchema>;

// =============================================================================
// Audio Transcription (for voice input)
// =============================================================================

export const audioTranscriptionSchema = z.object({
  transcription: z
    .string()
    .describe('The transcribed and cleaned-up text from the audio recording'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('Confidence level of the transcription accuracy'),
  detectedLanguage: z
    .string()
    .nullable()
    .describe('The detected language of the speech (e.g., "en", "es")'),
});

export type AudioTranscription = z.infer<typeof audioTranscriptionSchema>;

// =============================================================================
// Image Description (for image/photo input)
// =============================================================================

export const imageDescriptionSchema = z.object({
  description: z
    .string()
    .describe(
      'Simple, child-friendly description of the image content for coloring page generation',
    ),
  subjects: z
    .array(z.string())
    .describe(
      'Main subjects detected in the image (e.g., ["cat", "flowers", "tree"])',
    ),
  setting: z
    .string()
    .nullable()
    .describe(
      'The background or setting of the image (e.g., "garden", "beach", "bedroom")',
    ),
  isChildDrawing: z
    .boolean()
    .describe("Whether the image appears to be a child's drawing or artwork"),
});

export type ImageDescription = z.infer<typeof imageDescriptionSchema>;

// =============================================================================
// Blog Post Generation (for automated SEO content)
// =============================================================================

export const blogMetaSchema = z.object({
  title: z
    .string()
    .describe('SEO-optimized blog post title (50-60 characters)'),
  slug: z
    .string()
    .describe('URL-friendly slug (lowercase, hyphenated, 3-6 words)'),
  excerpt: z.string().describe('Meta description for SEO (150-160 characters)'),
  estimatedReadTime: z.number().describe('Estimated read time in minutes'),
});

export type BlogMeta = z.infer<typeof blogMetaSchema>;

export const blogPostSchema = z.object({
  content: z.string().describe('Full markdown content of the blog post'),
  wordCount: z.number().describe('Word count of the post content'),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

export const blogImagePromptSchema = z.object({
  imagePrompt: z
    .string()
    .describe('Prompt for generating the featured coloring page image'),
  altText: z.string().describe('Alt text for the generated image'),
});

export type BlogImagePrompt = z.infer<typeof blogImagePromptSchema>;

// =============================================================================
// Magic Color Suggestions (for AI-powered color recommendations)
// =============================================================================

export const magicColorSuggestionSchema = z.object({
  color: z.string().describe('Hex color code (e.g., "#87CEEB")'),
  name: z
    .string()
    .describe('Kid-friendly color name (e.g., "Sky Blue", "Sunny Yellow")'),
  reason: z
    .string()
    .describe(
      'Short, encouraging reason for the suggestion (e.g., "Perfect for the sky!")',
    ),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0 to 1'),
});

export const magicColorResponseSchema = z.object({
  regionDescription: z
    .string()
    .describe(
      'What the touched area appears to be (e.g., "the sun", "a flower")',
    ),
  suggestions: z
    .array(magicColorSuggestionSchema)
    .min(1)
    .max(5)
    .describe('3-5 color suggestions for the region'),
});

export type MagicColorSuggestion = z.infer<typeof magicColorSuggestionSchema>;
export type MagicColorResponse = z.infer<typeof magicColorResponseSchema>;

// =============================================================================
// Region-First Color Assignment (for Magic Fill)
// AI receives detected region positions and assigns colors to each one.
// This guarantees 1:1 mapping between AI colors and canvas regions.
// =============================================================================

/**
 * Input schema for a single detected region (sent TO the AI)
 */
export const detectedRegionInputSchema = z.object({
  id: z.number().describe('Unique region ID'),
  gridRow: z
    .number()
    .min(1)
    .max(5)
    .describe('Row in 5x5 grid (1=top, 5=bottom)'),
  gridCol: z
    .number()
    .min(1)
    .max(5)
    .describe('Column in 5x5 grid (1=left, 5=right)'),
  size: z
    .enum(['small', 'medium', 'large'])
    .describe('Relative size of the region'),
  pixelPercentage: z
    .number()
    .min(0)
    .max(100)
    .describe('Percentage of canvas this region covers'),
});

export type DetectedRegionInput = z.infer<typeof detectedRegionInputSchema>;

/**
 * Output schema for a single region color assignment (returned FROM the AI)
 */
export const regionColorAssignmentSchema = z.object({
  regionId: z
    .number()
    .describe('ID of the region being colored (must match input)'),
  element: z
    .string()
    .describe(
      'What this region appears to be (e.g., "sky", "teddy bear body", "flower petal")',
    ),
  suggestedColor: z.string().describe('Hex color from the provided palette'),
  colorName: z.string().describe('Name of the color from the palette'),
  reasoning: z.string().describe('Brief kid-friendly reason (5-7 words)'),
});

export type RegionColorAssignment = z.infer<typeof regionColorAssignmentSchema>;

/**
 * Full response schema for region-first color assignment
 */
export const regionFirstColorResponseSchema = z.object({
  sceneDescription: z
    .string()
    .describe('Brief description of the overall scene'),
  assignments: z
    .array(regionColorAssignmentSchema)
    .describe('Color assignment for each input region'),
});

export type RegionFirstColorResponse = z.infer<
  typeof regionFirstColorResponseSchema
>;
