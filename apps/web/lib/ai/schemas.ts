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
