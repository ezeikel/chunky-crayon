import type { APIRoute } from "astro";

/**
 * Daily blog cron, thin trigger.
 *
 * Mirrors apps/chunky-crayon-web/app/api/blog/generate/route.ts. The full
 * pipeline lives on the Hetzner worker at POST /generate/satellite-blog-post
 * (gpt-image-2 latency exceeds Vercel's 300s ceiling). This route hands off
 * the job with `{ siteSlug: "routinecharts" }` and returns 202.
 *
 * Worker handles errors and alerts admin via Resend. See
 * apps/chunky-crayon-worker/src/satellite-blog/pipeline.ts.
 */

export const prerender = false;

const SITE_SLUG = "routinecharts";

const fireWorker = async () => {
  const workerUrl = import.meta.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = import.meta.env.WORKER_SECRET;

  if (!workerUrl) {
    throw new Error("CHUNKY_CRAYON_WORKER_URL not set");
  }

  const response = await fetch(`${workerUrl}/generate/satellite-blog-post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({ siteSlug: SITE_SLUG }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, body };
};

const handle: APIRoute = async () => {
  try {
    const { ok, status, body } = await fireWorker();
    if (!ok) {
      console.error(
        `[cron/blog/generate] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "worker rejected satellite blog cron trigger",
          workerStatus: status,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        accepted: true,
        siteSlug: SITE_SLUG,
        message: "satellite blog cron handed off to worker",
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[cron/blog/generate] failed to reach worker:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "failed to reach worker",
        details: err instanceof Error ? err.message : "unknown",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

export const GET = handle;
export const POST = handle;
