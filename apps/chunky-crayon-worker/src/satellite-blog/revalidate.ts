/**
 * On-demand ISR revalidation for satellite sites.
 *
 * After publishing a post to Sanity, ping the new post URL + /blog with
 * the Vercel ISR bypass header so the edge cache regenerates immediately
 * instead of waiting for the time-based expiration window. Without this a
 * freshly published post is invisible to Google for up to 24h.
 *
 * Best-effort: never throws. A failed revalidation just means the post
 * appears at the next natural ISR expiration instead of instantly.
 */
export async function revalidateSatellitePost(
  domain: string,
  slug: string,
): Promise<void> {
  const token = process.env.ISR_BYPASS_TOKEN;
  if (!token) {
    console.warn(
      "[satellite-blog-revalidate] ISR_BYPASS_TOKEN not set — skipping; post will appear at next ISR expiration",
    );
    return;
  }

  const urls = [`https://${domain}/blog/${slug}`, `https://${domain}/blog`];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          headers: { "x-prerender-revalidate": token },
        });
        console.log(`[satellite-blog-revalidate] ${url} -> ${res.status}`);
      } catch (err) {
        console.error(`[satellite-blog-revalidate] failed for ${url}:`, err);
      }
    }),
  );
}
