import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import cn from '@/utils/cn';
import { tondo, rooneySans } from '@/fonts';
import '@/global.css';

export const metadata: Metadata = {
  title: 'Dev Tools - Chunky Crayon',
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
};

export default function DevLayout({ children }: Props) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <html lang="en" className="bg-bg-cream">
      <body
        className={cn(
          'font-rooney-sans antialiased',
          tondo.variable,
          rooneySans.variable,
        )}
      >
        {children}
      </body>
    </html>
  );
}
