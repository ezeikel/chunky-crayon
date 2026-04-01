/**
 * Proxy R2 URLs to same-origin path for canvas CORS compliance.
 *
 * Each app should call `setR2Host()` at startup with their brand-specific
 * R2 host (e.g. 'https://assets.chunkycrayon.com' or 'https://assets.coloringhabitat.com').
 * URLs matching that host are rewritten to `/_r2/*` which the app's
 * next.config rewrites to R2.
 */

let r2Host = "";

export function setR2Host(host: string) {
  r2Host = host;
}

export function proxyR2Url(url: string): string {
  if (r2Host && url.startsWith(r2Host)) {
    return url.replace(r2Host, "/_r2");
  }
  return url;
}
