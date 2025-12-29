import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { db } from '@chunky-crayon/db';
import { client, isSanityConfigured } from '@/lib/sanity';
import ManualTestingSection from './ManualTestingSection';

export const metadata: Metadata = {
  title: 'OG Image Preview - Chunky Crayon',
  description: 'Preview and test Open Graph images',
  robots: 'noindex, nofollow',
};

// Get sample data for preview
async function getSampleData() {
  // Get a sample coloring image
  const coloringImage = await db.coloringImage.findFirst({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });

  // Get a sample shared artwork
  const sharedArtwork = await db.artworkShare.findFirst({
    select: { shareCode: true },
    orderBy: { createdAt: 'desc' },
  });

  // Get a sample blog post from Sanity
  let blogPost: { slug: string; title: string } | null = null;
  if (isSanityConfigured) {
    const post = await client.fetch<{
      slug: { current: string };
      title: string;
    } | null>(
      `*[_type == "post" && status == "published"] | order(publishedAt desc)[0] { slug, title }`,
    );
    if (post?.slug?.current) {
      blogPost = { slug: post.slug.current, title: post.title };
    }
  }

  return { coloringImage, sharedArtwork, blogPost };
}

// Loading skeleton for the OG image grid
function OGGridSkeleton() {
  return (
    <div className="grid gap-8 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-72" />
          </div>
          <div className="p-6">
            <div className="aspect-[1200/630] bg-gray-100 rounded-xl mb-4" />
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded-lg w-32" />
              <div className="h-10 bg-gray-100 rounded-lg w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Async component for the OG image grid that fetches data
async function OGImageGrid() {
  const { coloringImage, sharedArtwork, blogPost } = await getSampleData();

  const ogTypes = [
    {
      name: 'Homepage (Generic)',
      path: '/',
      ogPath: '/opengraph-image',
      description: 'Main site OG image with branding and features',
    },
    {
      name: 'Coloring Image (Dynamic)',
      path: coloringImage ? `/coloring-image/${coloringImage.id}` : null,
      ogPath: coloringImage
        ? `/en/coloring-image/${coloringImage.id}/opengraph-image`
        : null,
      description: 'Individual coloring page with preview and metadata',
      sampleId: coloringImage?.id,
      sampleTitle: coloringImage?.title,
    },
    {
      name: 'Blog Post (Dynamic)',
      path: blogPost ? `/blog/${blogPost.slug}` : '/blog',
      ogPath: blogPost ? `/en/blog/${blogPost.slug}/opengraph-image` : null,
      description: 'Blog post with featured image, author, and categories',
      note: !blogPost ? 'Requires a published blog post in Sanity' : undefined,
      sampleSlug: blogPost?.slug,
      sampleTitle: blogPost?.title,
    },
    {
      name: 'Shared Artwork (Dynamic)',
      path: sharedArtwork ? `/shared/${sharedArtwork.shareCode}` : null,
      ogPath: sharedArtwork
        ? `/en/shared/${sharedArtwork.shareCode}/opengraph-image`
        : null,
      description: 'User-created artwork with celebratory design',
      sampleCode: sharedArtwork?.shareCode,
    },
  ];

  return (
    <div className="grid gap-8">
      {ogTypes.map((og) => (
        <div
          key={og.name}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-tondo font-bold text-xl text-text-primary">
              {og.name}
            </h2>
            <p className="text-text-secondary text-sm mt-1">{og.description}</p>
            {og.note && (
              <p className="text-crayon-orange text-sm mt-2 italic">
                Note: {og.note}
              </p>
            )}
            {og.sampleId && (
              <p className="text-text-muted text-xs mt-2">
                Sample ID: {og.sampleId}
                {og.sampleTitle && ` - "${og.sampleTitle}"`}
              </p>
            )}
            {og.sampleSlug && (
              <p className="text-text-muted text-xs mt-2">
                Slug: {og.sampleSlug}
                {og.sampleTitle && ` - "${og.sampleTitle}"`}
              </p>
            )}
            {og.sampleCode && (
              <p className="text-text-muted text-xs mt-2">
                Share Code: {og.sampleCode}
              </p>
            )}
          </div>

          {og.ogPath ? (
            <div className="p-6">
              {/* Preview Frame */}
              <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-4">
                <div className="aspect-[1200/630]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={og.ogPath}
                    alt={`${og.name} OG Preview`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={og.ogPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-crayon-orange text-white rounded-lg font-medium hover:bg-crayon-orange-dark transition-colors"
                >
                  View Full Size
                </a>
                {og.path && (
                  <Link
                    href={og.path}
                    className="px-4 py-2 bg-gray-100 text-text-primary rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    View Page
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <p className="text-text-muted">
                  No sample available. Create some content first.
                </p>
                {og.path && (
                  <Link
                    href={og.path}
                    className="inline-block mt-4 px-4 py-2 bg-gray-100 text-text-primary rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Go to {og.name.split(' ')[0]}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OGPreviewPage() {
  return (
    <div className="min-h-screen bg-bg-cream p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="font-tondo font-bold text-4xl text-text-primary mb-2">
            OG Image Preview
          </h1>
          <p className="text-text-secondary">
            Test and preview Open Graph images for social sharing
          </p>
        </header>

        {/* Quick Links */}
        <div className="mb-8 p-4 bg-white rounded-xl shadow-sm">
          <h2 className="font-tondo font-bold text-lg text-text-primary mb-3">
            Social Media Validators
          </h2>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://developers.facebook.com/tools/debug/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            >
              Facebook Debugger
            </a>
            <a
              href="https://cards-dev.twitter.com/validator"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-sky-100 text-sky-700 rounded-lg font-medium hover:bg-sky-200 transition-colors"
            >
              Twitter Card Validator
            </a>
            <a
              href="https://www.linkedin.com/post-inspector/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            >
              LinkedIn Inspector
            </a>
          </div>
        </div>

        {/* OG Image Grid - wrapped in Suspense for dynamic data */}
        <Suspense fallback={<OGGridSkeleton />}>
          <OGImageGrid />
        </Suspense>

        {/* Manual Test Section */}
        <ManualTestingSection />

        {/* Info Section */}
        <div className="mt-8 p-6 bg-paper-cream rounded-2xl">
          <h2 className="font-tondo font-bold text-lg text-text-primary mb-3">
            OG Image Specifications
          </h2>
          <ul className="space-y-2 text-text-secondary text-sm">
            <li>
              <strong>Dimensions:</strong> 1200 x 630 pixels (standard OG size)
            </li>
            <li>
              <strong>Format:</strong> PNG
            </li>
            <li>
              <strong>Fonts:</strong> Tondo (headings) + Rooney Sans (body)
            </li>
            <li>
              <strong>Runtime:</strong> Node.js (for database queries)
            </li>
            <li>
              <strong>Caching:</strong> Managed by Next.js file-based routing
            </li>
          </ul>
        </div>

        <footer className="mt-12 text-center text-text-muted text-sm">
          <Link href="/" className="hover:text-crayon-orange">
            &larr; Back to Chunky Crayon
          </Link>
        </footer>
      </div>
    </div>
  );
}
