/**
 * Daily safety net: scan the last N days of FB Page posts for comments
 * that webhooks missed (rate limits, downtime, signature failures) and
 * queue them for the process cron.
 *
 * FB-only: Instagram doesn't expose a page-wide listing of comments
 * across all posts via the Graph API, so a webhook-missed IG comment is
 * effectively unrecoverable here. FB's `/{page-id}/posts` + per-post
 * `/comments` lets us reconstruct.
 *
 * Auth: CRON_SECRET bearer.
 *
 * Direct port of the PTP `catch-up` route. Scope is intentionally narrow:
 * only top-level comments, no thread-reply reconstruction, no
 * #drawthis trigger handling (catch-up assumes the live moment has passed
 * for image requests — too late to be magical, and a stale prompt risk).
 * Caught comments go through the standard AI-reply path only.
 */
import { NextRequest, NextResponse, connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { fetchFacebookPostMessage } from '@/lib/instagram-automation';
import * as log from '@/lib/logger';

export const maxDuration = 300;

const LOOKBACK_DAYS = 7;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const { FACEBOOK_PAGE_ID } = process.env;

type FBComment = {
  id: string;
  from?: { id: string; name?: string };
  message?: string;
  created_time: string;
};

type FBPost = {
  id: string;
  created_time: string;
};

async function fetchRecentPosts(): Promise<FBPost[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const posts: FBPost[] = [];
  let url: string | null =
    `https://graph.facebook.com/v22.0/${FACEBOOK_PAGE_ID}/posts?fields=id,created_time&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;

  while (url) {
    const res: Response = await fetch(url);
    const data: { data?: FBPost[]; paging?: { next?: string } } =
      await res.json();

    if (!res.ok) {
      log.warn('catch-up: failed to fetch Page posts', {
        action: 'cron-social-comments-catchup',
        error: JSON.stringify(data),
      });
      break;
    }

    const page = data.data ?? [];
    let reachedCutoff = false;
    for (const post of page) {
      if (new Date(post.created_time) < cutoff) {
        reachedCutoff = true;
        break;
      }
      posts.push(post);
    }
    if (reachedCutoff || !data.paging?.next) break;
    url = data.paging.next;
  }

  return posts;
}

async function fetchPostComments(postId: string): Promise<FBComment[]> {
  const comments: FBComment[] = [];
  let url: string | null =
    `https://graph.facebook.com/v22.0/${postId}/comments?fields=id,from,message,created_time&limit=50&access_token=${PAGE_ACCESS_TOKEN}`;

  while (url) {
    const res: Response = await fetch(url);
    const data: { data?: FBComment[]; paging?: { next?: string } } =
      await res.json();

    if (!res.ok) {
      log.warn('catch-up: failed to fetch post comments', {
        action: 'cron-social-comments-catchup',
        postId,
        error: JSON.stringify(data),
      });
      break;
    }

    comments.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  return comments;
}

async function catchUp(request: NextRequest): Promise<NextResponse> {
  await connection();
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
    return NextResponse.json(
      { error: 'FACEBOOK_ACCESS_TOKEN or FACEBOOK_PAGE_ID missing' },
      { status: 500 },
    );
  }

  const posts = await fetchRecentPosts();
  if (posts.length === 0) {
    return NextResponse.json({ posts: 0, scannedComments: 0, queued: 0 });
  }

  const postIds = posts.map((p) => p.id);
  const existing = await db.socialCommentQueue.findMany({
    where: { postId: { in: postIds } },
    select: { commentId: true },
  });
  const existingIds = new Set(existing.map((e) => e.commentId));

  let scannedComments = 0;
  let queued = 0;
  const captionCache = new Map<string, string | null>();

  for (const post of posts) {
    const comments = await fetchPostComments(post.id);
    scannedComments += comments.length;

    for (const comment of comments) {
      if (existingIds.has(comment.id)) continue;
      if (comment.from?.id === FACEBOOK_PAGE_ID) continue;
      const message = comment.message?.trim();
      if (!message) continue;
      if (!comment.from?.id) continue;

      // Caught comments are already late so shorter jitter (30-90s)
      // before processing.
      const processAfter = new Date(
        Date.now() + (30 + Math.random() * 60) * 1000,
      );

      try {
        if (!captionCache.has(post.id)) {
          captionCache.set(post.id, await fetchFacebookPostMessage(post.id));
        }
        const caption = captionCache.get(post.id) ?? null;

        await db.socialCommentQueue.create({
          data: {
            platform: 'FACEBOOK',
            commentId: comment.id,
            postId: post.id,
            authorId: comment.from.id,
            authorUsername: comment.from.name ?? null,
            commentText: message,
            postCaption: caption,
            processAfter,
          },
        });
        queued += 1;
      } catch (err) {
        // Unique constraint — already queued by webhook between our
        // fetch and insert. Safe no-op.
        if (err instanceof Error && err.message.includes('Unique constraint')) {
          continue;
        }
        log.error(
          'catch-up: failed to queue comment',
          { action: 'cron-social-comments-catchup', commentId: comment.id },
          err instanceof Error ? err : undefined,
        );
      }
    }
  }

  const summary = { posts: posts.length, scannedComments, queued };
  log.info('Catch-up complete', {
    action: 'cron-social-comments-catchup',
    ...summary,
  });
  return NextResponse.json(summary);
}

export async function GET(request: NextRequest) {
  return catchUp(request);
}

export async function POST(request: NextRequest) {
  return catchUp(request);
}
