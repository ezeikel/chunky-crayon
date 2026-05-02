import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
  BLOG_POST_SYSTEM,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
  BLOG_TOPICS,
  BLOG_AUTHORS,
  type BlogTopic,
} from "@one-colored-pixel/coloring-core";
import {
  client as sanityClient,
  writeClient as sanityWriteClient,
  coveredTopicsQuery,
  topicExistsQuery,
} from "../lib/sanity.js";
import { sendAdminAlert } from "../lib/email.js";
import { generateBlogFeaturedImage, cleanupBlogImage } from "./image-gen.js";
import { markdownToPortableText } from "./markdown-to-portable-text.js";

const claudeModel = anthropic("claude-sonnet-4-5-20250929");

async function getCoveredTopics(): Promise<string[]> {
  try {
    const topics = await sanityClient.fetch<string[]>(coveredTopicsQuery);
    return topics || [];
  } catch (err) {
    console.error("[blog-cron] failed to fetch covered topics:", err);
    return [];
  }
}

async function isTopicCovered(topic: string): Promise<boolean> {
  try {
    return Boolean(await sanityClient.fetch(topicExistsQuery, { topic }));
  } catch {
    return false;
  }
}

function pickRandomUncoveredTopic(coveredTopics: string[]): BlogTopic | null {
  const uncovered = BLOG_TOPICS.filter((t) => !coveredTopics.includes(t.topic));
  if (uncovered.length === 0) return null;
  return uncovered[Math.floor(Math.random() * uncovered.length)];
}

function pickRandomAuthor() {
  return BLOG_AUTHORS[Math.floor(Math.random() * BLOG_AUTHORS.length)];
}

async function generateMeta(topic: string, keywords: string[]) {
  const { output } = await generateText({
    model: claudeModel,
    system: BLOG_META_SYSTEM,
    prompt: createBlogMetaPrompt(topic, keywords),
    output: Output.object({ schema: blogMetaSchema }),
  });
  if (!output)
    throw new Error("[blog-cron] meta generation returned no output");
  return output;
}

async function generateContent(
  topic: string,
  keywords: string[],
  coveredTopics: string[],
) {
  const { output } = await generateText({
    model: claudeModel,
    system: BLOG_POST_SYSTEM,
    prompt: createBlogPostPrompt(topic, keywords, coveredTopics),
    output: Output.object({ schema: blogPostSchema }),
  });
  if (!output)
    throw new Error("[blog-cron] content generation returned no output");
  return output;
}

async function generateImagePromptFromClaude(topic: string, postTitle: string) {
  const { output } = await generateText({
    model: claudeModel,
    system: BLOG_IMAGE_PROMPT_SYSTEM,
    prompt: createBlogImagePromptPrompt(topic, postTitle),
    output: Output.object({ schema: blogImagePromptSchema }),
  });
  if (!output)
    throw new Error("[blog-cron] image prompt generation returned no output");
  return output;
}

async function uploadImageToSanity(
  imageUrl: string,
  filename: string,
): Promise<{ _type: "reference"; _ref: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const asset = await sanityWriteClient.assets.upload(
      "image",
      Buffer.from(imageBuffer),
      { filename, contentType: "image/webp" },
    );
    return { _type: "reference", _ref: asset._id };
  } catch (err) {
    console.error("[blog-cron] failed to upload image to Sanity:", err);
    return null;
  }
}

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
  author: (typeof BLOG_AUTHORS)[number];
  imageAssetRef: { _type: "reference"; _ref: string } | null;
  imageAlt: string;
  imagePrompt: string;
  keywords: string[];
}) {
  const authorSlug = author.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/'/g, "");

  let authorRef: string;
  const existingAuthor = await sanityClient.fetch<string | null>(
    `*[_type == "author" && slug.current == $slug][0]._id`,
    { slug: authorSlug },
  );
  if (existingAuthor) {
    authorRef = existingAuthor;
  } else {
    const newAuthor = await sanityWriteClient.create({
      _type: "author",
      name: author.name,
      slug: { _type: "slug", current: authorSlug },
      title: author.title,
      bio: author.bio,
    });
    authorRef = newAuthor._id;
  }

  const body = markdownToPortableText(content);

  const post = await sanityWriteClient.create({
    _type: "post",
    title,
    slug: { _type: "slug", current: slug },
    excerpt,
    body,
    author: { _type: "reference", _ref: authorRef },
    featuredImage: imageAssetRef
      ? { _type: "image", asset: imageAssetRef, alt: imageAlt }
      : undefined,
    publishedAt: new Date().toISOString(),
    status: "published",
    seo: { metaTitle: title, metaDescription: excerpt, keywords },
    generationMeta: {
      topic,
      generatedAt: new Date().toISOString(),
      model: "gpt-image-2",
      imagePrompt,
    },
  });

  return post;
}

/**
 * Run the blog cron pipeline. Fire-and-forget from the worker route's
 * perspective — caller awaits the kickoff but not the work.
 *
 * On any failure, alerts admin via Resend. Never throws to the caller.
 */
export async function runBlogCron(): Promise<void> {
  try {
    const coveredTopics = await getCoveredTopics();
    const topic = pickRandomUncoveredTopic(coveredTopics);

    if (!topic) {
      const totalTopics = BLOG_TOPICS.length;
      console.log(
        `[blog-cron] all ${totalTopics} topics covered, nothing to publish`,
      );
      await sendAdminAlert({
        subject: "Chunky Crayon: Blog topic list exhausted",
        body: `The daily blog cron ran but all ${totalTopics} topics in BLOG_TOPICS have been covered.

No new post was published today.

Next step: run the deep-research script to add new topics, then merge into BLOG_TOPICS in packages/coloring-core/src/blog/topics.ts.`,
      });
      return;
    }

    // Idempotency: re-check after picking — protects against a parallel cron
    // run (manual trigger + scheduled) racing on the same topic.
    if (await isTopicCovered(topic.topic)) {
      console.log(
        `[blog-cron] topic already covered between fetch and pick: ${topic.topic}`,
      );
      return;
    }

    console.log(`[blog-cron] generating post for topic: ${topic.topic}`);

    const meta = await generateMeta(topic.topic, topic.keywords);
    console.log(`[blog-cron] meta done: ${meta.title}`);

    const { content } = await generateContent(
      topic.topic,
      topic.keywords,
      coveredTopics,
    );
    console.log(`[blog-cron] content done (${content.length} chars)`);

    const { imagePrompt, altText } = await generateImagePromptFromClaude(
      topic.topic,
      meta.title,
    );
    console.log(`[blog-cron] image prompt done`);

    let imageAssetRef: { _type: "reference"; _ref: string } | null = null;
    let tempFileName: string | null = null;
    try {
      console.log(`[blog-cron] generating featured image (gpt-image-2)…`);
      const imageResult = await generateBlogFeaturedImage(imagePrompt);
      tempFileName = imageResult.tempFileName;
      console.log(
        `[blog-cron] image done in ${imageResult.generationTimeMs}ms, uploading to Sanity…`,
      );
      const filename = `${meta.slug}-featured.webp`;
      imageAssetRef = await uploadImageToSanity(imageResult.url, filename);
    } catch (imageError) {
      console.error(
        "[blog-cron] image step failed, continuing without featured image:",
        imageError,
      );
    }

    const author = pickRandomAuthor();

    console.log(`[blog-cron] creating Sanity post…`);
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

    if (tempFileName) {
      await cleanupBlogImage(tempFileName);
    }

    console.log(
      `[blog-cron] success: post id=${post._id} slug=${meta.slug} topic="${topic.topic}"`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[blog-cron] pipeline failed:", message, stack);

    await sendAdminAlert({
      subject: "Chunky Crayon: Blog cron failed",
      body: `The blog cron pipeline threw on the worker.

Error: ${message}

Stack:
${stack ?? "(no stack)"}

Check Hetzner journalctl for the full trace:
  journalctl -u chunky-crayon-worker --since "1 hour ago" | grep blog-cron`,
    });
  }
}
