// Shared ad primitives. Colours mirror the brand tokens from global.css,
// reified as literal HSL so the PNG export from a server component is
// self-contained and doesn't depend on CSS custom properties resolving.

export const CC = {
  orange: 'hsl(12 75% 58%)',
  orangeDark: 'hsl(12 72% 48%)',
  pink: 'hsl(355 65% 72%)',
  pinkDark: 'hsl(355 55% 60%)',
  yellow: 'hsl(42 95% 62%)',
  yellowDark: 'hsl(38 85% 50%)',
  green: 'hsl(85 35% 52%)',
  greenDark: 'hsl(85 35% 40%)',
  purple: 'hsl(340 30% 65%)',
  surface: '#FDF6E3',
  surfaceDark: '#F0E6D0',
  ink: '#2a1d10',
  muted: '#6b5a47',
  paper: '#FFFDF4',
} as const;

export const AD_W = 1080;
export const AD_H = 1350;

export const TONDO = 'var(--font-tondo), ui-rounded, system-ui, sans-serif';
export const ROONEY =
  'var(--font-rooney-sans), ui-rounded, system-ui, sans-serif';

export function ChunkyButton({
  bg,
  shadow,
  children,
  fontSize = 44,
  py = 28,
  px = 48,
  color = '#fff',
}: {
  bg: string;
  shadow: string;
  children: React.ReactNode;
  fontSize?: number;
  py?: number;
  px?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${py}px ${px}px`,
        background: bg,
        color,
        fontFamily: TONDO,
        fontWeight: 700,
        fontSize,
        letterSpacing: '-0.01em',
        borderRadius: 36,
        boxShadow: `0 10px 0 0 ${shadow}`,
        lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}

export function Crayon({
  color,
  dark,
  length = 120,
  rotate = 0,
  style = {},
}: {
  color: string;
  dark: string;
  length?: number;
  rotate?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: length,
        height: 28,
        position: 'relative',
        transform: `rotate(${rotate}deg)`,
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.08))',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          borderTop: '14px solid transparent',
          borderBottom: '14px solid transparent',
          borderRight: `18px solid ${dark}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: 0,
          width: 14,
          height: 28,
          background: '#E8D5A8',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 0,
          right: 8,
          height: 28,
          background: color,
          borderRadius: '0 4px 4px 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 0,
          right: 16,
          height: 28,
          background: `repeating-linear-gradient(90deg, transparent 0 12px, rgba(0,0,0,0.08) 12px 14px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 3,
          width: 10,
          height: 22,
          background: dark,
          borderRadius: '0 6px 6px 0',
        }}
      />
    </div>
  );
}

export function PaletteDots({ size = 44 }: { size?: number }) {
  const colors = [
    CC.orange,
    CC.yellow,
    CC.green,
    '#6BB6D6',
    CC.purple,
    CC.pink,
    '#8B5A2B',
    '#2a1d10',
  ];
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {colors.map((c, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: c,
            boxShadow: `inset 0 -4px 0 rgba(0,0,0,0.15), 0 4px 0 rgba(0,0,0,0.12)`,
            border:
              c === '#2a1d10'
                ? '3px solid #fff'
                : '3px solid rgba(255,255,255,0.7)',
          }}
        />
      ))}
    </div>
  );
}
