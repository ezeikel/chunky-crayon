import { createClient } from "@sanity/client";

/**
 * Sanity clients for the satellite-site blog pipeline.
 *
 * These point at the `parent-tools` Sanity project (separate from CC's prod
 * Sanity project). Dataset is selected per-call from the SatelliteSiteConfig,
 * so one set of clients serves all satellite sites.
 *
 * Env vars:
 * - SATELLITE_SANITY_PROJECT_ID (e.g. "zeezp95x")
 * - SATELLITE_SANITY_API_VERSION (defaults to "2026-01-01")
 * - SATELLITE_SANITY_WRITE_TOKEN (required for writes)
 */

const projectId = process.env.SATELLITE_SANITY_PROJECT_ID;
const apiVersion = process.env.SATELLITE_SANITY_API_VERSION || "2026-01-01";

if (!projectId) {
  console.warn(
    "[satellite-blog] SATELLITE_SANITY_PROJECT_ID not set — satellite Sanity writes will fail",
  );
}

export const makeSatelliteReadClient = (dataset: string) =>
  createClient({
    projectId: projectId || "placeholder",
    dataset,
    apiVersion,
    useCdn: false,
  });

export const makeSatelliteWriteClient = (dataset: string) =>
  createClient({
    projectId: projectId || "placeholder",
    dataset,
    apiVersion,
    useCdn: false,
    token: process.env.SATELLITE_SANITY_WRITE_TOKEN,
  });

// Used for idempotency. Different from CC's queries because the satellite
// schema stores the source topic on the post directly (no generationMeta
// wrapper — simpler schema, fewer fields).
export const coveredTopicsQuery = `
  *[_type == "post" && defined(sourceTopic)].sourceTopic
`;

export const topicExistsQuery = `
  count(*[_type == "post" && sourceTopic == $topic]) > 0
`;

// Recent published posts for internal linking (topic clusters). Newest
// first, capped — Claude picks 2-3 contextually relevant ones to link.
export const recentPostsForLinkingQuery = `
  *[_type == "post" && publishedAt < now() && !(_id in path("drafts.**"))]
    | order(publishedAt desc)[0...20]{ title, "slug": slug.current }
`;
