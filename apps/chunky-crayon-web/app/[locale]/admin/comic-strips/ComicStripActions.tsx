'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faShareNodes,
  faCheck,
  faXmark,
  faSpinner,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  triggerComicStripGeneration,
  triggerComicStripPost,
} from '@/app/actions/comic-strip';

type Status = {
  kind: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
};

type Props = {
  /** Latest strip id (for "Post now" buttons). null when there's no
   * eligible strip yet. */
  latestStripId: string | null;
};

const ComicStripActions = ({ latestStripId }: Props) => {
  const [genStatus, setGenStatus] = useState<Status>({ kind: 'idle' });
  const [postStatus, setPostStatus] = useState<Record<string, Status>>({});
  const [, startTransition] = useTransition();

  const handleGenerate = () => {
    setGenStatus({ kind: 'pending' });
    startTransition(async () => {
      const res = await triggerComicStripGeneration();
      setGenStatus(
        res.ok
          ? { kind: 'success', message: res.message }
          : { kind: 'error', message: res.error },
      );
    });
  };

  const handlePost = (platform: 'instagram' | 'facebook' | 'pinterest') => {
    setPostStatus((s) => ({ ...s, [platform]: { kind: 'pending' } }));
    startTransition(async () => {
      const res = await triggerComicStripPost(platform);
      setPostStatus((s) => ({
        ...s,
        [platform]: res.ok
          ? {
              kind: 'success',
              message: `posted: ${res.platforms[platform]?.mediaId ?? '(no id)'}`,
            }
          : { kind: 'error', message: res.error },
      }));
    });
  };

  return (
    <div className="space-y-6">
      <section className="border rounded-2xl p-6 bg-card">
        <h2 className="text-xl font-bold mb-2">Generate a new strip</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Fires the worker pipeline. ~14 minutes until it lands. Refresh this
          page after that to see the result.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={genStatus.kind === 'pending'}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-crayon-orange text-white font-rooney-sans font-bold disabled:opacity-60"
        >
          {genStatus.kind === 'pending' ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faWandMagicSparkles} />
          )}
          {genStatus.kind === 'pending' ? 'Triggering…' : 'Generate now'}
        </button>
        {genStatus.message ? (
          <p
            className={`mt-3 text-sm ${
              genStatus.kind === 'error'
                ? 'text-destructive'
                : 'text-text-secondary'
            }`}
          >
            {genStatus.kind === 'success' ? '✅ ' : '⚠️ '}
            {genStatus.message}
          </p>
        ) : null}
      </section>

      <section className="border rounded-2xl p-6 bg-card">
        <h2 className="text-xl font-bold mb-2">Post latest strip</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {latestStripId
            ? 'Posts the most recent READY strip to the chosen platform. Idempotent — already-posted platforms are skipped.'
            : 'No eligible strip yet. Generate one first.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['instagram', 'facebook', 'pinterest'] as const).map((platform) => {
            const s = postStatus[platform] ?? { kind: 'idle' };
            return (
              <button
                key={platform}
                type="button"
                onClick={() => handlePost(platform)}
                disabled={!latestStripId || s.kind === 'pending'}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-crayon-orange text-crayon-orange-dark font-rooney-sans font-bold capitalize disabled:opacity-60"
              >
                {s.kind === 'pending' ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : s.kind === 'success' ? (
                  <FontAwesomeIcon icon={faCheck} />
                ) : s.kind === 'error' ? (
                  <FontAwesomeIcon icon={faXmark} />
                ) : (
                  <FontAwesomeIcon icon={faShareNodes} />
                )}
                {platform}
              </button>
            );
          })}
        </div>
        {Object.entries(postStatus).map(([platform, s]) =>
          s.message ? (
            <p
              key={platform}
              className={`mt-2 text-xs ${
                s.kind === 'error' ? 'text-destructive' : 'text-text-secondary'
              }`}
            >
              <span className="capitalize">{platform}</span>: {s.message}
            </p>
          ) : null,
        )}
      </section>
    </div>
  );
};

export default ComicStripActions;
