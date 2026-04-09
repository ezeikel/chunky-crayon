import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import {
  client,
  isSanityConfigured,
  postsByCategoryQuery,
  categoriesQuery,
  categoryBySlugQuery,
  urlFor,
} from "@/lib/sanity";
import type { BlogPost, BlogCategory } from "@/app/actions/blog";
import { generateAlternates } from "@/lib/seo";

type PageParams = {
  locale: string;
  slug: string;
};

type Category = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  color?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [t, category] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getCategory(slug),
  ]);

  if (!category) {
    return {
      title: t("categoryNotFound"),
    };
  }

  const title = t("categoryMetaTitle", { category: category.title });
  const description =
    category.description ||
    t("categoryDescription", { category: category.title });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: generateAlternates(locale, `/blog/category/${slug}`),
  };
}

async function getPosts(categorySlug: string) {
  "use cache";
  if (!isSanityConfigured) return [];
  return client.fetch<BlogPost[]>(postsByCategoryQuery, { categorySlug });
}

async function getCategories() {
  "use cache";
  if (!isSanityConfigured) return [];
  return client.fetch<BlogCategory[]>(categoriesQuery);
}

async function getCategory(slug: string) {
  "use cache";
  if (!isSanityConfigured) return null;
  return client.fetch<Category>(categoryBySlugQuery, { slug });
}

async function CategoryPills({
  categories,
  activeSlug,
}: {
  categories: BlogCategory[];
  activeSlug: string;
}) {
  const t = await getTranslations("blog");
  const filtered = categories.filter((c) => c.postCount > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      <Link
        href="/blog"
        className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
      >
        {t("all")}
      </Link>
      {filtered.map((category) => (
        <Link
          key={category._id}
          href={`/blog/category/${category.slug.current}`}
          className={
            activeSlug === category.slug.current
              ? "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              : "rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          }
        >
          {category.title}
          <span className="ml-1 text-muted-foreground">
            ({category.postCount})
          </span>
        </Link>
      ))}
    </div>
  );
}

async function PostCard({ post }: { post: BlogPost }) {
  const t = await getTranslations("blog");
  const imageUrl = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(600).height(400).url()
    : null;

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      {imageUrl && (
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image
            src={imageUrl}
            alt={post.featuredImage?.alt || post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        {post.categories && post.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.categories.map((category) => (
              <span
                key={category.slug.current}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {category.title}
              </span>
            ))}
          </div>
        )}

        <h2 className="mb-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.author && (
            <span>{t("byAuthor", { author: post.author.name })}</span>
          )}
          <time dateTime={post.publishedAt}>
            {format(new Date(post.publishedAt), "MMM d, yyyy")}
          </time>
        </div>
      </div>
    </Link>
  );
}

const CategoryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { slug } = await paramsPromise;
  const [t, posts, categories, category] = await Promise.all([
    getTranslations("blog"),
    getPosts(slug),
    getCategories(),
    getCategory(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {category.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {category.description ||
            t("categoryDescription", { category: category.title })}
        </p>
      </div>

      {/* Category filters */}
      <CategoryPills categories={categories} activeSlug={slug} />

      {/* Blog grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {t("noCategoryPosts")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("checkBackSoon")}
          </p>
        </div>
      )}
    </>
  );
};

const CategoryPage = async ({ params }: { params: Promise<PageParams> }) => {
  return (
    <main className="bg-background py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Suspense
          fallback={
            <div className="animate-pulse">
              <div className="mb-4 h-12 w-1/3 rounded bg-secondary" />
              <div className="mb-8 h-6 w-2/3 rounded bg-secondary" />
              <div className="mb-8 flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-24 rounded-full bg-secondary" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 rounded-2xl bg-secondary" />
                ))}
              </div>
            </div>
          }
        >
          <CategoryContent paramsPromise={params} />
        </Suspense>
      </div>
    </main>
  );
};

export default CategoryPage;
