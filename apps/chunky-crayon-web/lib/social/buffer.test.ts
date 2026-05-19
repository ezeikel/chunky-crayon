import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildCreatePostVariables, isBufferBridgeEnabled } from './buffer';

describe('buildCreatePostVariables', () => {
  const base = {
    text: 'Look at this dragon coloring page! 🐉 #coloringbook #fyp',
    videoUrl: 'https://pub-x.r2.dev/reels/dragon.mp4',
    dueAt: new Date('2026-05-20T20:00:00.000Z'),
  };

  it('formats dueAt as second-precision ISO 8601 UTC (no milliseconds)', () => {
    const { input } = buildCreatePostVariables('ch_123', base);
    // Buffer expects second precision; trailing .000Z would be rejected.
    expect(input.dueAt).toBe('2026-05-20T20:00:00Z');
    expect(input.dueAt).not.toMatch(/\.\d{3}Z$/);
  });

  it('uses customScheduled mode so it publishes at the exact slot, not the queue default', () => {
    const { input } = buildCreatePostVariables('ch_123', base);
    expect(input.mode).toBe('customScheduled');
    expect(input.schedulingType).toBe('automatic');
  });

  it('emits the new [AssetInput!]! @oneOf shape with a single video key', () => {
    const { input } = buildCreatePostVariables('ch_123', base);
    expect(Array.isArray(input.assets)).toBe(true);
    expect(input.assets).toHaveLength(1);
    expect(input.assets[0]).toEqual({
      video: { url: 'https://pub-x.r2.dev/reels/dragon.mp4' },
    });
    // @oneOf: the asset object must carry exactly one key.
    expect(Object.keys(input.assets[0])).toEqual(['video']);
  });

  it('includes thumbnailUrl on the video asset only when provided', () => {
    const withThumb = buildCreatePostVariables('ch_123', {
      ...base,
      thumbnailUrl: 'https://pub-x.r2.dev/covers/dragon.jpg',
    });
    expect(withThumb.input.assets[0]).toEqual({
      video: {
        url: 'https://pub-x.r2.dev/reels/dragon.mp4',
        thumbnailUrl: 'https://pub-x.r2.dev/covers/dragon.jpg',
      },
    });

    const withoutThumb = buildCreatePostVariables('ch_123', base);
    expect(
      'thumbnailUrl' in
        (withoutThumb.input.assets[0] as { video: object }).video,
    ).toBe(false);
  });

  it('passes the channelId and full caption through unchanged', () => {
    const { input } = buildCreatePostVariables('ch_abc', base);
    expect(input.channelId).toBe('ch_abc');
    expect(input.text).toBe(base.text);
  });

  it('builds an image asset when imageUrl is given (carousel → LinkedIn)', () => {
    const { input } = buildCreatePostVariables('ch_li', {
      text: 'Today’s free coloring page',
      imageUrl: 'https://pub-x.r2.dev/daily/page.jpg',
      dueAt: new Date('2026-05-21T19:30:00.000Z'),
    });
    expect(input.assets).toHaveLength(1);
    expect(input.assets[0]).toEqual({
      image: { url: 'https://pub-x.r2.dev/daily/page.jpg' },
    });
    // @oneOf: exactly one key, and it's image not video.
    expect(Object.keys(input.assets[0])).toEqual(['image']);
  });

  it('video wins if both are set (video is the richer surface)', () => {
    const { input } = buildCreatePostVariables('ch_x', {
      text: 't',
      videoUrl: 'https://pub-x.r2.dev/v.mp4',
      imageUrl: 'https://pub-x.r2.dev/i.jpg',
      dueAt: new Date('2026-05-21T19:30:00.000Z'),
    });
    expect(Object.keys(input.assets[0])).toEqual(['video']);
  });

  it('throws if neither videoUrl nor imageUrl is provided', () => {
    expect(() =>
      buildCreatePostVariables('ch_x', {
        text: 't',
        dueAt: new Date('2026-05-21T19:30:00.000Z'),
      }),
    ).toThrow(/videoUrl or imageUrl/);
  });
});

describe('isBufferBridgeEnabled', () => {
  const orig = { ...process.env };

  beforeEach(() => {
    delete process.env.BUFFER_API_KEY;
    delete process.env.BUFFER_ENABLE_TIKTOK;
    delete process.env.BUFFER_ENABLE_LINKEDIN;
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it('is off when no API key is set, even with the flag on', () => {
    process.env.BUFFER_ENABLE_TIKTOK = 'true';
    expect(isBufferBridgeEnabled('tiktok')).toBe(false);
  });

  it('is off when the API key is set but the platform flag is missing (default-off)', () => {
    process.env.BUFFER_API_KEY = 'key';
    expect(isBufferBridgeEnabled('tiktok')).toBe(false);
    expect(isBufferBridgeEnabled('linkedin')).toBe(false);
  });

  it('gates each platform independently', () => {
    process.env.BUFFER_API_KEY = 'key';
    process.env.BUFFER_ENABLE_TIKTOK = 'true';
    expect(isBufferBridgeEnabled('tiktok')).toBe(true);
    // LinkedIn flag still unset — its direct approval landed, say — so off.
    expect(isBufferBridgeEnabled('linkedin')).toBe(false);
  });

  it('accepts "1" as well as "true"', () => {
    process.env.BUFFER_API_KEY = 'key';
    process.env.BUFFER_ENABLE_LINKEDIN = '1';
    expect(isBufferBridgeEnabled('linkedin')).toBe(true);
  });

  it('treats any other value as off', () => {
    process.env.BUFFER_API_KEY = 'key';
    process.env.BUFFER_ENABLE_TIKTOK = 'yes';
    expect(isBufferBridgeEnabled('tiktok')).toBe(false);
  });
});
