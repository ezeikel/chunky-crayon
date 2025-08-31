import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { VercelToolbar } from '@vercel/toolbar/next';
import { config } from '@fortawesome/fontawesome-svg-core';
import PlausibleProvider from 'next-plausible';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import { Toaster } from '@/components/ui/sonner';
import BasicHeader from '@/components/BasicHeader/BasicHeader';
import Footer from '@/components/Footer/Footer';
import { tondo, rooneySans } from '@/fonts';
import Providers from './providers';
import '@/global.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'Chunky Crayon - Creative Coloring & Learning Fun',
  description:
    'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets. Transform text, voice, and image prompts into printable coloring pages, or enjoy digital coloring on our web, iOS, and Android apps. Expand your child’s creativity and learning with engaging activities like connect the dots, hangman, and more. Chunky Crayon makes learning and creativity a delightful experience for kids at home or in school.',
  keywords:
    'colouring book pages, creative app for kids, personalized coloring pages, educational worksheets, fun learning activities, kids creativity app, interactive coloring app, digital coloring, printable coloring pages, connect the dots, hangman, kids educational games, math worksheets, English worksheets, kids learning tools, creative learning, kids drawing activities, home learning, school learning, web app for kids, iOS app for kids, Android app for kids, Chunky Crayon, fun educational app',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Chunky Crayon - Creative Colouring & Learning Fun',
    description:
      'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets. Transform text, voice, and image prompts into printable coloring pages, or enjoy digital coloring on our web, iOS, and Android apps. Expand your child’s creativity and learning with engaging activities like connect the dots, hangman, and more. Chunky Crayon makes learning and creativity a delightful experience for kids at home or in school.',
    url: 'https://chunkycrayon.com',
    siteName: 'Chunky Crayon',
    images: [
      {
        url: 'https://chunkycrayon.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Chunky Crayon AI-Generated Colouring Book Pages',
      },
    ],
    locale: 'en-GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chunky Crayon - Creative Colouring & Learning Fun',
    description:
      'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets. Transform text, voice, and image prompts into printable coloring pages, or enjoy digital coloring on our web, iOS, and Android apps. Expand your child’s creativity and learning with engaging activities like connect the dots, hangman, and more. Chunky Crayon makes learning and creativity a delightful experience for kids at home or in school.',
    images: ['https://chunkycrayon.com/images/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldInjectToolbar = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="chunkycrayon.com" />
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1917430899000540');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1917430899000540&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Script id="pinterest-tag" strategy="afterInteractive">
          {`
            !function(e){if(!window.pintrk){window.pintrk = function () {
            window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
              n=window.pintrk;n.queue=[],n.version="3.0";var
              t=document.createElement("script");t.async=!0,t.src=e;var
              r=document.getElementsByTagName("script")[0];
              r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
            pintrk('load', '2612545195225', {em: '<user_email_address>'});
            pintrk('page');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            alt=""
            src="https://ct.pinterest.com/v3/?event=init&tid=2612545195225&pd[em]=<hashed_email_address>&noscript=1"
          />
        </noscript>
      </head>
      <body
        className={cn(
          'font-rooney-sans antialiased relative',
          tondo.variable,
          rooneySans.variable,
        )}
      >
        <Providers>
          <Suspense fallback={<BasicHeader />}>
            <Header />
          </Suspense>
          <main className="flex flex-col min-h-[calc(100vh-72px)] [&>div]:flex-1">
            {children}
            {shouldInjectToolbar && <VercelToolbar />}
          </main>
          <Footer />
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
