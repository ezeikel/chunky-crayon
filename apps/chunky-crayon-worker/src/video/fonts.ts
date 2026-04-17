import { staticFile } from "remotion";

/**
 * Tondo font family for Remotion compositions.
 *
 * The font bytes are base64-encoded directly into a static CSS file
 * at public/fonts/tondo-inline.css. This eliminates ALL HTTP fetches
 * for font files during render — which was the root cause of
 * intermittent delayRender timeouts on the Hetzner box where
 * Remotion's parallel render tabs would fight over font URL fetches.
 *
 * The CSS file is ~570KB but loads once and the browser parses the
 * @font-face rules synchronously. No delayRender, no per-tab race.
 */

export const TONDO_FAMILY = "Tondo";

export const TONDO_FONT_CSS_URL = staticFile("/fonts/tondo-inline.css");
