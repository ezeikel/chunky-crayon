import type { Metadata } from 'next';
import { generateAlternates } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Pricing - Chunky Crayon',
    description:
      'Choose the right plan for your family. Free coloring pages, premium features, and unlimited access to AI-generated coloring pages.',
    keywords: [
      'coloring app pricing',
      'coloring pages subscription',
      'free coloring pages',
      'premium coloring pages',
    ],
    openGraph: {
      title: 'Pricing - Chunky Crayon',
      description:
        'Choose the right plan for your family. Free and premium coloring page plans.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}/pricing`,
    },
    alternates: generateAlternates(locale, '/pricing'),
  };
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
