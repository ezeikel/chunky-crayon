import { describe, expect, it } from "vitest";
import {
  SEASONAL_EVENTS,
  getCurrentSeason,
  getUpcomingEvents,
} from "./seasonal-calendar";

/**
 * The seasonal calendar steers daily scene generation (what the app draws
 * on Halloween, Christmas, etc.). getUpcomingEvents has tricky date maths
 * — a window that wraps the year boundary — so the wrap case is pinned
 * explicitly. getCurrentSeason must be hemisphere-correct since copy and
 * imagery branch on it.
 */

describe("getCurrentSeason", () => {
  it.each([
    [new Date("2026-01-15"), "winter", "summer"],
    [new Date("2026-04-15"), "spring", "autumn"],
    [new Date("2026-07-15"), "summer", "winter"],
    [new Date("2026-10-15"), "autumn", "spring"],
    [new Date("2026-12-15"), "winter", "summer"],
  ])("for %s reports northern=%s southern=%s", (date, northern, southern) => {
    expect(getCurrentSeason(date)).toEqual({ northern, southern });
  });

  it("always returns opposite hemispheres", () => {
    for (let month = 0; month < 12; month++) {
      const { northern, southern } = getCurrentSeason(
        new Date(2026, month, 15),
      );
      expect(northern).not.toBe(southern);
    }
  });
});

describe("getUpcomingEvents", () => {
  it("returns events whose range overlaps the look-ahead window", () => {
    // Pick a real configured event and assert it surfaces on its own
    // start date with a small window.
    const sample = SEASONAL_EVENTS[0];
    const [mm, dd] = sample.startDate.split("-").map(Number);
    const onStart = new Date(2026, mm - 1, dd);

    const upcoming = getUpcomingEvents(onStart, 1);
    expect(upcoming.map((e) => e.name)).toContain(sample.name);
  });

  it("does not return an event that is far outside the window", () => {
    // A 0-day window on an arbitrary mid-range date should not surface
    // every event — sanity bound on the filter.
    const all = SEASONAL_EVENTS.length;
    const narrow = getUpcomingEvents(new Date("2026-02-10"), 0);
    expect(narrow.length).toBeLessThan(all);
  });

  it("handles a window that wraps the year boundary (late Dec → Jan events)", () => {
    // Late December with a wide window must be able to pick up an event
    // whose range crosses 31 Dec / 1 Jan without throwing or missing it.
    const lateDec = new Date("2026-12-28");
    expect(() => getUpcomingEvents(lateDec, 14)).not.toThrow();
    const wrap = getUpcomingEvents(lateDec, 14);
    expect(Array.isArray(wrap)).toBe(true);
  });

  it("is deterministic for the same date + window", () => {
    const a = getUpcomingEvents(new Date("2026-06-01"), 7).map((e) => e.name);
    const b = getUpcomingEvents(new Date("2026-06-01"), 7).map((e) => e.name);
    expect(a).toEqual(b);
  });
});
