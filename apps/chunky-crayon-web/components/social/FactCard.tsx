/**
 * FactCard Component for Satori Image Generation
 *
 * This component is designed specifically for Satori's JSX-to-SVG rendering.
 * Satori has specific CSS limitations - it supports a subset of CSS properties.
 * Uses inline styles as Satori doesn't support CSS-in-JS or Tailwind.
 *
 * @see https://github.com/vercel/satori#css
 */

import React from 'react';

export interface FactCardProps {
  fact: string;
  category: string;
  emoji: string;
  format?: 'square' | 'vertical';
  colorIndex?: number; // 0-5, selects background color theme
}

// Brand colors from the design system
const COLORS = {
  cream: '#FAF6F1',
  creamDark: '#EFDCC9',
  orange: '#EA8A3F',
  orangeLight: '#F5A666',
  text: '#3A3533',
  textSecondary: '#6B6662',
};

// Background color options - soft pastels that work well with the brand
const BACKGROUND_COLORS = [
  { bg: '#FAF6F1', divider: '#EFDCC9' }, // Cream (default)
  { bg: '#FFF5E6', divider: '#FFE4C4' }, // Soft peach/orange
  { bg: '#F0F7F4', divider: '#D4E8DC' }, // Soft mint/green
  { bg: '#FFF0F5', divider: '#FFD6E8' }, // Soft pink
  { bg: '#F5F0FF', divider: '#E0D4F7' }, // Soft lavender
  { bg: '#FFFDE7', divider: '#FFF59D' }, // Soft yellow
];

/**
 * FactCard component for Satori rendering.
 * Renders a styled fact card with the Chunky Crayon branding.
 */
export function FactCard({
  fact,
  category,
  emoji,
  format = 'square',
  colorIndex,
}: FactCardProps): React.ReactElement {
  const isVertical = format === 'vertical';
  const width = isVertical ? 1000 : 1080;
  const height = isVertical ? 1500 : 1080;

  // Select background color - use provided index or random
  const bgIndex =
    colorIndex !== undefined
      ? colorIndex % BACKGROUND_COLORS.length
      : Math.floor(Math.random() * BACKGROUND_COLORS.length);
  const bgColors = BACKGROUND_COLORS[bgIndex];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        backgroundColor: bgColors.bg,
        padding: isVertical ? 80 : 60,
        position: 'relative',
      }}
    >
      {/* Category Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: COLORS.orange,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 12,
          paddingBottom: 12,
          borderRadius: 100,
          marginBottom: isVertical ? 80 : 60,
        }}
      >
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <span
          style={{
            color: 'white',
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'Tondo',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {category}
        </span>
      </div>

      {/* Main Fact Text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          maxWidth: isVertical ? 800 : 900,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: COLORS.text,
            fontSize: isVertical ? 56 : 52,
            fontWeight: 500,
            fontFamily: 'Rooney Sans',
            lineHeight: 1.4,
            margin: 0,
            textAlign: 'center',
          }}
        >
          {fact}
        </p>
      </div>

      {/* Bottom Branding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginTop: isVertical ? 80 : 60,
        }}
      >
        {/* Divider line */}
        <div
          style={{
            width: 200,
            height: 2,
            backgroundColor: bgColors.divider,
            marginBottom: 20,
          }}
        />
        {/* Brand name */}
        <span
          style={{
            color: COLORS.orange,
            fontSize: 32,
            fontWeight: 700,
            fontFamily: 'Tondo',
            letterSpacing: -0.5,
          }}
        >
          Chunky Crayon
        </span>
        {/* Website */}
        <span
          style={{
            color: COLORS.textSecondary,
            fontSize: 20,
            fontFamily: 'Rooney Sans',
          }}
        >
          chunkycrayon.com
        </span>
      </div>
    </div>
  );
}

export default FactCard;
