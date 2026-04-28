#!/usr/bin/env tsx
/**
 * One-off email builder for the V2 demo-reel TikTok test posts.
 *
 * Generates the variant-aware TikTok caption for each of the 3 test reels
 * and emails them to SOCIAL_DIGEST_EMAIL alongside the reel + cover URLs
 * so they can be uploaded to TikTok manually.
 *
 * Run with:
 *   DATABASE_URL=<prod> pnpm tsx scripts/send-tiktok-test-email.ts
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

import { Resend } from 'resend';
import { db } from '@one-colored-pixel/db';
import { generateTikTokCaption } from '@/app/actions/social';
import { getResendFromAddress } from '@/lib/email-config';

const IDS = [
  'cmohqxwzj000004kwjqeidw6a', // Bumblebee — TEXT
  'cmohqz5j2000104kw1uc2c708', // Wildflower — IMAGE
  'cmohr0oxp000004jp3c8pvcxu', // Space Bear — VOICE
];

const variantEmoji: Record<string, string> = {
  TEXT: '⌨️',
  IMAGE: '📸',
  VOICE: '🎙️',
};

const main = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SOCIAL_DIGEST_EMAIL;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    process.exit(1);
  }
  if (!to) {
    console.error('SOCIAL_DIGEST_EMAIL not set');
    process.exit(1);
  }
  const resend = new Resend(apiKey);

  type Section = {
    title: string;
    variant: string;
    reelUrl: string;
    coverUrl: string;
    caption: string;
  };

  const sections: Section[] = [];

  for (const id of IDS) {
    const image = await db.coloringImage.findUnique({ where: { id } });
    if (!image || !image.demoReelUrl || !image.demoReelCoverUrl) {
      console.warn(`[${id}] missing reel/cover, skipping`);
      continue;
    }
    const caption = await generateTikTokCaption(image, 'demo_reel');
    sections.push({
      title: image.title,
      variant: image.demoReelVariant ?? 'UNKNOWN',
      reelUrl: image.demoReelUrl,
      coverUrl: image.demoReelCoverUrl,
      caption,
    });
  }

  // Plain HTML — no React Email template needed for a one-off ad-hoc email.
  const sectionHtml = sections
    .map(
      (s) => `
    <div style="margin: 24px 0; padding: 20px; background: #fff8f0; border-radius: 12px; border: 1px solid #f0e0c0;">
      <h2 style="margin: 0 0 8px; font-size: 20px;">${variantEmoji[s.variant] ?? ''} ${s.title}</h2>
      <p style="margin: 0 0 16px; color: #888; font-size: 13px;">Variant: <strong>${s.variant}</strong></p>

      <div style="margin: 16px 0;">
        <a href="${s.reelUrl}" style="display: inline-block; padding: 10px 16px; background: #ff7a40; color: white; text-decoration: none; border-radius: 8px; margin-right: 8px; font-weight: 600;">📥 Download Reel (mp4)</a>
        <a href="${s.coverUrl}" style="display: inline-block; padding: 10px 16px; background: #555; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">🖼 Download Cover (jpg)</a>
      </div>

      <p style="margin: 16px 0 8px; font-weight: 600;">TikTok Caption (copy-paste):</p>
      <pre style="margin: 0; padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px; white-space: pre-wrap; font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.5;">${s.caption.replace(/</g, '&lt;')}</pre>
    </div>
  `,
    )
    .join('\n');

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 28px; margin: 0 0 8px;">🎬 V2 Demo Reel Test — TikTok Posts</h1>
      <p style="margin: 0 0 24px; color: #666;">3 reels ready for manual TikTok upload. Download the mp4 + cover, then paste the caption.</p>
      ${sectionHtml}
      <p style="margin: 24px 0 0; color: #999; font-size: 12px;">IG + FB were posted automatically via /api/social/post. Pinterest skipped (manual reels-only test).</p>
    </div>
  `;

  const result = await resend.emails.send({
    from: getResendFromAddress('no-reply', 'Chunky Crayon'),
    to,
    subject: `🎬 V2 Demo Reel Test — TikTok payloads (${sections.length} reels)`,
    html,
  });

  console.log('Sent:', result);
  await db.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
