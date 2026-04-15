import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Load Tondo font weights for Remotion compositions. Font files live in
 * apps/chunky-crayon-worker/public/fonts/ — served by Remotion's static-file
 * mechanism during render.
 *
 * `loadFont()` is called at module import time and Remotion blocks render
 * until all weights are ready, so we can reference `fontFamily: 'Tondo'`
 * anywhere in compositions without awaiting anything ourselves.
 */

export const TONDO_FAMILY = "Tondo";

loadFont({
  family: TONDO_FAMILY,
  url: staticFile("/fonts/tondo-regular.ttf"),
  weight: "400",
  format: "truetype",
}).then(
  () => console.log("[fonts] Tondo Regular loaded"),
  (err) => console.error("[fonts] Tondo Regular failed:", err),
);

loadFont({
  family: TONDO_FAMILY,
  url: staticFile("/fonts/tondo-bold.ttf"),
  weight: "700",
  format: "truetype",
}).then(
  () => console.log("[fonts] Tondo Bold loaded"),
  (err) => console.error("[fonts] Tondo Bold failed:", err),
);

loadFont({
  family: TONDO_FAMILY,
  url: staticFile("/fonts/tondo-light.ttf"),
  weight: "300",
  format: "truetype",
}).then(
  () => console.log("[fonts] Tondo Light loaded"),
  (err) => console.error("[fonts] Tondo Light failed:", err),
);
