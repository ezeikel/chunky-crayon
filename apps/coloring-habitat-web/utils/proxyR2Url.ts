// Rewrites R2 asset URLs to a same-origin proxy path (/_r2/*).
// Needed because canvas pixel operations (getImageData, toDataURL) require
// same-origin images. R2 doesn't serve CORS headers, so fetch() from the
// browser would fail. The /_r2/* rewrite in next.config.ts proxies to R2.
// Match both prod custom domain and dev public URL
const R2_HOSTS = [
  "https://assets.coloringhabitat.com",
  "https://pub-6786013d1ffa411aa84ff29f787d7387.r2.dev",
];

export function proxyR2Url(url: string): string {
  for (const host of R2_HOSTS) {
    if (url.startsWith(host)) {
      return url.replace(host, "/_r2");
    }
  }
  return url;
}
