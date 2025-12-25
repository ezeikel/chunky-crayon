import BlogPostCard from './BlogPostCard';
import cn from '@/utils/cn';

type BlogGridProps = {
  posts: Array<{
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
  }>;
  className?: string;
};

const BlogGrid = ({ posts, className }: BlogGridProps) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">📝</span>
        <h3 className="font-tondo font-bold text-xl text-text-primary mb-2">
          No posts yet
        </h3>
        <p className="text-text-secondary">Check back soon for new articles!</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className,
      )}
    >
      {posts.map((post) => (
        <BlogPostCard key={post._id} post={post} />
      ))}
    </div>
  );
};

export default BlogGrid;
