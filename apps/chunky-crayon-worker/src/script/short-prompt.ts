/**
 * Calls the web app's `/api/dev/shorten-prompt` endpoint to turn a coloring
 * image's title + description into the ~8-word kid-typed prompt used in V2
 * demo reels. Same Bluey-tone guardrails as the legacy `next-scene-prompt`
 * shortener — single source of truth lives on the web app.
 *
 * Returns the short string, or falls back to `title` if anything goes wrong
 * (network, API key, etc.) so reels still render with *something* sensible
 * rather than blowing up the whole pipeline.
 */
const CC_ORIGIN = process.env.CC_ORIGIN ?? "https://www.chunkycrayon.com";

export async function shortenPromptForReel(opts: {
  title: string | null;
  description: string | null;
}): Promise<string> {
  const fallback = (opts.title ?? opts.description ?? "")
    .toLowerCase()
    .replace(/coloring page( for kids)?/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const workerSecret = process.env.WORKER_SECRET;
  try {
    const res = await fetch(`${CC_ORIGIN}/api/dev/shorten-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({
        title: opts.title ?? undefined,
        description: opts.description ?? undefined,
      }),
      // Shortener call: ~3-5s typical; give it a wide margin.
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[short-prompt] non-OK response ${res.status}: ${txt.slice(0, 200)} — falling back to "${fallback}"`,
      );
      return fallback;
    }
    const json = (await res.json()) as { short?: string };
    if (!json.short) {
      console.warn(
        `[short-prompt] response missing short field — falling back to "${fallback}"`,
      );
      return fallback;
    }
    console.log(`[short-prompt] "${opts.title}" → "${json.short}"`);
    return json.short;
  } catch (err) {
    console.warn(
      `[short-prompt] request failed (${err instanceof Error ? err.message : err}) — falling back to "${fallback}"`,
    );
    return fallback;
  }
}
