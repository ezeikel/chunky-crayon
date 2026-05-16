/**
 * Daily blog cron, thin shell. All logic lives in the shared package's
 * `createBlogCronHandler` (process.env-first secret read is load-bearing).
 * See @one-colored-pixel/satellite-shared/blog cron-trigger.ts.
 */
import { createBlogCronHandler } from "@one-colored-pixel/satellite-shared/blog";
import { siteConfig } from "@/site.config";

export const prerender = false;

const handle = createBlogCronHandler(siteConfig.slug);

export const GET = handle;
export const POST = handle;
