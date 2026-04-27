/**
 * R2 → /tmp proxy helper for V2 demo reel renders.
 *
 * Remotion's headless Chromium can't fetch our R2 prod bucket directly —
 * the bucket has no CORS headers. V1 worker solved this by downloading
 * each remote asset to /tmp/chunky-crayon-worker/ and serving it via the
 * worker's `/tmp/:filename` HTTP handler at `http://localhost:3030/tmp/`.
 *
 * V2 inherits the same approach. Pass each prod R2 URL through this
 * helper to get back a `localhost:<port>/tmp/<file>` URL Remotion can
 * fetch from inside the bundle.
 *
 * The proxy only runs for `https://...` URLs — same-origin `staticFile()`
 * URLs (used by studio preview) pass through unchanged.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

export type ProxyOptions = {
  /** Where files land. Worker's existing `/tmp/:filename` route serves
   *  this directory at `localhost:<port>/tmp/`. */
  cacheDir: string;
  /** Worker's HTTP port — needed to construct the localhost URL. */
  port: number;
};

/**
 * Download a remote asset to the cache dir and return a localhost URL
 * Remotion can fetch. Idempotent — same input URL always hashes to the
 * same local file, so calling this multiple times in one render is free
 * after the first.
 */
export async function proxyToLocal(
  url: string,
  opts: ProxyOptions,
): Promise<string> {
  // staticFile() URLs are already same-origin to the Remotion bundler —
  // pass them through. Only true cross-origin URLs need proxying.
  if (url.startsWith("/") || url.startsWith("http://localhost")) {
    return url;
  }

  await mkdir(opts.cacheDir, { recursive: true });

  // Hash the URL so the local filename is stable per source URL but
  // doesn't leak the path (some R2 keys are long). Keep the original
  // file extension so Remotion's MIME detection works.
  const ext = extractExtension(url);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  const localName = `v2-${hash}${ext}`;
  const localPath = `${opts.cacheDir}/${localName}`;

  // Skip download if we already have it. fs.stat would be more correct
  // but readFile-and-fail is fine — these are tens-of-KB files.
  try {
    const { stat } = await import("node:fs/promises");
    await stat(localPath);
    // Already cached — return the URL.
    return `http://localhost:${opts.port}/tmp/${localName}`;
  } catch {
    // Not cached — fall through to download.
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`[proxy] fetch failed ${resp.status} for ${url}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(localPath, buf);

  return `http://localhost:${opts.port}/tmp/${localName}`;
}

function extractExtension(url: string): string {
  // Find the last `.` after the last `/` and before any `?`.
  const noQuery = url.split("?")[0];
  const lastSlash = noQuery.lastIndexOf("/");
  const tail = noQuery.slice(lastSlash + 1);
  const lastDot = tail.lastIndexOf(".");
  if (lastDot === -1) return "";
  // Cap at 6 chars to avoid pulling in non-extensions like ".bin.gz" all the way.
  // We want the *final* extension; ".bin.gz" → ".gz". Remotion only cares
  // about the extension's content type (set by /tmp/:filename handler).
  return tail.slice(lastDot, lastDot + 8);
}
