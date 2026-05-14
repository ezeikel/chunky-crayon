import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
  createSatelliteBlogPostSystem,
  createSatelliteBlogPostPrompt,
  createSatelliteBlogMetaSystem,
  createSatelliteBlogMetaPrompt,
  createSatelliteBlogImagePromptSystem,
  createSatelliteBlogImagePromptPrompt,
  getSatelliteSite,
  stripEmDashes,
  type SatelliteSiteConfig,
  type SatelliteBlogTopic,
} from "@one-colored-pixel/coloring-core";
import {
  makeSatelliteReadClient,
  makeSatelliteWriteClient,
  coveredTopicsQuery,
  topicExistsQuery,
} from "./sanity.js";
import { sendAdminAlert } from "../lib/email.js";
import {
  generateSatelliteFeaturedImage,
  cleanupSatelliteBlogImage,
} from "./image-gen.js";
import { markdownToPortableText } from "./markdown-to-portable-text.js";

const claudeModel = anthropic("claude-sonnet-4-5-20250929");

async function getCoveredTopics(
  readClient: ReturnType<typeof makeSatelliteReadClient>,
): Promise<string[]> {
  try {
    const topics = await readClient.fetch<string[]>(coveredTopicsQuery);
    return topics || [];
  } catch (err) {
    console.error("[satellite-blog-cron] failed to fetch covered topics:", err);
    return [];
  }
}

async function isTopicCovered(
  readClient: ReturnType<typeof makeSatelliteReadClient>,
  topic: string,
): Promise<boolean> {
  try {
    return Boolean(await readClient.fetch(topicExistsQuery, { topic }));
  } catch {
    return false;
  }
}

function pickRandomUncoveredTopic(
  site: SatelliteSiteConfig,
  coveredTopics: string[],
): SatelliteBlogTopic | null {
  const uncovered = site.topics.filter((t) => !coveredTopics.includes(t.topic));
  if (uncovered.length === 0) return null;
  return uncovered[Math.floor(Math.random() * uncovered.length)] ?? null;
}

async function generateMeta(
  site: SatelliteSiteConfig,
  topic: string,
  keywords: string[],
) {
  const { output } = await generateText({
    model: claudeModel,
    system: createSatelliteBlogMetaSystem(site),
    prompt: createSatelliteBlogMetaPrompt(topic, keywords),
    output: Output.object({ schema: blogMetaSchema }),
  });
  if (!output)
    throw new Error("[satellite-blog-cron] meta generation returned no output");
  return {
    ...output,
    title: stripEmDashes(output.title),
    excerpt: stripEmDashes(output.excerpt),
  };
}

async function generateContent(
  site: SatelliteSiteConfig,
  topic: string,
  keywords: string[],
  coveredTopics: string[],
) {
  const { output } = await generateText({
    model: claudeModel,
    system: createSatelliteBlogPostSystem(site),
    prompt: createSatelliteBlogPostPrompt(topic, keywords, coveredTopics),
    output: Output.object({ schema: blogPostSchema }),
  });
  if (!output)
    throw new Error(
      "[satellite-blog-cron] content generation returned no output",
    );
  return { ...output, content: stripEmDashes(output.content) };
}

async function generateImagePromptFromClaude(
  site: SatelliteSiteConfig,
  topic: string,
  postTitle: string,
) {
  const { output } = await generateText({
    model: claudeModel,
    system: createSatelliteBlogImagePromptSystem(site),
    prompt: createSatelliteBlogImagePromptPrompt(topic, postTitle),
    output: Output.object({ schema: blogImagePromptSchema }),
  });
  if (!output)
    throw new Error(
      "[satellite-blog-cron] image prompt generation returned no output",
    );
  return output;
}

async function uploadImageToSanity(
  writeClient: ReturnType<typeof makeSatelliteWriteClient>,
  imageUrl: string,
  filename: string,
): Promise<{ _type: "reference"; _ref: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const asset = await writeClient.assets.upload(
      "image",
      Buffer.from(imageBuffer),
      { filename, contentType: "image/png" },
    );
    return { _type: "reference", _ref: asset._id };
  } catch (err) {
    console.error(
      "[satellite-blog-cron] failed to upload image to Sanity:",
      err,
    );
    return null;
  }
}

async function createSanityPost(
  site: SatelliteSiteConfig,
  writeClient: ReturnType<typeof makeSatelliteWriteClient>,
  {
    title,
    slug,
    excerpt,
    content,
    topic,
    imageAssetRef,
    imageAlt,
  }: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    topic: string;
    imageAssetRef: { _type: "reference"; _ref: string } | null;
    imageAlt: string;
  },
) {
  const body = markdownToPortableText(content);

  const post = await writeClient.create({
    _type: "post",
    title,
    slug: { _type: "slug", current: slug },
    excerpt,
    body,
    heroImage: imageAssetRef
      ? { _type: "image", asset: imageAssetRef, alt: imageAlt }
      : undefined,
    publishedAt: new Date().toISOString(),
    siteSlug: site.slug,
    sourceTopic: topic,
  });

  return post;
}

/**
 * Run the satellite-site blog cron pipeline for a given site slug.
 *
 * Mirrors the CC blog cron pattern: fire-and-forget from the worker route's
 * perspective. Caller awaits the kickoff but not the work. On failure, alerts
 * admin via Resend; never throws to the caller.
 */
export async function runSatelliteBlogCron(siteSlug: string): Promise<void> {
  const site = getSatelliteSite(siteSlug);
  if (!site) {
    console.error(
      `[satellite-blog-cron] unknown site slug "${siteSlug}" — aborting`,
    );
    await sendAdminAlert({
      subject: `Satellite blog cron: unknown site "${siteSlug}"`,
      body: `runSatelliteBlogCron was called with siteSlug="${siteSlug}" but no entry exists in SATELLITE_SITES. Add one in packages/coloring-core/src/satellite-blog/sites.ts.`,
    });
    return;
  }

  const readClient = makeSatelliteReadClient(site.sanityDataset);
  const writeClient = makeSatelliteWriteClient(site.sanityDataset);

  try {
    const coveredTopics = await getCoveredTopics(readClient);
    const topic = pickRandomUncoveredTopic(site, coveredTopics);

    if (!topic) {
      const totalTopics = site.topics.length;
      console.log(
        `[satellite-blog-cron][${site.slug}] all ${totalTopics} topics covered, nothing to publish`,
      );
      await sendAdminAlert({
        subject: `${site.displayName}: Blog topic list exhausted`,
        body: `The daily blog cron for ${site.displayName} ran but all ${totalTopics} topics in SATELLITE_SITES["${site.slug}"].topics have been covered.

No new post was published today.

Next step: add new topics to packages/coloring-core/src/satellite-blog/sites.ts and redeploy the worker.`,
      });
      return;
    }

    if (await isTopicCovered(readClient, topic.topic)) {
      console.log(
        `[satellite-blog-cron][${site.slug}] topic already covered between fetch and pick: ${topic.topic}`,
      );
      return;
    }

    console.log(
      `[satellite-blog-cron][${site.slug}] generating post for topic: ${topic.topic}`,
    );

    const meta = await generateMeta(site, topic.topic, topic.keywords);
    console.log(`[satellite-blog-cron][${site.slug}] meta done: ${meta.title}`);

    const { content } = await generateContent(
      site,
      topic.topic,
      topic.keywords,
      coveredTopics,
    );
    console.log(
      `[satellite-blog-cron][${site.slug}] content done (${content.length} chars)`,
    );

    const { imagePrompt, altText } = await generateImagePromptFromClaude(
      site,
      topic.topic,
      meta.title,
    );
    console.log(`[satellite-blog-cron][${site.slug}] image prompt done`);

    let imageAssetRef: { _type: "reference"; _ref: string } | null = null;
    let tempFileName: string | null = null;
    try {
      console.log(
        `[satellite-blog-cron][${site.slug}] generating featured image (gpt-image-2)…`,
      );
      const imageResult = await generateSatelliteFeaturedImage(
        imagePrompt,
        site.imageStylePrompt,
      );
      tempFileName = imageResult.tempFileName;
      console.log(
        `[satellite-blog-cron][${site.slug}] image done in ${imageResult.generationTimeMs}ms, uploading to Sanity…`,
      );
      const filename = `${meta.slug}-featured.png`;
      imageAssetRef = await uploadImageToSanity(
        writeClient,
        imageResult.url,
        filename,
      );
    } catch (imageError) {
      console.error(
        `[satellite-blog-cron][${site.slug}] image step failed, continuing without featured image:`,
        imageError,
      );
    }

    console.log(`[satellite-blog-cron][${site.slug}] creating Sanity post…`);
    const post = await createSanityPost(site, writeClient, {
      title: meta.title,
      slug: meta.slug,
      excerpt: meta.excerpt,
      content,
      topic: topic.topic,
      imageAssetRef,
      imageAlt: altText,
    });

    if (tempFileName) {
      await cleanupSatelliteBlogImage(tempFileName);
    }

    console.log(
      `[satellite-blog-cron][${site.slug}] success: post id=${post._id} slug=${meta.slug} topic="${topic.topic}"`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[satellite-blog-cron][${site.slug}] pipeline failed:`,
      message,
      stack,
    );

    await sendAdminAlert({
      subject: `${site.displayName}: Blog cron failed`,
      body: `The satellite blog cron pipeline threw on the worker for site "${site.slug}".

Error: ${message}

Stack:
${stack ?? "(no stack)"}

Check Hetzner journalctl for the full trace:
  journalctl -u chunky-crayon-worker --since "1 hour ago" | grep satellite-blog-cron`,
    });
  }
}
