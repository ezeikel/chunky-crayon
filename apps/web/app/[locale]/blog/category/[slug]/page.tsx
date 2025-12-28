import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PageWrap from '@/components/PageWrap/PageWrap';
import { BlogHeader, BlogGrid, CategoryList } from '@/components/blog';
import {
  client,
  isSanityConfigured,
  postsByCategoryQuery,
  categoriesQuery,
  categoryBySlugQuery,
} from '@/lib/sanity';

type PageParams = {
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
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: 'Category Not Found - Chunky Crayon',
    };
  }

  return {
    title: `${category.title} - Chunky Crayon Blog`,
    description:
      category.description ||
      `Browse all ${category.title} articles on the Chunky Crayon blog.`,
    openGraph: {
      title: `${category.title} - Chunky Crayon Blog`,
      description:
        category.description ||
        `Browse all ${category.title} articles on the Chunky Crayon blog.`,
      type: 'website',
    },
  };
}

async function getPosts(categorySlug: string) {
  'use cache';
  if (!isSanityConfigured) return [];
  return client.fetch(postsByCategoryQuery, { categorySlug });
}

async function getCategories() {
  'use cache';
  if (!isSanityConfigured) return [];
  return client.fetch(categoriesQuery);
}

async function getCategory(slug: string) {
  'use cache';
  if (!isSanityConfigured) return null;
  return client.fetch<Category>(categoryBySlugQuery, { slug });
}

const CategoryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { slug } = await paramsPromise;
  const [posts, categories, category] = await Promise.all([
    getPosts(slug),
    getCategories(),
    getCategory(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <>
      <BlogHeader
        title={category.title}
        description={
          category.description ||
          `Browse all ${category.title} articles on the Chunky Crayon blog.`
        }
      />
      <CategoryList
        categories={categories}
        activeSlug={slug}
        className="mb-8"
      />
      <BlogGrid posts={posts} />
    </>
  );
};

const CategoryPage = async ({ params }: { params: Promise<PageParams> }) => {
  return (
    <PageWrap className="max-w-6xl mx-auto">
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="h-12 bg-paper-cream rounded w-1/3 mb-4" />
            <div className="h-6 bg-paper-cream rounded w-2/3 mb-8" />
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 bg-paper-cream rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-paper-cream rounded-2xl h-64" />
              ))}
            </div>
          </div>
        }
      >
        <CategoryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default CategoryPage;
