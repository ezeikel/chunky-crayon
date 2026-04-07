import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai/models";
import { generateColoringPageImage } from "@/lib/ai/image-providers";
import { del } from "@one-colored-pixel/storage";
import {
  client,
  writeClient,
  isSanityConfigured,
  coveredTopicsQuery,
} from "@/lib/sanity";
import { getUpcomingEvents, type SeasonalEvent } from "@/lib/seasonal-calendar";

export const maxDuration = 300;

// --------------------------------------------------------------------------
// Types & constants
// --------------------------------------------------------------------------

type ContentType = "wellness" | "technique" | "event" | "trending" | "seasonal";

const BLOG_AUTHORS = [
  {
    name: "Maya Chen",
    title: "Wellness & Coloring Editor",
    bio: "Maya is an art therapist and wellness advocate who believes in the transformative power of creative expression. She writes about the science behind mindful coloring and its benefits for mental health.",
  },
  {
    name: "Oliver Park",
    title: "Technique & Inspiration",
    bio: "Oliver is a professional illustrator and coloring book creator. He shares tips and techniques to help colorists of all levels bring their pages to life.",
  },
  {
    name: "Priya Sharma",
    title: "Cultural Arts Writer",
    bio: "Priya explores the intersection of art, culture, and mindfulness. She writes about cultural celebrations and how coloring connects us to traditions worldwide.",
  },
];

const WELLNESS_TOPICS = [
  {
    topic: "Coloring for anxiety relief: the science behind the calm",
    keywords: ["anxiety", "stress relief", "coloring therapy", "mindfulness"],
  },
  {
    topic: "How coloring activates the relaxation response",
    keywords: ["relaxation", "parasympathetic", "meditation", "neuroscience"],
  },
  {
    topic: "Coloring as a mindfulness practice: a beginner's guide",
    keywords: ["mindfulness", "present moment", "coloring meditation", "focus"],
  },
  {
    topic: "The therapeutic benefits of coloring for adults",
    keywords: ["art therapy", "mental health", "self-care", "wellness"],
  },
  {
    topic: "Coloring before bed: improving sleep quality naturally",
    keywords: ["sleep", "insomnia", "bedtime routine", "screen-free"],
  },
  {
    topic: "Using coloring pages as a digital detox strategy",
    keywords: ["digital detox", "screen time", "analog activities", "presence"],
  },
  {
    topic: "The flow state: how coloring helps you achieve deep focus",
    keywords: ["flow state", "concentration", "Csikszentmihalyi", "focus"],
  },
  {
    topic: "Coloring for grief and emotional processing",
    keywords: ["grief", "emotions", "healing", "expression"],
  },
];

const TECHNIQUE_TOPICS = [
  {
    topic: "Blending colored pencils: techniques for smooth gradients",
    keywords: ["colored pencils", "blending", "gradient", "technique"],
  },
  {
    topic: "Choosing the right coloring tools: pencils vs markers vs gel pens",
    keywords: ["coloring tools", "supplies", "comparison", "beginners"],
  },
  {
    topic: "Color theory for coloring pages: creating harmony",
    keywords: ["color theory", "complementary colors", "palette", "harmony"],
  },
  {
    topic: "Shading and dimension: making flat coloring pages come alive",
    keywords: ["shading", "dimension", "light source", "depth"],
  },
  {
    topic: "Working with mandalas: tips for intricate patterns",
    keywords: ["mandala", "patterns", "symmetry", "detail"],
  },
  {
    topic: "Mixed media coloring: combining pencils, markers, and pastels",
    keywords: ["mixed media", "layering", "texture", "experiment"],
  },
];

// --------------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------------

const blogPostSchema = z.object({
  title: z.string().describe("Engaging blog post title (50-70 characters)"),
  slug: z
    .string()
    .describe(
      "URL-friendly slug derived from the title, lowercase with hyphens",
    ),
  excerpt: z
    .string()
    .describe(
      "Compelling excerpt for social sharing and previews (120-160 characters)",
    ),
  content: z
    .string()
    .describe(
      "Full blog post content in markdown format (800-1500 words). Include h2 and h3 headers, bullet points, and a conversational tone.",
    ),
  keywords: z
    .array(z.string())
    .describe("5-8 SEO keywords relevant to the article"),
  estimatedReadTime: z.number().describe("Estimated read time in minutes"),
  imagePrompt: z
    .string()
    .describe(
      "A prompt for generating a coloring page image related to this article. Must be a detailed description of a black and white line art coloring page.",
    ),
  imageAlt: z.string().describe("Alt text for the generated featured image"),
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getRandomAuthor() {
  return BLOG_AUTHORS[Math.floor(Math.random() * BLOG_AUTHORS.length)];
}

async function getCoveredTopics(): Promise<string[]> {
  try {
    return (await client.fetch<string[]>(coveredTopicsQuery)) || [];
  } catch {
    console.error("Failed to fetch covered topics");
    return [];
  }
}

function pickContentTypeAndTopic(
  upcomingEvents: SeasonalEvent[],
  coveredTopics: string[],
): { contentType: ContentType; topic: string; context: string } {
  // Priority 1: Upcoming cultural/holiday events
  if (upcomingEvents.length > 0) {
    // Filter to non-season events (more specific)
    const specificEvents = upcomingEvents.filter(
      (e) =>
        !e.name.includes("(Northern") &&
        !e.name.includes("(Southern") &&
        !coveredTopics.includes(e.name),
    );

    if (specificEvents.length > 0) {
      const event =
        specificEvents[Math.floor(Math.random() * specificEvents.length)];
      return {
        contentType: "event",
        topic: event.name,
        context: `Upcoming event: ${event.name}. ${event.description || event.childFriendlyDescription}. Themes: ${event.themes.join(", ")}. Write about celebrating this through coloring and creative expression.`,
      };
    }

    // Fall through to seasonal if only season events
    const seasonEvent =
      upcomingEvents[Math.floor(Math.random() * upcomingEvents.length)];
    return {
      contentType: "seasonal",
      topic: `Seasonal coloring: ${seasonEvent.name}`,
      context: `Current season: ${seasonEvent.name}. Themes: ${seasonEvent.themes.join(", ")}. Write about seasonal coloring inspiration and how the season connects to mindful coloring practice.`,
    };
  }

  // Priority 2: Wellness or technique (alternate)
  const uncoveredWellness = WELLNESS_TOPICS.filter(
    (t) => !coveredTopics.includes(t.topic),
  );
  const uncoveredTechnique = TECHNIQUE_TOPICS.filter(
    (t) => !coveredTopics.includes(t.topic),
  );

  // Prefer the category with more uncovered topics
  if (
    uncoveredWellness.length > 0 &&
    (uncoveredWellness.length >= uncoveredTechnique.length ||
      uncoveredTechnique.length === 0)
  ) {
    const pick =
      uncoveredWellness[Math.floor(Math.random() * uncoveredWellness.length)];
    return {
      contentType: "wellness",
      topic: pick.topic,
      context: `Write a wellness article about: ${pick.topic}. Keywords to incorporate: ${pick.keywords.join(", ")}.`,
    };
  }

  if (uncoveredTechnique.length > 0) {
    const pick =
      uncoveredTechnique[Math.floor(Math.random() * uncoveredTechnique.length)];
    return {
      contentType: "technique",
      topic: pick.topic,
      context: `Write a technique guide about: ${pick.topic}. Keywords to incorporate: ${pick.keywords.join(", ")}.`,
    };
  }

  // Fallback: trending (use Perplexity for research)
  return {
    contentType: "trending",
    topic: "trending coloring topic",
    context:
      "Research current trending topics in adult coloring, art therapy, or creative wellness and write about the most interesting one.",
  };
}

/**
 * Parse inline markdown formatting into Portable Text spans
 */
type PortableTextSpan = {
  _type: "span";
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
  _type: "block";
  _key: string;
  style?: string;
  children?: PortableTextSpan[];
  listItem?: string;
  level?: number;
  markDefs?: PortableTextMarkDef[];
};

function parseInlineFormatting(
  text: string,
  keyPrefix: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let spanIndex = 0;

  const inlinePattern =
    /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        children.push({
          _type: "span",
          _key: `${keyPrefix}_span_${spanIndex++}`,
          text: beforeText,
        });
      }
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith("**") || fullMatch.startsWith("__")) {
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: match[2] || match[3],
        marks: ["strong"],
      });
    } else if (fullMatch.startsWith("[")) {
      const linkKey = `link_${keyPrefix}_${spanIndex}`;
      markDefs.push({ _type: "link", _key: linkKey, href: match[7] });
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: match[6],
        marks: [linkKey],
      });
    } else if (fullMatch.startsWith("*") || fullMatch.startsWith("_")) {
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: match[4] || match[5],
        marks: ["em"],
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: remainingText,
      });
    }
  }

  if (children.length === 0) {
    children.push({
      _type: "span",
      _key: `${keyPrefix}_span_0`,
      text,
    });
  }

  return { children, markDefs };
}

function markdownToPortableText(markdown: string): PortableTextBlock[] {
  const lines = markdown.split("\n");
  const blocks: PortableTextBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `block_${i}`;

    if (!line.trim()) continue;
    if (/^[-*_]{3,}\s*$/.test(line.trim())) continue;

    if (line.startsWith("# ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h1",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("## ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(3), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h2",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("### ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(4), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h3",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("#### ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(5), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h4",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "normal",
        listItem: "bullet",
        level: 1,
        children,
        markDefs,
      });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "");
      const { children, markDefs } = parseInlineFormatting(text, key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "normal",
        listItem: "number",
        level: 1,
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("> ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "blockquote",
        children,
        markDefs,
      });
      continue;
    }

    const { children, markDefs } = parseInlineFormatting(line, key);
    blocks.push({
      _type: "block",
      _key: key,
      style: "normal",
      children,
      markDefs,
    });
  }

  return blocks;
}

async function uploadImageToSanity(
  imageUrl: string,
  filename: string,
): Promise<{ _type: "reference"; _ref: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);

    const imageBuffer = await response.arrayBuffer();
    const asset = await writeClient.assets.upload(
      "image",
      Buffer.from(imageBuffer),
      { filename, contentType: "image/webp" },
    );

    return { _type: "reference", _ref: asset._id };
  } catch (error) {
    console.error("Failed to upload image to Sanity:", error);
    return null;
  }
}

// --------------------------------------------------------------------------
// Blog post system prompt
// --------------------------------------------------------------------------

const BLOG_SYSTEM_PROMPT = `You are a writer for Coloring Habitat, a coloring platform focused on wellness, mindfulness, and creative relaxation.

Brand voice:
- Warm, knowledgeable, and encouraging
- Science-informed but accessible — not academic
- We speak as "we" (Coloring Habitat), never "I"
- Our audience colors for relaxation, stress relief, and creative expression
- We celebrate coloring as a legitimate wellness practice
- Tone is calm and grounding, like a trusted friend who happens to know a lot about art therapy
- Never use the word "adult" in titles or to describe coloring — it's just coloring

Content guidelines:
- Use h2 (##) for main sections and h3 (###) for subsections
- Include practical, actionable advice
- Reference scientific research where relevant (e.g., art therapy studies)
- End with an encouraging call to action that ties back to coloring
- Write in markdown format
- Aim for 800-1500 words
- Include a coloring page image prompt that would make an excellent featured image — describe a detailed black and white line art design related to the article topic`;

// --------------------------------------------------------------------------
// Route handler
// --------------------------------------------------------------------------

export async function GET(request: Request) {
  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSanityConfigured) {
    return NextResponse.json(
      { error: "Sanity not configured" },
      { status: 500 },
    );
  }

  try {
    // 1. Determine what to write about
    const coveredTopics = await getCoveredTopics();
    const upcomingEvents = getUpcomingEvents(new Date(), 7);
    const { contentType, topic, context } = pickContentTypeAndTopic(
      upcomingEvents,
      coveredTopics,
    );

    console.log(
      `Blog generation: contentType=${contentType}, topic="${topic}"`,
    );

    // 2. If trending, use Perplexity Sonar for research
    let researchContext = context;
    if (contentType === "trending") {
      try {
        const { text: research } = await generateText({
          model: models.search,
          prompt:
            "What are the current trending topics in coloring books, art therapy, creative wellness, and mindful art in 2026? List the top 5 trending topics with a brief description of why each is trending.",
        });
        researchContext = `Based on current trends research:\n${research}\n\nPick the most interesting trending topic and write about it in the context of coloring for wellness.`;
      } catch (error) {
        console.error("Perplexity research failed, falling back:", error);
        researchContext =
          "Write about a creative wellness topic that connects mindfulness with coloring.";
      }
    }

    // 3. For events, optionally enrich with Perplexity
    if (contentType === "event") {
      try {
        const { text: eventResearch } = await generateText({
          model: models.search,
          prompt: `Tell me about the upcoming ${topic} celebration in 2026. What are the key traditions, colors, symbols, and how might someone celebrate through creative art and coloring?`,
        });
        researchContext = `${context}\n\nAdditional research:\n${eventResearch}`;
      } catch {
        // Use existing context if research fails
      }
    }

    // 4. Generate the blog post with Claude
    console.log("Generating blog post content...");
    const { output: postData } = await generateText({
      model: models.creative,
      system: BLOG_SYSTEM_PROMPT,
      prompt: `Write a blog post about the following topic for Coloring Habitat.\n\nContent type: ${contentType}\nTopic: ${topic}\n\nContext:\n${researchContext}\n\nPreviously covered topics (avoid repetition): ${coveredTopics.slice(-10).join(", ")}`,
      output: Output.object({ schema: blogPostSchema }),
    });

    if (!postData) {
      return NextResponse.json(
        { error: "Failed to generate post content" },
        { status: 500 },
      );
    }

    // 5. Generate featured coloring page image
    console.log("Generating featured image...");
    let imageAssetRef: { _type: "reference"; _ref: string } | null = null;
    try {
      const imageResult = await generateColoringPageImage(postData.imagePrompt);
      const filename = `${postData.slug}-featured.webp`;
      imageAssetRef = await uploadImageToSanity(imageResult.url, filename);

      // Clean up temp file from storage
      try {
        await del(imageResult.tempFileName);
      } catch (cleanupError) {
        console.error("Failed to clean up temp image:", cleanupError);
      }
    } catch (imageError) {
      console.error(
        "Failed to generate image, continuing without:",
        imageError,
      );
    }

    // 6. Create or find author in Sanity
    const author = getRandomAuthor();
    const authorSlug = author.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/'/g, "");

    let authorRef: string;
    const existingAuthor = await client.fetch(
      `*[_type == "author" && slug.current == $slug][0]._id`,
      { slug: authorSlug },
    );

    if (existingAuthor) {
      authorRef = existingAuthor;
    } else {
      const newAuthor = await writeClient.create({
        _type: "author",
        name: author.name,
        slug: { _type: "slug", current: authorSlug },
        title: author.title,
        bio: author.bio,
      });
      authorRef = newAuthor._id;
    }

    // 7. Convert markdown to portable text
    const body = markdownToPortableText(postData.content);

    // 8. Create the post as draft in Sanity
    console.log("Creating post in Sanity...");
    const post = await writeClient.create({
      _type: "post",
      title: postData.title,
      slug: { _type: "slug", current: postData.slug },
      excerpt: postData.excerpt,
      body,
      author: { _type: "reference", _ref: authorRef },
      featuredImage: imageAssetRef
        ? {
            _type: "image",
            asset: imageAssetRef,
            alt: postData.imageAlt,
          }
        : undefined,
      categories: [],
      contentType,
      publishedAt: new Date().toISOString(),
      status: "published",
      seo: {
        metaTitle: postData.title,
        metaDescription: postData.excerpt,
        keywords: postData.keywords,
      },
      generationMeta: {
        topic,
        contentType,
        generatedAt: new Date().toISOString(),
        model: "claude-sonnet-4-5",
        imagePrompt: postData.imagePrompt,
        estimatedReadTime: postData.estimatedReadTime,
      },
    });

    console.log(`Blog post published: ${post._id}`);

    return NextResponse.json({
      success: true,
      postId: post._id,
      slug: postData.slug,
      contentType,
      topic,
      message: "Blog post published to Sanity",
    });
  } catch (error) {
    console.error("Error generating blog post:", error);
    return NextResponse.json(
      {
        error: "Failed to generate blog post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
