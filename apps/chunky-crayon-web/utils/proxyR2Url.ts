// Rewrites R2 asset URLs to a same-origin proxy path (/_r2/*).
// Needed because canvas pixel operations (getImageData, toDataURL) require
// same-origin images. R2 doesn't serve CORS headers, so fetch() from the
// browser would fail. The /_r2/* rewrite in next.config.ts proxies to R2.
// Match both the prod custom domain and the R2 dev public URL.
const R2_HOSTS = [
  'https://assets.chunkycrayon.com',
  'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev',
];

export function proxyR2Url(url: string): string {
  for (const host of R2_HOSTS) {
    if (url.startsWith(host)) {
      return url.replace(host, '/_r2');
    }
  }
  return url;
}
