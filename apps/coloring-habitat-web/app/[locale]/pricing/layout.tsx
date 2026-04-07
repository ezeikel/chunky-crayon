import type { Metadata } from "next";
import { generateAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Pricing | Coloring Habitat",
    description:
      "Choose the right plan for your mindful coloring practice. Free coloring pages, premium features, and unlimited access to AI-generated designs.",
    keywords: [
      "coloring app pricing",
      "adult coloring subscription",
      "free coloring pages",
      "premium coloring pages",
    ],
    openGraph: {
      title: "Pricing | Coloring Habitat",
      description:
        "Choose the right plan for your mindful coloring practice. Free and premium coloring page plans.",
      type: "website",
      url: `https://coloringhabitat.com/${locale}/pricing`,
    },
    alternates: generateAlternates(locale, "/pricing"),
  };
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
