import { Redis } from '@upstash/redis';

if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  throw new Error('Missing Upstash Redis environment variables');
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
});

export default redis;

// Redis key patterns for email list
export const REDIS_KEYS = {
  EMAILS_SET: 'coloringlist:emails',
  EMAIL_META: (email: string) => `coloringlist:meta:${email}`,
  UNSUB_FLAG: (email: string) => `coloringlist:unsub:${email}`,
  UNSUB_TOKEN: (token: string) => `coloringlist:token:${token}`,
} as const;
