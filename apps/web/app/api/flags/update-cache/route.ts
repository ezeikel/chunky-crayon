import { NextRequest, NextResponse } from 'next/server';
import {
  invalidateFlagCache,
  invalidateMultipleFlagCaches,
} from '@/app/actions/flags';

export const maxDuration = 60;

/**
 * API route to invalidate feature flag caches
 * Can be triggered by PostHog webhooks or manually
 *
 * Query params:
 * - flag: Single flag key to invalidate
 * - flags: Comma-separated list of flag keys to invalidate
 *
 * If no flags specified, returns success with no-op message
 */
export const GET = async (request: NextRequest) => {
  try {
    // Basic auth check using CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify the request is authorized
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const singleFlag = searchParams.get('flag');
    const multipleFlags = searchParams.get('flags');

    const updatedTags: string[] = [];

    if (singleFlag) {
      await invalidateFlagCache(singleFlag);
      updatedTags.push(`feature:${singleFlag}`);
    } else if (multipleFlags) {
      const flagKeys = multipleFlags.split(',').map((f) => f.trim());
      await invalidateMultipleFlagCaches(flagKeys);
      updatedTags.push(...flagKeys.map((f) => `feature:${f}`));
    }

    return NextResponse.json({
      status: 'success',
      message:
        updatedTags.length > 0
          ? 'Feature flag cache updated successfully'
          : 'No flags specified to invalidate',
      timestamp: new Date().toISOString(),
      service: 'chunky-crayon-web',
      updatedTags,
    });
  } catch (error) {
    console.error('Error updating feature flag cache:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update feature flag cache',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        service: 'chunky-crayon-web',
      },
      { status: 500 },
    );
  }
};

// Also support POST for webhooks
export const POST = GET;
