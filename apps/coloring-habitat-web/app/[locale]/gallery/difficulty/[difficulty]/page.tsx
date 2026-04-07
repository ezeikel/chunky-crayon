import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import DifficultyFilter from "@/components/DifficultyFilter/DifficultyFilter";
import {
  getDifficultyImages,
  getDifficultyCounts,
  getDifficultyFromSlug,
  getAllDifficultySlugs,
  DIFFICULTY_LABELS,
  DIFFICULTY_DESCRIPTIONS,
} from "@/app/data/gallery";
import { generateAlternates } from "@/lib/seo";

type DifficultyPageProps = {
  params: Promise<{ locale: string; difficulty: string }>;
};

export async function generateStaticParams() {
  return getAllDifficultySlugs();
}

export async function generateMetadata({
  params,
}: DifficultyPageProps): Promise<Metadata> {
  const { locale, difficulty: difficultySlug } = await params;
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!difficulty) {
    return { title: "Difficulty not found" };
  }

  const label = DIFFICULTY_LABELS[difficulty];

  return {
    title: `${label} Coloring Pages`,
    description: `Browse ${label.toLowerCase()} difficulty coloring pages. ${DIFFICULTY_DESCRIPTIONS[difficulty]}`,
    alternates: generateAlternates(
      locale,
      `/gallery/difficulty/${difficultySlug}`,
    ),
  };
}

const DifficultyPage = async ({ params }: DifficultyPageProps) => {
  const { difficulty: difficultySlug } = await params;
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!difficulty) {
    notFound();
  }

  const label = DIFFICULTY_LABELS[difficulty];

  const [data, difficultyCounts] = await Promise.all([
    getDifficultyImages(difficulty),
    getDifficultyCounts(),
  ]);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `https://coloringhabitat.com/gallery/difficulty/${difficultySlug}`,
    name: `${label} Coloring Pages`,
    description: DIFFICULTY_DESCRIPTIONS[difficulty],
    url: `https://coloringhabitat.com/gallery/difficulty/${difficultySlug}`,
    isPartOf: {
      "@id": "https://coloringhabitat.com/#website",
    },
    about: {
      "@type": "Thing",
      name: `${label} Difficulty Coloring`,
    },
    numberOfItems: data.images.length,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: data.images.length,
      itemListElement: data.images.slice(0, 10).map((image, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ImageObject",
          "@id": `https://coloringhabitat.com/coloring-image/${image.id}`,
          name: image.title || `${label} Coloring Page`,
          contentUrl: image.svgUrl,
          thumbnailUrl: image.svgUrl,
          description:
            image.description || `Free ${label.toLowerCase()} coloring page`,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Gallery", href: "/gallery" },
              { label: label },
            ]}
            className="mb-6"
          />

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {label} Coloring Pages
          </h1>
          <p className="mt-2 text-muted-foreground">
            {DIFFICULTY_DESCRIPTIONS[difficulty]}
          </p>

          {/* Difficulty filter */}
          <Suspense fallback={null}>
            <DifficultyFilter
              currentDifficulty={difficulty}
              counts={difficultyCounts}
              className="mt-8"
            />
          </Suspense>

          {/* Gallery grid */}
          <div className="mt-8">
            <GalleryGrid
              initialImages={data.images}
              initialCursor={data.nextCursor}
              initialHasMore={data.hasMore}
              galleryType="difficulty"
              difficultySlug={difficultySlug}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default DifficultyPage;
