import { useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { Accelerometer } from "expo-sensors";
import { getCurrentDeviceInfo } from "@/utils/deviceUtils";

/**
 * Detects when an iPhone is being held PHYSICALLY UPSIDE-DOWN in portrait, so we
 * can show a friendly "turn me around" hint.
 *
 * Why the accelerometer (and not the obvious APIs):
 *  - Notched / Dynamic-Island iPhones do NOT support the upside-down INTERFACE
 *    orientation — Apple's per-idiom default mask is `.allButUpsideDown`, so the
 *    window never rotates there (confirmed by Apple's own forum guidance). That's
 *    why a flipped iPhone just paints the normal portrait UI 180° rotated.
 *  - Because the interface orientation never changes, `expo-screen-orientation`
 *    (getOrientationAsync / addOrientationChangeListener) reports PORTRAIT_UP
 *    forever and CANNOT see the flip.
 *  - `useWindowDimensions` is also unchanged (still 402×874) when inverted.
 *  So the ONLY signal for "phone is physically upside-down" is the raw gravity
 *  vector from the accelerometer.
 *
 * iPad genuinely rotates to upside-down (its idiom mask includes all four), so it
 * never needs the hint — we gate it out by device type.
 *
 * TODO(upside-down-flip): a richer future version would, instead of a hint,
 * rotate the whole UI 180° (a transform on the React root gated on this signal)
 * so the app is fully USABLE upside-down. That carries real cost — safe-area
 * top/bottom swap, re-wrapping every RN <Modal> (they render in a separate
 * window and don't inherit the transform), and verifying gesture/bottom-sheet
 * drag direction under the flip — so it's deferred. See the workflow analysis;
 * this hook's accelerometer signal is exactly what that flip would reuse.
 */
export const useUpsideDownHint = (): boolean => {
  const [isUpsideDown, setIsUpsideDown] = useState(false);
  // Read the latest value via a ref inside the listener so the hysteresis
  // compares against the current state without re-subscribing on every change.
  const isUpsideDownRef = useRef(false);
  // DEV-only force flag. The iOS Simulator emits NO accelerometer data (verified:
  // 0 samples) AND renders upside-down correctly anyway, so the hint can't be
  // exercised there. Toggle `globalThis.__forceUpsideDownHint = true` from the
  // debugger (or temporarily in code) to preview the overlay on the sim. No-op
  // in production (the global is never set). Polled at 4Hz so a debugger toggle
  // shows up live without a rebuild.
  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (!__DEV__) return undefined;
    const id = setInterval(() => {
      const f =
        (globalThis as { __forceUpsideDownHint?: boolean })
          .__forceUpsideDownHint === true;
      setForced((prev) => (prev === f ? prev : f));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // iPhone-only. iPad rotates for real; web/Android don't have this quirk.
    // isTablet comes from the min screen dimension, so it's orientation-stable.
    if (Platform.OS !== "ios" || getCurrentDeviceInfo().isTablet) {
      return undefined;
    }

    // 3.3Hz — plenty to debounce a deliberate flip, negligible battery cost.
    Accelerometer.setUpdateInterval(300);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      // Only care about portrait-ish holds (y axis dominant). In landscape the
      // x axis dominates — ignore it so we never show the hint mid-landscape.
      const portraitDominant = Math.abs(y) > Math.abs(x);
      // iOS accelerometer sign (Apple CoreMotion, which expo-sensors wraps):
      // held UPRIGHT in portrait (bottom edge down) reads y ≈ −1g; held
      // UPSIDE-DOWN reads y ≈ +1g. (The original code had this inverted, which
      // fired the hint whenever the phone was held normally — see the upside-down
      // "Turn me around!" screenshot bug.)
      // Hysteresis so the hint doesn't flicker when the phone is near flat:
      //   enter "upside-down" only past +0.65g, exit once back below +0.35g.
      const next = isUpsideDownRef.current
        ? portraitDominant && y > 0.35
        : portraitDominant && y > 0.65;
      if (next !== isUpsideDownRef.current) {
        isUpsideDownRef.current = next;
        setIsUpsideDown(next);
      }
    });

    return () => subscription.remove();
  }, []);

  // Hard portrait-only gate. The hint is for an upside-down PORTRAIT hold; in
  // landscape the app has its own (correct) landscape layout, so the overlay
  // must never appear there — not via the accelerometer's portraitDominant
  // check (which can momentarily lag a rotation), and not via the dev force
  // flag. width >= height ⇒ landscape ⇒ suppressed. Reactive via
  // useWindowDimensions so it hides the instant the window goes landscape.
  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;
  if (isLandscape) return false;

  // Dev force override wins so the overlay can be previewed where the
  // accelerometer can't fire (the simulator).
  return forced || isUpsideDown;
};

export default useUpsideDownHint;
