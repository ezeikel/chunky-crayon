import { groq } from 'next-sanity';

// Get all published posts with author and category info
export const postsQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    featuredImage {
      asset->,
      alt,
      caption
    },
    author->{
      name,
      slug,
      image,
      title
    },
    categories[]->{
      title,
      slug,
      color
    },
    publishedAt
  }
`;

// Get a single post by slug
export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body,
    featuredImage {
      asset->,
      alt,
      caption
    },
    author->{
      name,
      slug,
      image,
      title,
      bio
    },
    categories[]->{
      title,
      slug,
      color
    },
    publishedAt,
    seo,
    generationMeta
  }
`;

// Get posts by category
export const postsByCategoryQuery = groq`
  *[_type == "post" && status == "published" && $categorySlug in categories[]->slug.current] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    featuredImage {
      asset->,
      alt,
      caption
    },
    author->{
      name,
      slug,
      image
    },
    categories[]->{
      title,
      slug,
      color
    },
    publishedAt
  }
`;

// Get all categories with post count
export const categoriesQuery = groq`
  *[_type == "category"] {
    _id,
    title,
    slug,
    description,
    color,
    "postCount": count(*[_type == "post" && status == "published" && references(^._id)])
  }
`;

// Get recent posts for sidebar/related
export const recentPostsQuery = groq`
  *[_type == "post" && status == "published" && slug.current != $currentSlug] | order(publishedAt desc)[0...4] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage {
      asset->,
      alt
    },
    publishedAt
  }
`;

// Get all post slugs for static generation
export const postSlugsQuery = groq`
  *[_type == "post" && status == "published"].slug.current
`;

// Get all category slugs for static generation
export const categorySlugsQuery = groq`
  *[_type == "category"].slug.current
`;

// Get posts count for pagination
export const postsCountQuery = groq`
  count(*[_type == "post" && status == "published"])
`;

// Get paginated posts
export const paginatedPostsQuery = groq`
  *[_type == "post" && status == "published"] | order(publishedAt desc)[$start...$end] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage {
      asset->,
      alt,
      caption
    },
    author->{
      name,
      slug,
      image
    },
    categories[]->{
      title,
      slug,
      color
    },
    publishedAt
  }
`;

// Check if a topic has been covered (for blog generation)
export const topicExistsQuery = groq`
  count(*[_type == "post" && generationMeta.topic == $topic]) > 0
`;

// Get all covered topics
export const coveredTopicsQuery = groq`
  *[_type == "post" && defined(generationMeta.topic)].generationMeta.topic
`;

// Get a category by slug
export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    color
  }
`;
