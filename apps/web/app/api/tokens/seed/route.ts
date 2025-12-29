import { NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';

// One-time endpoint to seed Pinterest token from env vars into database
// After seeding, the token will auto-refresh via the /api/tokens/refresh cron
export const POST = async (request: Request) => {
  try {
    // Basic auth check - only allow with admin secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body;

    if (provider === 'pinterest') {
      if (
        !process.env.PINTEREST_ACCESS_TOKEN ||
        !process.env.PINTEREST_REFRESH_TOKEN
      ) {
        return NextResponse.json(
          {
            error:
              'Missing PINTEREST_ACCESS_TOKEN or PINTEREST_REFRESH_TOKEN env vars',
          },
          { status: 400 },
        );
      }

      // Upsert the token (create if not exists, update if exists)
      const token = await db.apiToken.upsert({
        where: { provider: 'pinterest' },
        create: {
          provider: 'pinterest',
          accessToken: process.env.PINTEREST_ACCESS_TOKEN,
          refreshToken: process.env.PINTEREST_REFRESH_TOKEN,
          // Access token expires in 30 days from now (conservative estimate)
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          scopes: ['boards:read', 'pins:read', 'pins:write'],
          metadata: {
            boardId: process.env.PINTEREST_BOARD_ID,
            seededAt: new Date().toISOString(),
          },
        },
        update: {
          accessToken: process.env.PINTEREST_ACCESS_TOKEN,
          refreshToken: process.env.PINTEREST_REFRESH_TOKEN,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          scopes: ['boards:read', 'pins:read', 'pins:write'],
          metadata: {
            boardId: process.env.PINTEREST_BOARD_ID,
            seededAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pinterest token seeded successfully',
        expiresAt: token.expiresAt,
      });
    }

    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error seeding token:', error);
    return NextResponse.json(
      { error: 'Failed to seed token' },
      { status: 500 },
    );
  }
};
