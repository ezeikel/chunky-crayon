import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { PortableText, type PortableTextBlock } from '@portabletext/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClock,
  faCalendar,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import { portableTextComponents } from '@/components/blog/PortableTextComponents';
import {
  client,
  isSanityConfigured,
  postBySlugQuery,
  recentPostsQuery,
  urlFor,
} from '@/lib/sanity';
import cn from '@/utils/cn';

type PageParams = {
  slug: string;
};

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  body: PortableTextBlock[];
  featuredImage?: {
    asset: { _ref: string };
    alt?: string;
    caption?: string;
  };
  author?: {
    name: string;
    slug: { current: string };
    image?: { asset: { _ref: string } };
    title?: string;
    bio?: string;
  };
  categories?: Array<{
    title: string;
    slug: { current: string };
    color?: string;
  }>;
  publishedAt: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  generationMeta?: {
    estimatedReadTime?: number;
  };
};

type RelatedPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  featuredImage?: {
    asset: { _ref: string };
    alt?: string;
  };
  publishedAt: string;
};

export async function generateStaticParams() {
  if (!isSanityConfigured) return [];
  const posts = await client.fetch<Array<{ slug: { current: string } }>>(
    `*[_type == "post" && status == "published"]{ slug }`,
  );
  return posts.map((post) => ({ slug: post.slug.current }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found - Chunky Crayon',
    };
  }

  const title = post.seo?.metaTitle || `${post.title} - Chunky Crayon Blog`;
  const description = post.seo?.metaDescription || post.excerpt || '';
  const imageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(1200).height(630).url()
    : undefined;

  return {
    title,
    description,
    keywords: post.seo?.keywords?.join(', '),
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: post.featuredImage?.alt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

async function getPost(slug: string) {
  'use cache';
  cacheLife('blog-post');
  cacheTag('blog-posts', `blog-post-${slug}`);
  if (!isSanityConfigured) return null;
  return client.fetch<Post>(postBySlugQuery, { slug });
}

async function getRecentPosts(currentSlug: string) {
  'use cache';
  cacheLife('blog-list');
  cacheTag('blog-posts');
  if (!isSanityConfigured) return [];
  return client.fetch<RelatedPost[]>(recentPostsQuery, { currentSlug });
}

const BlogPostContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { slug } = await paramsPromise;
  const [post, recentPosts] = await Promise.all([
    getPost(slug),
    getRecentPosts(slug),
  ]);

  if (!post) {
    notFound();
  }

  const imageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(1200).height(675).url()
    : null;

  const authorImageUrl = post.author?.image
    ? urlFor(post.author.image).width(80).height(80).url()
    : null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <>
      {/* Back Link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-crayon-orange transition-colors mb-8"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
        <span>Back to Blog</span>
      </Link>

      <article>
        {/* Header */}
        <header className="mb-8">
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((category) => (
                <Link
                  key={category.slug.current}
                  href={`/blog/category/${category.slug.current}`}
                  className={cn(
                    'text-xs font-medium px-3 py-1 rounded-full transition-colors',
                    'bg-crayon-orange/10 text-crayon-orange hover:bg-crayon-orange/20',
                  )}
                >
                  {category.title}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="font-tondo font-bold text-3xl md:text-4xl lg:text-5xl text-text-primary mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary mb-6">
            {post.author && (
              <div className="flex items-center gap-2">
                {authorImageUrl && (
                  <Image
                    src={authorImageUrl}
                    alt={post.author.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span>By {post.author.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faCalendar}
                className="text-xs"
                style={iconStyle}
              />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </time>
            </div>
            {post.generationMeta?.estimatedReadTime && (
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon
                  icon={faClock}
                  className="text-xs"
                  style={iconStyle}
                />
                <span>{post.generationMeta.estimatedReadTime} min read</span>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {imageUrl && (
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-8">
              <Image
                src={imageUrl}
                alt={post.featuredImage?.alt || post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <PortableText value={post.body} components={portableTextComponents} />
        </div>

        {/* Author Bio */}
        {post.author?.bio && (
          <div className="mt-12 p-6 bg-paper-cream rounded-2xl border-2 border-paper-cream-dark">
            <div className="flex items-start gap-4">
              {authorImageUrl && (
                <Image
                  src={authorImageUrl}
                  alt={post.author.name}
                  width={64}
                  height={64}
                  className="rounded-full flex-shrink-0"
                />
              )}
              <div>
                <h3 className="font-tondo font-semibold text-lg text-text-primary">
                  {post.author.name}
                </h3>
                {post.author.title && (
                  <p className="text-sm text-crayon-orange mb-2">
                    {post.author.title}
                  </p>
                )}
                <p className="text-text-secondary text-sm">{post.author.bio}</p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Related Posts */}
      {recentPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
            More from the Blog
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentPosts.map((relatedPost) => {
              const relatedImageUrl = relatedPost.featuredImage
                ? urlFor(relatedPost.featuredImage).width(400).height(267).url()
                : null;

              return (
                <Link
                  key={relatedPost._id}
                  href={`/blog/${relatedPost.slug.current}`}
                  className="group flex gap-4 p-4 rounded-xl bg-white border-2 border-paper-cream-dark hover:border-crayon-orange/30 transition-colors"
                >
                  {relatedImageUrl && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={relatedImageUrl}
                        alt={
                          relatedPost.featuredImage?.alt || relatedPost.title
                        }
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-tondo font-semibold text-text-primary group-hover:text-crayon-orange transition-colors line-clamp-2 mb-1">
                      {relatedPost.title}
                    </h3>
                    <time
                      dateTime={relatedPost.publishedAt}
                      className="text-xs text-text-tertiary"
                    >
                      {format(new Date(relatedPost.publishedAt), 'MMM d, yyyy')}
                    </time>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};

const BlogPostPage = async ({ params }: { params: Promise<PageParams> }) => {
  return (
    <PageWrap className="max-w-4xl mx-auto">
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="h-8 bg-paper-cream rounded w-24 mb-8" />
            <div className="h-12 bg-paper-cream rounded w-3/4 mb-6" />
            <div className="h-6 bg-paper-cream rounded w-1/2 mb-8" />
            <div className="aspect-video bg-paper-cream rounded-2xl mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-paper-cream rounded" />
              <div className="h-4 bg-paper-cream rounded" />
              <div className="h-4 bg-paper-cream rounded w-2/3" />
            </div>
          </div>
        }
      >
        <BlogPostContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default BlogPostPage;
