import { NextRequest, NextResponse } from 'next/server';
import { generateDailyScene } from '@/lib/scene-generation';

export const maxDuration = 60;

/**
 * GET /api/coloring-image/generate-scene
 *
 * Test endpoint for scene generation. Calls Perplexity Sonar
 * to generate a seasonal/trending scene description without
 * triggering image generation.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (reuse same auth pattern)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const scene = await generateDailyScene();

    return NextResponse.json({
      success: true,
      scene,
    });
  } catch (error) {
    console.error('[GenerateScene] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate scene',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
