import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@chunky-crayon/db';
import { ADMIN_EMAILS } from '@/constants';

/**
 * DELETE /api/auth/disconnect?provider=pinterest|tiktok
 * Disconnects a social media account by deleting its OAuth token.
 */
export const DELETE = async (request: NextRequest) => {
  // Check if user is admin
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get('provider');

  if (!provider || !['pinterest', 'tiktok'].includes(provider)) {
    return NextResponse.json(
      { error: 'Invalid provider. Must be "pinterest" or "tiktok"' },
      { status: 400 },
    );
  }

  try {
    // Delete the token from the database
    await db.apiToken.delete({
      where: { provider },
    });

    console.log(`[Disconnect] Successfully disconnected ${provider}`);

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (error) {
    // Handle case where token doesn't exist
    if (
      error instanceof Error &&
      error.message.includes('Record to delete does not exist')
    ) {
      return NextResponse.json(
        { error: `${provider} is not connected` },
        { status: 404 },
      );
    }

    console.error(`[Disconnect] Error disconnecting ${provider}:`, error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 },
    );
  }
};
