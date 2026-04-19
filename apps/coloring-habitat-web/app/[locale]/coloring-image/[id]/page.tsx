import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import ColoringPageContent from "@/components/ColoringPageContent/ColoringPageContent";
import { ColoringContextProvider } from "@one-colored-pixel/coloring-ui";
import { generateAlternates } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  getAllColoringImagesStatic,
  getColoringImageById,
} from "@/app/data/coloring-image";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

// Static generation for the newest 400 coloring images (see
// getAllColoringImagesStatic for the rationale on the 400 cap).
// Older images render on-demand via ISR and are cached forever after
// first request thanks to cacheComponents in next.config.
export const generateStaticParams = async () => {
  const images = await getAllColoringImagesStatic();
  return images.map((image) => ({
    id: image.id,
  }));
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const image = await getColoringImageById(id);

  if (!image) {
    return { title: "Coloring Page Not Found" };
  }

  const title = `${image.title || "Coloring Page"} | Coloring Habitat`;
  const description =
    image.description ||
    "Free adult coloring page from Coloring Habitat. Color online for relaxation and mindfulness.";

  return {
    title,
    description,
    keywords:
      image.tags?.join(", ") || "coloring page, adult coloring, mindfulness",
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://coloringhabitat.com/${locale}/coloring-image/${id}`,
    },
    alternates: generateAlternates(locale, `/coloring-image/${id}`),
  };
}

const ColoringImagePage = async ({ params }: Props) => {
  const { id } = await params;
  const t = await getTranslations("navigation");

  // Uses cached getColoringImageById ('use cache' directive) so the page
  // can be prerendered under cacheComponents without hitting Next.js 16's
  // uncached-access rule. auth() is dynamic and Suspends during prerender.
  const [image, session] = await Promise.all([
    getColoringImageById(id),
    auth(),
  ]);

  if (!image) {
    notFound();
  }

  const isAuthenticated = !!session?.user?.id;

  const imageSchema = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `https://coloringhabitat.com/coloring-image/${id}`,
    name: image.title || "Coloring Page",
    description:
      image.description ||
      "Free adult coloring page from Coloring Habitat for relaxation and mindfulness",
    contentUrl: image.svgUrl || image.url,
    thumbnailUrl: image.svgUrl || image.url,
    url: `https://coloringhabitat.com/coloring-image/${id}`,
    isPartOf: {
      "@id": "https://coloringhabitat.com/#website",
    },
    creator: {
      "@id": "https://coloringhabitat.com/#organization",
    },
    copyrightHolder: {
      "@id": "https://coloringhabitat.com/#organization",
    },
    license: "https://coloringhabitat.com/terms",
    acquireLicensePage: "https://coloringhabitat.com/pricing",
    keywords:
      image.tags?.join(", ") || "coloring page, adult coloring, mindfulness",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
      />
      <main className="bg-background py-8">
        <div className="mx-auto max-w-[100vw] px-6">
          <Breadcrumbs
            items={[
              { label: t("home"), href: "/" },
              { label: t("gallery"), href: "/gallery" },
              { label: image.title || "Coloring Page" },
            ]}
            className="mb-6"
          />

          {/* Coloring canvas with toolbar and sidebars */}
          <ColoringContextProvider
            variant="adult"
            storagePrefix="coloring-habitat"
          >
            <ColoringPageContent
              coloringImage={image}
              isAuthenticated={isAuthenticated}
              title={image.title || "Coloring Page"}
            />
          </ColoringContextProvider>

          {/* Metadata: description and tags */}
          <div className="mt-8 max-w-3xl mx-auto">
            {image.description && (
              <p className="text-muted-foreground">{image.description}</p>
            )}

            {image.tags && image.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {image.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ColoringImagePage;
