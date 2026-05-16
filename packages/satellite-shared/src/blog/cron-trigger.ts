import type { APIRoute } from "astro";

/**
 * Daily blog cron, thin trigger — shared across all satellites.
 *
 * Mirrors apps/chunky-crayon-web/app/api/blog/generate/route.ts. The full
 * pipeline lives on the Hetzner worker at POST /generate/satellite-blog-post
 * (gpt-image-2 latency exceeds Vercel's 300s ceiling). This route hands off
 * the job with `{ siteSlug }` and returns 202. The worker handles errors
 * and alerts admin via Resend. See
 * apps/chunky-crayon-worker/src/satellite-blog/pipeline.ts.
 *
 * `createBlogCronHandler(siteSlug)` returns the handler used as both GET
 * and POST in the app's `pages/api/cron/blog/generate.ts` shell.
 */
export const createBlogCronHandler = (siteSlug: string): APIRoute => {
  const fireWorker = async () => {
    // Server-only secrets: read process.env at runtime (Vercel injects env
    // vars there). Astro's import.meta.env only exposes PUBLIC_-prefixed
    // vars to the server bundle, so non-public secrets MUST come from
    // process.env. This fallback ordering is load-bearing — do not regress.
    const workerUrl =
      process.env.CHUNKY_CRAYON_WORKER_URL ??
      import.meta.env.CHUNKY_CRAYON_WORKER_URL;
    const workerSecret =
      process.env.WORKER_SECRET ?? import.meta.env.WORKER_SECRET;

    if (!workerUrl) {
      throw new Error("CHUNKY_CRAYON_WORKER_URL not set");
    }

    const response = await fetch(`${workerUrl}/generate/satellite-blog-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({ siteSlug }),
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
          siteSlug,
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

  return handle;
};
