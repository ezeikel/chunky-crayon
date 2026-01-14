import { NextResponse } from 'next/server';
import { generateFact } from '@/app/actions/generate-fact';

/**
 * GET /api/social/fact-card/generate
 *
 * Generate a new fact using AI.
 * Used by the preview page for testing.
 */
export async function GET() {
  try {
    const fact = await generateFact();
    return NextResponse.json({ fact });
  } catch (error) {
    console.error('Error generating fact:', error);
    return NextResponse.json(
      { error: 'Failed to generate fact', details: String(error) },
      { status: 500 },
    );
  }
}
