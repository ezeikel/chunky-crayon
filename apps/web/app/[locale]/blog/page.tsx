import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import PageWrap from '@/components/PageWrap/PageWrap';
import { BlogHeader, BlogGrid, CategoryList } from '@/components/blog';
import {
  client,
  isSanityConfigured,
  postsQuery,
  categoriesQuery,
} from '@/lib/sanity';

export const metadata: Metadata = {
  title: 'Blog - Chunky Crayon',
  description:
    'Tips, ideas, and inspiration for creative coloring activities. Discover coloring tips for kids, adults, and families.',
  openGraph: {
    title: 'The Chunky Crayon Blog',
    description:
      'Tips, ideas, and inspiration for creative coloring activities. Discover coloring tips for kids, adults, and families.',
    type: 'website',
  },
};

async function getPosts() {
  'use cache';
  cacheLife('blog-list');
  cacheTag('blog-list', 'blog-posts');
  if (!isSanityConfigured) return [];
  return client.fetch(postsQuery);
}

async function getCategories() {
  'use cache';
  cacheLife('blog-list');
  cacheTag('blog-list', 'blog-categories');
  if (!isSanityConfigured) return [];
  return client.fetch(categoriesQuery);
}

const BlogPage = async () => {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);

  return (
    <PageWrap className="max-w-6xl mx-auto">
      <BlogHeader />
      <CategoryList categories={categories} className="mb-8" />
      <BlogGrid posts={posts} />
    </PageWrap>
  );
};

export default BlogPage;
