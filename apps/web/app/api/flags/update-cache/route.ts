import { NextRequest, NextResponse } from 'next/server';
import { onFlagChanged } from '@/app/actions/flags';

export const maxDuration = 60;

export const GET = async (request: NextRequest) => {
  try {
    // Basic auth check using CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify the request is authorized (either from Vercel cron or manual trigger with auth)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the onFlagChanged function to update the cache
    await onFlagChanged();

    return NextResponse.json({
      status: 'success',
      message: 'Feature flag cache updated successfully',
      timestamp: new Date().toISOString(),
      service: 'chunky-crayon-web',
      updatedTags: ['feature:showAuthButtons'],
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

// Also support POST for manual triggers from dashboards or webhooks
export const POST = GET;
