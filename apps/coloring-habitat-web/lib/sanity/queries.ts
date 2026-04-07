// GROQ queries for Coloring Habitat blog

// Get all published posts with author and category info
export const postsQuery = `
  *[_type == "post" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    contentType,
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
export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body,
    contentType,
    eventDate,
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
export const postsByCategoryQuery = `
  *[_type == "post" && status == "published" && $categorySlug in categories[]->slug.current] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    contentType,
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
export const categoriesQuery = `
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
export const recentPostsQuery = `
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
export const postSlugsQuery = `
  *[_type == "post" && status == "published"].slug.current
`;

// Get a category by slug
export const categoryBySlugQuery = `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    color
  }
`;

// Get all covered topics (for blog generation dedup)
export const coveredTopicsQuery = `
  *[_type == "post" && defined(generationMeta.topic)].generationMeta.topic
`;

// Get covered content types with counts
export const contentTypeStatsQuery = `
  {
    "wellness": count(*[_type == "post" && contentType == "wellness"]),
    "technique": count(*[_type == "post" && contentType == "technique"]),
    "event": count(*[_type == "post" && contentType == "event"]),
    "trending": count(*[_type == "post" && contentType == "trending"]),
    "seasonal": count(*[_type == "post" && contentType == "seasonal"])
  }
`;
