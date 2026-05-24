import { describe, expect, it } from 'vitest';
import { getColoState } from './service';

describe('getColoState — progressToNext', () => {
  it('returns null progress at the max stage', () => {
    const state = getColoState(6, [], 200);
    expect(state.progressToNext).toBeNull();
  });

  it('reports raw progress under the next-stage threshold', () => {
    // Stage 1 (req 0) → Stage 2 (req 5). Kid has 3 saved → 3/5, 60%.
    const state = getColoState(1, [], 3);
    expect(state.progressToNext).toEqual({
      current: 3,
      required: 5,
      percentage: 60,
    });
  });

  it('caps current at required when the kid overshoots the next-stage threshold', () => {
    // Stage 3 (req 15) → Stage 4 (req 30). Kid has 50 saved (overshoot
    // because the evolution event hasn't fired yet). Without the cap,
    // consumers showed "50/30 artworks" and "Save -20 more artworks
    // to evolve!" — both broken for a 3-8yo. The fix clamps current
    // at required so display math stays sane.
    const state = getColoState(3, [], 50);
    expect(state.progressToNext).toEqual({
      current: 30,
      required: 30,
      percentage: 100,
    });
  });

  it('handles zero-artwork users at stage 1 cleanly', () => {
    const state = getColoState(1, [], 0);
    expect(state.progressToNext).toEqual({
      current: 0,
      required: 5,
      percentage: 0,
    });
  });
});
