import { NextResponse } from 'next/server';
import { generateRandomBlogPost, getBlogTopicStats } from '@/app/actions/blog';

export const maxDuration = 300; // Blog generation can take up to 5 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  try {
    // First check if there are uncovered topics
    const stats = await getBlogTopicStats();

    if (stats.remainingCount === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'All topics have been covered',
          stats,
        },
        { headers: corsHeaders },
      );
    }

    // Generate a new blog post
    const result = await generateRandomBlogPost();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        postId: result.postId,
        slug: result.slug,
        message: 'Successfully generated blog post',
        remainingTopics: stats.remainingCount - 1,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error generating blog post:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate blog post',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST() {
  return GET();
}
