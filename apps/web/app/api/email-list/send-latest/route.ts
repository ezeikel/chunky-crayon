import { NextResponse } from 'next/server';
import { GenerationType } from '@chunky-crayon/db';
import { sendColoringImageEmail, sendAdminAlert } from '@/app/actions/email';
import { db } from '@chunky-crayon/db';

export const maxDuration = 150;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);
    const generationType =
      (url.searchParams.get('type') as GenerationType) || GenerationType.DAILY;
    const emails = url.searchParams.get('emails');

    // Get start of today in UTC to only send emails for fresh images
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // get the most recent coloring image of the specified type created today
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType,
        createdAt: { gte: todayStart },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage) {
      const message = `No ${generationType} image generated today - skipping email`;
      console.warn(`[send-latest] ${message}`);
      await sendAdminAlert({
        subject: 'Daily email skipped - no daily image',
        body: `The daily coloring image email was skipped because no ${generationType} image was generated today.\n\nThis likely means the image generation cron at 08:00 UTC failed. Check the Vercel function logs for /api/coloring-image/generate.`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `No ${generationType.toLowerCase()} image generated today - email skipped`,
          skipped: true,
        },
        { headers: corsHeaders },
      );
    }

    // parse custom emails if provided
    const customEmails = emails
      ? emails.split(',').map((email) => email.trim())
      : undefined;

    await sendColoringImageEmail(coloringImage, generationType, customEmails);

    return NextResponse.json(
      {
        success: true,
        message: customEmails
          ? `Email sent to ${customEmails.length} specific recipients for ${generationType.toLowerCase()} coloring image`
          : `Email sent for ${generationType.toLowerCase()} coloring image`,
        ...(customEmails && { emailsSent: customEmails }),
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('Error sending coloring image email:', error);
    return NextResponse.json(
      { error: 'Failed to send coloring image email' },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};

// vercel Cron Jobs only work with GET requests
export const GET = handleRequest;
export const POST = handleRequest;
