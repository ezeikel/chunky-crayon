import { put } from '@/lib/storage';

/**
 * Video Generation Provider using Google Veo 3
 *
 * Generates animated videos from static images for social media carousels.
 * Uses image-to-video (i2v) capability to bring coloring pages to life.
 */

export type VideoGenerationResult = {
  url: string;
  tempFileName: string;
  generationTimeMs: number;
  durationSeconds: number;
};

// Veo 3 model ID
const VEO_MODEL = 'veo-3.0-generate-preview';

// Video generation config
const VIDEO_CONFIG = {
  durationSeconds: 5, // 5 seconds is ideal for social media
  aspectRatio: '1:1', // Square for Instagram/Facebook
} as const;

/**
 * Fetch an image and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

/**
 * Generate an animated video from a coloring page image using Veo 3.
 *
 * @param imageUrl - URL of the source image (PNG/JPEG)
 * @param animationPrompt - Prompt describing the desired animation
 * @returns Generated video URL and metadata
 */
export async function generateAnimationFromImage(
  imageUrl: string,
  animationPrompt: string,
): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  // eslint-disable-next-line no-console
  console.log('[VideoGeneration] Starting Veo 3 image-to-video generation');
  // eslint-disable-next-line no-console
  console.log('[VideoGeneration] Prompt:', animationPrompt);

  try {
    // For Veo 3, we need to use the predictLongRunning endpoint
    // See: https://ai.google.dev/gemini-api/docs/video
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: animationPrompt,
              image: {
                bytesBase64Encoded: await fetchImageAsBase64(imageUrl),
                mimeType: 'image/webp',
              },
            },
          ],
          parameters: {
            aspectRatio: VIDEO_CONFIG.aspectRatio,
            durationSeconds: VIDEO_CONFIG.durationSeconds,
            personGeneration: 'dont_allow', // Safe for kids content
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Veo API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check if we got an operation (async) or direct result
    if (result.name) {
      // Async operation - need to poll for completion
      const videoData = await pollForVideoCompletion(result.name);
      const generationTimeMs = Date.now() - startTime;

      // Save video to storage
      const videoBuffer = Buffer.from(videoData.videoBytes, 'base64');
      const tempFileName = `coloring-images/animations/${Date.now()}-${Math.random().toString(36).substring(2)}.mp4`;
      const { url } = await put(tempFileName, videoBuffer, {
        access: 'public',
      });

      // eslint-disable-next-line no-console
      console.log(
        `[VideoGeneration] Completed in ${generationTimeMs}ms, saved to ${url}`,
      );

      return {
        url,
        tempFileName,
        generationTimeMs,
        durationSeconds: VIDEO_CONFIG.durationSeconds,
      };
    }

    // Direct result (less common)
    if (result.predictions?.[0]?.video) {
      const generationTimeMs = Date.now() - startTime;
      const videoBuffer = Buffer.from(result.predictions[0].video, 'base64');
      const tempFileName = `coloring-images/animations/${Date.now()}-${Math.random().toString(36).substring(2)}.mp4`;
      const { url } = await put(tempFileName, videoBuffer, {
        access: 'public',
      });

      return {
        url,
        tempFileName,
        generationTimeMs,
        durationSeconds: VIDEO_CONFIG.durationSeconds,
      };
    }

    throw new Error('Unexpected Veo API response format');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[VideoGeneration] Failed:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

/**
 * Poll for video generation completion (Veo operations are async)
 */
async function pollForVideoCompletion(
  operationName: string,
  maxAttempts = 60, // 5 minutes max with 5s intervals
  intervalMs = 5000,
): Promise<{ videoBytes: string }> {
  // eslint-disable-next-line no-console
  console.log(`[VideoGeneration] Polling operation: ${operationName}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
      {
        headers: {
          'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to check operation status: ${response.status}`);
    }

    const operation = await response.json();

    if (operation.done) {
      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
      }

      // Extract video from response
      const video = operation.response?.generatedVideos?.[0]?.video;
      if (!video) {
        throw new Error('No video in completed operation response');
      }

      return { videoBytes: video };
    }

    // eslint-disable-next-line no-console
    console.log(
      `[VideoGeneration] Still processing... (attempt ${attempt + 1}/${maxAttempts})`,
    );
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video generation timed out');
}

/**
 * Check if video generation is available (API key configured)
 */
export function isVideoGenerationAvailable(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
