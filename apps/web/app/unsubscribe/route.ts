import { NextRequest, NextResponse } from 'next/server';
import redis, { REDIS_KEYS } from '@/lib/redis';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  const email = await redis.get<string>(REDIS_KEYS.UNSUB_TOKEN(token));

  if (!email) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  // Mark email as unsubscribed
  await redis.set(REDIS_KEYS.UNSUB_FLAG(email), true);

  // Remove from email list
  await redis.srem(REDIS_KEYS.EMAILS_SET, email);

  // Update metadata
  await redis.hset(REDIS_KEYS.EMAIL_META(email), {
    tsUnsubscribed: Date.now(),
  });

  return NextResponse.redirect(`${baseUrl}/?unsub=success`, 302);
}
