import { NextResponse } from 'next/server';
import { GenerationType } from '@chunky-crayon/db';
import { sendColoringImageEmail } from '@/app/actions';
import { db } from '@chunky-crayon/db';

export const dynamic = 'force-dynamic';

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

    // get the most recent coloring image of the specified type
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage) {
      throw new Error(
        `No ${generationType.toLowerCase()} coloring image found to send`,
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
