import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

config.autoAddCss = false;

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://coloringhabitat.com"),
  title: {
    default: "Coloring Habitat | Mindful Coloring for Adults",
    template: "%s | Coloring Habitat",
  },
  description:
    "Create beautiful coloring pages for relaxation and mindfulness. Type, talk, or snap a photo to generate intricate designs.",
  openGraph: {
    type: "website",
    siteName: "Coloring Habitat",
    title: "Coloring Habitat | Mindful Coloring for Adults",
    description:
      "Create intricate coloring pages in seconds. Color online or print at home. Your daily dose of creative mindfulness.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Coloring Habitat",
    description: "Mindful coloring for adults. Create, color, find your calm.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={jakarta.variable}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
