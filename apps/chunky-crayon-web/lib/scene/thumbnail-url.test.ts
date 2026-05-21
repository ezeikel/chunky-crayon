import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveThumbnailUrl } from './thumbnail-url';

/**
 * Trivial — but a busted resolver = every thumbnail tile breaks in prod,
 * so the contract gets pinned. `process.env` is mutated in each test
 * and restored after.
 */

const stub = (value: string | undefined): void => {
  vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', value ?? '');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveThumbnailUrl', () => {
  it('returns null when the key is null', () => {
    stub('https://assets.chunkycrayon.com');
    expect(resolveThumbnailUrl(null)).toBeNull();
  });

  it('returns null when the env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', '');
    expect(resolveThumbnailUrl('scene-thumbnails/subject/dog.png')).toBeNull();
  });

  it('joins base + key with a single slash', () => {
    stub('https://assets.chunkycrayon.com');
    expect(resolveThumbnailUrl('scene-thumbnails/subject/dog.png')).toBe(
      'https://assets.chunkycrayon.com/scene-thumbnails/subject/dog.png',
    );
  });

  it('strips a trailing slash on the base before joining', () => {
    stub('https://assets.chunkycrayon.com/');
    expect(resolveThumbnailUrl('scene-thumbnails/location/beach.png')).toBe(
      'https://assets.chunkycrayon.com/scene-thumbnails/location/beach.png',
    );
  });
});
