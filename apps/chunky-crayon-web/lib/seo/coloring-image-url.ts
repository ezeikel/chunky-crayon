// Single source of truth for /coloring-image/[id] vs /coloring-pages/[slug] URLs.
//
// Public daily/system images get the SEO-friendly slugged URL; everything else
// (user-generated, in-flight, hidden) stays on the CUID URL. Routes call the
// helper at link time; sitemap + JSON-LD use the canonical variant.
//
// `userId === null` is the safety belt: even if a bug set showInCommunity=true
// on a user row, the helper still returns the CUID URL so private content
// never leaks into the public namespace.

type ImageForUrl = {
  id: string;
  slugBase: string | null;
  userId: string | null;
  showInCommunity: boolean;
  status: 'GENERATING' | 'READY' | 'FAILED';
};

const SLUG_SUFFIX_LEN = 5;

export function isPubliclyIndexable(image: ImageForUrl): boolean {
  return (
    image.userId === null &&
    image.showInCommunity &&
    image.status === 'READY' &&
    image.slugBase !== null
  );
}

export function getColoringImageUrl(
  image: ImageForUrl,
  locale: string,
): string {
  if (isPubliclyIndexable(image) && image.slugBase) {
    return `/${locale}/coloring-pages/${image.slugBase}-${image.id.slice(-SLUG_SUFFIX_LEN)}`;
  }
  return `/${locale}/coloring-image/${image.id}`;
}

export function getColoringImageCanonicalUrl(
  image: ImageForUrl,
  locale: string,
): string {
  return `https://chunkycrayon.com${getColoringImageUrl(image, locale)}`;
}

// Pulled from the public slug for the route lookup — `slug.slice(-5)` is the
// id suffix that uniquely identifies the row.
export function getIdSuffixFromSlug(slug: string): string {
  return slug.slice(-SLUG_SUFFIX_LEN);
}

// Validates that an arbitrary slug matches the canonical form for a given row,
// used by the route handler to decide between "render" and "301-to-canonical".
export function getCanonicalSlugForImage(image: {
  id: string;
  slugBase: string | null;
}): string | null {
  if (!image.slugBase) return null;
  return `${image.slugBase}-${image.id.slice(-SLUG_SUFFIX_LEN)}`;
}
