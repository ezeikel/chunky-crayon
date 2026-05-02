import { createClient } from "@sanity/client";

/**
 * Sanity clients for the worker.
 *
 * Mirrors apps/chunky-crayon-web/lib/sanity/client.ts. The worker writes
 * blog posts directly to Sanity from inside the cron pipeline (the Vercel
 * route is fire-and-forget and exits before any Sanity work runs).
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-02-19";

if (!projectId) {
  console.warn(
    "[sanity] NEXT_PUBLIC_SANITY_PROJECT_ID not set — Sanity writes will fail",
  );
}

export const client = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: false,
});

export const writeClient = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Same query shape as the web app's coveredTopicsQuery in lib/sanity/queries.ts.
// Duplicated rather than imported to avoid pulling next-sanity (Next-bound)
// into the worker runtime.
export const coveredTopicsQuery = `
  *[_type == "post" && defined(generationMeta.topic)].generationMeta.topic
`;

export const topicExistsQuery = `
  count(*[_type == "post" && generationMeta.topic == $topic]) > 0
`;
