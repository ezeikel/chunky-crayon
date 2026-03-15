import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Creates a CSS cursor string from a FontAwesome icon definition.
 * The cursor will be centered on the icon.
 *
 * @param iconDef - FontAwesome icon definition
 * @param size - Size of the cursor in pixels (default: 24)
 * @param color - Color of the icon (default: '#000')
 * @returns CSS cursor value string
 */
export function createIconCursor(
  iconDef: IconDefinition,
  size: number = 24,
  color: string = '#000',
): string {
  // FontAwesome icon structure: [width, height, ligatures, unicode, svgPathData]
  const [width, height, , , pathData] = iconDef.icon;

  // Handle both string and array path data (some icons have multiple paths)
  const paths = Array.isArray(pathData)
    ? pathData.map((d) => `<path fill="${color}" d="${d}"/>`).join('')
    : `<path fill="${color}" d="${pathData}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  // Hotspot is at the center of the icon
  const hotspot = Math.floor(size / 2);

  return `url("data:image/svg+xml,${encoded}") ${hotspot} ${hotspot}, auto`;
}

/**
 * Creates a cursor with a colored ring preview around the brush icon.
 * This gives users a visual preview of the selected color.
 *
 * @param iconDef - FontAwesome icon definition
 * @param size - Size of the cursor in pixels (default: 32)
 * @param iconColor - Color of the icon itself
 * @param ringColor - Color of the preview ring (typically the selected brush color)
 * @returns CSS cursor value string
 */
export function createIconCursorWithRing(
  iconDef: IconDefinition,
  size: number = 32,
  iconColor: string = '#000',
  ringColor: string = '#000',
): string {
  const [width, height, , , pathData] = iconDef.icon;

  const paths = Array.isArray(pathData)
    ? pathData.map((d) => `<path fill="${iconColor}" d="${d}"/>`).join('')
    : `<path fill="${iconColor}" d="${pathData}"/>`;

  // Scale the icon to fit inside the ring
  const iconSize = size * 0.6;
  const iconOffset = (size - iconSize) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="${ringColor}" stroke-width="2" opacity="0.8"/>
    <g transform="translate(${iconOffset}, ${iconOffset})">
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${width} ${height}">
        ${paths}
      </svg>
    </g>
  </svg>`;

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  const hotspot = Math.floor(size / 2);

  return `url("data:image/svg+xml,${encoded}") ${hotspot} ${hotspot}, auto`;
}
