import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
  buildBlogSystemPrompt,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
  BLOG_TOPICS,
  BLOG_AUTHORS,
  stripEmDashes,
  expandKeywordCluster,
  researchTopSerps,
  VOICE_REF,
  HUMOR_REF,
  STORIES_REF,
  type BlogTopic,
  type ExpandedCluster,
  type SerpResearch,
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

// BLOG_TOPICS in coloring-core is a cross-brand catalogue: it includes an
// `adult-coloring` bucket meant for Coloring Habitat, not Chunky Crayon. The
// catalogue's only typing is `category: string`, so nothing stops the worker
// from picking an adult topic — and on 2026-05-13 it did exactly that
// ("Burnout Recovery Path Coloring for Professional Rejuvenation"), with
// several similar adult-leaning posts having already shipped to Sanity in
// prior weeks. Restrict CC's worker to the kid-appropriate buckets here.
const CC_BLOG_CATEGORIES: ReadonlySet<string> = new Set([
  "parenting",
  "educational",
  "seasonal",
  "themes",
  "techniques",
]);

function pickRandomUncoveredTopic(coveredTopics: string[]): BlogTopic | null {
  const covered = new Set(coveredTopics);
  const uncovered = BLOG_TOPICS.filter(
    (t) => CC_BLOG_CATEGORIES.has(t.category) && !covered.has(t.topic),
  );
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
  return {
    ...output,
    title: stripEmDashes(output.title),
    excerpt: stripEmDashes(output.excerpt),
  };
}

async function generateContent(
  topic: string,
  cluster: ExpandedCluster,
  coveredTopics: string[],
  research: SerpResearch | null,
) {
  const system = buildBlogSystemPrompt({
    voice: VOICE_REF,
    humor: HUMOR_REF,
    stories: STORIES_REF,
  });
  const { output } = await generateText({
    model: claudeModel,
    system,
    prompt: createBlogPostPrompt(topic, cluster, coveredTopics, research),
    output: Output.object({ schema: blogPostSchema }),
  });
  if (!output)
    throw new Error("[blog-cron] content generation returned no output");
  return { ...output, content: stripEmDashes(output.content) };
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
 * Find a topic by best-effort fuzzy match against BLOG_TOPICS. Used by
 * the --topic CLI override so a human doesn't have to type the exact
 * BLOG_TOPICS entry — substring match against the topic string wins.
 */
function findTopicOverride(override: string): BlogTopic | null {
  const needle = override.trim().toLowerCase();
  if (!needle) return null;
  const exact = BLOG_TOPICS.find((t) => t.topic.toLowerCase() === needle);
  if (exact) return exact;
  const substr = BLOG_TOPICS.find((t) =>
    t.topic.toLowerCase().includes(needle),
  );
  return substr ?? null;
}

export type RunBlogCronOptions = {
  /**
   * If set, skip the random-uncovered pick and use this topic instead.
   * Accepts an exact BLOG_TOPICS string or a substring (first match
   * wins). If no BLOG_TOPICS row matches, the cron exits without
   * publishing.
   */
  topicOverride?: string;
  /**
   * If true, run the pipeline up to and including content generation
   * but skip image generation and Sanity write. Console-logs the
   * assembled system prompt, user prompt, and generated content so we
   * can eyeball voice/structure without burning Sanity/R2 slots.
   */
  dryRun?: boolean;
};

/**
 * Run the blog cron pipeline. Fire-and-forget from the worker route's
 * perspective — caller awaits the kickoff but not the work.
 *
 * On any failure, alerts admin via Resend. Never throws to the caller.
 */
export async function runBlogCron(
  options: RunBlogCronOptions = {},
): Promise<void> {
  const { topicOverride, dryRun = false } = options;
  try {
    const coveredTopics = await getCoveredTopics();

    let topic: BlogTopic | null;
    if (topicOverride) {
      topic = findTopicOverride(topicOverride);
      if (!topic) {
        console.error(
          `[blog-cron] --topic="${topicOverride}" did not match any BLOG_TOPICS entry. Aborting.`,
        );
        return;
      }
      console.log(
        `[blog-cron] using topic override: "${topic.topic}" (category: ${topic.category})`,
      );
    } else {
      topic = pickRandomUncoveredTopic(coveredTopics);
    }

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
    // run (manual trigger + scheduled) racing on the same topic. Skip when
    // running with an explicit override (developer is intentionally
    // re-running) or in dry-run mode (no Sanity write happens anyway).
    if (!topicOverride && !dryRun && (await isTopicCovered(topic.topic))) {
      console.log(
        `[blog-cron] topic already covered between fetch and pick: ${topic.topic}`,
      );
      return;
    }

    console.log(`[blog-cron] generating post for topic: ${topic.topic}`);

    // ---- NEW: keyword cluster expansion (Claude Sonnet 4.5) ----
    const cluster = await expandKeywordCluster(topic);
    const clusterTotal =
      1 +
      cluster.secondary.length +
      cluster.questions.length +
      cluster.semantic.length;
    console.log(
      `[blog-cron] keyword cluster expanded: ${clusterTotal} keywords (primary=1, secondary=${cluster.secondary.length}, questions=${cluster.questions.length}, semantic=${cluster.semantic.length})`,
    );

    // ---- NEW: SERP research (Perplexity Sonar) ----
    // Failures return null and the prompt falls back to default
    // targets. Daily post availability must not regress on this step.
    const research = await researchTopSerps(topic.topic, [
      cluster.primary,
      ...cluster.secondary,
    ]);
    if (research) {
      console.log(
        `[blog-cron] SERP research returned: ${research.topResults.length} results, avg word count ${research.averageWordCount}`,
      );
    } else {
      console.log(
        `[blog-cron] SERP research returned: null (drafting with default targets)`,
      );
    }

    // ---- NEW: voice/humor/stories refs are loaded as static imports ----
    console.log(
      `[blog-cron] voice refs loaded (voice=${VOICE_REF.length} chars, humor=${HUMOR_REF.length} chars, stories=${STORIES_REF.length} chars)`,
    );

    if (dryRun) {
      const system = buildBlogSystemPrompt({
        voice: VOICE_REF,
        humor: HUMOR_REF,
        stories: STORIES_REF,
      });
      const userPrompt = createBlogPostPrompt(
        topic.topic,
        cluster,
        coveredTopics,
        research,
      );
      console.log(
        `\n[blog-cron][dry-run] ===== ASSEMBLED SYSTEM PROMPT (${system.length} chars) =====\n${system}\n[blog-cron][dry-run] ===== END SYSTEM PROMPT =====\n`,
      );
      console.log(
        `\n[blog-cron][dry-run] ===== ASSEMBLED USER PROMPT =====\n${userPrompt}\n[blog-cron][dry-run] ===== END USER PROMPT =====\n`,
      );
      const { content } = await generateContent(
        topic.topic,
        cluster,
        coveredTopics,
        research,
      );
      console.log(
        `\n[blog-cron][dry-run] ===== GENERATED CONTENT (${content.length} chars) =====\n${content}\n[blog-cron][dry-run] ===== END CONTENT =====\n`,
      );
      console.log(
        `[blog-cron][dry-run] skipping meta/image/Sanity write. Done.`,
      );
      return;
    }

    const meta = await generateMeta(topic.topic, topic.keywords);
    console.log(`[blog-cron] meta done: ${meta.title}`);

    const { content } = await generateContent(
      topic.topic,
      cluster,
      coveredTopics,
      research,
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
