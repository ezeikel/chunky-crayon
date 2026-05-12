/**
 * Higgsfield CLI wrapper — single helper used by all visual-gen modules
 * in `lib/ugc-ads/*` (still-generator, warmup-generator, video-generator,
 * virality).
 *
 * Why CLI, not HTTP: Higgsfield's HTTP API is not publicly documented;
 * the CLI is what they support. Shelling out is uglier in Node, but
 * adding undocumented HTTP-shape assumptions to our system is a bigger
 * bet than depending on a published CLI.
 *
 * What we get back: with `--json --wait` the CLI prints a JSON array of
 * completed jobs to stdout (one entry per `--wait` job). We just need
 * `result_url`. Anything more is on the caller to look up via
 * `higgsfield generate get <id>`.
 *
 * Failure model: any non-zero exit is thrown as Error with stderr
 * appended. Wait timeouts are passed through (`--wait-timeout`) so the
 * caller controls how long to block.
 */

import { spawn } from 'node:child_process';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

/**
 * One Higgsfield job result. Shape mirrors what `higgsfield --json generate
 * create ... --wait` returns. We keep only the fields the system actually
 * reads — `params` and `medias` etc. are available via the raw response
 * but we don't promise stability on those across CLI versions.
 */
export type HiggsfieldJobResult = {
  id: string;
  status: 'completed' | 'failed' | string;
  jobSetType: string;
  resultUrl: string;
};

/**
 * Thrown when Higgsfield's safety classifier flags a prompt/asset as NSFW
 * and refuses to return media. Callers can catch this specifically and
 * skip the prompt (the warmup generator does this — falls back to the
 * next prompt in the pool rather than failing the whole batch).
 *
 * Note: false positives happen. We saw "Close-up of green leaves on a
 * tree branch moving gently in a breeze" get flagged. The classifier
 * is opaque and aggressive; treat it as a recoverable error.
 */
export class HiggsfieldNsfwError extends Error {
  readonly jobId: string;
  readonly prompt: string;
  constructor(jobId: string, prompt: string) {
    super(
      `[higgsfield] job ${jobId} flagged NSFW (prompt: "${prompt.slice(0, 120)}")`,
    );
    this.name = 'HiggsfieldNsfwError';
    this.jobId = jobId;
    this.prompt = prompt;
  }
}

/**
 * Thrown when Higgsfield's IP classifier flags a prompt as referencing
 * copyrighted material (named brands, "cartoon character", licensed
 * characters, recognisable product names). Treated as recoverable like
 * NSFW — the warmup generator skips and tries the next prompt.
 *
 * The classifier is aggressive: even oblique references like "a backpack
 * with a faded cartoon character" trip it without naming anything.
 * Audit the prompt pool to remove brand-coded language proactively.
 */
export class HiggsfieldIpError extends Error {
  readonly jobId: string;
  readonly prompt: string;
  constructor(jobId: string, prompt: string) {
    super(
      `[higgsfield] job ${jobId} flagged IP (prompt: "${prompt.slice(0, 120)}")`,
    );
    this.name = 'HiggsfieldIpError';
    this.jobId = jobId;
    this.prompt = prompt;
  }
}

/** Args passed to `higgsfield generate create`. */
export type RunHiggsfieldOptions = {
  /** Model job_set_type, e.g. 'gpt_image_2', 'seedance_2_0'. */
  model: string;
  /** Required for all create calls. */
  prompt: string;
  /**
   * Media flag → path. Each entry becomes `--<flag> <path>`. Local paths
   * are auto-uploaded by the CLI; uploaded ids work too if you pass them.
   */
  media?: Partial<{
    image: string;
    startImage: string;
    endImage: string;
    video: string;
    audio: string;
  }>;
  /** Free-form model params. Become `--<key> <value>` on the CLI. */
  params?: Record<string, string | number | boolean>;
  /** Wait timeout, e.g. '20m'. Default 30m matches Marketing Studio runs. */
  waitTimeout?: string;
  /** Wait poll interval, e.g. '5s'. Default 5s. */
  waitInterval?: string;
};

// ─────────────────────────────────────────────────────────────────────
// Internal — args + spawn
// ─────────────────────────────────────────────────────────────────────

const HIGGSFIELD_BIN = process.env.HIGGSFIELD_BIN ?? 'higgsfield';

const MEDIA_FLAG: Record<
  keyof NonNullable<RunHiggsfieldOptions['media']>,
  string
> = {
  image: '--image',
  startImage: '--start-image',
  endImage: '--end-image',
  video: '--video',
  audio: '--audio',
};

function buildArgs(opts: RunHiggsfieldOptions): string[] {
  const args: string[] = ['--json', 'generate', 'create', opts.model];

  args.push('--prompt', opts.prompt);

  if (opts.media) {
    for (const [key, path] of Object.entries(opts.media)) {
      if (!path) continue;
      const flag = MEDIA_FLAG[key as keyof typeof MEDIA_FLAG];
      args.push(flag, path);
    }
  }

  if (opts.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      args.push(`--${key}`, String(value));
    }
  }

  args.push('--wait');
  args.push('--wait-timeout', opts.waitTimeout ?? '30m');
  args.push('--wait-interval', opts.waitInterval ?? '5s');

  return args;
}

/**
 * Spawn the higgsfield CLI and stream stderr through to our console so
 * progress lines (`waiting on job ...`) appear during long-running jobs.
 * stdout is captured silently and parsed as JSON at the end.
 */
function spawnHiggsfield(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(HIGGSFIELD_BIN, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const s = chunk.toString();
      stderr += s;
      // Stream stderr to the caller's console so long-running renders show
      // progress instead of hanging silently. Caller sees the same output
      // they would running `higgsfield ...` manually.
      process.stderr.write(s);
    });

    child.on('error', (err) => {
      reject(new Error(`[higgsfield] spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `[higgsfield] exited ${code}\nstderr:\n${stderr || '<empty>'}\nstdout:\n${stdout || '<empty>'}`,
          ),
        );
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────

/**
 * Run a single Higgsfield generation job synchronously (blocks until
 * complete or `waitTimeout` is hit). Returns the first job result; the
 * CLI returns an array but we always request one job, so element 0 is it.
 *
 * Throws if the CLI exits non-zero or returns JSON without a result url.
 */
export async function runHiggsfield(
  opts: RunHiggsfieldOptions,
): Promise<HiggsfieldJobResult> {
  const args = buildArgs(opts);
  const stdout = await spawnHiggsfield(args);

  // The CLI may emit progress lines before the final JSON when --wait is
  // used WITHOUT --json globally; with --json it should print only the
  // final array. Be defensive — extract the last JSON array in stdout.
  const json = extractTrailingJson(stdout);

  type RawJob = {
    id?: string;
    status?: string;
    job_set_type?: string;
    result_url?: string;
    result_urls?: string[];
  };
  const arr = json as RawJob[];
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`[higgsfield] no job returned: ${stdout.slice(0, 500)}`);
  }
  const job = arr[0];

  // Surface NSFW + IP flagging as distinct typed errors so callers
  // (warmup generator) can skip + retry with a different prompt rather
  // than fail the whole batch.
  if (job.status === 'nsfw') {
    throw new HiggsfieldNsfwError(job.id ?? '?', opts.prompt);
  }
  if (job.status === 'ip_detected') {
    throw new HiggsfieldIpError(job.id ?? '?', opts.prompt);
  }
  if (job.status !== 'completed') {
    throw new Error(
      `[higgsfield] job ${job.id} finished with status=${job.status}`,
    );
  }

  const resultUrl = job.result_url ?? job.result_urls?.[0];
  if (!resultUrl) {
    throw new Error(
      `[higgsfield] job ${job.id ?? '?'} has no result_url: ${JSON.stringify(job).slice(0, 500)}`,
    );
  }
  return {
    id: job.id ?? '',
    status: 'completed',
    jobSetType: job.job_set_type ?? opts.model,
    resultUrl,
  };
}

/**
 * Find the last `[...]` JSON array in the CLI output. Used because the
 * CLI sometimes prints a non-JSON pre-line ("waiting on job xyz") before
 * the final result block.
 */
function extractTrailingJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  // Fast path: whole stdout is JSON.
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to scan.
  }
  // Scan for the last `[` at the start of a line and parse from there.
  const lastOpen = trimmed.lastIndexOf('\n[');
  if (lastOpen >= 0) {
    return JSON.parse(trimmed.slice(lastOpen + 1));
  }
  throw new Error(
    `[higgsfield] could not parse JSON from stdout: ${trimmed.slice(0, 400)}`,
  );
}
