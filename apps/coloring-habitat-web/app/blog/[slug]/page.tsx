import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClock,
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import { portableTextComponents } from "@/components/blog/PortableTextComponents";
import {
  client,
  isSanityConfigured,
  postBySlugQuery,
  recentPostsQuery,
  urlFor,
} from "@/lib/sanity";

type PageParams = {
  slug: string;
};

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  body: PortableTextBlock[];
  contentType?: string;
  eventDate?: string;
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

async function getPost(slug: string) {
  if (!isSanityConfigured) return null;
  return client.fetch<Post>(postBySlugQuery, { slug });
}

async function getRecentPosts(currentSlug: string) {
  if (!isSanityConfigured) return [];
  return client.fetch<RelatedPost[]>(recentPostsQuery, { currentSlug });
}

export async function generateStaticParams() {
  if (!isSanityConfigured) return [{ slug: "placeholder" }];
  const posts = await client.fetch<Array<{ slug: { current: string } }>>(
    `*[_type == "post" && status == "published"]{ slug }`,
  );
  // Cache Components requires at least one result from generateStaticParams
  if (posts.length === 0) return [{ slug: "placeholder" }];
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
      title: "Post Not Found | Coloring Habitat",
    };
  }

  const title = post.seo?.metaTitle || `${post.title} | Coloring Habitat Blog`;
  const description = post.seo?.metaDescription || post.excerpt || "";
  const imageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(1200).height(630).url()
    : undefined;

  return {
    title,
    description,
    keywords: post.seo?.keywords?.join(", "),
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      url: `https://coloringhabitat.com/blog/${slug}`,
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
      card: "summary_large_image",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
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

  return (
    <>
      {/* Back Link */}
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
        <span>Back to Blog</span>
      </Link>

      <article>
        {/* Header */}
        <header className="mb-8">
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <span
                  key={category.slug.current}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {category.title}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              <FontAwesomeIcon icon={faCalendar} className="text-xs" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), "MMMM d, yyyy")}
              </time>
            </div>
            {post.generationMeta?.estimatedReadTime && (
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} className="text-xs" />
                <span>{post.generationMeta.estimatedReadTime} min read</span>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {imageUrl && (
            <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl">
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
          <div className="mt-12 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              {authorImageUrl && (
                <Image
                  src={authorImageUrl}
                  alt={post.author.name}
                  width={64}
                  height={64}
                  className="flex-shrink-0 rounded-full"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {post.author.name}
                </h3>
                {post.author.title && (
                  <p className="mb-2 text-sm text-primary">
                    {post.author.title}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {post.author.bio}
                </p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Related Posts */}
      {recentPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-foreground">
            More from the Blog
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {recentPosts.map((relatedPost) => {
              const relatedImageUrl = relatedPost.featuredImage
                ? urlFor(relatedPost.featuredImage).width(400).height(267).url()
                : null;

              return (
                <Link
                  key={relatedPost._id}
                  href={`/blog/${relatedPost.slug.current}`}
                  className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  {relatedImageUrl && (
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={relatedImageUrl}
                        alt={
                          relatedPost.featuredImage?.alt || relatedPost.title
                        }
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {relatedPost.title}
                    </h3>
                    <time
                      dateTime={relatedPost.publishedAt}
                      className="text-xs text-muted-foreground"
                    >
                      {format(new Date(relatedPost.publishedAt), "MMM d, yyyy")}
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
    <>
      <main className="bg-background py-16">
        <div className="mx-auto max-w-4xl px-6">
          <Suspense
            fallback={
              <div className="animate-pulse">
                <div className="mb-8 h-8 w-24 rounded bg-secondary" />
                <div className="mb-6 h-12 w-3/4 rounded bg-secondary" />
                <div className="mb-8 h-6 w-1/2 rounded bg-secondary" />
                <div className="mb-8 aspect-video rounded-2xl bg-secondary" />
                <div className="space-y-4">
                  <div className="h-4 rounded bg-secondary" />
                  <div className="h-4 rounded bg-secondary" />
                  <div className="h-4 w-2/3 rounded bg-secondary" />
                </div>
              </div>
            }
          >
            <BlogPostContent paramsPromise={params} />
          </Suspense>
        </div>
      </main>
    </>
  );
};

export default BlogPostPage;
