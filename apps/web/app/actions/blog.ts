'use server';

import { generateObject, generateText } from 'ai';
import {
  getTracedModels,
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
  BLOG_POST_SYSTEM,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
  generateColoringPageImage,
} from '@/lib/ai';
import { writeClient, client, coveredTopicsQuery } from '@/lib/sanity';
import { BLOG_TOPICS, BLOG_AUTHORS, type BlogTopic } from '@/constants';

type GenerateBlogPostResult = {
  success: boolean;
  postId?: string;
  slug?: string;
  error?: string;
};

/**
 * Get all topics that have already been covered in the blog
 */
async function getCoveredTopics(): Promise<string[]> {
  try {
    const topics = await client.fetch<string[]>(coveredTopicsQuery);
    return topics || [];
  } catch {
    console.error('Failed to fetch covered topics');
    return [];
  }
}

/**
 * Get a random uncovered topic from the blog topics list
 */
async function getRandomUncoveredTopic(): Promise<BlogTopic | null> {
  const coveredTopics = await getCoveredTopics();
  const uncoveredTopics = BLOG_TOPICS.filter(
    (t) => !coveredTopics.includes(t.topic),
  );

  if (uncoveredTopics.length === 0) {
    console.log('All topics have been covered!');
    return null;
  }

  const randomIndex = Math.floor(Math.random() * uncoveredTopics.length);
  return uncoveredTopics[randomIndex];
}

/**
 * Get a random author for the blog post
 */
function getRandomAuthor() {
  const randomIndex = Math.floor(Math.random() * BLOG_AUTHORS.length);
  return BLOG_AUTHORS[randomIndex];
}

/**
 * Generate blog post metadata (title, slug, excerpt)
 */
async function generateBlogMeta(topic: string, keywords: string[]) {
  const models = getTracedModels({
    properties: { feature: 'blog_generation' },
  });

  const { object } = await generateObject({
    model: models.text,
    system: BLOG_META_SYSTEM,
    prompt: createBlogMetaPrompt(topic, keywords),
    schema: blogMetaSchema,
  });

  return object;
}

/**
 * Generate the full blog post content
 */
async function generateBlogContent(
  topic: string,
  keywords: string[],
  coveredTopics: string[],
) {
  const models = getTracedModels({
    properties: { feature: 'blog_generation' },
  });

  const { object } = await generateObject({
    model: models.text,
    system: BLOG_POST_SYSTEM,
    prompt: createBlogPostPrompt(topic, keywords, coveredTopics),
    schema: blogPostSchema,
  });

  return object;
}

/**
 * Generate the image prompt for the blog featured image
 */
async function generateImagePrompt(topic: string, postTitle: string) {
  const models = getTracedModels({
    properties: { feature: 'blog_generation' },
  });

  const { object } = await generateObject({
    model: models.textFast,
    system: BLOG_IMAGE_PROMPT_SYSTEM,
    prompt: createBlogImagePromptPrompt(topic, postTitle),
    schema: blogImagePromptSchema,
  });

  return object;
}

/**
 * Upload an image to Sanity and return the asset reference
 */
async function uploadImageToSanity(
  imageUrl: string,
  filename: string,
): Promise<{ _type: 'reference'; _ref: string } | null> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Upload to Sanity
    const asset = await writeClient.assets.upload(
      'image',
      Buffer.from(imageBuffer),
      {
        filename,
        contentType: 'image/webp',
      },
    );

    return {
      _type: 'reference',
      _ref: asset._id,
    };
  } catch (error) {
    console.error('Failed to upload image to Sanity:', error);
    return null;
  }
}

type PortableTextSpan = {
  _type: 'span';
  _key: string;
  text: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _type: string;
  _key: string;
  href?: string;
};

type PortableTextBlock = {
  _type: 'block';
  _key: string;
  style?: string;
  children?: PortableTextSpan[];
  listItem?: string;
  level?: number;
  markDefs?: PortableTextMarkDef[];
};

/**
 * Parse inline markdown formatting (bold, italic, links) into Portable Text spans
 */
function parseInlineFormatting(
  text: string,
  keyPrefix: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let spanIndex = 0;

  // Regex patterns for inline formatting
  // Match bold (**text** or __text__), italic (*text* or _text_), and links [text](url)
  const inlinePattern =
    /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        children.push({
          _type: 'span',
          _key: `${keyPrefix}_span_${spanIndex++}`,
          text: beforeText,
        });
      }
    }

    const fullMatch = match[0];

    // Check what type of formatting this is
    if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) {
      // Bold
      const boldText = match[2] || match[3];
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: boldText,
        marks: ['strong'],
      });
    } else if (fullMatch.startsWith('[')) {
      // Link
      const linkText = match[6];
      const linkHref = match[7];
      const linkKey = `link_${keyPrefix}_${spanIndex}`;
      markDefs.push({
        _type: 'link',
        _key: linkKey,
        href: linkHref,
      });
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: linkText,
        marks: [linkKey],
      });
    } else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) {
      // Italic
      const italicText = match[4] || match[5];
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: italicText,
        marks: ['em'],
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      children.push({
        _type: 'span',
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: remainingText,
      });
    }
  }

  // If no matches found, just return the whole text as a single span
  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: `${keyPrefix}_span_0`,
      text: text,
    });
  }

  return { children, markDefs };
}

/**
 * Convert markdown content to Portable Text blocks for Sanity
 */
function markdownToPortableText(markdown: string): PortableTextBlock[] {
  const lines = markdown.split('\n');
  const blocks: PortableTextBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `block_${i}`;

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Skip horizontal rules (---, ***, ___)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      continue;
    }

    // H1 headers
    if (line.startsWith('# ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'h1',
        children,
        markDefs,
      });
      continue;
    }

    // H2 headers
    if (line.startsWith('## ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(3), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'h2',
        children,
        markDefs,
      });
      continue;
    }

    // H3 headers
    if (line.startsWith('### ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(4), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'h3',
        children,
        markDefs,
      });
      continue;
    }

    // H4 headers
    if (line.startsWith('#### ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(5), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'h4',
        children,
        markDefs,
      });
      continue;
    }

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children,
        markDefs,
      });
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      const { children, markDefs } = parseInlineFormatting(text, key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'normal',
        listItem: 'number',
        level: 1,
        children,
        markDefs,
      });
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: 'block',
        _key: key,
        style: 'blockquote',
        children,
        markDefs,
      });
      continue;
    }

    // Regular paragraph with inline formatting
    const { children, markDefs } = parseInlineFormatting(line, key);
    blocks.push({
      _type: 'block',
      _key: key,
      style: 'normal',
      children,
      markDefs,
    });
  }

  return blocks;
}

/**
 * Create a blog post in Sanity
 */
async function createSanityPost({
  title,
  slug,
  excerpt,
  content,
  topic,
  author,
  imageAssetRef,
  imageAlt,
  imagePrompt,
  keywords,
}: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  topic: string;
  author: (typeof BLOG_AUTHORS)[0];
  imageAssetRef: { _type: 'reference'; _ref: string } | null;
  imageAlt: string;
  imagePrompt: string;
  keywords: string[];
}) {
  // First, check if author exists, create if not
  const authorSlug = author.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/'/g, '');
  let authorRef: string;

  const existingAuthor = await client.fetch(
    `*[_type == "author" && slug.current == $slug][0]._id`,
    { slug: authorSlug },
  );

  if (existingAuthor) {
    authorRef = existingAuthor;
  } else {
    const newAuthor = await writeClient.create({
      _type: 'author',
      name: author.name,
      slug: { _type: 'slug', current: authorSlug },
      title: author.title,
      bio: author.bio,
    });
    authorRef = newAuthor._id;
  }

  // Convert markdown to portable text
  const body = markdownToPortableText(content);

  // Create the post
  const post = await writeClient.create({
    _type: 'post',
    title,
    slug: { _type: 'slug', current: slug },
    excerpt,
    body,
    author: { _type: 'reference', _ref: authorRef },
    featuredImage: imageAssetRef
      ? {
          _type: 'image',
          asset: imageAssetRef,
          alt: imageAlt,
        }
      : undefined,
    publishedAt: new Date().toISOString(),
    status: 'published',
    seo: {
      metaTitle: title,
      metaDescription: excerpt,
      keywords,
    },
    generationMeta: {
      topic,
      generatedAt: new Date().toISOString(),
      model: 'gpt-4o',
      imagePrompt,
    },
  });

  return post;
}

/**
 * Generate a complete blog post for a specific topic
 */
export async function generateBlogPostForTopic(
  topic: BlogTopic,
  publishDate?: Date,
): Promise<GenerateBlogPostResult> {
  try {
    console.log(`Generating blog post for topic: ${topic.topic}`);

    // 1. Get covered topics to avoid repetition
    const coveredTopics = await getCoveredTopics();

    // 2. Generate metadata
    console.log('Generating metadata...');
    const meta = await generateBlogMeta(topic.topic, topic.keywords);

    // 3. Generate content
    console.log('Generating content...');
    const { content } = await generateBlogContent(
      topic.topic,
      topic.keywords,
      coveredTopics,
    );

    // 4. Generate image prompt
    console.log('Generating image prompt...');
    const { imagePrompt, altText } = await generateImagePrompt(
      topic.topic,
      meta.title,
    );

    // 5. Generate the coloring page image
    console.log('Generating featured image...');
    let imageAssetRef: { _type: 'reference'; _ref: string } | null = null;
    try {
      const imageResult = await generateColoringPageImage(imagePrompt);
      // Upload to Sanity (GenerationResult always has url on success, throws on failure)
      const filename = `${meta.slug}-featured.webp`;
      imageAssetRef = await uploadImageToSanity(imageResult.url, filename);
    } catch (imageError) {
      console.error(
        'Failed to generate image, continuing without:',
        imageError,
      );
    }

    // 6. Get random author
    const author = getRandomAuthor();

    // 7. Create post in Sanity
    console.log('Creating post in Sanity...');
    const post = await createSanityPost({
      title: meta.title,
      slug: meta.slug,
      excerpt: meta.excerpt,
      content,
      topic: topic.topic,
      author,
      imageAssetRef,
      imageAlt: altText,
      imagePrompt,
      keywords: topic.keywords,
    });

    console.log(`Successfully created blog post: ${post._id}`);

    return {
      success: true,
      postId: post._id,
      slug: meta.slug,
    };
  } catch (error) {
    console.error('Failed to generate blog post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a random blog post (for cron job)
 */
export async function generateRandomBlogPost(): Promise<GenerateBlogPostResult> {
  const topic = await getRandomUncoveredTopic();

  if (!topic) {
    return {
      success: false,
      error: 'All topics have been covered',
    };
  }

  return generateBlogPostForTopic(topic);
}

/**
 * Get statistics about blog topic coverage
 */
export async function getBlogTopicStats() {
  const coveredTopics = await getCoveredTopics();
  const totalTopics = BLOG_TOPICS.length;
  const coveredCount = coveredTopics.length;
  const remainingCount = totalTopics - coveredCount;

  const categoryStats = BLOG_TOPICS.reduce(
    (acc, topic) => {
      acc[topic.category] = acc[topic.category] || { total: 0, covered: 0 };
      acc[topic.category].total++;
      if (coveredTopics.includes(topic.topic)) {
        acc[topic.category].covered++;
      }
      return acc;
    },
    {} as Record<string, { total: number; covered: number }>,
  );

  return {
    totalTopics,
    coveredCount,
    remainingCount,
    percentComplete: Math.round((coveredCount / totalTopics) * 100),
    categoryStats,
  };
}
