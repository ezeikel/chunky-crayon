import { createClient } from "@sanity/client";

// Use placeholder for build time when env vars aren't set
export const projectId = process.env.SANITY_PROJECT_ID || "1od8pera";
export const dataset = process.env.SANITY_DATASET || "production";
export const apiVersion = process.env.SANITY_API_VERSION || "2025-03-22";

export const isSanityConfigured = projectId !== "placeholder";

// Read-only client for fetching data
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
});

// Write client for mutations (server-side only)
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
