import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { routing } from "@/i18n/routing";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className={jakarta.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://coloringhabitat.com/#website",
                  url: "https://coloringhabitat.com",
                  name: "Coloring Habitat",
                  description:
                    "Create beautiful coloring pages for relaxation and mindfulness. Type, talk, or snap a photo to generate intricate designs.",
                  publisher: {
                    "@id": "https://coloringhabitat.com/#organization",
                  },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate:
                        "https://coloringhabitat.com/gallery?search={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://coloringhabitat.com/#organization",
                  name: "Coloring Habitat",
                  url: "https://coloringhabitat.com",
                  sameAs: [
                    "https://www.instagram.com/coloringhabitat",
                    "https://www.facebook.com/coloringhabitat",
                    "https://www.tiktok.com/@coloringhabitat",
                    "https://www.pinterest.com/coloringhabitat",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer service",
                    email: "hello@coloringhabitat.com",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <Suspense>
              <Header />
            </Suspense>
            <main className="flex min-h-[calc(100vh-72px)] flex-col [&>div]:flex-1">
              <Suspense>{children}</Suspense>
            </main>
            <Suspense>
              <Footer />
            </Suspense>
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
