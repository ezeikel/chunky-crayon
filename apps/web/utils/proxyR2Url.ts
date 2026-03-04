const R2_HOST = 'https://assets.chunkycrayon.com';

export function proxyR2Url(url: string): string {
  if (url.startsWith(R2_HOST)) {
    return url.replace(R2_HOST, '/_r2');
  }
  return url;
}
