import { staticFile } from "remotion";

/**
 * Tondo font family for Remotion compositions.
 *
 * We previously used @remotion/fonts + loadFont(), but that wraps each
 * font in delayRender() and on the Hetzner box Remotion's parallel
 * render tabs would deterministically hang one of the font fetches —
 * failing the whole render after a 30-120s timeout.
 *
 * Switching to an @font-face CSS rule served via Remotion's staticFile()
 * sidesteps delayRender entirely. The browser loads the font normally
 * and `font-display: block` ensures it's ready before any text paints.
 */

export const TONDO_FAMILY = "Tondo";

export const TONDO_FONT_FACE_CSS = `
@font-face {
  font-family: '${TONDO_FAMILY}';
  src: url('${staticFile("/fonts/tondo-regular.ttf")}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: '${TONDO_FAMILY}';
  src: url('${staticFile("/fonts/tondo-bold.ttf")}') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: '${TONDO_FAMILY}';
  src: url('${staticFile("/fonts/tondo-light.ttf")}') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: block;
}
`;
