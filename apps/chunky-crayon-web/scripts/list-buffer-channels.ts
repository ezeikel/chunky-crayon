#!/usr/bin/env tsx

/**
 * Lists every connected Buffer channel across all organizations on the
 * account, grouped so you can copy the right ids into the per-app env
 * vars. CC and PTP share ONE Buffer account/key, so TikTok/LinkedIn
 * channel ids MUST be pinned per app or the bridge could cross-post a
 * CC reel onto PTP's channel (auto-discovery matches by service only).
 *
 * Usage:
 *   BUFFER_API_KEY=<key> pnpm buffer:channels
 *   (or put BUFFER_API_KEY in .env.local and just run `pnpm buffer:channels`)
 *
 * Then set, in each app's Vercel project (CC and PTP separately):
 *   BUFFER_CHANNEL_ID_TIKTOK=<that app's TikTok channel id>
 *   BUFFER_CHANNEL_ID_LINKEDIN=<that app's LinkedIn channel id>
 */

import { config } from 'dotenv';
import { listBufferChannels } from '@/lib/social/buffer';

// Load environment variables from .env.local (BUFFER_API_KEY)
config({ path: '.env.local' });

const main = async () => {
  if (!process.env.BUFFER_API_KEY) {
    console.error(
      '❌ BUFFER_API_KEY not set. Generate one at Buffer → Settings → API,\n' +
        '   then re-run with BUFFER_API_KEY=<key> pnpm buffer:channels\n' +
        '   (or add it to apps/chunky-crayon-web/.env.local).',
    );
    process.exit(1);
  }

  console.log('🔍 Fetching connected Buffer channels...\n');

  const channels = await listBufferChannels();

  if (channels.length === 0) {
    console.log(
      '⚠️  No channels found. Connect TikTok / LinkedIn in Buffer first.',
    );
    return;
  }

  // Group by organization for readability.
  const byOrg = new Map<string, typeof channels>();
  channels.forEach((c) => {
    const key = `${c.organizationName ?? 'Unnamed org'} (${c.organizationId})`;
    const list = byOrg.get(key) ?? [];
    list.push(c);
    byOrg.set(key, list);
  });

  byOrg.forEach((list, org) => {
    console.log(`\n🏢 ${org}`);
    list.forEach((c) => {
      const label = c.displayName ?? c.name ?? '(unnamed)';
      console.log(`  • ${c.service.padEnd(10)} ${label}`);
      console.log(`    id: ${c.id}`);
    });
  });

  // Surface the two we actually pin so they're easy to copy.
  console.log('\n──────────────────────────────────────────────');
  console.log('Pin these per app (CC and PTP each get their OWN ids):');

  // Iterate the platforms we actually bridge via Buffer. Adding a new
  // platform = one entry here, instead of a new branch per platform.
  // Keeps env-var-name conventions in sync with lib/social/buffer.ts's
  // ENV_SUFFIX map.
  const BRIDGED_SERVICES: { service: string; envVar: string; label: string }[] =
    [
      {
        service: 'tiktok',
        envVar: 'BUFFER_CHANNEL_ID_TIKTOK',
        label: 'TikTok',
      },
      {
        service: 'linkedin',
        envVar: 'BUFFER_CHANNEL_ID_LINKEDIN',
        label: 'LinkedIn',
      },
      {
        service: 'threads',
        envVar: 'BUFFER_CHANNEL_ID_THREADS',
        label: 'Threads',
      },
    ];

  for (const { service, envVar, label } of BRIDGED_SERVICES) {
    const matches = channels.filter(
      (c) => c.service?.toLowerCase() === service,
    );
    if (matches.length === 0) continue;
    console.log(`\n${label} channels:`);
    matches.forEach((c) =>
      console.log(
        `  ${envVar}=${c.id}  # ${c.displayName ?? c.name ?? c.organizationName}`,
      ),
    );
  }
  console.log('');
};

main().catch((err) => {
  console.error('❌ Failed to list Buffer channels:', err);
  process.exit(1);
});
