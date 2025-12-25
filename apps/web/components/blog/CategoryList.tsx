import Link from 'next/link';
import cn from '@/utils/cn';

type Category = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  color?: string;
  postCount?: number;
};

type CategoryListProps = {
  categories: Category[];
  activeSlug?: string;
  className?: string;
};

const CategoryList = ({
  categories,
  activeSlug,
  className,
}: CategoryListProps) => {
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className={cn('flex flex-wrap gap-2 justify-center', className)}>
      <Link
        href="/blog"
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          !activeSlug
            ? 'bg-crayon-orange text-white'
            : 'bg-paper-cream text-text-secondary hover:bg-crayon-orange/10 hover:text-crayon-orange',
        )}
      >
        All Posts
      </Link>
      {categories.map((category) => (
        <Link
          key={category._id}
          href={`/blog/category/${category.slug.current}`}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeSlug === category.slug.current
              ? 'bg-crayon-orange text-white'
              : 'bg-paper-cream text-text-secondary hover:bg-crayon-orange/10 hover:text-crayon-orange',
          )}
        >
          {category.title}
          {category.postCount !== undefined && (
            <span className="ml-1 opacity-70">({category.postCount})</span>
          )}
        </Link>
      ))}
    </nav>
  );
};

export default CategoryList;
