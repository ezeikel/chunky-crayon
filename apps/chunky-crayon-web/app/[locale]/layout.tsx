import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { VercelToolbar } from '@vercel/toolbar/next';
import { config } from '@fortawesome/fontawesome-svg-core';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import { Toaster } from '@/components/ui/sonner';
import BasicHeader from '@/components/BasicHeader/BasicHeader';
import Footer from '@/components/Footer/Footer';
import PixelLoaders from '@/components/PixelLoaders/PixelLoaders';
import { tondo, rooneySans } from '@/fonts';
import Providers from '../providers';
import { routing } from '@/i18n/routing';
import { getOGImageUrl } from '@/lib/og/r2-url';
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
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    openGraph: {
      title: 'Chunky Crayon - Creative Coloring & Learning Fun',
      description:
        'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets.',
      url: `https://chunkycrayon.com/${locale}`,
      siteName: 'Chunky Crayon',
      // Pre-rendered PNG on R2 — fast static response avoids the 15s
      // Satori render that timed out Meta's scraper. The convention
      // route at app/[locale]/opengraph-image.tsx remains as a fallback
      // (Next will only emit it when no openGraph.images is set, so
      // wrapping in `?? undefined` lets the convention route win in
      // dev/preview where R2_PUBLIC_URL may not be set).
      images: getOGImageUrl('homepage') ?? undefined,
      locale: locale === 'en' ? 'en_GB' : locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Chunky Crayon - Creative Coloring & Learning Fun',
      description:
        'Chunky Crayon is a vibrant and interactive app designed for kids and parents to generate unique, personalized coloring book pages and fun educational worksheets.',
      images: getOGImageUrl('homepage') ?? undefined,
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
        {/* Pixel + Pinterest tag loaders. Lives in a Client Component
            so we can use Script onLoad to fire init/PageView without an
            inline-script body containing template-literal env interpolation
            (that pattern crashed iOS Safari + Facebook/Instagram in-app
            browsers with SyntaxError: Unexpected EOF — Sentry issues
            CHUNKY-CRAYON-WEB-4X / 4S, ~2.6k events). */}
        <PixelLoaders />
        {process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        {process.env.NEXT_PUBLIC_PINTEREST_TAG_ID && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://ct.pinterest.com/v3/?event=init&tid=${process.env.NEXT_PUBLIC_PINTEREST_TAG_ID}&noscript=1`}
            />
          </noscript>
        )}
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
                    'Create personalised coloring pages from any prompt. Free printable coloring pages for kids and adults.',
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
        data-vaul-drawer-wrapper=""
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
        <Analytics />
      </body>
    </html>
  );
}
