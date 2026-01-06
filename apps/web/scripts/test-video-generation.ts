/**
 * Test script for Veo 3 video generation
 *
 * This script tests the full video generation flow:
 * 1. Takes an image URL (or uses a default test image)
 * 2. Generates an animation prompt using the expert system
 * 3. Calls Veo 3 to generate the video
 * 4. Saves the video locally for artifact upload
 *
 * Run manually: npx tsx scripts/test-video-generation.ts
 * Or via GitHub Action: .github/workflows/test-video-generation.yml
 */

import * as fs from 'fs';
import * as path from 'path';

// Default test image - a simple coloring page hosted publicly
// This is a placeholder - replace with an actual test image URL from your R2 bucket
const DEFAULT_TEST_IMAGE =
  'https://pub-1cfc94960ab24040b98654839dbfe725.r2.dev/uploads/coloring-images/sample-test-unicorn.png';

async function main() {
  console.log('🎬 Starting Veo 3 Video Generation Test\n');

  // Check for API key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set');
    process.exit(1);
  }

  // Get test parameters
  const imageUrl = process.env.TEST_IMAGE_URL || DEFAULT_TEST_IMAGE;
  const customPrompt = process.env.TEST_CUSTOM_PROMPT;

  console.log(`📷 Image URL: ${imageUrl}`);

  // Create output directory
  const outputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Step 1: Generate animation prompt (if not provided)
    let animationPrompt: string;

    if (customPrompt) {
      console.log('\n📝 Using custom prompt');
      animationPrompt = customPrompt;
    } else {
      console.log('\n📝 Generating animation prompt with expert system...');

      // Import the animation prompt generator
      const { generateAnimationPromptFromImage } = await import(
        '../lib/ai/animation'
      );
      animationPrompt = await generateAnimationPromptFromImage(imageUrl);
    }

    console.log(`\n✅ Animation prompt:\n"${animationPrompt}"\n`);

    // Save prompt to file for reference
    fs.writeFileSync(
      path.join(outputDir, 'prompt.txt'),
      `Image URL: ${imageUrl}\n\nAnimation Prompt:\n${animationPrompt}`,
    );

    // Step 2: Generate video using Veo 3
    console.log('🎥 Generating video with Veo 3 (this may take a few minutes)...');
    const startTime = Date.now();

    const { generateAnimationFromImage } = await import(
      '../lib/ai/video-providers'
    );
    const result = await generateAnimationFromImage(imageUrl, animationPrompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Video generated in ${duration}s`);
    console.log(`   Duration: ${result.durationSeconds}s`);
    console.log(`   URL: ${result.url}`);

    // Step 3: Download video and save locally
    console.log('\n💾 Downloading video...');
    const videoResponse = await fetch(result.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const videoPath = path.join(outputDir, 'animation.mp4');
    fs.writeFileSync(videoPath, videoBuffer);

    console.log(`✅ Video saved to: ${videoPath}`);
    console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Save metadata
    const metadata = {
      imageUrl,
      animationPrompt,
      generatedUrl: result.url,
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
  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Save error details
    fs.writeFileSync(
      path.join(outputDir, 'error.txt'),
      `Error: ${error instanceof Error ? error.message : String(error)}\n\nStack: ${error instanceof Error ? error.stack : 'N/A'}`,
    );

    process.exit(1);
  }
}

main();
