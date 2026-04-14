import 'dotenv/config';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { readFile, stat } from 'node:fs/promises';

import { recordColoringSession } from './record/session.js';

const app = new Hono();
app.use('*', logger());

// Bearer auth for /publish/* — only trusted crons should call these.
app.use('/publish/*', async (c, next) => {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return next(); // local dev convenience
  if (c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'chunky-crayon-worker' }),
);

// Serve files from /tmp with Range support — Remotion's headless Chromium needs
// this to load locally-generated webm/mp3 during render (file:// is blocked).
app.get('/tmp/:filename', async (c) => {
  const filename = c.req.param('filename');
  const filePath = `/tmp/${filename}`;
  try {
    const stats = await stat(filePath);
    const data = await readFile(filePath);
    const ext = filename.split('.').pop() ?? '';
    const contentType =
      ext === 'mp4' ? 'video/mp4'
      : ext === 'webm' ? 'video/webm'
      : ext === 'mp3' ? 'audio/mpeg'
      : 'application/octet-stream';

    const range = c.req.header('range');
    if (range && (ext === 'mp4' || ext === 'webm')) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stats.size - 1;
      const chunk = data.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length.toString(),
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return c.json({ error: 'Not found' }, 404);
  }
});

/**
 * End-to-end record → render → post flow. Skeleton only — at this stage it
 * just runs the Playwright recording and returns the webm path. Remotion
 * composition, voiceover, and social posting get layered on in follow-ups.
 *
 * POST /publish/next
 * Body: { image_id: string, dry_run?: boolean, sweep?: 'diagonal' | 'horizontal' }
 */
app.post('/publish/next', async (c) => {
  const body = await c.req.json<{
    image_id: string;
    dry_run?: boolean;
    sweep?: 'diagonal' | 'horizontal';
  }>();

  if (!body.image_id) {
    return c.json({ error: 'image_id is required' }, 400);
  }

  const origin = process.env.CC_ORIGIN ?? 'http://localhost:3000';
  const recording = await recordColoringSession({
    imageId: body.image_id,
    origin,
    sweep: body.sweep ?? 'diagonal',
    outDir: '/tmp/chunky-crayon-worker',
  });

  return c.json({
    ok: true,
    dry_run: !!body.dry_run,
    recording,
    // TODO: composite via Remotion, upload to R2, post to IG/FB/TikTok/Pinterest.
    note: 'record-only stub — Remotion + social posting still to land',
  });
});

const port = parseInt(process.env.PORT ?? '3030', 10);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`[chunky-crayon-worker] listening on http://0.0.0.0:${port}`);
});
