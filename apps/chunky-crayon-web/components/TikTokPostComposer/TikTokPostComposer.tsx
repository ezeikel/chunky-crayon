'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCheck,
  faTimes,
  faUnlink,
} from '@fortawesome/free-solid-svg-icons';
import { faTiktok } from '@fortawesome/free-brands-svg-icons';
import type { CreatorInfo } from '@/lib/tiktok';

type TikTokPostComposerProps = {
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  hasVideo: boolean;
  onClose: () => void;
  onDisconnect: () => void;
};

type PostState = 'loading' | 'composing' | 'posting' | 'success' | 'error';

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Public',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

const TikTokPostComposer = ({
  artworkId,
  artworkTitle,
  artworkImageUrl,
  hasVideo,
  onClose,
  onDisconnect,
}: TikTokPostComposerProps) => {
  const [state, setState] = useState<PostState>('loading');
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [caption, setCaption] = useState(artworkTitle || '');
  const [privacyLevel, setPrivacyLevel] = useState('SELF_ONLY');
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch creator info on mount (required by TikTok review)
  useEffect(() => {
    const loadCreatorInfo = async () => {
      try {
        const { getCreatorInfo } = await import('@/app/actions/user-social');
        const info = await getCreatorInfo();
        if (info) {
          setCreatorInfo(info);
          // Set defaults from creator's settings
          setDisableDuet(info.duetDisabled);
          setDisableStitch(info.stitchDisabled);
          setDisableComment(info.commentDisabled);
          // Default to most restrictive available option
          if (info.privacyLevelOptions.includes('SELF_ONLY')) {
            setPrivacyLevel('SELF_ONLY');
          } else {
            setPrivacyLevel(info.privacyLevelOptions[0]);
          }
          setState('composing');
        } else {
          setError('Could not load TikTok account info. Please reconnect.');
          setState('error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setState('error');
      }
    };

    loadCreatorInfo();
  }, []);

  const handlePublish = async () => {
    setState('posting');
    setError(null);

    try {
      const response = await fetch('/api/social/tiktok/user-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId,
          caption,
          privacyLevel,
          disableDuet,
          disableStitch,
          disableComment,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setState('success');
      } else {
        setError(data.error || 'Failed to post');
        setState('composing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setState('composing');
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <FontAwesomeIcon
          icon={faSpinner}
          className="text-2xl text-primary animate-spin"
        />
        <p className="text-sm text-muted-foreground">
          Loading TikTok account...
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <FontAwesomeIcon icon={faCheck} className="text-2xl text-green-600" />
        </div>
        <h3 className="text-lg font-bold">Posted to TikTok!</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Your artwork has been submitted to TikTok. It may take a moment to
          appear on your profile.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  if (state === 'error' && !creatorInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
          <FontAwesomeIcon icon={faTimes} className="text-2xl text-red-600" />
        </div>
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 rounded-lg border border-border font-semibold"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Creator identity (required by TikTok review) */}
      {creatorInfo && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          {creatorInfo.creatorAvatar && (
            <Image
              src={creatorInfo.creatorAvatar}
              alt={creatorInfo.creatorNickname}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {creatorInfo.creatorNickname}
            </p>
            <p className="text-xs text-muted-foreground">
              Posting to your TikTok account
            </p>
          </div>
          <FontAwesomeIcon icon={faTiktok} className="text-lg" />
        </div>
      )}

      {/* Content preview */}
      <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden bg-muted">
        <Image
          src={artworkImageUrl}
          alt={artworkTitle}
          fill
          className="object-cover"
        />
        {hasVideo && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Video
          </div>
        )}
      </div>

      {/* Caption editor */}
      <div>
        <label
          htmlFor="tiktok-caption"
          className="text-sm font-medium text-foreground"
        >
          Caption
        </label>
        <textarea
          id="tiktok-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 150))}
          rows={3}
          maxLength={150}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Describe your artwork..."
        />
        <p className="text-xs text-muted-foreground text-right">
          {caption.length}/150
        </p>
      </div>

      {/* Privacy level (required by TikTok review) */}
      <div>
        <label
          htmlFor="tiktok-privacy"
          className="text-sm font-medium text-foreground"
        >
          Who can see this
        </label>
        <select
          id="tiktok-privacy"
          value={privacyLevel}
          onChange={(e) => setPrivacyLevel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {(creatorInfo?.privacyLevelOptions || ['SELF_ONLY']).map((level) => (
            <option key={level} value={level}>
              {PRIVACY_LABELS[level] || level}
            </option>
          ))}
        </select>
      </div>

      {/* Interaction toggles (required by TikTok review) */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Interaction settings
        </p>
        <label className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Allow Duet</span>
          <input
            type="checkbox"
            checked={!disableDuet}
            onChange={(e) => setDisableDuet(!e.target.checked)}
            disabled={creatorInfo?.duetDisabled}
            className="rounded"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Allow Stitch</span>
          <input
            type="checkbox"
            checked={!disableStitch}
            onChange={(e) => setDisableStitch(!e.target.checked)}
            disabled={creatorInfo?.stitchDisabled}
            className="rounded"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Allow Comments</span>
          <input
            type="checkbox"
            checked={!disableComment}
            onChange={(e) => setDisableComment(!e.target.checked)}
            disabled={creatorInfo?.commentDisabled}
            className="rounded"
          />
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handlePublish}
          disabled={state === 'posting' || !caption.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-black text-white font-semibold disabled:opacity-50"
        >
          {state === 'posting' ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faTiktok} />
              Publish to TikTok
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDisconnect}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <FontAwesomeIcon icon={faUnlink} />
          Disconnect TikTok
        </button>
      </div>
    </div>
  );
};

export default TikTokPostComposer;
