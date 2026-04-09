/**
 * Proxy R2 URLs to same-origin path for canvas CORS compliance.
 *
 * Each app should call `setR2Hosts()` at startup with their brand-specific
 * R2 hosts — both the production custom domain (e.g.
 * 'https://assets.chunkycrayon.com') and the R2 dev public URL (e.g.
 * 'https://pub-xxxxx.r2.dev') so fetches match in all environments.
 *
 * URLs matching any configured host are rewritten to `/_r2/*` which the app's
 * next.config rewrites to R2.
 */

let r2Hosts: string[] = [];

export function setR2Hosts(hosts: string[]) {
  r2Hosts = hosts.filter(Boolean);
}

/**
 * @deprecated Use `setR2Hosts` instead. Kept for backwards compatibility —
 * sets a single host.
 */
export function setR2Host(host: string) {
  r2Hosts = host ? [host] : [];
}

export function proxyR2Url(url: string): string {
  for (const host of r2Hosts) {
    if (url.startsWith(host)) {
      return url.replace(host, "/_r2");
    }
  }
  return url;
}
