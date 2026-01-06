/**
 * Test script for Veo 3 video generation
 *
 * This script tests the full video generation flow:
 * 1. Fetches a coloring image from the database (latest daily, latest any, or specific ID)
 * 2. Uses stored animation prompt or generates a new one
 * 3. Calls Veo 3 to generate the video
 * 4. Saves the video locally for artifact upload
 *
 * Environment variables:
 * - TEST_IMAGE_SOURCE: 'latest_daily' | 'latest_any' | 'specific_id'
 * - TEST_COLORING_IMAGE_ID: ID of specific image (when source is 'specific_id')
 * - TEST_PROMPT_SOURCE: 'stored_or_generate' | 'generate_new' | 'custom'
 * - TEST_CUSTOM_PROMPT: Custom prompt text (when source is 'custom')
 *
 * Run manually: npx tsx scripts/test-video-generation.ts
 * Or via GitHub Action: .github/workflows/test-video-generation.yml
 */

import * as fs from 'fs';
import * as path from 'path';
import { db, GenerationType } from '@chunky-crayon/db';

type ImageSource = 'latest_daily' | 'latest_any' | 'specific_id';
type PromptSource = 'stored_or_generate' | 'generate_new' | 'custom';

async function getColoringImage(source: ImageSource, specificId?: string) {
  switch (source) {
    case 'specific_id':
      if (!specificId) {
        throw new Error('specific_id source requires TEST_COLORING_IMAGE_ID');
      }
      const specific = await db.coloringImage.findUnique({
        where: { id: specificId },
      });
      if (!specific) {
        throw new Error(`Coloring image not found: ${specificId}`);
      }
      return specific;

    case 'latest_daily':
      const latestDaily = await db.coloringImage.findFirst({
        where: { generationType: GenerationType.DAILY },
        orderBy: { createdAt: 'desc' },
      });
      if (!latestDaily) {
        throw new Error('No daily coloring images found');
      }
      return latestDaily;

    case 'latest_any':
    default:
      const latestAny = await db.coloringImage.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!latestAny) {
        throw new Error('No coloring images found');
      }
      return latestAny;
  }
}

async function getAnimationPrompt(
  source: PromptSource,
  storedPrompt: string | null,
  imageUrl: string,
  customPrompt?: string,
): Promise<{ prompt: string; source: string }> {
  switch (source) {
    case 'custom':
      if (!customPrompt) {
        throw new Error('custom source requires TEST_CUSTOM_PROMPT');
      }
      return { prompt: customPrompt, source: 'custom' };

    case 'generate_new':
      console.log('📝 Generating new animation prompt with expert system...');
      const { generateAnimationPromptFromImage } = await import(
        '../lib/ai/animation'
      );
      const newPrompt = await generateAnimationPromptFromImage(imageUrl);
      return { prompt: newPrompt, source: 'generated_new' };

    case 'stored_or_generate':
    default:
      if (storedPrompt) {
        console.log('📝 Using stored animation prompt from database');
        return { prompt: storedPrompt, source: 'stored' };
      }
      console.log('📝 No stored prompt, generating new one...');
      const { generateAnimationPromptFromImage: gen } = await import(
        '../lib/ai/animation'
      );
      const generatedPrompt = await gen(imageUrl);
      return { prompt: generatedPrompt, source: 'generated_fallback' };
  }
}

async function main() {
  console.log('🎬 Starting Veo 3 Video Generation Test\n');

  // Check for required env vars
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  // Get test parameters
  const imageSource = (process.env.TEST_IMAGE_SOURCE ||
    'latest_daily') as ImageSource;
  const specificId = process.env.TEST_COLORING_IMAGE_ID;
  const promptSource = (process.env.TEST_PROMPT_SOURCE ||
    'stored_or_generate') as PromptSource;
  const customPrompt = process.env.TEST_CUSTOM_PROMPT;

  console.log(`📋 Configuration:`);
  console.log(`   Image source: ${imageSource}`);
  console.log(`   Prompt source: ${promptSource}`);
  if (specificId) console.log(`   Specific ID: ${specificId}`);
  if (customPrompt) console.log(`   Custom prompt: ${customPrompt.slice(0, 50)}...`);

  // Create output directory
  const outputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Step 1: Fetch coloring image from database
    console.log('\n🔍 Fetching coloring image from database...');
    const coloringImage = await getColoringImage(imageSource, specificId);

    console.log(`\n✅ Found coloring image:`);
    console.log(`   ID: ${coloringImage.id}`);
    console.log(`   Title: ${coloringImage.title}`);
    console.log(`   Type: ${coloringImage.generationType}`);
    console.log(`   Has stored prompt: ${!!coloringImage.animationPrompt}`);
    console.log(`   URL: ${coloringImage.url}`);

    if (!coloringImage.url) {
      throw new Error('Coloring image has no URL');
    }

    // Step 2: Get animation prompt
    const { prompt: animationPrompt, source: promptUsed } =
      await getAnimationPrompt(
        promptSource,
        coloringImage.animationPrompt,
        coloringImage.url,
        customPrompt,
      );

    console.log(`\n✅ Animation prompt (${promptUsed}):\n"${animationPrompt}"\n`);

    // Save image info and prompt to file
    fs.writeFileSync(
      path.join(outputDir, 'prompt.txt'),
      [
        `Coloring Image ID: ${coloringImage.id}`,
        `Title: ${coloringImage.title}`,
        `Type: ${coloringImage.generationType}`,
        `Image URL: ${coloringImage.url}`,
        ``,
        `Prompt Source: ${promptUsed}`,
        `Animation Prompt:`,
        animationPrompt,
      ].join('\n'),
    );

    // Step 3: Generate video using Veo 3
    console.log('🎥 Generating video with Veo 3 (this may take a few minutes)...');
    const startTime = Date.now();

    const { generateAnimationFromImage } = await import(
      '../lib/ai/video-providers'
    );
    const result = await generateAnimationFromImage(
      coloringImage.url,
      animationPrompt,
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Video generated in ${duration}s`);
    console.log(`   Duration: ${result.durationSeconds}s`);
    console.log(`   URL: ${result.url}`);

    // Step 4: Download video and save locally
    console.log('\n💾 Downloading video...');
    const videoResponse = await fetch(result.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const videoPath = path.join(outputDir, 'animation.mp4');
    fs.writeFileSync(videoPath, videoBuffer);

    console.log(`✅ Video saved to: ${videoPath}`);
    console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Save metadata
    const metadata = {
      coloringImageId: coloringImage.id,
      coloringImageTitle: coloringImage.title,
      generationType: coloringImage.generationType,
      imageUrl: coloringImage.url,
      promptSource: promptUsed,
      animationPrompt,
      generatedVideoUrl: result.url,
      durationSeconds: result.durationSeconds,
      generationTimeMs: result.generationTimeMs,
      fileSizeBytes: videoBuffer.length,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
    );

    console.log('\n🎉 Test completed successfully!');
    console.log(`\nOutput files in: ${outputDir}`);
    console.log('  - animation.mp4 (the generated video)');
    console.log('  - prompt.txt (the animation prompt used)');
    console.log('  - metadata.json (generation details)');

    // Disconnect from database
    await db.$disconnect();
  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Save error details
    fs.writeFileSync(
      path.join(outputDir, 'error.txt'),
      `Error: ${error instanceof Error ? error.message : String(error)}\n\nStack: ${error instanceof Error ? error.stack : 'N/A'}`,
    );

    await db.$disconnect();
    process.exit(1);
  }
}

main();
