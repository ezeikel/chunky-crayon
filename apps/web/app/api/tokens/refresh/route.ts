import { NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';

export const maxDuration = 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Refresh Pinterest access token using refresh token
const refreshPinterestToken = async (refreshToken: string) => {
  const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`,
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinterest token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // seconds
    scopes: data.scope?.split(' ') || [],
  };
};

// Refresh TikTok access token using refresh token
const refreshTikTokToken = async (refreshToken: string) => {
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || (data.error?.code && data.error.code !== 'ok')) {
    throw new Error(
      `TikTok token refresh failed: ${data.error_description || data.error?.message || 'Unknown error'}`,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // seconds (24 hours = 86400)
  };
};

const handleRequest = async () => {
  try {
    const results = {
      pinterest: null as string | null,
      tiktok: null as string | null,
      errors: [] as string[],
    };

    // Check Pinterest token
    const pinterestToken = await db.apiToken.findUnique({
      where: { provider: 'pinterest' },
    });

    if (pinterestToken) {
      // Refresh if token expires within 7 days
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (pinterestToken.expiresAt < sevenDaysFromNow) {
        try {
          console.log('Pinterest token expiring soon, refreshing...');

          const newTokens = await refreshPinterestToken(
            pinterestToken.refreshToken,
          );

          // Update token in database
          await db.apiToken.update({
            where: { provider: 'pinterest' },
            data: {
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
              scopes: newTokens.scopes,
            },
          });

          results.pinterest = 'refreshed';
          console.log('Pinterest token refreshed successfully');
        } catch (error) {
          console.error('Error refreshing Pinterest token:', error);
          results.errors.push(
            `Pinterest: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } else {
        results.pinterest = 'valid';
        console.log(
          'Pinterest token still valid until:',
          pinterestToken.expiresAt,
        );
      }
    } else {
      results.pinterest = 'not_configured';
      console.log('Pinterest token not found in database');
    }

    // Check TikTok token
    const tiktokToken = await db.apiToken.findUnique({
      where: { provider: 'tiktok' },
    });

    if (tiktokToken) {
      // Refresh if token expires within 6 hours (TikTok tokens last 24 hours)
      const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

      if (tiktokToken.expiresAt < sixHoursFromNow) {
        try {
          console.log('TikTok token expiring soon, refreshing...');

          const newTokens = await refreshTikTokToken(tiktokToken.refreshToken);

          // Update token in database
          await db.apiToken.update({
            where: { provider: 'tiktok' },
            data: {
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
            },
          });

          results.tiktok = 'refreshed';
          console.log('TikTok token refreshed successfully');
        } catch (error) {
          console.error('Error refreshing TikTok token:', error);
          results.errors.push(
            `TikTok: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } else {
        results.tiktok = 'valid';
        console.log('TikTok token still valid until:', tiktokToken.expiresAt);
      }
    } else {
      results.tiktok = 'not_configured';
      console.log('TikTok token not found in database');
    }

    return NextResponse.json(
      {
        success: results.errors.length === 0,
        results,
        message:
          results.errors.length === 0
            ? 'Token check complete'
            : 'Some tokens failed to refresh',
      },
      {
        status: results.errors.length === 0 ? 200 : 500,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('Error in token refresh:', error);
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
