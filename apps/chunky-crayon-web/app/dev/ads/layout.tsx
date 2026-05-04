import cn from '@/utils/cn';
import { tondo, rooneySans } from '@/fonts';
import '@/global.css';

export const metadata = {
  title: 'Ad preview',
  robots: { index: false, follow: false },
};

// Standalone layout for ad previews — no Header/Footer/Providers.
// The 1080×1350 canvas gets the full viewport, fonts load, nothing else.
//
// Override global.css's `scrollbar-gutter: stable` for this route only —
// that rule reserves 15px on the right of <body>, which used to clip the
// right edge of the ad canvas (Pinterest 1000px export was being squeezed
// into 985px of usable width). Ad previews never need scrollbar reservation
// because the canvas is sized to fill the viewport exactly.
export default function AdLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ scrollbarGutter: 'auto', overflow: 'hidden' }}>
      <body
        className={cn('antialiased', tondo.variable, rooneySans.variable)}
        style={{
          margin: 0,
          padding: 0,
          background: '#f0eee9',
          overflow: 'hidden',
        }}
      >
        {children}
      </body>
    </html>
  );
}
