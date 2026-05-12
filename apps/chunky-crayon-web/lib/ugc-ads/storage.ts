/**
 * R2 path builders for the UGC ads system.
 *
 * All paths live under `ugc-personas/{handle}/`. The bucket itself is
 * selected by @one-colored-pixel/storage from R2_BUCKET in the env —
 * dev → dev bucket, prod → prod bucket, no logic needed here. This
 * module is just the source of truth for path conventions so the
 * persona generator, ad generator, admin UI, and any future cleanup
 * scripts agree on where things live.
 *
 * Convention: relative paths only (no leading slash). `put()` from
 * @one-colored-pixel/storage prepends the bucket.
 */

const PERSONAS_ROOT = 'ugc-personas';

/** Per-persona root: ugc-personas/{handle}/ */
const personaRoot = (handle: string) => `${PERSONAS_ROOT}/${handle}`;

export const personaStoragePaths = (handle: string) => ({
  /** Canonical persona face (GPT Image 2). Identity source-of-truth. */
  faceStill: `${personaRoot(handle)}/face.png`,
  /** Profile-picture variant (Nano Banana Pro identity-locked, different shot). */
  pfp: `${personaRoot(handle)}/pfp.png`,
  /** ElevenLabs voice preview MP3, saved for admin review. */
  voicePreview: `${personaRoot(handle)}/voice-preview.mp3`,
  /** Warm-up clip i. Posting order = i. */
  warmupClip: (sequence: number) =>
    `${personaRoot(handle)}/warmup/${sequence}.mp4`,
  /** Caption file paired with the clip. */
  warmupCaption: (sequence: number) =>
    `${personaRoot(handle)}/warmup/${sequence}-caption.txt`,
});

export const adStoragePaths = (handle: string, adId: string) => {
  const root = `${personaRoot(handle)}/ads/${adId}`;
  return {
    root,
    /** Final talking-head MP4 — what the operator downloads + posts. */
    finalVideo: `${root}/final.mp4`,
    /** Persona still used as Seedance --start-image. */
    still: `${root}/still.png`,
    /** ElevenLabs voiceover used as Seedance --audio. */
    voiceover: `${root}/voiceover.mp3`,
    /** ffmpeg-extracted frames at 2fps for the judge. Frame i = frame_{padded}.jpg */
    frame: (i: number) =>
      `${root}/frames/frame_${String(i).padStart(3, '0')}.jpg`,
    /** Prefix for the judge's frame batch (passed to UgcAd.framesPrefix). */
    framesPrefix: `${root}/frames/`,
    /** Judge report JSON. */
    judge: `${root}/judge.json`,
    /** Virality report JSON. */
    virality: `${root}/virality.json`,
  };
};

/**
 * Helper for the admin UI / launch scripts: given an R2 public URL,
 * yield the human-readable path (everything after the bucket domain).
 * Useful for logs without leaking the bucket name.
 */
export const r2PublicPathOnly = (publicUrl: string): string => {
  try {
    const u = new URL(publicUrl);
    return u.pathname.replace(/^\//, '');
  } catch {
    return publicUrl;
  }
};
