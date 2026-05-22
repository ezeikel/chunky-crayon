import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  savePendingCreation,
  loadPendingCreation,
  clearPendingCreation,
  type PendingCreation,
} from './pending-creation';

/**
 * A busted resolver here means a fresh subscriber loses the scene they
 * just paid to finish — so the contract gets pinned: round-trip per
 * mode, TTL expiry, and the defensive null paths (corrupt / missing).
 */

const STORAGE_KEY = 'cc_pending_creation';

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('savePendingCreation / loadPendingCreation', () => {
  it('round-trips a scene intent', () => {
    const intent: PendingCreation = {
      mode: 'scene',
      selection: { subject: ['cow'], location: ['beach'] },
      characterId: null,
      description: 'a cow at the beach',
    };
    savePendingCreation(intent);
    expect(loadPendingCreation()).toEqual(intent);
  });

  it('round-trips a text intent', () => {
    const intent: PendingCreation = {
      mode: 'text',
      description: 'a dragon eating pizza',
    };
    savePendingCreation(intent);
    expect(loadPendingCreation()).toEqual(intent);
  });

  it('round-trips a voice intent', () => {
    const intent: PendingCreation = {
      mode: 'voice',
      firstAnswer: 'a fox',
      secondAnswer: 'in space',
    };
    savePendingCreation(intent);
    expect(loadPendingCreation()).toEqual(intent);
  });

  it('round-trips a photo intent', () => {
    const intent: PendingCreation = {
      mode: 'photo',
      photoBase64: 'data:image/png;base64,AAAA',
    };
    savePendingCreation(intent);
    expect(loadPendingCreation()).toEqual(intent);
  });

  it('returns null when nothing is stored', () => {
    expect(loadPendingCreation()).toBeNull();
  });

  it('returns null and self-clears a corrupt entry', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPendingCreation()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns null and self-clears an entry past the 24h TTL', () => {
    const intent: PendingCreation = {
      mode: 'text',
      description: 'stale idea',
    };
    // Save 25h ago.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T00:00:00Z'));
    savePendingCreation(intent);
    vi.setSystemTime(new Date('2026-05-22T01:00:00Z'));
    expect(loadPendingCreation()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('still returns an entry just inside the 24h TTL', () => {
    const intent: PendingCreation = {
      mode: 'text',
      description: 'fresh enough',
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T00:00:00Z'));
    savePendingCreation(intent);
    // 23h later — still valid.
    vi.setSystemTime(new Date('2026-05-21T23:00:00Z'));
    expect(loadPendingCreation()).toEqual(intent);
  });

  it('returns null when the envelope is missing savedAt', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ payload: { mode: 'text', description: 'x' } }),
    );
    expect(loadPendingCreation()).toBeNull();
  });
});

describe('clearPendingCreation', () => {
  it('removes a stored intent', () => {
    savePendingCreation({ mode: 'text', description: 'gone soon' });
    clearPendingCreation();
    expect(loadPendingCreation()).toBeNull();
  });

  it('is a no-op when nothing is stored', () => {
    expect(() => clearPendingCreation()).not.toThrow();
  });
});
