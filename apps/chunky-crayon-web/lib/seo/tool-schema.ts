/**
 * Shared JSON-LD builder for free-tool pages. Each tool renders as a
 * `SoftwareApplication` of category `EducationalApplication` with
 * price=0 so search engines can surface them as free-to-use kid tools.
 */
export type ToolSchemaInput = {
  /** Human-readable name (maps to `name`) */
  name: string;
  /** Short one-liner describing what the tool does (maps to `description`) */
  description: string;
  /** URL segment after the locale, e.g. "/tools/reward-chart". */
  path: string;
  /** Locale segment, e.g. "en". */
  locale: string;
};

export const buildToolSchema = ({
  name,
  description,
  path,
  locale,
}: ToolSchemaInput) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name,
  description,
  url: `https://chunkycrayon.com/${locale}${path}`,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  audience: {
    '@type': 'PeopleAudience',
    suggestedMinAge: 3,
    suggestedMaxAge: 8,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Chunky Crayon',
    url: 'https://chunkycrayon.com',
  },
});
