'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashCan,
  faSpinner,
  faArrowsRotate,
} from '@fortawesome/pro-duotone-svg-icons';
import { deleteComicStrip, rerollComicStrip } from '@/app/actions/comic-strip';

const STATUS_BADGE: Record<string, string> = {
  GENERATING: 'bg-amber-100 text-amber-900',
  READY: 'bg-green-100 text-green-900',
  POSTED: 'bg-blue-100 text-blue-900',
  QC_FAILED: 'bg-red-100 text-red-900',
};

type Props = {
  strip: {
    id: string;
    slug: string;
    title: string;
    theme: string;
    status: string;
    caption: string | null;
    assembledUrl: string | null;
    socialPostResults: unknown;
    createdAt: Date;
    postedAt: Date | null;
  };
};

const ComicStripCard = ({ strip: s }: Props) => {
  const [, startTransition] = useTransition();
  const [deleteState, setDeleteState] = useState<
    'idle' | 'confirming' | 'pending' | 'error'
  >('idle');
  const [rerollState, setRerollState] = useState<
    'idle' | 'confirming' | 'pending' | 'error' | 'success'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const social =
    (s.socialPostResults as Record<
      string,
      { success: boolean; mediaId?: string }
    > | null) ?? {};

  // Re-roll only makes sense for strips that haven't gone live yet.
  const canReroll = s.status !== 'POSTED';

  const handleDelete = () => {
    if (deleteState !== 'confirming') {
      setDeleteState('confirming');
      return;
    }
    setDeleteState('pending');
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteComicStrip(s.id);
      if (!res.ok) {
        setDeleteState('error');
        setErrorMessage(res.error);
      }
      // On success, revalidatePath in the action will re-render the
      // list without this card — no further state to set.
    });
  };

  const handleReroll = () => {
    if (rerollState !== 'confirming') {
      setRerollState('confirming');
      return;
    }
    setRerollState('pending');
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await rerollComicStrip(s.id);
      if (!res.ok) {
        setRerollState('error');
        setErrorMessage(res.error);
        return;
      }
      setRerollState('success');
      setSuccessMessage(res.message);
    });
  };

  return (
    <article className="border rounded-2xl p-4 bg-card flex flex-col sm:flex-row gap-4">
      <div className="flex-shrink-0 w-full sm:w-48">
        {s.assembledUrl ? (
          <Image
            src={s.assembledUrl}
            alt={s.title}
            width={192}
            height={192}
            className="w-full h-auto rounded-xl border"
            unoptimized
          />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">
            no asset yet
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <header className="flex items-start gap-2 flex-wrap">
          <h3 className="font-bold text-lg flex-1">{s.title}</h3>
          <span
            className={`inline-block text-xs font-mono px-2 py-1 rounded ${
              STATUS_BADGE[s.status] ?? 'bg-muted'
            }`}
          >
            {s.status}
          </span>
          <span className="inline-block text-xs font-mono px-2 py-1 rounded bg-muted">
            {s.theme}
          </span>
        </header>
        <p className="text-xs text-muted-foreground mt-1">
          {s.slug} · created{' '}
          {new Date(s.createdAt).toLocaleString('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          {s.postedAt
            ? ` · posted ${new Date(s.postedAt).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`
            : ''}
        </p>
        {s.caption ? (
          <p className="text-sm mt-2 text-text-secondary line-clamp-2">
            {s.caption}
          </p>
        ) : null}
        <div className="flex gap-2 mt-3 flex-wrap text-xs">
          {(['instagram', 'facebook', 'pinterest'] as const).map((p) => {
            const r = social[p];
            return (
              <span
                key={p}
                className={`px-2 py-1 rounded font-mono ${
                  r?.success
                    ? 'bg-green-100 text-green-900'
                    : r
                      ? 'bg-red-100 text-red-900'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {p}
                {r?.success ? ' ✅' : r ? ' ❌' : ' —'}
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          {s.assembledUrl ? (
            <a
              href={s.assembledUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-crayon-orange-dark underline"
            >
              Open assembled strip ↗
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {canReroll ? (
              <button
                type="button"
                onClick={handleReroll}
                disabled={
                  rerollState === 'pending' || rerollState === 'success'
                }
                title="Delete this strip and immediately generate a new one (~14 min)"
                className={`inline-flex items-center gap-2 text-xs font-rooney-sans font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                  rerollState === 'confirming'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                }`}
              >
                {rerollState === 'pending' ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faArrowsRotate} />
                )}
                {rerollState === 'confirming'
                  ? 'Click again to confirm'
                  : rerollState === 'pending'
                    ? 'Re-rolling…'
                    : rerollState === 'success'
                      ? 'Re-rolling…'
                      : 'Re-roll'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteState === 'pending'}
              className={`inline-flex items-center gap-2 text-xs font-rooney-sans font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                deleteState === 'confirming'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-300 text-red-700 hover:bg-red-50'
              }`}
            >
              {deleteState === 'pending' ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faTrashCan} />
              )}
              {deleteState === 'confirming'
                ? 'Click again to confirm'
                : deleteState === 'pending'
                  ? 'Deleting…'
                  : 'Delete'}
            </button>
          </div>
        </div>
        {successMessage ? (
          <p className="mt-2 text-xs text-text-secondary">
            ✅ {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-2 text-xs text-destructive">⚠️ {errorMessage}</p>
        ) : null}
      </div>
    </article>
  );
};

export default ComicStripCard;
