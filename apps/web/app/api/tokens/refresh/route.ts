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

const handleRequest = async () => {
  try {
    const results = {
      pinterest: null as string | null,
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
