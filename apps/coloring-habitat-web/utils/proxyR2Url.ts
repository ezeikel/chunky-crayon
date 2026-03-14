// Rewrites R2 asset URLs to a same-origin proxy path (/_r2/*).
// Needed because canvas pixel operations (getImageData, toDataURL) require
// same-origin images. R2 doesn't serve CORS headers, so fetch() from the
// browser would fail. The /_r2/* rewrite in next.config.ts proxies to R2.
const R2_HOST = "https://assets.chunkycrayon.com";

export function proxyR2Url(url: string): string {
  if (url.startsWith(R2_HOST)) {
    return url.replace(R2_HOST, "/_r2");
  }
  return url;
}
