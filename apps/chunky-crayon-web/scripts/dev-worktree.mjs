/**
 * dev:worktree — run the dev server from a git worktree without the
 * auth-redirect breakage.
 *
 * The problem: a worktree is a second copy of the app. Run `next dev`
 * in it alongside the main checkout and Next picks the next free port
 * (3001, 3002, ...). But `.env.local` is copied from the main checkout
 * with `NEXTAUTH_URL=http://localhost:3000`, so NextAuth issues every
 * sign-in redirect to :3000 — you bounce out of the worktree and can't
 * test logged-in flows.
 *
 * This script:
 *   1. Pins a dedicated worktree port (3100) so it never collides with
 *      the main checkout (:3000) or coloring-habitat-web (:3001).
 *   2. Rewrites `NEXTAUTH_URL` in this worktree's `.env.local` to match
 *      that port (idempotent — only touches the line if it's wrong).
 *   3. Execs `next dev` on the pinned port.
 *
 * `.env.local` is gitignored, so the rewrite is local-only and safe.
 *
 * Usage (from apps/chunky-crayon-web in any worktree):
 *   pnpm dev:worktree
 *
 * The main checkout still uses plain `pnpm dev` on :3000 — untouched.
 */

import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WORKTREE_PORT = 3100;
const ENV_PATH = join(process.cwd(), '.env.local');

// A worktree's `--git-dir` lives under `<main>/.git/worktrees/<name>`,
// whereas `--git-common-dir` always points at the main `.git`. They
// differ only inside a worktree.
const isWorktree = (() => {
  try {
    const gitDir = execSync('git rev-parse --git-dir', {
      encoding: 'utf8',
    }).trim();
    return gitDir.includes('/.git/worktrees/');
  } catch {
    return false;
  }
})();

if (!isWorktree) {
  console.error(
    '[dev:worktree] Not in a git worktree — use `pnpm dev` in the main checkout.',
  );
  process.exit(1);
}

// Rewrite NEXTAUTH_URL to the pinned worktree port, if needed.
const desiredUrl = `http://localhost:${WORKTREE_PORT}`;
if (existsSync(ENV_PATH)) {
  const env = readFileSync(ENV_PATH, 'utf8');
  const line = `NEXTAUTH_URL="${desiredUrl}"`;
  if (env.includes(`NEXTAUTH_URL=`)) {
    const next = env.replace(/^NEXTAUTH_URL=.*$/m, line);
    if (next !== env) {
      writeFileSync(ENV_PATH, next);
      console.log(`[dev:worktree] NEXTAUTH_URL -> ${desiredUrl}`);
    } else {
      console.log(`[dev:worktree] NEXTAUTH_URL already ${desiredUrl}`);
    }
  } else {
    writeFileSync(ENV_PATH, `${env.trimEnd()}\n${line}\n`);
    console.log(`[dev:worktree] NEXTAUTH_URL added -> ${desiredUrl}`);
  }
} else {
  console.warn(
    `[dev:worktree] No .env.local found — copy it from the main checkout (see feedback_worktrees_copy_env_files).`,
  );
}

// Clear a stale Turbopack dev lock. When a previous `next dev` crashes
// (or is killed hard) it can leave `.next/dev/lock` behind, and the
// next start aborts with "Unable to acquire lock". Removing it on
// startup is safe here — this script is the single entry point and we
// kill any prior process before relying on the port anyway.
const lockPath = join(process.cwd(), '.next', 'dev', 'lock');
if (existsSync(lockPath)) {
  try {
    rmSync(lockPath);
    console.log('[dev:worktree] cleared stale .next/dev/lock');
  } catch {
    // Non-fatal — if it's genuinely held, `next dev` will say so.
  }
}

console.log(`[dev:worktree] starting dev server on :${WORKTREE_PORT}`);
const child = spawn(
  'next',
  ['dev', '--turbopack', '--port', String(WORKTREE_PORT)],
  { stdio: 'inherit', shell: true },
);
child.on('exit', (code) => process.exit(code ?? 0));
