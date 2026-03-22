import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts, getCategories } from "@/app/actions/blog";
import type { BlogPost, BlogCategory } from "@/app/actions/blog";
import { urlFor } from "@/lib/sanity";

export const metadata: Metadata = {
  title: "Blog | Coloring Habitat",
  description:
    "Wellness tips, coloring techniques, and creative inspiration for mindful coloring. Discover the science behind coloring for stress relief.",
  openGraph: {
    title: "The Coloring Habitat Blog",
    description:
      "Wellness tips, coloring techniques, and creative inspiration for mindful coloring.",
    type: "website",
    url: "https://coloringhabitat.com/blog",
  },
};

function CategoryPills({ categories }: { categories: BlogCategory[] }) {
  const filtered = categories.filter((c) => c.postCount > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      <Link
        href="/blog"
        className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        All
      </Link>
      {filtered.map((category) => (
        <Link
          key={category._id}
          href={`/blog?category=${category.slug.current}`}
          className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
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

function PostCard({ post }: { post: BlogPost }) {
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
        {/* Categories */}
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
          {post.author && <span>By {post.author.name}</span>}
          <time dateTime={post.publishedAt}>
            {format(new Date(post.publishedAt), "MMM d, yyyy")}
          </time>
        </div>
      </div>
    </Link>
  );
}

const BlogPage = async () => {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getCategories(),
  ]);

  return (
    <>
      <Header />
      <main className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Blog
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Wellness tips, coloring techniques, and creative inspiration for
              your mindful coloring practice.
            </p>
          </div>

          {/* Category filters */}
          <CategoryPills categories={categories} />

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
                Coming soon
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;re working on articles about the science of coloring for
                wellness, technique guides, and creative inspiration.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BlogPage;
