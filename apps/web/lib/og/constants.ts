/**
 * OG Image Design Constants
 *
 * Brand colors and design tokens for consistent OG image styling.
 * Based on the Chunky Crayon warm analogous color palette.
 */

// OG Image Dimensions (standard)
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Brand Colors (converted from HSL to hex for ImageResponse)
export const colors = {
  // Primary - Crayon Orange: Warm, friendly, inviting
  crayonOrange: '#E37748',
  crayonOrangeLight: '#F5A080',
  crayonOrangeDark: '#C85A34',

  // Secondary - Peach: Soft, approachable
  crayonTeal: '#F5B07A',
  crayonTealLight: '#FCDABB',
  crayonTealDark: '#E89550',

  // Accent - Blush Pink: Playful
  crayonPink: '#E89CA5',
  crayonPinkLight: '#F5CDD3',
  crayonPinkDark: '#D67380',

  // Highlight - Sunshine Yellow: Cheerful
  crayonYellow: '#F5C842',
  crayonYellowLight: '#FCE699',
  crayonYellowDark: '#E5AB1C',

  // Success - Sage Green: Natural
  crayonGreen: '#8FAA66',
  crayonGreenLight: '#B8CC99',
  crayonGreenDark: '#6B8A45',

  // Purple - Dusty Rose: Warm variety
  crayonPurple: '#C99EB0',
  crayonPurpleLight: '#E0C5D0',
  crayonPurpleDark: '#A67388',

  // Warm Tan
  crayonSky: '#E8D5C5',
  crayonSkyLight: '#F5EDE5',
  crayonSkyDark: '#D4BBA8',

  // Neutrals
  textPrimary: '#3D3330',
  textSecondary: '#5C5350',
  textMuted: '#8A807A',
  textInverted: '#FFFFFF',

  // Backgrounds
  bgCream: '#FDF8F3',
  bgCreamDark: '#F5EDE5',
  bgLavender: '#FBF6F2',
  bgWhite: '#FFFDFB',

  // Paper
  paperSky: '#F7F0EA',
  paperCream: '#FBF7F3',
} as const;

// Gradient definitions
export const gradients = {
  // Primary warm gradient
  primary: `linear-gradient(135deg, ${colors.bgCream} 0%, ${colors.bgCreamDark} 100%)`,

  // Orange accent gradient
  orange: `linear-gradient(135deg, ${colors.crayonOrange} 0%, ${colors.crayonOrangeDark} 100%)`,

  // Playful rainbow gradient
  rainbow: `linear-gradient(135deg, ${colors.crayonOrange} 0%, ${colors.crayonPink} 50%, ${colors.crayonYellow} 100%)`,

  // Warm sunset (for backgrounds)
  warmSunset: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 50%, ${colors.bgCreamDark} 100%)`,
} as const;

// Common styles
export const styles = {
  // Card-like container
  card: {
    backgroundColor: colors.bgWhite,
    borderRadius: '24px',
    boxShadow: `0 8px 32px rgba(227, 119, 72, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05)`,
  },

  // Pill badge
  badge: {
    backgroundColor: colors.crayonOrangeLight,
    color: colors.textPrimary,
    padding: '8px 20px',
    borderRadius: '100px',
    fontSize: '20px',
    fontWeight: 600,
  },

  // Tag/category pill
  tag: {
    backgroundColor: `${colors.crayonOrange}22`,
    color: colors.crayonOrangeDark,
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '16px',
    fontWeight: 500,
  },
} as const;

// Decorative crayon colors for visual elements
export const crayonColors = [
  colors.crayonOrange,
  colors.crayonPink,
  colors.crayonYellow,
  colors.crayonGreen,
  colors.crayonTeal,
  colors.crayonPurple,
] as const;
