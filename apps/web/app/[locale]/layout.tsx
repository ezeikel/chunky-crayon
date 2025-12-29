import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { VercelToolbar } from '@vercel/toolbar/next';
import { config } from '@fortawesome/fontawesome-svg-core';
import PlausibleProvider from 'next-plausible';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import { Toaster } from '@/components/ui/sonner';
import DevToolbar from '@/components/dev/DevToolbar';
import BasicHeader from '@/components/BasicHeader/BasicHeader';
import Footer from '@/components/Footer/Footer';
import { tondo, rooneySans } from '@/fonts';
import Providers from '../providers';
import { routing } from '@/i18n/routing';
import '@/global.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

config.autoAddCss = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Base metadata - will be translated when translations are complete
  return {
    title: 'Chunky Crayon - Creative Coloring & Learning Fun',
    description:
      'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets.',
    keywords:
      'coloring book pages, creative app for kids, personalized coloring pages, educational worksheets',
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      title: 'Chunky Crayon - Creative Coloring & Learning Fun',
      description:
        'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets.',
      url: `https://chunkycrayon.com/${locale}`,
      siteName: 'Chunky Crayon',
      images: [
        {
          url: 'https://chunkycrayon.com/images/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Chunky Crayon AI-Generated Coloring Book Pages',
        },
      ],
      locale: locale === 'en' ? 'en_GB' : locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Chunky Crayon - Creative Coloring & Learning Fun',
      description:
        'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets.',
      images: ['https://chunkycrayon.com/images/og-image.jpg'],
    },
    alternates: {
      canonical: `https://chunkycrayon.com/${locale}`,
      languages: {
        en: 'https://chunkycrayon.com/en',
        ja: 'https://chunkycrayon.com/ja',
        ko: 'https://chunkycrayon.com/ko',
        de: 'https://chunkycrayon.com/de',
        fr: 'https://chunkycrayon.com/fr',
        es: 'https://chunkycrayon.com/es',
        'x-default': 'https://chunkycrayon.com/en',
      },
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering for this locale
  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const shouldInjectToolbar = process.env.NODE_ENV === 'development';

  return (
    <html lang={locale}>
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
            pintrk('load', '2612545195225');
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
            src="https://ct.pinterest.com/v3/?event=init&tid=2612545195225&noscript=1"
          />
        </noscript>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': 'https://chunkycrayon.com/#website',
                  url: 'https://chunkycrayon.com',
                  name: 'Chunky Crayon',
                  description:
                    'Create personalized coloring pages with AI. Free printable coloring pages for kids and adults.',
                  publisher: {
                    '@id': 'https://chunkycrayon.com/#organization',
                  },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate:
                        'https://chunkycrayon.com/gallery?search={search_term_string}',
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'Organization',
                  '@id': 'https://chunkycrayon.com/#organization',
                  name: 'Chunky Crayon',
                  url: 'https://chunkycrayon.com',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://chunkycrayon.com/images/logo.png',
                    width: 512,
                    height: 512,
                  },
                  sameAs: [
                    'https://www.facebook.com/chunkycrayon',
                    'https://twitter.com/chunkycrayon',
                    'https://www.pinterest.com/chunkycrayon',
                    'https://www.instagram.com/chunkycrayon',
                  ],
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'customer service',
                    email: 'hello@chunkycrayon.com',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={cn(
          'font-rooney-sans antialiased relative',
          tondo.variable,
          rooneySans.variable,
        )}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
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
        </NextIntlClientProvider>
        <Toaster />
        <DevToolbar />
        <Analytics />
      </body>
    </html>
  );
}
