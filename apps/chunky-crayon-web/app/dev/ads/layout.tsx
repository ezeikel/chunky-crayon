import cn from '@/utils/cn';
import { tondo, rooneySans } from '@/fonts';
import '@/global.css';

export const metadata = {
  title: 'Ad preview',
  robots: { index: false, follow: false },
};

// Standalone layout for ad previews — no Header/Footer/Providers.
// The 1080×1350 canvas gets the full viewport, fonts load, nothing else.
export default function AdLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={cn('antialiased', tondo.variable, rooneySans.variable)}
        style={{ margin: 0, padding: 0, background: '#f0eee9' }}
      >
        {children}
      </body>
    </html>
  );
}
