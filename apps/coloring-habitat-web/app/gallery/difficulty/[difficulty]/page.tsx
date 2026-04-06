import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
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

type DifficultyPageProps = {
  params: Promise<{ difficulty: string }>;
};

export async function generateStaticParams() {
  return getAllDifficultySlugs();
}

export async function generateMetadata({
  params,
}: DifficultyPageProps): Promise<Metadata> {
  const { difficulty: difficultySlug } = await params;
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!difficulty) {
    return { title: "Difficulty not found" };
  }

  const label = DIFFICULTY_LABELS[difficulty];

  return {
    title: `${label} Coloring Pages`,
    description: `Browse ${label.toLowerCase()} difficulty coloring pages. ${DIFFICULTY_DESCRIPTIONS[difficulty]}`,
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

  return (
    <>
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/gallery" className="hover:text-foreground">
              Gallery
            </Link>
            <span>/</span>
            <span className="text-foreground">{label}</span>
          </nav>

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
