'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { urlFor } from '@/lib/sanity';
import cn from '@/utils/cn';

type BlogPostCardProps = {
  post: {
    _id: string;
    title: string;
    slug: { current: string };
    excerpt?: string;
    featuredImage?: {
      asset: { _ref: string };
      alt?: string;
    };
    author?: {
      name: string;
      image?: { asset: { _ref: string } };
    };
    categories?: Array<{
      title: string;
      slug: { current: string };
      color?: string;
    }>;
    publishedAt: string;
  };
  className?: string;
};

const BlogPostCard = ({ post, className }: BlogPostCardProps) => {
  const t = useTranslations('blog');
  const imageUrl = post.featuredImage
    ? urlFor(post.featuredImage).width(600).height(400).url()
    : null;

  return (
    <article
      className={cn(
        'group bg-white rounded-2xl overflow-hidden shadow-card border-2 border-paper-cream-dark hover:shadow-lg hover:border-crayon-orange/30 transition-all duration-300',
        className,
      )}
    >
      <Link href={`/blog/${post.slug.current}`}>
        {/* Featured Image */}
        <div className="relative aspect-[3/2] overflow-hidden bg-paper-cream">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.featuredImage?.alt || post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-30">🎨</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.categories.slice(0, 2).map((category) => (
                <span
                  key={category.slug.current}
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    category.color
                      ? `bg-${category.color}/10 text-${category.color}`
                      : 'bg-crayon-orange/10 text-crayon-orange',
                  )}
                >
                  {category.title}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h2 className="font-tondo font-bold text-lg md:text-xl text-text-primary mb-2 line-clamp-2 group-hover:text-crayon-orange transition-colors">
            {post.title}
          </h2>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-text-secondary text-sm line-clamp-2 mb-4">
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            {post.author && (
              <span>{t('byAuthor', { author: post.author.name })}</span>
            )}
            <time dateTime={post.publishedAt}>
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default BlogPostCard;
